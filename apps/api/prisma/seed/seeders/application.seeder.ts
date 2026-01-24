// =============================================================================
// Application Seeder - Creates demo applications and documents
// =============================================================================

import { PrismaClient, ApplicationStatus, ApplicationMethod, DocumentType, EmailStatus } from '@prisma/client';
import {
  DEMO_USER_ID,
  DEMO_CAMPAIGN_COMPLETED_ID,
  DEMO_CAMPAIGN_ACTIVE_ID,
} from '../config';
import { daysAgo, addRandomHours, demoId, generatePlaceholderText } from '../utils';

interface ApplicationData {
  company: string;
  status: ApplicationStatus;
  method?: ApplicationMethod;
  hasDocuments: boolean;
  hasEmail: boolean;
  emailStatus?: EmailStatus;
  daysAgoCreated: number;
  campaign: 'completed' | 'active';
}

const applications: ApplicationData[] = [
  // Completed campaign applications
  {
    company: 'Doctolib',
    status: ApplicationStatus.SUBMITTED,
    method: ApplicationMethod.EMAIL,
    hasDocuments: true,
    hasEmail: true,
    emailStatus: EmailStatus.SENT,
    daysAgoCreated: 14,
    campaign: 'completed',
  },
  {
    company: 'Datadog',
    status: ApplicationStatus.READY_TO_SUBMIT,
    method: ApplicationMethod.EXTERNAL,
    hasDocuments: true,
    hasEmail: false,
    daysAgoCreated: 12,
    campaign: 'completed',
  },
  {
    company: 'BlaBlaCar',
    status: ApplicationStatus.PENDING_REVIEW,
    hasDocuments: true,
    hasEmail: false,
    daysAgoCreated: 10,
    campaign: 'completed',
  },
  {
    company: 'Swile',
    status: ApplicationStatus.SUBMITTED,
    method: ApplicationMethod.EXTERNAL,
    hasDocuments: true,
    hasEmail: true,
    emailStatus: EmailStatus.SENT,
    daysAgoCreated: 8,
    campaign: 'completed',
  },
  {
    company: 'Mirakl',
    status: ApplicationStatus.PENDING_GENERATION,
    hasDocuments: false,
    hasEmail: false,
    daysAgoCreated: 5,
    campaign: 'completed',
  },
  {
    company: 'Alan',
    status: ApplicationStatus.GENERATING,
    hasDocuments: false,
    hasEmail: false,
    daysAgoCreated: 4,
    campaign: 'completed',
  },
  {
    company: 'Qonto',
    status: ApplicationStatus.WITHDRAWN,
    hasDocuments: true,
    hasEmail: false,
    daysAgoCreated: 7,
    campaign: 'completed',
  },

  // Active campaign application
  {
    company: 'Spendesk',
    status: ApplicationStatus.PENDING_GENERATION,
    hasDocuments: false,
    hasEmail: false,
    daysAgoCreated: 2,
    campaign: 'active',
  },
];

export async function seedApplications(prisma: PrismaClient): Promise<void> {
  console.log('Seeding demo applications...');

  // Delete existing demo applications first
  await prisma.application.deleteMany({
    where: {
      id: { startsWith: 'demo_' },
    },
  });

  let appIndex = 0;
  let docIndex = 0;
  let emailIndex = 0;

  for (const app of applications) {
    // Find the job for this application
    const job = await prisma.jobOffer.findFirst({
      where: {
        company: app.company,
        id: { startsWith: 'demo_' },
      },
    });

    if (!job) {
      console.log(`  Warning: Job not found for ${app.company}, skipping application`);
      continue;
    }

    const campaignId = app.campaign === 'completed'
      ? DEMO_CAMPAIGN_COMPLETED_ID
      : DEMO_CAMPAIGN_ACTIVE_ID;

    const applicationId = demoId('application', appIndex);
    const createdAt = addRandomHours(daysAgo(app.daysAgoCreated), 0, 8);

    // Determine timestamps based on status
    let confirmedAt: Date | null = null;
    let submittedAt: Date | null = null;

    const confirmedStatuses: ApplicationStatus[] = [
      ApplicationStatus.READY_TO_SUBMIT,
      ApplicationStatus.SUBMITTING,
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.WITHDRAWN,
    ];
    if (confirmedStatuses.includes(app.status)) {
      confirmedAt = addRandomHours(createdAt, 2, 24);
    }

    if (app.status === ApplicationStatus.SUBMITTED) {
      submittedAt = addRandomHours(confirmedAt || createdAt, 1, 12);
    }

    // Create application
    await prisma.application.create({
      data: {
        id: applicationId,
        jobOfferId: job.id,
        userId: DEMO_USER_ID,
        campaignId,
        status: app.status,
        method: app.method || null,
        requiresConfirm: true,
        confirmedAt,
        confirmedBy: confirmedAt ? DEMO_USER_ID : null,
        submittedAt,
        submissionNotes: submittedAt ? 'Application submitted via platform' : null,
        testMode: false,
        createdAt,
      },
    });

    // Update job status to APPLIED if application was created
    await prisma.jobOffer.update({
      where: { id: job.id },
      data: { status: 'APPLIED' },
    });

    // Create documents if needed
    if (app.hasDocuments) {
      const sanitizedCompany = app.company.toLowerCase().replace(/\s+/g, '_');

      // CV Document
      await prisma.generatedDocument.create({
        data: {
          id: demoId('document', docIndex++),
          applicationId,
          userId: DEMO_USER_ID,
          type: DocumentType.CV,
          fileName: `CV_Marie_Dupont_${app.company}.pdf`,
          filePath: `uploads/${DEMO_USER_ID}/generated/cv_${sanitizedCompany}.pdf`,
          fileSize: 180000 + Math.floor(Math.random() * 50000),
          mimeType: 'application/pdf',
          promptUsed: `Generate a tailored CV for Marie Dupont applying to ${app.company} for the ${job.title} position.`,
          modelUsed: 'gpt-4',
          inputContext: {
            candidateName: 'Marie Dupont',
            targetCompany: app.company,
            targetRole: job.title,
            relevantSkills: ['React', 'TypeScript', 'Node.js'],
          },
          generatedJson: {
            header: {
              name: 'Marie Dupont',
              title: 'Senior Full-Stack Engineer',
              email: 'marie.dupont@demo.tripalium.ai',
              phone: '+33 6 12 34 56 78',
              location: 'Paris, France',
            },
            summary: `Experienced Full-Stack Engineer with 8 years of expertise in React, Node.js, and cloud architecture. Proven track record at TechVision Paris and DataFlow Solutions. Excited to bring my skills to ${app.company}.`,
            experience: [
              {
                company: 'TechVision Paris',
                title: 'Senior Full-Stack Engineer',
                dates: '2021 - Present',
                highlights: [
                  'Led micro-frontend architecture reducing build time by 60%',
                  'Mentored 3 junior developers',
                ],
              },
            ],
            skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
          },
          version: 1,
          isLatest: true,
          generatedAt: addRandomHours(createdAt, 0, 2),
          createdAt: addRandomHours(createdAt, 0, 2),
        },
      });

      // Cover Letter Document
      await prisma.generatedDocument.create({
        data: {
          id: demoId('document', docIndex++),
          applicationId,
          userId: DEMO_USER_ID,
          type: DocumentType.COVER_LETTER,
          fileName: `Cover_Letter_Marie_Dupont_${app.company}.pdf`,
          filePath: `uploads/${DEMO_USER_ID}/generated/cover_letter_${sanitizedCompany}.pdf`,
          fileSize: 45000 + Math.floor(Math.random() * 15000),
          mimeType: 'application/pdf',
          promptUsed: `Generate a personalized cover letter for Marie Dupont applying to ${app.company} for the ${job.title} position.`,
          modelUsed: 'gpt-4',
          inputContext: {
            candidateName: 'Marie Dupont',
            targetCompany: app.company,
            targetRole: job.title,
            companyInfo: `${app.company} is a leading French tech company.`,
          },
          generatedJson: {
            greeting: `Dear ${app.company} Hiring Team,`,
            opening: `I am writing to express my strong interest in the ${job.title} position at ${app.company}. With 8 years of experience in full-stack development, I am excited about the opportunity to contribute to your team.`,
            body: generatePlaceholderText(4),
            closing: 'I look forward to discussing how my experience and skills can benefit your team.',
            signature: 'Marie Dupont',
          },
          version: 1,
          isLatest: true,
          generatedAt: addRandomHours(createdAt, 0, 2),
          createdAt: addRandomHours(createdAt, 0, 2),
        },
      });
    }

    // Create email record if needed
    if (app.hasEmail) {
      await prisma.emailRecord.create({
        data: {
          id: demoId('email', emailIndex++),
          applicationId,
          userId: DEMO_USER_ID,
          toAddress: `careers@${app.company.toLowerCase().replace(/\s+/g, '')}.com`,
          fromAddress: 'marie.dupont@demo.tripalium.ai',
          subject: `Application for ${job.title} - Marie Dupont`,
          bodyHtml: `<p>Dear Hiring Team,</p><p>Please find attached my application for the ${job.title} position.</p><p>Best regards,<br>Marie Dupont</p>`,
          bodyText: `Dear Hiring Team,\n\nPlease find attached my application for the ${job.title} position.\n\nBest regards,\nMarie Dupont`,
          attachments: [
            { name: `CV_Marie_Dupont_${app.company}.pdf`, type: 'application/pdf' },
            { name: `Cover_Letter_Marie_Dupont_${app.company}.pdf`, type: 'application/pdf' },
          ],
          status: app.emailStatus || EmailStatus.QUEUED,
          sentAt: app.emailStatus === EmailStatus.SENT ? addRandomHours(daysAgo(app.daysAgoCreated), 1, 24) : null,
          dryRun: false,
          createdAt: addRandomHours(createdAt, 1, 2),
        },
      });
    }

    appIndex++;
  }

  console.log(`  Created ${appIndex} applications`);
  console.log(`  Created ${docIndex} generated documents`);
  console.log(`  Created ${emailIndex} email records`);
}
