import { Injectable, Logger } from '@nestjs/common';
import { JobSourceType } from '@tripalium/shared';
import {
  BaseJobSourceAdapter,
  CampaignSearchCriteria,
  DiscoveredJob,
  DiscoveryResult,
  HealthCheckResult,
} from './base-adapter';

/**
 * WTTJ job structure from Algolia
 */
interface WTTJAlgoliaJob {
  objectID: string;
  name: string; // Job title
  reference: string;
  slug: string;
  profession: {
    name: string;
    category_name: string;
  };
  contract_type: {
    en: string;
    fr: string;
  };
  experience_level: {
    en: string;
    fr: string;
  };
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: string;
  };
  office?: {
    name: string;
    city: string;
    country: string;
  };
  organization: {
    name: string;
    slug: string;
    logo?: {
      url: string;
    };
  };
  remote?: string;
  websites_urls?: Array<{
    website_reference: string;
    url: string;
  }>;
  published_at: number;
  created_at?: {
    $date: string;
  };
  body_en?: string;
  body_fr?: string;
  profile_en?: string;
  profile_fr?: string;
  _geoloc?: {
    lat: number;
    lng: number;
  };
}

interface AlgoliaSearchResponse {
  hits: WTTJAlgoliaJob[];
  nbHits: number;
  page: number;
  nbPages: number;
  hitsPerPage: number;
}

@Injectable()
export class WTTJAdapter extends BaseJobSourceAdapter {
  private readonly logger = new Logger(WTTJAdapter.name);

  readonly sourceName = 'wttj';
  readonly displayName = 'Welcome to the Jungle';
  readonly sourceType = JobSourceType.API;
  readonly supportsAutoApply = false;

  // WTTJ uses Algolia for job search - these are public frontend credentials
  private readonly algoliaAppId = 'CSEKHVMS53';
  private readonly algoliaApiKey = '4bd8f6215d0cc52b26430765769e65a0';
  private readonly algoliaIndex = 'wttj_jobs_production';

  async discoverJobs(criteria: CampaignSearchCriteria): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let allJobs: DiscoveredJob[] = [];

    try {
      // Build Algolia search query
      const searchQueries = this.buildSearchQueries(criteria);

      // Execute searches for each role
      const allHits: WTTJAlgoliaJob[] = [];

      for (const query of searchQueries) {
        try {
          const results = await this.searchAlgolia(query.query, query.filters);
          allHits.push(...results.hits);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Search failed';
          errors.push(`Query "${query.query}": ${errorMessage}`);
        }
      }

      // Deduplicate by objectID
      const uniqueJobs = new Map<string, WTTJAlgoliaJob>();
      for (const job of allHits) {
        if (!uniqueJobs.has(job.objectID)) {
          uniqueJobs.set(job.objectID, job);
        }
      }

      // Map to standard format
      allJobs = Array.from(uniqueJobs.values()).map((job) =>
        this.mapToDiscoveredJob(job, criteria.campaignId),
      );

      this.logger.log(
        `WTTJ: Found ${uniqueJobs.size} unique jobs for campaign ${criteria.campaignId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`WTTJ fetch failed: ${errorMessage}`);
      errors.push(errorMessage);
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
      // Simple search to verify API is working
      const results = await this.searchAlgolia('developer', '', 1);

      return {
        healthy: results.hits.length > 0,
        message: `WTTJ API available (${results.nbHits} total jobs indexed)`,
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
   * Build Algolia search queries from criteria
   */
  private buildSearchQueries(
    criteria: CampaignSearchCriteria,
  ): Array<{ query: string; filters: string }> {
    const queries: Array<{ query: string; filters: string }> = [];

    // Build filters
    const filterParts: string[] = [];

    // Location filters
    if (criteria.targetLocations.length > 0) {
      const locationFilters = criteria.targetLocations.map((loc) => {
        const normalized = loc.toLowerCase();
        if (normalized.includes('paris')) return 'office.city:Paris';
        if (normalized.includes('lyon')) return 'office.city:Lyon';
        if (normalized.includes('marseille')) return 'office.city:Marseille';
        if (normalized.includes('bordeaux')) return 'office.city:Bordeaux';
        if (normalized.includes('toulouse')) return 'office.city:Toulouse';
        if (normalized.includes('france')) return 'office.country:France';
        if (normalized.includes('remote')) return 'remote:fulltime';
        return `office.city:${loc}`;
      });
      if (locationFilters.length > 0) {
        filterParts.push(`(${locationFilters.join(' OR ')})`);
      }
    }

    // Remote filter
    if (criteria.remoteOk) {
      // Don't filter out remote jobs - include them all
    } else {
      filterParts.push('NOT remote:fulltime');
    }

    // Contract type filters
    if (criteria.contractTypes.length > 0) {
      const contractFilters = criteria.contractTypes.map((type) => {
        const normalized = type.toLowerCase();
        if (normalized.includes('cdi') || normalized.includes('permanent')) return 'contract_type.en:full_time';
        if (normalized.includes('cdd') || normalized.includes('contract')) return 'contract_type.en:fixed_term';
        if (normalized.includes('freelance')) return 'contract_type.en:freelance';
        if (normalized.includes('internship') || normalized.includes('stage')) return 'contract_type.en:internship';
        return `contract_type.en:${type}`;
      });
      if (contractFilters.length > 0) {
        filterParts.push(`(${contractFilters.join(' OR ')})`);
      }
    }

    const filterString = filterParts.join(' AND ');

    // Create a query for each target role
    for (const role of criteria.targetRoles) {
      queries.push({
        query: role,
        filters: filterString,
      });
    }

    // If no roles specified, do a general search
    if (queries.length === 0) {
      queries.push({ query: '', filters: filterString });
    }

    return queries;
  }

  /**
   * Execute Algolia search
   */
  private async searchAlgolia(
    query: string,
    filters: string,
    hitsPerPage = 50,
  ): Promise<AlgoliaSearchResponse> {
    const searchUrl = `https://${this.algoliaAppId}-dsn.algolia.net/1/indexes/${this.algoliaIndex}/query`;

    const response = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': this.algoliaAppId,
        'X-Algolia-API-Key': this.algoliaApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        filters,
        hitsPerPage,
        attributesToRetrieve: [
          'objectID',
          'name',
          'reference',
          'slug',
          'profession',
          'contract_type',
          'experience_level',
          'salary',
          'office',
          'organization',
          'remote',
          'websites_urls',
          'published_at',
          'body_en',
          'body_fr',
          'profile_en',
          'profile_fr',
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Algolia API returned ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Map WTTJ job to standard format
   */
  private mapToDiscoveredJob(job: WTTJAlgoliaJob, campaignId: string): DiscoveredJob {
    // Use English description if available, otherwise French
    const description = job.body_en || job.body_fr || '';
    const requirements = job.profile_en || job.profile_fr || '';

    // Build location string
    let location = 'France';
    if (job.office) {
      location = [job.office.city, job.office.country].filter(Boolean).join(', ');
    }
    if (job.remote === 'fulltime') {
      location = 'Remote';
    } else if (job.remote === 'partial') {
      location = `${location} (Hybrid)`;
    }

    // Build salary string
    let salary: string | null = null;
    if (job.salary && (job.salary.min || job.salary.max)) {
      const currency = job.salary.currency || 'EUR';
      const period = job.salary.period || 'year';
      if (job.salary.min && job.salary.max) {
        salary = `${job.salary.min.toLocaleString()} - ${job.salary.max.toLocaleString()} ${currency}/${period}`;
      } else if (job.salary.min) {
        salary = `${job.salary.min.toLocaleString()}+ ${currency}/${period}`;
      } else if (job.salary.max) {
        salary = `Up to ${job.salary.max.toLocaleString()} ${currency}/${period}`;
      }
    }

    // Determine contract type
    const contractType = job.contract_type?.en || job.contract_type?.fr || 'Full-time';

    // Determine remote type
    let remoteType = 'On-site';
    if (job.remote === 'fulltime') {
      remoteType = 'Remote';
    } else if (job.remote === 'partial') {
      remoteType = 'Hybrid';
    }

    // Build job URL
    const jobUrl = `https://www.welcometothejungle.com/en/companies/${job.organization.slug}/jobs/${job.slug}`;

    // Extract requirements from profile text
    const extractedRequirements = this.extractRequirements(requirements + '\n' + description);

    return {
      externalId: `wttj-${job.objectID}`,
      title: job.name,
      company: job.organization.name,
      location,
      description: this.stripHtml(description),
      requirements: extractedRequirements,
      salary,
      contractType: this.normalizeContractType(contractType),
      remoteType,
      url: jobUrl,
      postedAt: job.published_at ? new Date(job.published_at * 1000) : undefined,
    };
  }

  /**
   * Normalize contract type to standard format
   */
  private normalizeContractType(type: string): string {
    const normalized = type.toLowerCase();
    if (normalized.includes('full') || normalized === 'cdi') return 'Full-time';
    if (normalized.includes('fixed') || normalized === 'cdd') return 'Contract';
    if (normalized.includes('freelance')) return 'Freelance';
    if (normalized.includes('intern')) return 'Internship';
    if (normalized.includes('part')) return 'Part-time';
    return type;
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();
  }
}
