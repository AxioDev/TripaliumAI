// =============================================================================
// Campaign Seeder - Creates demo campaigns
// =============================================================================

import { PrismaClient, CampaignStatus } from '@prisma/client';
import {
  DEMO_USER_ID,
  DEMO_CAMPAIGN_COMPLETED_ID,
  DEMO_CAMPAIGN_ACTIVE_ID,
  DEMO_CAMPAIGN_DRAFT_ID,
  MATCH_THRESHOLDS,
} from '../config';
import { daysAgo, demoId } from '../utils';

interface CampaignData {
  id: string;
  name: string;
  status: CampaignStatus;
  targetRoles: string[];
  targetLocations: string[];
  contractTypes: string[];
  salaryMin: number;
  salaryMax: number;
  matchThreshold: number;
  testMode: boolean;
  autoApply: boolean;
  startedAt?: Date;
  pausedAt?: Date;
  stoppedAt?: Date;
  createdAt: Date;
}

const campaigns: CampaignData[] = [
  // Campaign 1: COMPLETED - Senior React Developer Paris
  {
    id: DEMO_CAMPAIGN_COMPLETED_ID,
    name: 'Senior React Developer - Paris',
    status: CampaignStatus.COMPLETED,
    targetRoles: ['Senior Frontend Developer', 'Senior React Developer', 'Frontend Engineer', 'Lead Frontend'],
    targetLocations: ['Paris, France', 'Île-de-France'],
    contractTypes: ['CDI'],
    salaryMin: 65000,
    salaryMax: 85000,
    matchThreshold: MATCH_THRESHOLDS.completed,
    testMode: false,
    autoApply: false,
    startedAt: daysAgo(21),
    stoppedAt: daysAgo(3),
    createdAt: daysAgo(21),
  },

  // Campaign 2: ACTIVE - Full-Stack Opportunities
  {
    id: DEMO_CAMPAIGN_ACTIVE_ID,
    name: 'Full-Stack Opportunities',
    status: CampaignStatus.ACTIVE,
    targetRoles: ['Full-Stack Developer', 'Full-Stack Engineer', 'Senior Full-Stack', 'Tech Lead'],
    targetLocations: ['Paris, France', 'Remote', 'France'],
    contractTypes: ['CDI'],
    salaryMin: 70000,
    salaryMax: 95000,
    matchThreshold: MATCH_THRESHOLDS.active,
    testMode: false,
    autoApply: false,
    startedAt: daysAgo(4),
    createdAt: daysAgo(4),
  },

  // Campaign 3: DRAFT - Tech Lead Positions (test mode)
  {
    id: DEMO_CAMPAIGN_DRAFT_ID,
    name: 'Tech Lead Positions',
    status: CampaignStatus.DRAFT,
    targetRoles: ['Tech Lead', 'Engineering Manager', 'Staff Engineer', 'Principal Engineer'],
    targetLocations: ['Paris, France', 'Remote'],
    contractTypes: ['CDI'],
    salaryMin: 90000,
    salaryMax: 120000,
    matchThreshold: MATCH_THRESHOLDS.draft,
    testMode: true, // Practice mode enabled
    autoApply: false,
    createdAt: daysAgo(1),
  },
];

export async function seedCampaigns(prisma: PrismaClient): Promise<void> {
  console.log('Seeding demo campaigns...');

  // Get the WTTJ job source for linking
  const wttjSource = await prisma.jobSource.findUnique({
    where: { name: 'wttj' },
  });

  const mockSource = await prisma.jobSource.findUnique({
    where: { name: 'mock' },
  });

  for (const campaign of campaigns) {
    await prisma.campaign.upsert({
      where: { id: campaign.id },
      update: {
        name: campaign.name,
        status: campaign.status,
        targetRoles: campaign.targetRoles,
        targetLocations: campaign.targetLocations,
        contractTypes: campaign.contractTypes,
        salaryMin: campaign.salaryMin,
        salaryMax: campaign.salaryMax,
        salaryCurrency: 'EUR',
        matchThreshold: campaign.matchThreshold,
        testMode: campaign.testMode,
        autoApply: campaign.autoApply,
        remoteOk: true,
        startedAt: campaign.startedAt,
        pausedAt: campaign.pausedAt,
        stoppedAt: campaign.stoppedAt,
      },
      create: {
        id: campaign.id,
        userId: DEMO_USER_ID,
        name: campaign.name,
        status: campaign.status,
        targetRoles: campaign.targetRoles,
        targetLocations: campaign.targetLocations,
        contractTypes: campaign.contractTypes,
        salaryMin: campaign.salaryMin,
        salaryMax: campaign.salaryMax,
        salaryCurrency: 'EUR',
        matchThreshold: campaign.matchThreshold,
        testMode: campaign.testMode,
        autoApply: campaign.autoApply,
        remoteOk: true,
        startedAt: campaign.startedAt,
        pausedAt: campaign.pausedAt,
        stoppedAt: campaign.stoppedAt,
        createdAt: campaign.createdAt,
      },
    });

    // Link job sources to campaigns (except draft)
    if (campaign.status !== CampaignStatus.DRAFT && wttjSource) {
      await prisma.campaignJobSource.upsert({
        where: {
          campaignId_sourceId: {
            campaignId: campaign.id,
            sourceId: wttjSource.id,
          },
        },
        update: {},
        create: {
          id: demoId('campaign_source', `${campaign.id}_wttj`),
          campaignId: campaign.id,
          sourceId: wttjSource.id,
          isActive: true,
        },
      });
    }

    // Link mock source to draft campaign for testing
    if (campaign.status === CampaignStatus.DRAFT && mockSource) {
      await prisma.campaignJobSource.upsert({
        where: {
          campaignId_sourceId: {
            campaignId: campaign.id,
            sourceId: mockSource.id,
          },
        },
        update: {},
        create: {
          id: demoId('campaign_source', `${campaign.id}_mock`),
          campaignId: campaign.id,
          sourceId: mockSource.id,
          isActive: true,
        },
      });
    }

    console.log(`  Created campaign: ${campaign.name} (${campaign.status})`);
  }
}
