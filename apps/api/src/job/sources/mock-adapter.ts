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
  frontend: [
    'React',
    'Vue',
    'Angular',
    'TypeScript',
    'JavaScript',
    'CSS',
    'HTML',
    'Redux',
    'Next.js',
  ],
  backend: [
    'Node.js',
    'Python',
    'Java',
    'Go',
    'Rust',
    'PostgreSQL',
    'MongoDB',
    'Redis',
    'GraphQL',
  ],
  fullstack: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'CI/CD'],
  devops: [
    'Kubernetes',
    'Docker',
    'AWS',
    'GCP',
    'Azure',
    'Terraform',
    'Ansible',
    'Jenkins',
    'GitLab CI',
  ],
  data: [
    'Python',
    'SQL',
    'Spark',
    'Hadoop',
    'Machine Learning',
    'TensorFlow',
    'Pandas',
    'Airflow',
  ],
};

const salaryRanges: Record<string, { min: number; max: number }> = {
  junior: { min: 35000, max: 50000 },
  mid: { min: 50000, max: 75000 },
  senior: { min: 75000, max: 110000 },
  lead: { min: 100000, max: 140000 },
};

@Injectable()
export class MockAdapter extends BaseJobSourceAdapter {
  private readonly logger = new Logger(MockAdapter.name);

  readonly sourceName = 'mock';
  readonly displayName = 'Demo Mode';
  readonly sourceType = JobSourceType.MOCK;
  readonly supportsAutoApply = false;

  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    super();
    // Only enable mock adapter in development or when explicitly enabled
    const nodeEnv = this.configService.get('NODE_ENV', 'development');
    const enableMock = this.configService.get('ENABLE_MOCK_JOBS', 'false') === 'true';
    this.enabled = nodeEnv === 'development' || enableMock;

    if (this.enabled) {
      this.logger.log('Mock adapter enabled (development/demo mode)');
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async discoverJobs(criteria: CampaignSearchCriteria): Promise<DiscoveryResult> {
    const startTime = Date.now();

    if (!this.enabled) {
      this.logger.warn('Mock adapter called but not enabled');
      return {
        jobs: [],
        metadata: {
          source: this.sourceName,
          queryTime: Date.now() - startTime,
          totalFound: 0,
          filtered: 0,
          errors: ['Mock adapter is disabled in production'],
        },
      };
    }

    this.logger.log(`Generating mock jobs for campaign ${criteria.campaignId}`);

    // Generate mock jobs
    const jobs = this.generateMockJobs(criteria);

    return {
      jobs,
      metadata: {
        source: this.sourceName,
        queryTime: Date.now() - startTime,
        totalFound: jobs.length,
        filtered: 0,
      },
    };
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return {
      healthy: this.enabled,
      message: this.enabled ? 'Mock adapter ready' : 'Mock adapter disabled in production',
      lastChecked: new Date(),
      responseTimeMs: 0,
    };
  }

  private generateMockJobs(criteria: CampaignSearchCriteria): DiscoveredJob[] {
    const jobs: DiscoveredJob[] = [];

    // Generate 5-15 jobs per campaign
    const numJobs = Math.floor(Math.random() * 11) + 5;

    for (let i = 0; i < numJobs; i++) {
      const role = criteria.targetRoles[Math.floor(Math.random() * criteria.targetRoles.length)];
      const location =
        criteria.targetLocations[Math.floor(Math.random() * criteria.targetLocations.length)];
      const company = mockCompanies[Math.floor(Math.random() * mockCompanies.length)];

      // Determine skill category based on role
      let skillCategory = 'fullstack';
      const roleLower = role.toLowerCase();
      if (
        roleLower.includes('frontend') ||
        roleLower.includes('react') ||
        roleLower.includes('vue')
      ) {
        skillCategory = 'frontend';
      } else if (
        roleLower.includes('backend') ||
        roleLower.includes('node') ||
        roleLower.includes('python')
      ) {
        skillCategory = 'backend';
      } else if (
        roleLower.includes('devops') ||
        roleLower.includes('sre') ||
        roleLower.includes('cloud')
      ) {
        skillCategory = 'devops';
      } else if (
        roleLower.includes('data') ||
        roleLower.includes('ml') ||
        roleLower.includes('machine learning')
      ) {
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
      const contractTypes =
        criteria.contractTypes.length > 0 ? criteria.contractTypes : ['Full-time', 'Contract'];
      const contractType = contractTypes[Math.floor(Math.random() * contractTypes.length)];

      // Remote type
      const remoteTypes = criteria.remoteOk ? ['Remote', 'Hybrid', 'On-site'] : ['On-site', 'Hybrid'];
      const remoteType = remoteTypes[Math.floor(Math.random() * remoteTypes.length)];

      const externalId = `mock-${criteria.campaignId}-${Date.now()}-${i}`;

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
        url: `https://demo.tripalium.ai/jobs/${externalId}`,
        postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last 7 days
        applicationEmail: `careers@${company.name.toLowerCase().replace(/\s+/g, '')}.demo`,
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
    const selectedResponsibilities = this.shuffleArray([...responsibilities]).slice(
      0,
      numResponsibilities,
    );

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

---
[DEMO MODE] This is a simulated job posting for testing purposes.
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
