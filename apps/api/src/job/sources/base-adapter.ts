import { JobSourceType } from '@tripalium/shared';

/**
 * Search criteria derived from campaign settings
 */
export interface CampaignSearchCriteria {
  campaignId: string;
  targetRoles: string[];
  targetLocations: string[];
  contractTypes: string[];
  remoteOk: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
}

/**
 * Standardized job format returned by all adapters
 */
export interface DiscoveredJob {
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  requirements: string[];
  salary: string | null;
  contractType: string | null;
  remoteType: string | null;
  url: string;
  postedAt?: Date;
  applicationEmail?: string | null;
  applicationUrl?: string | null;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  healthy: boolean;
  message?: string;
  lastChecked: Date;
  responseTimeMs?: number;
}

/**
 * Discovery result with metadata
 */
export interface DiscoveryResult {
  jobs: DiscoveredJob[];
  metadata: {
    source: string;
    queryTime: number;
    totalFound: number;
    filtered: number;
    errors?: string[];
  };
}

/**
 * Base interface for all job source adapters
 */
export interface JobSourceAdapter {
  /**
   * Unique identifier for this source (e.g., 'remoteok', 'wttj', 'mock')
   */
  readonly sourceName: string;

  /**
   * Display name shown to users (e.g., 'RemoteOK', 'Welcome to the Jungle')
   */
  readonly displayName: string;

  /**
   * Type of data source
   */
  readonly sourceType: JobSourceType;

  /**
   * Whether this source supports automatic application submission
   */
  readonly supportsAutoApply: boolean;

  /**
   * Discover jobs matching the given criteria
   */
  discoverJobs(criteria: CampaignSearchCriteria): Promise<DiscoveryResult>;

  /**
   * Check if the source is available and responding
   */
  healthCheck(): Promise<HealthCheckResult>;

  /**
   * Get the database ID for this source (set by registry)
   */
  getSourceId(): string | null;

  /**
   * Set the database ID for this source
   */
  setSourceId(id: string): void;
}

/**
 * Abstract base class providing common functionality
 */
export abstract class BaseJobSourceAdapter implements JobSourceAdapter {
  abstract readonly sourceName: string;
  abstract readonly displayName: string;
  abstract readonly sourceType: JobSourceType;
  abstract readonly supportsAutoApply: boolean;

  protected sourceId: string | null = null;

  abstract discoverJobs(criteria: CampaignSearchCriteria): Promise<DiscoveryResult>;
  abstract healthCheck(): Promise<HealthCheckResult>;

  getSourceId(): string | null {
    return this.sourceId;
  }

  setSourceId(id: string): void {
    this.sourceId = id;
  }

  /**
   * Utility: Check if a job title matches target roles
   */
  protected matchesRole(jobTitle: string, targetRoles: string[]): boolean {
    const normalizedTitle = jobTitle.toLowerCase();
    return targetRoles.some((role) => {
      const normalizedRole = role.toLowerCase();
      // Check for common patterns
      return (
        normalizedTitle.includes(normalizedRole) ||
        normalizedRole.includes(normalizedTitle) ||
        this.fuzzyRoleMatch(normalizedTitle, normalizedRole)
      );
    });
  }

  /**
   * Utility: Fuzzy match for role names
   */
  protected fuzzyRoleMatch(title: string, role: string): boolean {
    // Handle common abbreviations and variations
    const roleMap: Record<string, string[]> = {
      frontend: ['front-end', 'front end', 'ui', 'react', 'vue', 'angular'],
      backend: ['back-end', 'back end', 'server', 'api', 'node', 'python', 'java'],
      fullstack: ['full-stack', 'full stack'],
      devops: ['dev ops', 'sre', 'infrastructure', 'platform'],
      data: ['data science', 'machine learning', 'ml', 'ai', 'analytics'],
    };

    for (const [key, variations] of Object.entries(roleMap)) {
      if (role.includes(key)) {
        return variations.some((v) => title.includes(v));
      }
      if (variations.some((v) => role.includes(v))) {
        return title.includes(key) || variations.some((v) => title.includes(v));
      }
    }

    return false;
  }

  /**
   * Utility: Check if a location matches target locations
   */
  protected matchesLocation(
    jobLocation: string | null,
    targetLocations: string[],
    remoteOk: boolean,
  ): boolean {
    // Remote jobs always match if remoteOk is true
    if (remoteOk && this.isRemoteJob(jobLocation)) {
      return true;
    }

    if (!jobLocation) {
      return remoteOk; // Unknown location only matches if remote is OK
    }

    const normalizedJobLocation = jobLocation.toLowerCase();
    return targetLocations.some((target) => {
      const normalizedTarget = target.toLowerCase();
      return (
        normalizedJobLocation.includes(normalizedTarget) ||
        normalizedTarget.includes(normalizedJobLocation)
      );
    });
  }

  /**
   * Utility: Check if a job is remote
   */
  protected isRemoteJob(location: string | null): boolean {
    if (!location) return false;
    const remoteKeywords = ['remote', 'anywhere', 'worldwide', 'work from home', 'wfh'];
    return remoteKeywords.some((kw) => location.toLowerCase().includes(kw));
  }

  /**
   * Utility: Determine remote type from job data
   */
  protected determineRemoteType(location: string | null, description: string): string {
    const combined = `${location || ''} ${description}`.toLowerCase();

    if (combined.includes('fully remote') || combined.includes('100% remote')) {
      return 'Remote';
    }
    if (combined.includes('hybrid')) {
      return 'Hybrid';
    }
    if (
      combined.includes('remote') ||
      combined.includes('anywhere') ||
      combined.includes('worldwide')
    ) {
      return 'Remote';
    }
    if (combined.includes('on-site') || combined.includes('onsite') || combined.includes('office')) {
      return 'On-site';
    }

    return 'Unknown';
  }

  /**
   * Utility: Extract requirements from description
   */
  protected extractRequirements(description: string): string[] {
    const requirements: string[] = [];

    // Common requirement patterns
    const patterns = [
      /requirements?:?\s*\n((?:[-•*]\s*.+\n?)+)/gi,
      /qualifications?:?\s*\n((?:[-•*]\s*.+\n?)+)/gi,
      /what we're looking for:?\s*\n((?:[-•*]\s*.+\n?)+)/gi,
      /skills:?\s*\n((?:[-•*]\s*.+\n?)+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        const lines = match[1].split('\n');
        for (const line of lines) {
          const cleaned = line.replace(/^[-•*]\s*/, '').trim();
          if (cleaned && cleaned.length > 3 && !requirements.includes(cleaned)) {
            requirements.push(cleaned);
          }
        }
      }
    }

    // If no structured requirements found, extract key skills from text
    if (requirements.length === 0) {
      const techKeywords = [
        'JavaScript',
        'TypeScript',
        'Python',
        'Java',
        'Go',
        'Rust',
        'React',
        'Vue',
        'Angular',
        'Node.js',
        'PostgreSQL',
        'MongoDB',
        'Redis',
        'AWS',
        'GCP',
        'Azure',
        'Docker',
        'Kubernetes',
        'CI/CD',
        'Git',
        'REST',
        'GraphQL',
        'SQL',
        'NoSQL',
      ];

      for (const keyword of techKeywords) {
        if (description.toLowerCase().includes(keyword.toLowerCase())) {
          requirements.push(keyword);
        }
      }
    }

    return requirements.slice(0, 15); // Limit to 15 requirements
  }
}
