// =============================================================================
// User Seeder - Creates demo user with profile
// =============================================================================

import { PrismaClient, CVType, ParsingStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  DEMO_USER_ID,
  DEMO_PROFILE_ID,
  DEMO_CV_PARSED_ID,
  DEMO_CV_PROCESSING_ID,
} from '../config';
import { daysAgo, demoId } from '../utils';
import {
  demoUser,
  demoProfile,
  workExperiences,
  educations,
  skills,
  languages,
  certifications,
} from '../data/demo-persona';

export async function seedUser(prisma: PrismaClient): Promise<void> {
  console.log('Seeding demo user...');

  // Create user
  const passwordHash = await bcrypt.hash(demoUser.password, 12);

  await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      email: demoUser.email,
      passwordHash,
      emailVerified: daysAgo(21),
    },
    create: {
      id: DEMO_USER_ID,
      email: demoUser.email,
      passwordHash,
      emailVerified: daysAgo(21),
      createdAt: daysAgo(21),
    },
  });

  console.log(`  Created user: ${demoUser.email}`);

  // Create profile
  await prisma.profile.upsert({
    where: { id: DEMO_PROFILE_ID },
    update: {
      ...demoProfile,
    },
    create: {
      ...demoProfile,
      createdAt: daysAgo(21),
    },
  });

  console.log(`  Created profile: ${demoProfile.firstName} ${demoProfile.lastName}`);

  // Delete existing related data to avoid duplicates
  await Promise.all([
    prisma.workExperience.deleteMany({ where: { profileId: DEMO_PROFILE_ID } }),
    prisma.education.deleteMany({ where: { profileId: DEMO_PROFILE_ID } }),
    prisma.skill.deleteMany({ where: { profileId: DEMO_PROFILE_ID } }),
    prisma.language.deleteMany({ where: { profileId: DEMO_PROFILE_ID } }),
    prisma.certification.deleteMany({ where: { profileId: DEMO_PROFILE_ID } }),
  ]);

  // Create work experiences
  await prisma.workExperience.createMany({
    data: workExperiences.map((exp, index) => ({
      id: demoId('work_exp', index),
      profileId: DEMO_PROFILE_ID,
      ...exp,
      createdAt: daysAgo(21),
    })),
  });

  console.log(`  Created ${workExperiences.length} work experiences`);

  // Create educations
  await prisma.education.createMany({
    data: educations.map((edu, index) => ({
      id: demoId('education', index),
      profileId: DEMO_PROFILE_ID,
      ...edu,
      createdAt: daysAgo(21),
    })),
  });

  console.log(`  Created ${educations.length} education records`);

  // Create skills
  await prisma.skill.createMany({
    data: skills.map((skill, index) => ({
      id: demoId('skill', index),
      profileId: DEMO_PROFILE_ID,
      ...skill,
      createdAt: daysAgo(21),
    })),
  });

  console.log(`  Created ${skills.length} skills`);

  // Create languages
  await prisma.language.createMany({
    data: languages.map((lang, index) => ({
      id: demoId('language', index),
      profileId: DEMO_PROFILE_ID,
      ...lang,
      createdAt: daysAgo(21),
    })),
  });

  console.log(`  Created ${languages.length} languages`);

  // Create certifications
  await prisma.certification.createMany({
    data: certifications.map((cert, index) => ({
      id: demoId('certification', index),
      profileId: DEMO_PROFILE_ID,
      ...cert,
      createdAt: daysAgo(21),
    })),
  });

  console.log(`  Created ${certifications.length} certifications`);

  // Create CVs
  // CV 1: Parsed successfully
  await prisma.cV.upsert({
    where: { id: DEMO_CV_PARSED_ID },
    update: {},
    create: {
      id: DEMO_CV_PARSED_ID,
      userId: DEMO_USER_ID,
      profileId: DEMO_PROFILE_ID,
      type: CVType.UPLOADED,
      fileName: 'CV_Marie_Dupont_2024.pdf',
      filePath: `uploads/${DEMO_USER_ID}/cvs/CV_Marie_Dupont_2024.pdf`,
      fileSize: 245678,
      mimeType: 'application/pdf',
      parsingStatus: ParsingStatus.COMPLETED,
      isBaseline: true,
      parsedData: {
        firstName: demoProfile.firstName,
        lastName: demoProfile.lastName,
        email: demoProfile.email,
        phone: demoProfile.phone,
        location: demoProfile.location,
        summary: demoProfile.summary,
        workExperiences: workExperiences.map(exp => ({
          company: exp.company,
          title: exp.title,
          startDate: exp.startDate.toISOString(),
          endDate: exp.endDate?.toISOString() || null,
          description: exp.description,
          highlights: exp.highlights,
        })),
        educations: educations.map(edu => ({
          institution: edu.institution,
          degree: edu.degree,
          field: edu.field,
          endDate: edu.endDate?.toISOString(),
        })),
        skills: skills.map(s => s.name),
        languages: languages.map(l => `${l.name} (${l.proficiency})`),
      },
      createdAt: daysAgo(21),
    },
  });

  // CV 2: Still processing (simulates recent upload)
  await prisma.cV.upsert({
    where: { id: DEMO_CV_PROCESSING_ID },
    update: {},
    create: {
      id: DEMO_CV_PROCESSING_ID,
      userId: DEMO_USER_ID,
      profileId: null,
      type: CVType.UPLOADED,
      fileName: 'CV_Marie_Dupont_EN.pdf',
      filePath: `uploads/${DEMO_USER_ID}/cvs/CV_Marie_Dupont_EN.pdf`,
      fileSize: 198432,
      mimeType: 'application/pdf',
      parsingStatus: ParsingStatus.PROCESSING,
      isBaseline: false,
      createdAt: daysAgo(1),
    },
  });

  console.log('  Created 2 CVs (1 parsed, 1 processing)');
}
