import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DiscoveredJob } from './sources';

interface DeduplicationResult {
  uniqueJobs: DiscoveredJob[];
  duplicates: Array<{
    job: DiscoveredJob;
    existingJobId: string;
    matchType: 'url' | 'external_id' | 'fuzzy';
    similarity?: number;
  }>;
  stats: {
    total: number;
    unique: number;
    duplicates: number;
    byMatchType: Record<string, number>;
  };
}

@Injectable()
export class JobDeduplicationService {
  private readonly logger = new Logger(JobDeduplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deduplicate jobs for a campaign
   */
  async deduplicate(
    campaignId: string,
    jobs: DiscoveredJob[],
  ): Promise<DeduplicationResult> {
    const uniqueJobs: DiscoveredJob[] = [];
    const duplicates: DeduplicationResult['duplicates'] = [];
    const matchTypeCounts: Record<string, number> = {};

    // Get existing jobs for this campaign
    const existingJobs = await this.prisma.jobOffer.findMany({
      where: { campaignId },
      select: {
        id: true,
        externalId: true,
        url: true,
        company: true,
        title: true,
        location: true,
      },
    });

    // Build lookup maps for fast matching
    const urlMap = new Map<string, string>();
    const externalIdMap = new Map<string, string>();
    const fuzzyKeys = new Map<string, string>();

    for (const existing of existingJobs) {
      // URL matching (normalize URL)
      const normalizedUrl = this.normalizeUrl(existing.url);
      urlMap.set(normalizedUrl, existing.id);

      // External ID matching
      externalIdMap.set(existing.externalId, existing.id);

      // Fuzzy matching key
      const fuzzyKey = this.createFuzzyKey(
        existing.company,
        existing.title,
        existing.location,
      );
      fuzzyKeys.set(fuzzyKey, existing.id);
    }

    // Track jobs we've already accepted in this batch
    const batchUrls = new Set<string>();
    const batchExternalIds = new Set<string>();
    const batchFuzzyKeys = new Set<string>();

    for (const job of jobs) {
      const normalizedUrl = this.normalizeUrl(job.url);
      const fuzzyKey = this.createFuzzyKey(job.company, job.title, job.location);

      // Check for duplicates (in order of priority)
      let isDuplicate = false;
      let existingJobId: string | undefined;
      let matchType: 'url' | 'external_id' | 'fuzzy' | undefined;

      // 1. Check external ID (most reliable)
      if (externalIdMap.has(job.externalId)) {
        isDuplicate = true;
        existingJobId = externalIdMap.get(job.externalId);
        matchType = 'external_id';
      }
      // 2. Check URL
      else if (urlMap.has(normalizedUrl)) {
        isDuplicate = true;
        existingJobId = urlMap.get(normalizedUrl);
        matchType = 'url';
      }
      // 3. Check fuzzy match
      else if (fuzzyKeys.has(fuzzyKey)) {
        isDuplicate = true;
        existingJobId = fuzzyKeys.get(fuzzyKey);
        matchType = 'fuzzy';
      }
      // 4. Check against current batch
      else if (
        batchExternalIds.has(job.externalId) ||
        batchUrls.has(normalizedUrl) ||
        batchFuzzyKeys.has(fuzzyKey)
      ) {
        isDuplicate = true;
        matchType = 'external_id';
      }

      if (isDuplicate && existingJobId && matchType) {
        duplicates.push({
          job,
          existingJobId,
          matchType,
        });
        matchTypeCounts[matchType] = (matchTypeCounts[matchType] || 0) + 1;
      } else {
        uniqueJobs.push(job);
        batchExternalIds.add(job.externalId);
        batchUrls.add(normalizedUrl);
        batchFuzzyKeys.add(fuzzyKey);
      }
    }

    const result: DeduplicationResult = {
      uniqueJobs,
      duplicates,
      stats: {
        total: jobs.length,
        unique: uniqueJobs.length,
        duplicates: duplicates.length,
        byMatchType: matchTypeCounts,
      },
    };

    if (duplicates.length > 0) {
      this.logger.log(
        `Deduplication: ${jobs.length} jobs -> ${uniqueJobs.length} unique, ${duplicates.length} duplicates`,
      );
    }

    return result;
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove trailing slashes, www prefix, and common tracking parameters
      let normalized = parsed.origin + parsed.pathname;
      normalized = normalized.replace(/\/+$/, '');
      normalized = normalized.replace('://www.', '://');
      normalized = normalized.toLowerCase();

      // Sort and keep only essential query params
      const essentialParams = ['id', 'job', 'slug'];
      const params = new URLSearchParams(parsed.search);
      const filteredParams = new URLSearchParams();

      for (const key of essentialParams) {
        if (params.has(key)) {
          filteredParams.set(key, params.get(key)!);
        }
      }

      const query = filteredParams.toString();
      if (query) {
        normalized += '?' + query;
      }

      return normalized;
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Create a fuzzy matching key from company, title, and location
   */
  private createFuzzyKey(
    company: string,
    title: string,
    location: string | null,
  ): string {
    const normalizedCompany = this.normalizeText(company);
    const normalizedTitle = this.normalizeText(title);
    const normalizedLocation = location ? this.normalizeText(location) : '';

    return `${normalizedCompany}|${normalizedTitle}|${normalizedLocation}`;
  }

  /**
   * Normalize text for fuzzy matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Check if a job has expired based on posting date
   */
  isExpired(job: DiscoveredJob, maxAgeDays = 30): boolean {
    if (!job.postedAt) {
      return false; // Can't determine, assume not expired
    }

    const ageMs = Date.now() - job.postedAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);

    return ageDays > maxAgeDays;
  }

  /**
   * Mark expired jobs in the database
   */
  async markExpiredJobs(campaignId: string, maxAgeDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const result = await this.prisma.jobOffer.updateMany({
      where: {
        campaignId,
        discoveredAt: { lt: cutoffDate },
        status: { in: ['DISCOVERED', 'ANALYZING', 'MATCHED'] },
        expiresAt: null,
      },
      data: {
        status: 'EXPIRED',
        expiresAt: new Date(),
      },
    });

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} jobs as expired for campaign ${campaignId}`);
    }

    return result.count;
  }

  /**
   * Get duplicate statistics for a campaign
   */
  async getDuplicateStats(campaignId: string): Promise<{
    totalJobs: number;
    uniqueUrls: number;
    potentialDuplicates: number;
  }> {
    const jobs = await this.prisma.jobOffer.findMany({
      where: { campaignId },
      select: { url: true, company: true, title: true, location: true },
    });

    const urls = new Set(jobs.map((j) => this.normalizeUrl(j.url)));
    const fuzzyKeys = new Set(
      jobs.map((j) => this.createFuzzyKey(j.company, j.title, j.location)),
    );

    return {
      totalJobs: jobs.length,
      uniqueUrls: urls.size,
      potentialDuplicates: jobs.length - Math.max(urls.size, fuzzyKeys.size),
    };
  }
}
