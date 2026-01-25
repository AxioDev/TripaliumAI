import { PrismaClient, JobSourceType, ApiKeyScope } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { seedDemoData, cleanupDemoData, resetAndSeed } from './seed/index';

const prisma = new PrismaClient();

// Parse command line arguments
const args = process.argv.slice(2);
const isDemo = args.includes('--demo');
const isReset = args.includes('--reset');
const isCleanDemo = args.includes('--clean-demo');

async function seedBase() {
  console.log('Seeding base database data...');

  // Create job sources
  const jobSources = await Promise.all([
    prisma.jobSource.upsert({
      where: { name: 'mock' },
      update: {},
      create: {
        name: 'mock',
        displayName: 'Mock Jobs (Testing)',
        type: JobSourceType.MOCK,
        supportsAutoApply: false,
        isActive: true,
      },
    }),
    prisma.jobSource.upsert({
      where: { name: 'manual' },
      update: {},
      create: {
        name: 'manual',
        displayName: 'Manual Entry',
        type: JobSourceType.MANUAL,
        supportsAutoApply: false,
        isActive: true,
      },
    }),
    prisma.jobSource.upsert({
      where: { name: 'wttj' },
      update: {},
      create: {
        name: 'wttj',
        displayName: 'Welcome to the Jungle',
        type: JobSourceType.RSS,
        baseUrl: 'https://www.welcometothejungle.com',
        supportsAutoApply: false,
        isActive: true,
      },
    }),
    prisma.jobSource.upsert({
      where: { name: 'remoteok' },
      update: {},
      create: {
        name: 'remoteok',
        displayName: 'RemoteOK',
        type: JobSourceType.RSS,
        baseUrl: 'https://remoteok.com/remote-jobs.rss',
        supportsAutoApply: false,
        isActive: true,
      },
    }),
    prisma.jobSource.upsert({
      where: { name: 'indeed' },
      update: {},
      create: {
        name: 'indeed',
        displayName: 'Indeed',
        type: JobSourceType.API,
        baseUrl: 'https://indeed.com',
        supportsAutoApply: false,
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${jobSources.length} job sources`);

  // Create test user
  const passwordHash = await bcrypt.hash('testpassword123', 12);

  const testUser = await prisma.user.upsert({
    where: { email: 'test@tripalium.local' },
    update: {},
    create: {
      email: 'test@tripalium.local',
      passwordHash,
    },
  });

  console.log(`Created test user: ${testUser.email}`);

  // Create API keys for test user
  const testApiKeyRaw = `trpl_test_${randomBytes(24).toString('base64url')}`;
  const testApiKeyHash = createHash('sha256').update(testApiKeyRaw).digest('hex');

  await prisma.apiKey.upsert({
    where: { keyHash: testApiKeyHash },
    update: {},
    create: {
      userId: testUser.id,
      keyHash: testApiKeyHash,
      keyPrefix: testApiKeyRaw.substring(0, 12),
      name: 'Test API Key',
      scope: ApiKeyScope.TEST,
    },
  });

  const writeApiKeyRaw = `trpl_write_${randomBytes(24).toString('base64url')}`;
  const writeApiKeyHash = createHash('sha256').update(writeApiKeyRaw).digest('hex');

  await prisma.apiKey.upsert({
    where: { keyHash: writeApiKeyHash },
    update: {},
    create: {
      userId: testUser.id,
      keyHash: writeApiKeyHash,
      keyPrefix: writeApiKeyRaw.substring(0, 12),
      name: 'Write API Key',
      scope: ApiKeyScope.WRITE,
    },
  });

  console.log('Created API keys for test user:');
  console.log(`  TEST scope: ${testApiKeyRaw}`);
  console.log(`  WRITE scope: ${writeApiKeyRaw}`);

  // Create sample profile for test user
  const profile = await prisma.profile.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      firstName: 'Test',
      lastName: 'User',
      email: 'test@tripalium.local',
      phone: '+1 555 123 4567',
      location: 'Paris, France',
      summary:
        'Experienced software engineer with expertise in full-stack development, cloud architecture, and team leadership. Passionate about building scalable systems and mentoring junior developers.',
      motivationText:
        'I am seeking a challenging role where I can leverage my technical skills while continuing to grow professionally. I thrive in collaborative environments and enjoy tackling complex problems.',
    },
  });

  // Add work experiences
  await prisma.workExperience.createMany({
    data: [
      {
        profileId: profile.id,
        company: 'TechCorp Inc.',
        title: 'Senior Software Engineer',
        location: 'Paris, France',
        startDate: new Date('2021-03-01'),
        endDate: null,
        description:
          'Leading development of microservices architecture serving 1M+ users.',
        highlights: [
          'Architected and implemented event-driven system reducing latency by 40%',
          'Mentored team of 5 junior developers',
          'Introduced CI/CD pipeline reducing deployment time by 60%',
        ],
        sortOrder: 0,
      },
      {
        profileId: profile.id,
        company: 'StartupXYZ',
        title: 'Full Stack Developer',
        location: 'Remote',
        startDate: new Date('2018-06-01'),
        endDate: new Date('2021-02-28'),
        description: 'Built and maintained core product features for B2B SaaS platform.',
        highlights: [
          'Developed real-time collaboration features using WebSockets',
          'Optimized database queries improving page load by 50%',
          'Integrated third-party payment systems (Stripe, PayPal)',
        ],
        sortOrder: 1,
      },
    ],
    skipDuplicates: true,
  });

  // Add education
  await prisma.education.createMany({
    data: [
      {
        profileId: profile.id,
        institution: 'University of Technology',
        degree: "Master's Degree",
        field: 'Computer Science',
        startDate: new Date('2014-09-01'),
        endDate: new Date('2016-06-30'),
        sortOrder: 0,
      },
      {
        profileId: profile.id,
        institution: 'University of Technology',
        degree: "Bachelor's Degree",
        field: 'Software Engineering',
        startDate: new Date('2011-09-01'),
        endDate: new Date('2014-06-30'),
        sortOrder: 1,
      },
    ],
    skipDuplicates: true,
  });

  // Add skills
  await prisma.skill.createMany({
    data: [
      { profileId: profile.id, name: 'TypeScript', category: 'Programming', level: 'Expert', sortOrder: 0 },
      { profileId: profile.id, name: 'Node.js', category: 'Backend', level: 'Expert', sortOrder: 1 },
      { profileId: profile.id, name: 'React', category: 'Frontend', level: 'Advanced', sortOrder: 2 },
      { profileId: profile.id, name: 'PostgreSQL', category: 'Database', level: 'Advanced', sortOrder: 3 },
      { profileId: profile.id, name: 'AWS', category: 'Cloud', level: 'Intermediate', sortOrder: 4 },
      { profileId: profile.id, name: 'Docker', category: 'DevOps', level: 'Advanced', sortOrder: 5 },
      { profileId: profile.id, name: 'Python', category: 'Programming', level: 'Intermediate', sortOrder: 6 },
    ],
    skipDuplicates: true,
  });

  // Add languages
  await prisma.language.createMany({
    data: [
      { profileId: profile.id, name: 'English', proficiency: 'Fluent' },
      { profileId: profile.id, name: 'French', proficiency: 'Native' },
      { profileId: profile.id, name: 'Spanish', proficiency: 'Intermediate' },
    ],
    skipDuplicates: true,
  });

  console.log('Created sample profile with experiences, education, skills, and languages');

  // Create sample campaigns for test user
  const mockSource = jobSources.find(s => s.name === 'mock');
  const wttjSource = jobSources.find(s => s.name === 'wttj');

  // Active campaign
  const activeCampaign = await prisma.campaign.upsert({
    where: { id: 'test-campaign-active' },
    update: {},
    create: {
      id: 'test-campaign-active',
      userId: testUser.id,
      name: 'Senior Developer Roles - Paris',
      targetRoles: ['Senior Software Engineer', 'Lead Developer', 'Full Stack Developer'],
      targetLocations: ['Paris, France', 'Remote'],
      contractTypes: ['Full-time', 'Contract'],
      remoteOk: true,
      matchThreshold: 70,
      status: 'ACTIVE',
      testMode: false,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    },
  });

  // Connect job sources to active campaign
  if (mockSource) {
    await prisma.campaignJobSource.upsert({
      where: {
        campaignId_sourceId: {
          campaignId: activeCampaign.id,
          sourceId: mockSource.id,
        },
      },
      update: {},
      create: {
        campaignId: activeCampaign.id,
        sourceId: mockSource.id,
      },
    });
  }

  // Draft campaign (practice mode)
  await prisma.campaign.upsert({
    where: { id: 'test-campaign-draft' },
    update: {},
    create: {
      id: 'test-campaign-draft',
      userId: testUser.id,
      name: 'Tech Lead Opportunities',
      targetRoles: ['Tech Lead', 'Engineering Manager'],
      targetLocations: ['Paris, France', 'Lyon, France'],
      contractTypes: ['Full-time'],
      remoteOk: true,
      matchThreshold: 75,
      status: 'DRAFT',
      testMode: true,
    },
  });

  console.log('Created sample campaigns');

  console.log('\n✅ Base database seeded successfully!');
  console.log('\nTest credentials:');
  console.log('  Email: test@tripalium.local');
  console.log('  Password: testpassword123');
}

async function main() {
  // Show usage if --help
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
TripaliumAI Database Seeder

Usage:
  npx prisma db seed              Run base seed only
  npx prisma db seed -- --demo    Run base + demo data seed
  npx prisma db seed -- --reset   Reset database and reseed everything
  npx prisma db seed -- --clean-demo  Remove only demo data

Options:
  --demo       Add full demo dataset (Marie Dupont profile)
  --reset      Clear demo data, then run base + demo seed
  --clean-demo Remove all demo data without reseeding
  --help, -h   Show this help message
`);
    return;
  }

  // Handle clean-demo flag
  if (isCleanDemo) {
    await cleanupDemoData(prisma);
    console.log('\n✅ Demo data cleaned successfully!');
    return;
  }

  // Handle reset flag
  if (isReset) {
    await resetAndSeed(prisma, seedBase);
    return;
  }

  // Handle demo flag
  if (isDemo) {
    // First run base seed
    await seedBase();
    // Then add demo data
    await seedDemoData(prisma);
    return;
  }

  // Default: just run base seed
  await seedBase();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
