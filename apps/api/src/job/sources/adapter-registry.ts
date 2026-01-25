import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JobSourceAdapter, DiscoveryResult, CampaignSearchCriteria } from './base-adapter';
import { JobSourceType } from '@tripalium/shared';

export interface AggregatedDiscoveryResult {
  jobs: DiscoveryResult['jobs'];
  metadata: {
    totalSources: number;
    successfulSources: number;
    failedSources: string[];
    totalJobs: number;
    queryTimeMs: number;
    sourceResults: Array<{
      source: string;
      jobCount: number;
      queryTimeMs: number;
      error?: string;
    }>;
  };
}

@Injectable()
export class AdapterRegistry implements OnModuleInit {
  private readonly logger = new Logger(AdapterRegistry.name);
  private adapters: Map<string, JobSourceAdapter> = new Map();
  private initialized = false;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initializeAdapters();
  }

  /**
   * Register an adapter with the registry
   */
  registerAdapter(adapter: JobSourceAdapter): void {
    this.adapters.set(adapter.sourceName, adapter);
    this.logger.log(`Registered adapter: ${adapter.sourceName} (${adapter.displayName})`);
  }

  /**
   * Get a specific adapter by name
   */
  getAdapter(sourceName: string): JobSourceAdapter | undefined {
    return this.adapters.get(sourceName);
  }

  /**
   * Get all registered adapters
   */
  getAllAdapters(): JobSourceAdapter[] {
    return Array.from(this.adapters.values());
  }

  /**
   * Get adapters by type
   */
  getAdaptersByType(type: JobSourceType): JobSourceAdapter[] {
    return Array.from(this.adapters.values()).filter((a) => a.sourceType === type);
  }

  /**
   * Get active adapters (those with database records)
   */
  getActiveAdapters(): JobSourceAdapter[] {
    return Array.from(this.adapters.values()).filter((a) => a.getSourceId() !== null);
  }

  /**
   * Initialize adapters by syncing with database sources
   */
  private async initializeAdapters(): Promise<void> {
    if (this.initialized) return;

    // Get all active job sources from database
    const sources = await this.prisma.jobSource.findMany({
      where: { isActive: true },
    });

    // Match adapters with database sources
    for (const source of sources) {
      const adapter = this.adapters.get(source.name);
      if (adapter) {
        adapter.setSourceId(source.id);
        this.logger.log(`Linked adapter ${source.name} to database source ${source.id}`);
      } else {
        this.logger.warn(
          `Database source ${source.name} (${source.displayName}) has no registered adapter`,
        );
      }
    }

    // Check for adapters without database sources
    for (const adapter of this.adapters.values()) {
      if (!adapter.getSourceId()) {
        this.logger.warn(
          `Adapter ${adapter.sourceName} has no database source - will be created on first use`,
        );
      }
    }

    this.initialized = true;
    this.logger.log(`Adapter registry initialized with ${this.adapters.size} adapters`);
  }

  /**
   * Ensure an adapter has a database source record
   */
  async ensureSourceExists(adapter: JobSourceAdapter): Promise<string> {
    if (adapter.getSourceId()) {
      return adapter.getSourceId()!;
    }

    // Create the source in database
    const source = await this.prisma.jobSource.upsert({
      where: { name: adapter.sourceName },
      update: {},
      create: {
        name: adapter.sourceName,
        displayName: adapter.displayName,
        type: adapter.sourceType,
        supportsAutoApply: adapter.supportsAutoApply,
        isActive: true,
      },
    });

    adapter.setSourceId(source.id);
    this.logger.log(`Created database source for adapter ${adapter.sourceName}: ${source.id}`);

    return source.id;
  }

  /**
   * Discover jobs from a specific source
   */
  async discoverFromSource(
    sourceName: string,
    criteria: CampaignSearchCriteria,
  ): Promise<DiscoveryResult> {
    const adapter = this.adapters.get(sourceName);
    if (!adapter) {
      throw new Error(`No adapter registered for source: ${sourceName}`);
    }

    await this.ensureSourceExists(adapter);
    return adapter.discoverJobs(criteria);
  }

  /**
   * Discover jobs from multiple sources
   */
  async discoverFromSources(
    sourceNames: string[],
    criteria: CampaignSearchCriteria,
  ): Promise<AggregatedDiscoveryResult> {
    const startTime = Date.now();
    const results: AggregatedDiscoveryResult = {
      jobs: [],
      metadata: {
        totalSources: sourceNames.length,
        successfulSources: 0,
        failedSources: [],
        totalJobs: 0,
        queryTimeMs: 0,
        sourceResults: [],
      },
    };

    // Run all adapters in parallel
    const promises = sourceNames.map(async (sourceName) => {
      const sourceStartTime = Date.now();
      try {
        const result = await this.discoverFromSource(sourceName, criteria);
        return {
          sourceName,
          success: true,
          result,
          queryTimeMs: Date.now() - sourceStartTime,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to discover from ${sourceName}: ${errorMessage}`);
        return {
          sourceName,
          success: false,
          error: errorMessage,
          queryTimeMs: Date.now() - sourceStartTime,
        };
      }
    });

    const sourceResults = await Promise.all(promises);

    // Aggregate results
    for (const sr of sourceResults) {
      if (sr.success && sr.result) {
        results.jobs.push(...sr.result.jobs);
        results.metadata.successfulSources++;
        results.metadata.sourceResults.push({
          source: sr.sourceName,
          jobCount: sr.result.jobs.length,
          queryTimeMs: sr.queryTimeMs,
        });
      } else {
        results.metadata.failedSources.push(sr.sourceName);
        results.metadata.sourceResults.push({
          source: sr.sourceName,
          jobCount: 0,
          queryTimeMs: sr.queryTimeMs,
          error: sr.error,
        });
      }
    }

    results.metadata.totalJobs = results.jobs.length;
    results.metadata.queryTimeMs = Date.now() - startTime;

    return results;
  }

  /**
   * Discover jobs from all active adapters
   */
  async discoverFromAllSources(criteria: CampaignSearchCriteria): Promise<AggregatedDiscoveryResult> {
    const activeAdapters = this.getActiveAdapters();
    const sourceNames = activeAdapters.map((a) => a.sourceName);

    if (sourceNames.length === 0) {
      this.logger.warn('No active adapters available for job discovery');
      return {
        jobs: [],
        metadata: {
          totalSources: 0,
          successfulSources: 0,
          failedSources: [],
          totalJobs: 0,
          queryTimeMs: 0,
          sourceResults: [],
        },
      };
    }

    return this.discoverFromSources(sourceNames, criteria);
  }

  /**
   * Run health checks on all adapters
   */
  async healthCheckAll(): Promise<Record<string, { healthy: boolean; message?: string }>> {
    const results: Record<string, { healthy: boolean; message?: string }> = {};

    const promises = Array.from(this.adapters.entries()).map(async ([name, adapter]) => {
      try {
        const health = await adapter.healthCheck();
        return { name, health };
      } catch (error) {
        return {
          name,
          health: {
            healthy: false,
            message: error instanceof Error ? error.message : 'Health check failed',
            lastChecked: new Date(),
          },
        };
      }
    });

    const healthResults = await Promise.all(promises);

    for (const { name, health } of healthResults) {
      results[name] = { healthy: health.healthy, message: health.message };
    }

    return results;
  }
}
