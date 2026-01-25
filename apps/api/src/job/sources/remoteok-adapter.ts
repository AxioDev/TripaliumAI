import { Injectable, Logger } from '@nestjs/common';
import { JobSourceType } from '@tripalium/shared';
import {
  BaseJobSourceAdapter,
  CampaignSearchCriteria,
  DiscoveredJob,
  DiscoveryResult,
  HealthCheckResult,
} from './base-adapter';
import { RssParser, RssItem } from './utils/rss-parser';
import { RateLimiter, withRetry, RateLimitConfigs, RetryConfigs } from './utils/rate-limiter';

/**
 * RemoteOK RSS feed structure (they use JSON-in-RSS)
 */
interface RemoteOKJob {
  id: string;
  epoch: number;
  slug: string;
  company: string;
  company_logo: string;
  position: string;
  tags: string[];
  description: string;
  location: string;
  salary_min?: number;
  salary_max?: number;
  url: string;
  apply_url?: string;
}

@Injectable()
export class RemoteOKAdapter extends BaseJobSourceAdapter {
  private readonly logger = new Logger(RemoteOKAdapter.name);
  private readonly rssParser = new RssParser();
  private readonly rateLimiter = new RateLimiter(RateLimitConfigs.remoteok);

  readonly sourceName = 'remoteok';
  readonly displayName = 'RemoteOK';
  readonly sourceType = JobSourceType.RSS;
  readonly supportsAutoApply = false;

  // RemoteOK provides both RSS and JSON API
  private readonly jsonApiUrl = 'https://remoteok.com/api';
  private readonly rssUrl = 'https://remoteok.com/remote-jobs.rss';

  async discoverJobs(criteria: CampaignSearchCriteria): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let allJobs: DiscoveredJob[] = [];

    try {
      // RemoteOK provides a JSON API which is easier to parse
      // The API returns all recent jobs, we filter locally
      const jobs = await this.fetchFromJsonApi();

      // Filter jobs based on criteria
      const filteredJobs = this.filterJobs(jobs, criteria);

      allJobs = filteredJobs.map((job) => this.mapToDiscoveredJob(job, criteria.campaignId));

      this.logger.log(
        `RemoteOK: Found ${jobs.length} jobs, ${allJobs.length} after filtering for campaign ${criteria.campaignId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`RemoteOK fetch failed: ${errorMessage}`);
      errors.push(errorMessage);

      // Fallback to RSS feed
      try {
        this.logger.log('Falling back to RSS feed...');
        const rssJobs = await this.fetchFromRss(criteria);
        allJobs = rssJobs;
      } catch (rssError) {
        const rssErrorMessage = rssError instanceof Error ? rssError.message : 'Unknown RSS error';
        errors.push(`RSS fallback also failed: ${rssErrorMessage}`);
      }
    }

    return {
      jobs: allJobs,
      metadata: {
        source: this.sourceName,
        queryTime: Date.now() - startTime,
        totalFound: allJobs.length,
        filtered: 0,
        errors: errors.length > 0 ? errors : undefined,
      },
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const response = await fetch(this.jsonApiUrl, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'TripaliumAI Job Discovery Bot/1.0',
        },
      });

      return {
        healthy: response.ok,
        message: response.ok ? 'RemoteOK API available' : `HTTP ${response.status}`,
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        healthy: false,
        message: error instanceof Error ? error.message : 'Health check failed',
        lastChecked: new Date(),
        responseTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Fetch jobs from RemoteOK JSON API with rate limiting and retry
   */
  private async fetchFromJsonApi(): Promise<RemoteOKJob[]> {
    return this.rateLimiter.execute(this.sourceName, async () => {
      return withRetry(
        async () => {
          const response = await fetch(this.jsonApiUrl, {
            headers: {
              'User-Agent': 'TripaliumAI Job Discovery Bot/1.0 (+https://tripalium.ai)',
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`RemoteOK API returned ${response.status}`);
          }

          const data = await response.json();

          // RemoteOK API returns an array where first item is legal/meta info
          // Actual jobs start from index 1
          if (!Array.isArray(data)) {
            throw new Error('Invalid API response format');
          }

          // Filter out the first item which contains legal text
          const jobs = data.slice(1).filter((item): item is RemoteOKJob => {
            return item && typeof item === 'object' && 'position' in item;
          });

          return jobs;
        },
        RetryConfigs.standard,
        this.logger,
      );
    });
  }

  /**
   * Fallback: Fetch from RSS feed
   */
  private async fetchFromRss(criteria: CampaignSearchCriteria): Promise<DiscoveredJob[]> {
    const feed = await this.rssParser.parseUrl(this.rssUrl);
    const jobs: DiscoveredJob[] = [];

    for (const item of feed.items) {
      if (this.matchesRssItem(item, criteria)) {
        jobs.push(this.mapRssItemToJob(item, criteria.campaignId));
      }
    }

    return jobs;
  }

  /**
   * Filter jobs based on campaign criteria
   */
  private filterJobs(jobs: RemoteOKJob[], criteria: CampaignSearchCriteria): RemoteOKJob[] {
    return jobs.filter((job) => {
      // Match by role/position
      if (!this.matchesRole(job.position, criteria.targetRoles)) {
        return false;
      }

      // Match by tags (skills)
      const jobTags = job.tags.map((t) => t.toLowerCase());
      const hasMatchingTag = criteria.targetRoles.some((role) => {
        const normalizedRole = role.toLowerCase();
        return jobTags.some(
          (tag) => tag.includes(normalizedRole) || normalizedRole.includes(tag),
        );
      });

      // If no role match found and no tag match, skip
      // (but we already matched role above, so this is additional filtering)

      // Match by location (RemoteOK is primarily remote jobs)
      if (!criteria.remoteOk) {
        // User doesn't want remote jobs but RemoteOK is all remote
        // Still include if the job mentions a specific location that matches
        const locationMatch = criteria.targetLocations.some((loc) =>
          job.location.toLowerCase().includes(loc.toLowerCase()),
        );
        if (!locationMatch && job.location.toLowerCase().includes('worldwide')) {
          return false;
        }
      }

      // Salary filter (if job has salary info)
      if (criteria.salaryMin && job.salary_max && job.salary_max < criteria.salaryMin) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if RSS item matches criteria
   */
  private matchesRssItem(item: RssItem, criteria: CampaignSearchCriteria): boolean {
    const title = (item.title || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    const categories = (item.categories || []).map((c) => c.toLowerCase());

    // Match by role
    const roleMatch = criteria.targetRoles.some((role) => {
      const normalizedRole = role.toLowerCase();
      return (
        title.includes(normalizedRole) ||
        description.includes(normalizedRole) ||
        categories.some((c) => c.includes(normalizedRole))
      );
    });

    if (!roleMatch) {
      return false;
    }

    // All RemoteOK jobs are remote, so check remoteOk preference
    // If user explicitly doesn't want remote, we shouldn't include these
    // However, most users searching RemoteOK want remote, so we include all

    return true;
  }

  /**
   * Map RemoteOK job to standard format
   */
  private mapToDiscoveredJob(job: RemoteOKJob, campaignId: string): DiscoveredJob {
    const description = this.rssParser.stripHtml(job.description);

    // Build salary string
    let salary: string | null = null;
    if (job.salary_min || job.salary_max) {
      if (job.salary_min && job.salary_max) {
        salary = `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()} USD`;
      } else if (job.salary_min) {
        salary = `$${job.salary_min.toLocaleString()}+ USD`;
      } else if (job.salary_max) {
        salary = `Up to $${job.salary_max.toLocaleString()} USD`;
      }
    }

    return {
      externalId: `remoteok-${job.id}`,
      title: job.position,
      company: job.company,
      location: job.location || 'Remote',
      description,
      requirements: this.extractRequirements(description).concat(job.tags),
      salary,
      contractType: 'Full-time', // RemoteOK is primarily full-time positions
      remoteType: 'Remote',
      url: job.url || `https://remoteok.com/remote-jobs/${job.slug}`,
      postedAt: job.epoch ? new Date(job.epoch * 1000) : undefined,
      applicationUrl: job.apply_url,
    };
  }

  /**
   * Map RSS item to standard format
   */
  private mapRssItemToJob(item: RssItem, campaignId: string): DiscoveredJob {
    const description = this.rssParser.stripHtml(item.description || item.content || '');

    // Extract company from title (format: "Company: Position")
    let company = 'Unknown';
    let title = item.title || '';
    const colonIndex = title.indexOf(':');
    if (colonIndex > 0) {
      company = title.substring(0, colonIndex).trim();
      title = title.substring(colonIndex + 1).trim();
    }

    // Generate external ID from link or guid
    const externalId = `remoteok-${item.guid || this.hashString(item.link)}`;

    return {
      externalId,
      title,
      company,
      location: 'Remote',
      description,
      requirements: this.extractRequirements(description).concat(item.categories || []),
      salary: null,
      contractType: 'Full-time',
      remoteType: 'Remote',
      url: item.link,
      postedAt: item.pubDate ? new Date(item.pubDate) : undefined,
    };
  }

  /**
   * Simple hash function for generating IDs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }
}
