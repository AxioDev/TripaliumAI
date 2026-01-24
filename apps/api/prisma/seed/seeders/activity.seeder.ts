// =============================================================================
// Activity Seeder - Creates demo action logs for timeline
// =============================================================================

import { PrismaClient, Prisma } from '@prisma/client';
import {
  DEMO_USER_ID,
  DEMO_PROFILE_ID,
  DEMO_CAMPAIGN_COMPLETED_ID,
  DEMO_CAMPAIGN_ACTIVE_ID,
  DEMO_CAMPAIGN_DRAFT_ID,
  DEMO_CV_PARSED_ID,
  DEMO_CV_PROCESSING_ID,
} from '../config';
import { daysAgo, addRandomHours, demoId } from '../utils';

interface ActionLogEntry {
  entityType: string;
  entityId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  daysAgo: number;
  hoursOffset?: number;
}

// Generate the activity timeline (approximately 50 entries)
function generateActivityTimeline(): ActionLogEntry[] {
  const activities: ActionLogEntry[] = [];

  // Week 1: Profile and first campaign setup (21-14 days ago)

  // Day 21: Account created, profile setup
  activities.push({
    entityType: 'user',
    entityId: DEMO_USER_ID,
    action: 'user.created',
    metadata: { email: 'marie.dupont@demo.tripalium.ai' },
    daysAgo: 21,
    hoursOffset: 0,
  });

  activities.push({
    entityType: 'profile',
    entityId: DEMO_PROFILE_ID,
    action: 'profile.created',
    metadata: { name: 'Marie Dupont' },
    daysAgo: 21,
    hoursOffset: 0.5,
  });

  activities.push({
    entityType: 'cv',
    entityId: DEMO_CV_PARSED_ID,
    action: 'cv.uploaded',
    metadata: { fileName: 'CV_Marie_Dupont_2024.pdf' },
    daysAgo: 21,
    hoursOffset: 1,
  });

  activities.push({
    entityType: 'cv',
    entityId: DEMO_CV_PARSED_ID,
    action: 'cv.parsing_started',
    daysAgo: 21,
    hoursOffset: 1.1,
  });

  activities.push({
    entityType: 'cv',
    entityId: DEMO_CV_PARSED_ID,
    action: 'cv.parsing_completed',
    metadata: { extractedSkills: 16, extractedExperiences: 4 },
    daysAgo: 21,
    hoursOffset: 1.5,
  });

  activities.push({
    entityType: 'profile',
    entityId: DEMO_PROFILE_ID,
    action: 'profile.updated',
    metadata: { fieldsUpdated: ['skills', 'workExperiences', 'education'] },
    daysAgo: 21,
    hoursOffset: 2,
  });

  // First campaign created and started
  activities.push({
    entityType: 'campaign',
    entityId: DEMO_CAMPAIGN_COMPLETED_ID,
    action: 'campaign.created',
    metadata: { name: 'Senior React Developer - Paris' },
    daysAgo: 21,
    hoursOffset: 3,
  });

  activities.push({
    entityType: 'campaign',
    entityId: DEMO_CAMPAIGN_COMPLETED_ID,
    action: 'campaign.started',
    metadata: { targetRoles: ['Senior React Developer', 'Frontend Engineer'] },
    daysAgo: 21,
    hoursOffset: 3.5,
  });

  // Jobs discovered over the first few days
  const completedCampaignCompanies = [
    'Doctolib', 'Datadog', 'BlaBlaCar', 'Swile', 'Mirakl',
    'ContentSquare', 'Alan', 'Qonto', 'ManoMano', 'PayFit',
    'Ledger', 'Back Market',
  ];

  completedCampaignCompanies.forEach((company, index) => {
    const dayOffset = 20 - Math.floor(index / 2);
    activities.push({
      entityType: 'job_offer',
      action: 'job.discovered',
      metadata: { company, campaign: 'Senior React Developer - Paris' },
      daysAgo: dayOffset,
      hoursOffset: (index % 6) * 2,
    });

    activities.push({
      entityType: 'job_offer',
      action: 'job.analyzed',
      metadata: { company, matchScore: [92, 88, 85, 80, 82, 78, 75, 72, 74, 68, 45, 55][index] },
      daysAgo: dayOffset,
      hoursOffset: (index % 6) * 2 + 1,
    });
  });

  // Week 2: Applications created and processed (14-7 days ago)

  // Application activities
  activities.push({
    entityType: 'application',
    action: 'application.created',
    metadata: { company: 'Doctolib', role: 'Senior Frontend Engineer' },
    daysAgo: 14,
    hoursOffset: 2,
  });

  activities.push({
    entityType: 'application',
    action: 'documents.generated',
    metadata: { company: 'Doctolib', documents: ['CV', 'Cover Letter'] },
    daysAgo: 14,
    hoursOffset: 3,
  });

  activities.push({
    entityType: 'application',
    action: 'application.confirmed',
    metadata: { company: 'Doctolib' },
    daysAgo: 14,
    hoursOffset: 10,
  });

  activities.push({
    entityType: 'application',
    action: 'application.submitted',
    metadata: { company: 'Doctolib', method: 'email' },
    daysAgo: 13,
    hoursOffset: 2,
  });

  // More applications
  activities.push({
    entityType: 'application',
    action: 'application.created',
    metadata: { company: 'Datadog', role: 'Lead React Developer' },
    daysAgo: 12,
    hoursOffset: 4,
  });

  activities.push({
    entityType: 'application',
    action: 'documents.generated',
    metadata: { company: 'Datadog', documents: ['CV', 'Cover Letter'] },
    daysAgo: 12,
    hoursOffset: 5,
  });

  activities.push({
    entityType: 'application',
    action: 'application.created',
    metadata: { company: 'BlaBlaCar', role: 'Senior Full-Stack Engineer' },
    daysAgo: 10,
    hoursOffset: 3,
  });

  activities.push({
    entityType: 'application',
    action: 'documents.generated',
    metadata: { company: 'BlaBlaCar', documents: ['CV', 'Cover Letter'] },
    daysAgo: 10,
    hoursOffset: 4,
  });

  activities.push({
    entityType: 'application',
    action: 'application.created',
    metadata: { company: 'Swile', role: 'Senior React Developer' },
    daysAgo: 8,
    hoursOffset: 2,
  });

  activities.push({
    entityType: 'application',
    action: 'application.submitted',
    metadata: { company: 'Swile', method: 'external' },
    daysAgo: 8,
    hoursOffset: 8,
  });

  // User rejections
  activities.push({
    entityType: 'job_offer',
    action: 'job.rejected',
    metadata: { company: 'ContentSquare', reason: 'user_decision', note: 'Not a good culture fit' },
    daysAgo: 9,
    hoursOffset: 5,
  });

  activities.push({
    entityType: 'job_offer',
    action: 'job.rejected',
    metadata: { company: 'PayFit', reason: 'user_decision', note: 'Salary below expectations' },
    daysAgo: 9,
    hoursOffset: 6,
  });

  // Application withdrawn
  activities.push({
    entityType: 'application',
    action: 'application.withdrawn',
    metadata: { company: 'Qonto', reason: 'Found better opportunity' },
    daysAgo: 7,
    hoursOffset: 4,
  });

  // Week 3: Campaign completed, new campaign started (7 days ago → now)

  activities.push({
    entityType: 'campaign',
    entityId: DEMO_CAMPAIGN_COMPLETED_ID,
    action: 'campaign.completed',
    metadata: { name: 'Senior React Developer - Paris', jobsFound: 12, applicationsSubmitted: 2 },
    daysAgo: 3,
    hoursOffset: 2,
  });

  // New campaign
  activities.push({
    entityType: 'campaign',
    entityId: DEMO_CAMPAIGN_ACTIVE_ID,
    action: 'campaign.created',
    metadata: { name: 'Full-Stack Opportunities' },
    daysAgo: 4,
    hoursOffset: 0,
  });

  activities.push({
    entityType: 'campaign',
    entityId: DEMO_CAMPAIGN_ACTIVE_ID,
    action: 'campaign.started',
    metadata: { targetRoles: ['Full-Stack Developer', 'Tech Lead'] },
    daysAgo: 4,
    hoursOffset: 1,
  });

  // New jobs discovered
  const activeCampaignCompanies = ['Algolia', 'Criteo', 'Spendesk', 'Aircall', 'Pennylane', 'GitGuardian', 'AB Tasty', 'Akeneo'];
  activeCampaignCompanies.forEach((company, index) => {
    activities.push({
      entityType: 'job_offer',
      action: 'job.discovered',
      metadata: { company, campaign: 'Full-Stack Opportunities' },
      daysAgo: 3 - Math.floor(index / 3),
      hoursOffset: (index % 8) * 3,
    });
  });

  // Some analyzed
  ['Spendesk', 'Aircall', 'Pennylane'].forEach((company, index) => {
    activities.push({
      entityType: 'job_offer',
      action: 'job.analyzed',
      metadata: { company, matchScore: [85, 82, 79][index] },
      daysAgo: 2,
      hoursOffset: index * 2,
    });
  });

  // New application started
  activities.push({
    entityType: 'application',
    action: 'application.created',
    metadata: { company: 'Spendesk', role: 'Senior Full-Stack Developer' },
    daysAgo: 2,
    hoursOffset: 4,
  });

  // Draft campaign created
  activities.push({
    entityType: 'campaign',
    entityId: DEMO_CAMPAIGN_DRAFT_ID,
    action: 'campaign.created',
    metadata: { name: 'Tech Lead Positions', testMode: true },
    daysAgo: 1,
    hoursOffset: 2,
  });

  // New CV uploaded
  activities.push({
    entityType: 'cv',
    entityId: DEMO_CV_PROCESSING_ID,
    action: 'cv.uploaded',
    metadata: { fileName: 'CV_Marie_Dupont_EN.pdf' },
    daysAgo: 1,
    hoursOffset: 4,
  });

  activities.push({
    entityType: 'cv',
    entityId: DEMO_CV_PROCESSING_ID,
    action: 'cv.parsing_started',
    daysAgo: 1,
    hoursOffset: 4.1,
  });

  return activities;
}

export async function seedActivity(prisma: PrismaClient): Promise<void> {
  console.log('Seeding demo activity logs...');

  // Delete existing demo action logs
  await prisma.actionLog.deleteMany({
    where: {
      id: { startsWith: 'demo_' },
    },
  });

  const activities = generateActivityTimeline();

  for (let i = 0; i < activities.length; i++) {
    const activity = activities[i];
    const baseDate = daysAgo(activity.daysAgo);
    const createdAt = activity.hoursOffset
      ? addRandomHours(baseDate, activity.hoursOffset, activity.hoursOffset + 0.5)
      : baseDate;

    await prisma.actionLog.create({
      data: {
        id: demoId('action', i),
        userId: DEMO_USER_ID,
        entityType: activity.entityType,
        entityId: activity.entityId || null,
        action: activity.action,
        status: 'success',
        metadata: (activity.metadata as Prisma.InputJsonValue) || undefined,
        testMode: false,
        createdAt,
      },
    });
  }

  console.log(`  Created ${activities.length} action log entries`);
}
