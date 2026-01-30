import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { QueueService } from '../queue/queue.service';
import { BillingService } from '../billing/billing.service';
import { ActionType, CampaignStatus, UsageAction, PlanTier, PLAN_LIMITS } from '@tripalium/shared';

interface CreateCampaignData {
  name: string;
  targetRoles: string[];
  targetLocations: string[];
  contractTypes?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  remoteOk?: boolean;
  matchThreshold?: number;
  testMode?: boolean;
  autoApply?: boolean;
  jobSourceIds?: string[];
  maxApplications?: number;
  anonymizeApplications?: boolean;
}

@Injectable()
export class CampaignService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly queueService: QueueService,
    private readonly billingService: BillingService,
  ) {}

  async createCampaign(userId: string, data: CreateCampaignData) {
    // Check entitlement
    const entitlement = await this.billingService.checkEntitlement(userId, UsageAction.CAMPAIGN_CREATE);
    if (!entitlement.allowed) {
      throw new ForbiddenException(entitlement.reason);
    }

    // Enforce plan restrictions
    const userPlan = await this.billingService.getUserPlan(userId);
    const limits = userPlan.limits;
    if (limits.practiceModeForcedOn) {
      data.testMode = true;
      data.autoApply = false;
    }
    if (!limits.autoApplyEnabled) {
      data.autoApply = false;
    }

    // Safety validation: Block autoApply in production mode (testMode=false)
    if (data.autoApply && data.testMode === false) {
      throw new BadRequestException(
        'Auto-apply is not allowed in production mode. Enable practice mode or disable auto-apply.',
      );
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        userId,
        name: data.name,
        status: CampaignStatus.DRAFT,
        targetRoles: data.targetRoles,
        targetLocations: data.targetLocations,
        contractTypes: data.contractTypes || [],
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency || 'EUR',
        remoteOk: data.remoteOk ?? true,
        matchThreshold: data.matchThreshold || 60,
        testMode: data.testMode ?? false,
        autoApply: data.autoApply ?? false,
        maxApplications: data.maxApplications ?? 50,
        anonymizeApplications: data.anonymizeApplications ?? false,
      },
    });

    // Add job sources if specified
    if (data.jobSourceIds?.length) {
      await this.prisma.campaignJobSource.createMany({
        data: data.jobSourceIds.map((sourceId) => ({
          campaignId: campaign.id,
          sourceId,
        })),
      });
    }

    // Record billing usage
    await this.billingService.recordUsage(userId, UsageAction.CAMPAIGN_CREATE, campaign.id);

    // Log with isSensitive=true for production campaigns
    const isProductionCampaign = data.testMode === false;
    if (isProductionCampaign) {
      await this.logService.logSensitive({
        userId,
        entityType: 'campaign',
        entityId: campaign.id,
        action: ActionType.CAMPAIGN_CREATED,
        metadata: { name: data.name, testMode: false },
      });
    } else {
      await this.logService.log({
        userId,
        entityType: 'campaign',
        entityId: campaign.id,
        action: ActionType.CAMPAIGN_CREATED,
        metadata: { name: data.name },
      });
    }

    return campaign;
  }

  async getCampaign(campaignId: string, userId: string) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        jobSources: {
          include: { source: true },
        },
        _count: {
          select: {
            jobOffers: true,
            applications: true,
          },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return campaign;
  }

  async listCampaigns(userId: string) {
    return this.prisma.campaign.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            jobOffers: true,
            applications: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateCampaign(
    campaignId: string,
    userId: string,
    data: Partial<CreateCampaignData>,
  ) {
    const campaign = await this.getCampaign(campaignId, userId);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot update active campaign');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        name: data.name,
        targetRoles: data.targetRoles,
        targetLocations: data.targetLocations,
        contractTypes: data.contractTypes,
        salaryMin: data.salaryMin,
        salaryMax: data.salaryMax,
        salaryCurrency: data.salaryCurrency,
        remoteOk: data.remoteOk,
        matchThreshold: data.matchThreshold,
        testMode: data.testMode,
        autoApply: data.autoApply,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'campaign',
      entityId: campaignId,
      action: ActionType.CAMPAIGN_UPDATED,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }

  async startCampaign(campaignId: string, userId: string) {
    const campaign = await this.getCampaign(campaignId, userId);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign already active');
    }

    // Check active campaign limit
    const entitlement = await this.billingService.checkEntitlement(userId, UsageAction.CAMPAIGN_ACTIVATE);
    if (!entitlement.allowed) {
      throw new ForbiddenException(entitlement.reason);
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.ACTIVE,
        startedAt: new Date(),
      },
    });

    await this.logService.log({
      userId,
      entityType: 'campaign',
      entityId: campaignId,
      action: ActionType.CAMPAIGN_STARTED,
      testMode: campaign.testMode,
    });

    // Queue initial job discovery
    await this.queueService.addJob({
      type: 'job.discover',
      data: { campaignId },
      userId,
      testMode: campaign.testMode,
    });

    return updated;
  }

  async pauseCampaign(campaignId: string, userId: string) {
    const campaign = await this.getCampaign(campaignId, userId);

    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign not active');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.PAUSED,
        pausedAt: new Date(),
      },
    });

    await this.logService.log({
      userId,
      entityType: 'campaign',
      entityId: campaignId,
      action: ActionType.CAMPAIGN_PAUSED,
    });

    return updated;
  }

  async stopCampaign(campaignId: string, userId: string) {
    const campaign = await this.getCampaign(campaignId, userId);

    if (
      campaign.status !== CampaignStatus.ACTIVE &&
      campaign.status !== CampaignStatus.PAUSED
    ) {
      throw new BadRequestException('Campaign not running');
    }

    const updated = await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: CampaignStatus.COMPLETED,
        stoppedAt: new Date(),
      },
    });

    await this.logService.log({
      userId,
      entityType: 'campaign',
      entityId: campaignId,
      action: ActionType.CAMPAIGN_STOPPED,
    });

    return updated;
  }

  async deleteCampaign(campaignId: string, userId: string) {
    const campaign = await this.getCampaign(campaignId, userId);

    if (campaign.status === CampaignStatus.ACTIVE) {
      throw new BadRequestException('Cannot delete active campaign');
    }

    await this.prisma.campaign.delete({
      where: { id: campaignId },
    });

    return { success: true };
  }
}
