import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobSourceType } from '@tripalium/shared';
import {
  BaseJobSourceAdapter,
  CampaignSearchCriteria,
  DiscoveredJob,
  DiscoveryResult,
  HealthCheckResult,
} from './base-adapter';

/**
 * JobSpy API response structure
 */
interface JobSpyJob {
  id?: string;
  title: string;
  company: string;
  company_url?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  job_type?: string;
  date_posted?: string;
  interval?: string;
  min_amount?: number;
  max_amount?: number;
  currency?: string;
  is_remote?: boolean;
  job_url: string;
  description?: string;
  emails?: string[];
  site?: string;
}

interface JobSpyResponse {
  jobs?: JobSpyJob[];
  error?: string;
  message?: string;
}

/**
 * Indeed Adapter
 *
 * Uses the JobSpy API to discover jobs from Indeed.
 * The JobSpy API is a self-hosted REST API that aggregates
 * job listings from multiple platforms including Indeed, LinkedIn,
 * Glassdoor, and ZipRecruiter.
 *
 * @see https://github.com/rainmanjam/jobspy-api
 */
@Injectable()
export class IndeedMCPAdapter extends BaseJobSourceAdapter {
  private readonly logger = new Logger(IndeedMCPAdapter.name);

  readonly sourceName = 'indeed';
  readonly displayName = 'Indeed';
  readonly sourceType = JobSourceType.API;
  readonly supportsAutoApply = false;

  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(private readonly configService: ConfigService) {
    super();
    this.apiUrl = configService.get<string>('JOBSPY_MCP_URL', 'http://jobspy:8000');
    this.apiKey = configService.get<string>('JOBSPY_API_KEY', '');
  }

  async discoverJobs(criteria: CampaignSearchCriteria): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let allJobs: DiscoveredJob[] = [];

    try {
      // Build search query from target roles
      const searchTerm = this.buildSearchTerm(criteria.targetRoles);
      const location = criteria.targetLocations[0] || '';

      this.logger.log(
        `Indeed: Searching for "${searchTerm}" in "${location}" for campaign ${criteria.campaignId}`,
      );

      // Call JobSpy API
      const response = await this.callJobSpyAPI(searchTerm, location, criteria);

      if (response.error) {
        throw new Error(response.error);
      }

      const jobs = response.jobs || [];

      // Map to standard format
      allJobs = jobs.map((job) => this.mapToDiscoveredJob(job, criteria));

      // Filter by location if multiple locations specified
      if (criteria.targetLocations.length > 1) {
        allJobs = allJobs.filter((job) =>
          this.matchesLocation(job.location, criteria.targetLocations, criteria.remoteOk),
        );
      }

      this.logger.log(
        `Indeed: Found ${allJobs.length} jobs for campaign ${criteria.campaignId}`,
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Indeed fetch failed: ${errorMessage}`);
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
      // Check health endpoint first
      const healthResponse = await fetch(`${this.apiUrl}/health`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!healthResponse.ok) {
        throw new Error(`Health check returned ${healthResponse.status}`);
      }

      return {
        healthy: true,
        message: 'JobSpy API available',
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
   * Build search term from target roles
   */
  private buildSearchTerm(targetRoles: string[]): string {
    if (targetRoles.length === 0) {
      return 'developer';
    }

    if (targetRoles.length === 1) {
      return targetRoles[0];
    }

    // Combine multiple roles with OR
    return targetRoles.slice(0, 3).join(' OR ');
  }

  /**
   * Get HTTP headers for API requests
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }

    return headers;
  }

  /**
   * Call the JobSpy REST API
   */
  private async callJobSpyAPI(
    searchTerm: string,
    location: string,
    criteria: CampaignSearchCriteria,
  ): Promise<JobSpyResponse> {
    // Determine country for Indeed search
    const countryIndeed = this.getCountryCode(location);

    // Build query parameters
    const params = new URLSearchParams({
      site_name: 'indeed',
      search_term: searchTerm,
      results_wanted: '50',
      format: 'json',
      country_indeed: countryIndeed,
    });

    if (location) {
      params.set('location', location);
    }

    if (criteria.remoteOk) {
      params.set('is_remote', 'true');
    }

    // Map contract types to job_type
    if (criteria.contractTypes.length > 0) {
      const jobType = this.mapContractType(criteria.contractTypes[0]);
      if (jobType) {
        params.set('job_type', jobType);
      }
    }

    const url = `${this.apiUrl}/api/v1/search_jobs?${params.toString()}`;

    this.logger.debug(`Indeed: Calling API: ${url}`);

    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`JobSpy API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    // Handle different response formats
    if (Array.isArray(result)) {
      return { jobs: result };
    }

    if (result.jobs) {
      return result;
    }

    if (result.data && Array.isArray(result.data)) {
      return { jobs: result.data };
    }

    return { jobs: [] };
  }

  /**
   * Get Indeed country code from location string
   */
  private getCountryCode(location: string): string {
    const normalized = location.toLowerCase();

    const countryMappings: Record<string, string> = {
      'united states': 'USA',
      usa: 'USA',
      'new york': 'USA',
      'san francisco': 'USA',
      'los angeles': 'USA',
      'united kingdom': 'UK',
      uk: 'UK',
      london: 'UK',
      france: 'France',
      paris: 'France',
      lyon: 'France',
      marseille: 'France',
      germany: 'Germany',
      berlin: 'Germany',
      munich: 'Germany',
      canada: 'Canada',
      toronto: 'Canada',
      vancouver: 'Canada',
      australia: 'Australia',
      sydney: 'Australia',
      melbourne: 'Australia',
      netherlands: 'Netherlands',
      amsterdam: 'Netherlands',
      spain: 'Spain',
      madrid: 'Spain',
      barcelona: 'Spain',
      italy: 'Italy',
      milan: 'Italy',
      rome: 'Italy',
      remote: 'USA',
    };

    for (const [key, code] of Object.entries(countryMappings)) {
      if (normalized.includes(key)) {
        return code;
      }
    }

    return 'USA'; // Default to USA
  }

  /**
   * Map contract type to JobSpy job_type
   */
  private mapContractType(contractType: string): string | null {
    const normalized = contractType.toLowerCase();

    if (normalized.includes('full') || normalized.includes('cdi') || normalized.includes('permanent')) {
      return 'fulltime';
    }
    if (normalized.includes('part')) {
      return 'parttime';
    }
    if (normalized.includes('contract') || normalized.includes('cdd') || normalized.includes('temporary')) {
      return 'contract';
    }
    if (normalized.includes('intern') || normalized.includes('stage')) {
      return 'internship';
    }

    return null;
  }

  /**
   * Map JobSpy job to standard format
   */
  private mapToDiscoveredJob(job: JobSpyJob, criteria: CampaignSearchCriteria): DiscoveredJob {
    // Build salary string
    let salary: string | null = null;
    if (job.min_amount || job.max_amount) {
      const currency = job.currency || 'USD';
      const interval = job.interval || 'yearly';
      if (job.min_amount && job.max_amount) {
        salary = `${job.min_amount.toLocaleString()} - ${job.max_amount.toLocaleString()} ${currency}/${interval}`;
      } else if (job.min_amount) {
        salary = `${job.min_amount.toLocaleString()}+ ${currency}/${interval}`;
      } else if (job.max_amount) {
        salary = `Up to ${job.max_amount.toLocaleString()} ${currency}/${interval}`;
      }
    }

    // Determine remote type
    let remoteType = 'On-site';
    if (job.is_remote) {
      remoteType = 'Remote';
    } else if (job.location?.toLowerCase().includes('hybrid')) {
      remoteType = 'Hybrid';
    } else {
      remoteType = this.determineRemoteType(job.location || null, job.description || '');
    }

    // Normalize contract type
    let contractType: string | null = null;
    if (job.job_type) {
      contractType = this.normalizeContractType(job.job_type);
    }

    // Parse posted date
    let postedAt: Date | undefined;
    if (job.date_posted) {
      try {
        postedAt = new Date(job.date_posted);
        if (isNaN(postedAt.getTime())) {
          postedAt = undefined;
        }
      } catch {
        postedAt = undefined;
      }
    }

    // Extract requirements from description
    const requirements = job.description ? this.extractRequirements(job.description) : [];

    // Generate unique external ID with indeed- prefix for source matching
    const externalId = `indeed-${job.id || this.hashString(job.job_url)}`;

    return {
      externalId,
      title: job.title,
      company: job.company,
      location: job.location || null,
      description: job.description || '',
      requirements,
      salary,
      contractType,
      remoteType,
      url: job.job_url,
      postedAt,
      applicationEmail: job.emails?.[0] || null,
      applicationUrl: job.job_url,
    };
  }

  /**
   * Normalize contract type to standard format
   */
  private normalizeContractType(type: string): string {
    const normalized = type.toLowerCase();

    if (normalized.includes('full') || normalized.includes('permanent')) {
      return 'Full-time';
    }
    if (normalized.includes('part')) {
      return 'Part-time';
    }
    if (normalized.includes('contract') || normalized.includes('temporary')) {
      return 'Contract';
    }
    if (normalized.includes('freelance') || normalized.includes('consultant')) {
      return 'Freelance';
    }
    if (normalized.includes('intern')) {
      return 'Internship';
    }

    return type;
  }

  /**
   * Simple string hash for generating unique IDs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
