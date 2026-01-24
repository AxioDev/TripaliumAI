import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { ActionType, JobOfferStatus, JobSourceType } from '@tripalium/shared';

// Mock job templates for realistic job generation
const mockCompanies = [
  { name: 'TechGlobal Solutions', size: 'large' },
  { name: 'StartupIO', size: 'startup' },
  { name: 'FinanceHub', size: 'large' },
  { name: 'CloudNative Inc', size: 'medium' },
  { name: 'DataDriven Corp', size: 'large' },
  { name: 'AgileWorks', size: 'medium' },
  { name: 'Innovation Labs', size: 'startup' },
  { name: 'ScaleFast', size: 'medium' },
  { name: 'SecureNet Systems', size: 'large' },
  { name: 'DevOps Masters', size: 'startup' },
];

const skillSets: Record<string, string[]> = {
  frontend: ['React', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Redux', 'Next.js'],
  backend: ['Node.js', 'Python', 'Java', 'Go', 'Rust', 'PostgreSQL', 'MongoDB', 'Redis', 'GraphQL'],
  fullstack: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'CI/CD'],
  devops: ['Kubernetes', 'Docker', 'AWS', 'GCP', 'Azure', 'Terraform', 'Ansible', 'Jenkins', 'GitLab CI'],
  data: ['Python', 'SQL', 'Spark', 'Hadoop', 'Machine Learning', 'TensorFlow', 'Pandas', 'Airflow'],
};

const salaryRanges: Record<string, { min: number; max: number }> = {
  junior: { min: 35000, max: 50000 },
  mid: { min: 50000, max: 75000 },
  senior: { min: 75000, max: 110000 },
  lead: { min: 100000, max: 140000 },
};

@Injectable()
export class JobDiscoveryService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    this.queueService.registerHandler('job.discover', this.handleDiscoverJob.bind(this));
  }

  async handleDiscoverJob(job: Job<JobPayload>) {
    const { campaignId } = job.data.data as { campaignId: string };
    const testMode = job.data.testMode ?? false;

    // Get campaign with user
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

    try {
      // Get mock job source
      const mockSource = await this.prisma.jobSource.findFirst({
        where: { type: JobSourceType.MOCK },
      });

      if (!mockSource) {
        throw new Error('Mock job source not found');
      }

      // Generate mock jobs based on campaign criteria
      const jobs = this.generateMockJobs(campaign, mockSource.id);

      // Filter out jobs that already exist (by external ID)
      const existingJobs = await this.prisma.jobOffer.findMany({
        where: {
          campaignId,
          externalId: { in: jobs.map((j) => j.externalId) },
        },
        select: { externalId: true },
      });

      const existingIds = new Set(existingJobs.map((j) => j.externalId));
      const newJobs = jobs.filter((j) => !existingIds.has(j.externalId));

      if (newJobs.length === 0) {
        await this.logService.log({
          userId: campaign.userId,
          entityType: 'campaign',
          entityId: campaignId,
          action: ActionType.JOB_DISCOVERY_COMPLETED,
          metadata: { jobsFound: 0, newJobs: 0 },
          testMode,
        });
        return { jobsFound: 0, newJobs: 0 };
      }

      // Create job offers
      await this.prisma.jobOffer.createMany({
        data: newJobs.map((job) => ({
          campaignId,
          jobSourceId: mockSource.id,
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
          discoveredAt: new Date(),
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

      // Queue analysis jobs
      for (const createdJob of createdJobs) {
        await this.queueService.addJob({
          type: 'job.analyze',
          data: { jobId: createdJob.id, campaignId },
          userId: campaign.userId,
          testMode,
        });
      }

      await this.logService.log({
        userId: campaign.userId,
        entityType: 'campaign',
        entityId: campaignId,
        action: ActionType.JOB_DISCOVERY_COMPLETED,
        metadata: { jobsFound: jobs.length, newJobs: newJobs.length },
        testMode,
      });

      return { jobsFound: jobs.length, newJobs: newJobs.length };
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

  private generateMockJobs(
    campaign: {
      id: string;
      targetRoles: string[];
      targetLocations: string[];
      contractTypes: string[];
      remoteOk: boolean;
    },
    sourceId: string,
  ) {
    const jobs: Array<{
      externalId: string;
      title: string;
      company: string;
      location: string;
      description: string;
      requirements: string[];
      salary: string | null;
      contractType: string;
      remoteType: string;
      url: string;
    }> = [];

    // Generate 5-15 jobs per campaign
    const numJobs = Math.floor(Math.random() * 11) + 5;

    for (let i = 0; i < numJobs; i++) {
      const role = campaign.targetRoles[Math.floor(Math.random() * campaign.targetRoles.length)];
      const location = campaign.targetLocations[Math.floor(Math.random() * campaign.targetLocations.length)];
      const company = mockCompanies[Math.floor(Math.random() * mockCompanies.length)];

      // Determine skill category based on role
      let skillCategory = 'fullstack';
      const roleLower = role.toLowerCase();
      if (roleLower.includes('frontend') || roleLower.includes('react') || roleLower.includes('vue')) {
        skillCategory = 'frontend';
      } else if (roleLower.includes('backend') || roleLower.includes('node') || roleLower.includes('python')) {
        skillCategory = 'backend';
      } else if (roleLower.includes('devops') || roleLower.includes('sre') || roleLower.includes('cloud')) {
        skillCategory = 'devops';
      } else if (roleLower.includes('data') || roleLower.includes('ml') || roleLower.includes('machine learning')) {
        skillCategory = 'data';
      }

      const skills = skillSets[skillCategory] || skillSets.fullstack;
      const numRequirements = Math.floor(Math.random() * 4) + 4;
      const requirements = this.shuffleArray([...skills]).slice(0, numRequirements);

      // Determine seniority level
      let level = 'mid';
      if (roleLower.includes('senior') || roleLower.includes('sr')) {
        level = 'senior';
      } else if (roleLower.includes('junior') || roleLower.includes('jr')) {
        level = 'junior';
      } else if (roleLower.includes('lead') || roleLower.includes('principal')) {
        level = 'lead';
      }

      const salaryRange = salaryRanges[level];
      const salary = `${salaryRange.min.toLocaleString()} - ${salaryRange.max.toLocaleString()} EUR`;

      // Contract type
      const contractTypes = campaign.contractTypes.length > 0
        ? campaign.contractTypes
        : ['Full-time', 'Contract'];
      const contractType = contractTypes[Math.floor(Math.random() * contractTypes.length)];

      // Remote type
      const remoteTypes = campaign.remoteOk
        ? ['Remote', 'Hybrid', 'On-site']
        : ['On-site', 'Hybrid'];
      const remoteType = remoteTypes[Math.floor(Math.random() * remoteTypes.length)];

      const externalId = `mock-${campaign.id}-${Date.now()}-${i}`;

      jobs.push({
        externalId,
        title: role,
        company: company.name,
        location: remoteType === 'Remote' ? 'Remote' : location,
        description: this.generateJobDescription(role, company.name, requirements, level),
        requirements,
        salary,
        contractType,
        remoteType,
        url: `https://example.com/jobs/${externalId}`,
      });
    }

    return jobs;
  }

  private generateJobDescription(
    role: string,
    company: string,
    requirements: string[],
    level: string,
  ): string {
    const levelDescriptions: Record<string, string> = {
      junior: 'an entry-level position perfect for developers starting their career',
      mid: 'a mid-level position for experienced developers looking to grow',
      senior: 'a senior position requiring deep expertise and leadership skills',
      lead: 'a leadership role overseeing technical direction and team development',
    };

    const responsibilities = [
      'Design and implement new features',
      'Collaborate with cross-functional teams',
      'Write clean, maintainable code',
      'Participate in code reviews',
      'Contribute to technical documentation',
      'Debug and resolve production issues',
      'Mentor junior team members',
      'Drive technical decisions',
    ];

    const numResponsibilities = level === 'lead' || level === 'senior' ? 6 : 4;
    const selectedResponsibilities = this.shuffleArray([...responsibilities]).slice(0, numResponsibilities);

    return `
${company} is looking for a ${role} to join our team. This is ${levelDescriptions[level]}.

About the Role:
As a ${role}, you will be working on cutting-edge projects using modern technologies. You'll be part of a collaborative team that values innovation and quality.

Responsibilities:
${selectedResponsibilities.map((r) => `- ${r}`).join('\n')}

Requirements:
- ${requirements.slice(0, 4).join('\n- ')}
- Strong problem-solving skills
- Excellent communication skills

Nice to have:
- ${requirements.slice(4).join('\n- ') || 'Experience with agile methodologies'}

We offer competitive salary, flexible work arrangements, and excellent benefits.
    `.trim();
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
