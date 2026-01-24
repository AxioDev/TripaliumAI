// =============================================================================
// Job Seeder - Creates demo job offers
// =============================================================================

import { PrismaClient, JobOfferStatus } from '@prisma/client';
import {
  DEMO_CAMPAIGN_COMPLETED_ID,
  DEMO_CAMPAIGN_ACTIVE_ID,
} from '../config';
import { daysAgo, addRandomHours, demoId } from '../utils';
import { completedCampaignJobs, activeCampaignJobs } from '../data/job-templates';
import { getCompany } from '../data/companies';

function mapStatus(status: string): JobOfferStatus {
  const statusMap: Record<string, JobOfferStatus> = {
    DISCOVERED: JobOfferStatus.DISCOVERED,
    ANALYZING: JobOfferStatus.ANALYZING,
    MATCHED: JobOfferStatus.MATCHED,
    REJECTED: JobOfferStatus.REJECTED,
    APPLIED: JobOfferStatus.APPLIED,
  };
  return statusMap[status] || JobOfferStatus.DISCOVERED;
}

export async function seedJobs(prisma: PrismaClient): Promise<void> {
  console.log('Seeding demo job offers...');

  // Get the WTTJ job source
  const wttjSource = await prisma.jobSource.findUnique({
    where: { name: 'wttj' },
  });

  if (!wttjSource) {
    throw new Error('WTTJ job source not found. Run base seed first.');
  }

  // Delete existing demo jobs to avoid conflicts
  await prisma.jobOffer.deleteMany({
    where: {
      id: {
        startsWith: 'demo_job_',
      },
    },
  });

  // Seed completed campaign jobs
  let jobIndex = 0;
  for (const job of completedCampaignJobs) {
    const company = getCompany(job.company);
    const jobId = demoId('job', jobIndex);

    // Calculate realistic timestamps based on status
    let discoveredAt: Date;
    let analyzedAt: Date | null = null;

    // Jobs discovered over the campaign duration (21 days ago to 3 days ago)
    const dayOffset = Math.floor(21 - (jobIndex * 1.5));
    discoveredAt = addRandomHours(daysAgo(Math.max(3, dayOffset)), 0, 8);

    if (job.status !== 'DISCOVERED') {
      analyzedAt = addRandomHours(discoveredAt, 1, 4);
    }

    await prisma.jobOffer.create({
      data: {
        id: jobId,
        campaignId: DEMO_CAMPAIGN_COMPLETED_ID,
        jobSourceId: wttjSource.id,
        externalId: `wttj_${job.company.toLowerCase().replace(/\s+/g, '_')}_${jobIndex}`,
        title: job.title,
        company: job.company,
        location: company?.location || 'Paris, France',
        description: job.description,
        requirements: job.requirements,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: 'EUR',
        contractType: job.contractType,
        remoteType: job.remoteType,
        url: `https://www.welcometothejungle.com/fr/companies/${job.company.toLowerCase().replace(/\s+/g, '-')}/jobs/${jobId}`,
        matchScore: job.matchScore,
        matchAnalysis: job.matchScore ? {
          overallScore: job.matchScore,
          skillsMatch: Math.min(100, job.matchScore + Math.floor(Math.random() * 10)),
          experienceMatch: Math.min(100, job.matchScore + Math.floor(Math.random() * 5) - 5),
          locationMatch: 100,
          salaryMatch: 90,
          highlights: [
            'Strong React/TypeScript match',
            'Location matches preference',
            'Salary within range',
          ],
          concerns: job.matchScore < 70 ? ['Missing specific requirements'] : [],
        } : undefined,
        status: mapStatus(job.status),
        discoveredAt,
        analyzedAt,
        expiresAt: daysAgo(-30), // Expires in 30 days
        createdAt: discoveredAt,
      },
    });

    jobIndex++;
  }

  console.log(`  Created ${completedCampaignJobs.length} jobs for completed campaign`);

  // Seed active campaign jobs
  for (const job of activeCampaignJobs) {
    const company = getCompany(job.company);
    const jobId = demoId('job', jobIndex);

    // Active campaign jobs are more recent (4 days ago to now)
    const hourOffset = Math.floor((activeCampaignJobs.indexOf(job) + 1) * 12);
    const discoveredAt = addRandomHours(daysAgo(4), hourOffset, hourOffset + 6);
    const analyzedAt = job.status !== 'DISCOVERED' && job.status !== 'ANALYZING'
      ? addRandomHours(discoveredAt, 1, 4)
      : null;

    await prisma.jobOffer.create({
      data: {
        id: jobId,
        campaignId: DEMO_CAMPAIGN_ACTIVE_ID,
        jobSourceId: wttjSource.id,
        externalId: `wttj_${job.company.toLowerCase().replace(/\s+/g, '_')}_active_${jobIndex}`,
        title: job.title,
        company: job.company,
        location: company?.location || 'Paris, France',
        description: job.description,
        requirements: job.requirements,
        salary: job.salary,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: 'EUR',
        contractType: job.contractType,
        remoteType: job.remoteType,
        url: `https://www.welcometothejungle.com/fr/companies/${job.company.toLowerCase().replace(/\s+/g, '-')}/jobs/${jobId}`,
        matchScore: job.matchScore,
        matchAnalysis: job.matchScore ? {
          overallScore: job.matchScore,
          skillsMatch: Math.min(100, job.matchScore + Math.floor(Math.random() * 10)),
          experienceMatch: Math.min(100, job.matchScore + Math.floor(Math.random() * 5) - 5),
          locationMatch: 100,
          salaryMatch: 85,
          highlights: ['Strong technical skills match'],
          concerns: [],
        } : undefined,
        status: mapStatus(job.status),
        discoveredAt,
        analyzedAt,
        expiresAt: daysAgo(-30),
        createdAt: discoveredAt,
      },
    });

    jobIndex++;
  }

  console.log(`  Created ${activeCampaignJobs.length} jobs for active campaign`);
  console.log(`  Total: ${jobIndex} job offers`);
}

/**
 * Get job IDs by company name for linking applications
 */
export async function getJobIdByCompany(prisma: PrismaClient, company: string): Promise<string | null> {
  const job = await prisma.jobOffer.findFirst({
    where: {
      company,
      id: { startsWith: 'demo_' },
    },
    select: { id: true },
  });
  return job?.id || null;
}
