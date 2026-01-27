import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ActionType, JobOfferStatus } from '@tripalium/shared';
import { AdapterRegistry, CampaignSearchCriteria, DiscoveredJob } from './sources';
import { JobDeduplicationService } from './job-deduplication.service';

@Injectable()
export class JobDiscoveryService implements OnModuleInit {
  private readonly logger = new Logger(JobDiscoveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly queueService: QueueService,
    private readonly adapterRegistry: AdapterRegistry,
    private readonly deduplicationService: JobDeduplicationService,
    private readonly realtimeService: RealtimeService,
  ) {}

  onModuleInit() {
    this.queueService.registerHandler('job.discover', this.handleDiscoverJob.bind(this));
  }

  async handleDiscoverJob(job: Job<JobPayload>) {
    const { campaignId } = job.data.data as { campaignId: string };
    const testMode = job.data.testMode ?? false;

    // Get campaign with user and job sources
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        user: true,
        jobSources: { include: { source: true } },
      },
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await this.logService.log({
      userId: campaign.userId,
      entityType: 'campaign',
      entityId: campaignId,
      action: ActionType.JOB_DISCOVERY_STARTED,
      testMode,
    });

    // Emit discovery started event
    this.realtimeService.jobDiscoveryStarted(
      campaign.userId,
      campaignId,
      campaign.name,
    );

    try {
      // Build search criteria from campaign
      const criteria: CampaignSearchCriteria = {
        campaignId: campaign.id,
        targetRoles: campaign.targetRoles,
        targetLocations: campaign.targetLocations,
        contractTypes: campaign.contractTypes,
        remoteOk: campaign.remoteOk,
        salaryMin: campaign.salaryMin || undefined,
        salaryMax: campaign.salaryMax || undefined,
        salaryCurrency: campaign.salaryCurrency || undefined,
      };

      // Determine which sources to use
      const sourceNames = campaign.jobSources.length > 0
        ? campaign.jobSources.map((js) => js.source.name)
        : this.adapterRegistry.getActiveAdapters().map((a) => a.sourceName);

      if (sourceNames.length === 0) {
        this.logger.warn(`No job sources available for campaign ${campaignId}`);
        await this.logService.log({
          userId: campaign.userId,
          entityType: 'campaign',
          entityId: campaignId,
          action: ActionType.JOB_DISCOVERY_COMPLETED,
          metadata: { jobsFound: 0, newJobs: 0, noSources: true },
          testMode,
        });
        return { jobsFound: 0, newJobs: 0 };
      }

      this.logger.log(
        `Discovering jobs for campaign ${campaignId} from sources: ${sourceNames.join(', ')}`,
      );

      // Discover jobs from all configured sources
      const result = await this.adapterRegistry.discoverFromSources(sourceNames, criteria);

      this.logger.log(
        `Discovery completed: ${result.metadata.totalJobs} jobs from ${result.metadata.successfulSources}/${result.metadata.totalSources} sources`,
      );

      if (result.metadata.failedSources.length > 0) {
        this.logger.warn(`Failed sources: ${result.metadata.failedSources.join(', ')}`);
      }

      // Filter out expired jobs
      const nonExpiredJobs = result.jobs.filter(
        (job) => !this.deduplicationService.isExpired(job),
      );

      // Deduplicate jobs (checks external ID, URL, and fuzzy match)
      const dedupResult = await this.deduplicationService.deduplicate(
        campaignId,
        nonExpiredJobs,
      );

      const newJobs = dedupResult.uniqueJobs;

      if (newJobs.length === 0) {
        await this.logService.log({
          userId: campaign.userId,
          entityType: 'campaign',
          entityId: campaignId,
          action: ActionType.JOB_DISCOVERY_COMPLETED,
          metadata: {
            jobsFound: result.jobs.length,
            newJobs: 0,
            duplicates: dedupResult.stats.duplicates,
            expired: result.jobs.length - nonExpiredJobs.length,
            sources: result.metadata.sourceResults,
          },
          testMode,
        });
        return { jobsFound: result.jobs.length, newJobs: 0 };
      }

      // Get source IDs for the discovered jobs
      const sourceIdMap = await this.getSourceIdMap(newJobs);

      // Create job offers
      await this.prisma.jobOffer.createMany({
        data: newJobs.map((job) => ({
          campaignId,
          jobSourceId: sourceIdMap.get(job.externalId) || sourceIdMap.values().next().value,
          externalId: job.externalId,
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          requirements: job.requirements,
          salary: job.salary,
          contractType: job.contractType,
          remoteType: job.remoteType,
          url: job.url,
          status: JobOfferStatus.DISCOVERED,
          discoveredAt: job.postedAt || new Date(),
        })),
      });

      // Get created job IDs
      const createdJobs = await this.prisma.jobOffer.findMany({
        where: {
          campaignId,
          externalId: { in: newJobs.map((j) => j.externalId) },
        },
        select: { id: true },
      });

      // Queue analysis jobs and emit discovered events
      for (const createdJob of createdJobs) {
        await this.queueService.addJob({
          type: 'job.analyze',
          data: { jobId: createdJob.id, campaignId },
          userId: campaign.userId,
          testMode,
        });
      }

      // Emit job discovered events for each new job
      const createdJobsWithDetails = await this.prisma.jobOffer.findMany({
        where: { id: { in: createdJobs.map((j) => j.id) } },
        select: { id: true, title: true, company: true, location: true },
      });

      for (const job of createdJobsWithDetails) {
        this.realtimeService.jobDiscovered(campaign.userId, campaignId, {
          id: job.id,
          title: job.title,
          company: job.company,
          location: job.location || undefined,
        });
      }

      await this.logService.log({
        userId: campaign.userId,
        entityType: 'campaign',
        entityId: campaignId,
        action: ActionType.JOB_DISCOVERY_COMPLETED,
        metadata: {
          jobsFound: result.jobs.length,
          newJobs: newJobs.length,
          duplicates: dedupResult.stats.duplicates,
          duplicatesByType: dedupResult.stats.byMatchType,
          expired: result.jobs.length - nonExpiredJobs.length,
          sources: result.metadata.sourceResults,
          queryTimeMs: result.metadata.queryTimeMs,
        },
        testMode,
      });

      // Emit discovery completed event
      this.realtimeService.jobDiscoveryCompleted(campaign.userId, campaignId, {
        jobsFound: result.jobs.length,
        newJobs: newJobs.length,
        matchedJobs: 0, // Will be updated as jobs are analyzed
      });

      return {
        jobsFound: result.jobs.length,
        newJobs: newJobs.length,
        duplicates: dedupResult.stats.duplicates,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.logService.log({
        userId: campaign.userId,
        entityType: 'campaign',
        entityId: campaignId,
        action: ActionType.JOB_DISCOVERY_FAILED,
        status: 'failure',
        errorMessage,
        testMode,
      });

      throw error;
    }
  }

  /**
   * Build a map of externalId -> sourceId for jobs
   */
  private async getSourceIdMap(jobs: DiscoveredJob[]): Promise<Map<string, string>> {
    const sourceIdMap = new Map<string, string>();

    // Get unique source names from job external IDs
    const sourceNames = new Set<string>();
    for (const job of jobs) {
      // Extract source name from external ID prefix (e.g., "mock-...", "remoteok-...")
      const sourceName = job.externalId.split('-')[0];
      sourceNames.add(sourceName);
    }

    // Get source IDs from database
    const sources = await this.prisma.jobSource.findMany({
      where: { name: { in: Array.from(sourceNames) } },
      select: { id: true, name: true },
    });

    const sourceNameToId = new Map(sources.map((s) => [s.name, s.id]));

    // Map each job to its source ID
    for (const job of jobs) {
      const sourceName = job.externalId.split('-')[0];
      const sourceId = sourceNameToId.get(sourceName);
      if (sourceId) {
        sourceIdMap.set(job.externalId, sourceId);
      }
    }

    return sourceIdMap;
  }
}
