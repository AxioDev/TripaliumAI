// =============================================================================
// Demo Seed Orchestrator
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { DEMO_ID_PREFIX, DEMO_EMAIL } from './config';
import { seedUser } from './seeders/user.seeder';
import { seedCampaigns } from './seeders/campaign.seeder';
import { seedJobs } from './seeders/job.seeder';
import { seedApplications } from './seeders/application.seeder';
import { seedActivity } from './seeders/activity.seeder';

/**
 * Clean up all demo data (entities with demo_ prefix)
 */
export async function cleanupDemoData(prisma: PrismaClient): Promise<void> {
  console.log('\nCleaning up existing demo data...');

  // Delete in reverse order of dependencies
  await prisma.actionLog.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo action logs');

  await prisma.emailRecord.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo email records');

  await prisma.generatedDocument.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo generated documents');

  await prisma.application.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo applications');

  await prisma.jobOffer.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo job offers');

  await prisma.campaignJobSource.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo campaign job sources');

  await prisma.campaign.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo campaigns');

  await prisma.cV.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo CVs');

  await prisma.certification.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });

  await prisma.language.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });

  await prisma.skill.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });

  await prisma.education.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });

  await prisma.workExperience.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo profile data');

  await prisma.profile.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo profiles');

  await prisma.user.deleteMany({
    where: { id: { startsWith: DEMO_ID_PREFIX } },
  });
  console.log('  Deleted demo users');

  console.log('Demo data cleanup complete.');
}

/**
 * Seed all demo data
 */
export async function seedDemoData(prisma: PrismaClient): Promise<void> {
  console.log('\n========================================');
  console.log('   TripaliumAI Demo Data Seeder');
  console.log('========================================\n');

  // Clean up existing demo data first (idempotent)
  await cleanupDemoData(prisma);

  console.log('\nSeeding demo data...\n');

  // Seed in order of dependencies
  await seedUser(prisma);
  console.log('');

  await seedCampaigns(prisma);
  console.log('');

  await seedJobs(prisma);
  console.log('');

  await seedApplications(prisma);
  console.log('');

  await seedActivity(prisma);
  console.log('');

  console.log('========================================');
  console.log('   Demo data seeded successfully!');
  console.log('========================================\n');

  console.log('Demo credentials:');
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log('  Password: demo123456');
  console.log('');
  console.log('Demo includes:');
  console.log('  - 1 complete user profile (Marie Dupont)');
  console.log('  - 4 work experiences, 2 education records');
  console.log('  - 16 skills, 3 languages, 1 certification');
  console.log('  - 2 CVs (1 parsed, 1 processing)');
  console.log('  - 3 campaigns (completed, active, draft)');
  console.log('  - 20 job offers across campaigns');
  console.log('  - 8 applications at various stages');
  console.log('  - 16 generated documents (CV + cover letter)');
  console.log('  - 3 email records');
  console.log('  - ~50 activity log entries');
  console.log('');
}

/**
 * Reset database and reseed everything (base + demo)
 */
export async function resetAndSeed(
  prisma: PrismaClient,
  seedBase: () => Promise<void>
): Promise<void> {
  console.log('\n========================================');
  console.log('   Full Database Reset & Reseed');
  console.log('========================================\n');

  // Clean all demo data
  await cleanupDemoData(prisma);

  // Run base seed
  console.log('\nRunning base seed...\n');
  await seedBase();

  // Run demo seed
  await seedDemoData(prisma);
}
