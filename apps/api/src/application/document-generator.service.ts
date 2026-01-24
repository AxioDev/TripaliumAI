import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { OpenAIService } from '../llm/openai.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { ProfileService } from '../profile/profile.service';
import { StorageService } from '../storage/storage.service';
import {
  ActionType,
  ApplicationStatus,
  DocumentType,
} from '@tripalium/shared';
import {
  generatedCVSchema,
  generatedCoverLetterSchema,
} from '@tripalium/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class DocumentGeneratorService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly openaiService: OpenAIService,
    private readonly queueService: QueueService,
    private readonly profileService: ProfileService,
    private readonly storageService: StorageService,
  ) {}

  onModuleInit() {
    this.queueService.registerHandler(
      'document.generate',
      this.handleGenerateDocuments.bind(this),
    );
  }

  async handleGenerateDocuments(job: Job<JobPayload>) {
    const { applicationId } = job.data.data as { applicationId: string };
    const testMode = job.data.testMode ?? false;

    // Get application with job offer
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        jobOffer: true,
        campaign: true,
      },
    });

    if (!application) {
      throw new Error('Application not found');
    }

    const userId = application.userId;

    await this.logService.log({
      userId,
      entityType: 'application',
      entityId: applicationId,
      action: ActionType.DOCUMENT_GENERATION_STARTED,
      testMode,
    });

    try {
      // Update status to generating
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.GENERATING },
      });

      // Get user profile
      const profile = await this.profileService.getProfile(userId);

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Prepare profile data for CV generation
      const profileData = {
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedIn: profile.linkedIn,
        website: profile.website,
        summary: profile.summary || '',
        motivationText: profile.motivationText || undefined,
        workExperiences: profile.workExperiences.map((e) => ({
          company: e.company,
          title: e.title,
          location: e.location,
          startDate: e.startDate.toISOString().slice(0, 7),
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 7) : null,
          description: e.description || '',
          highlights: e.highlights,
        })),
        educations: profile.educations.map((e) => ({
          institution: e.institution,
          degree: e.degree,
          field: e.field,
          startDate: e.startDate ? e.startDate.toISOString().slice(0, 7) : null,
          endDate: e.endDate ? e.endDate.toISOString().slice(0, 7) : null,
          gpa: e.gpa,
          description: e.description,
        })),
        skills: profile.skills.map((s) => s.name),
        languages: profile.languages.map((l) => ({
          name: l.name,
          proficiency: l.proficiency,
        })),
      };

      const jobOffer = {
        title: application.jobOffer.title,
        company: application.jobOffer.company,
        description: application.jobOffer.description,
        requirements: application.jobOffer.requirements,
      };

      // Generate CV
      const generatedCV = await this.openaiService.generateCV(
        profileData,
        jobOffer,
        generatedCVSchema,
        'generated_cv',
      );

      // Generate Cover Letter
      const generatedCoverLetter = await this.openaiService.generateCoverLetter(
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          summary: profile.summary || '',
          motivationText: profile.motivationText || undefined,
        },
        jobOffer,
        generatedCoverLetterSchema,
        'generated_cover_letter',
      );

      // Mark old documents as not latest
      await this.prisma.generatedDocument.updateMany({
        where: { applicationId, isLatest: true },
        data: { isLatest: false },
      });

      // Get next version number
      const lastDoc = await this.prisma.generatedDocument.findFirst({
        where: { applicationId },
        orderBy: { version: 'desc' },
      });
      const nextVersion = (lastDoc?.version || 0) + 1;

      // Save CV document
      const cvFileName = `CV_${profile.firstName}_${profile.lastName}_${application.jobOffer.company.replace(/\s+/g, '_')}_v${nextVersion}.json`;
      const cvContent = JSON.stringify(generatedCV, null, 2);
      const cvFile = await this.storageService.store(
        Buffer.from(cvContent),
        cvFileName,
        'documents',
        userId,
      );
      const cvFilePath = cvFile.path;

      await this.prisma.generatedDocument.create({
        data: {
          applicationId,
          userId,
          type: DocumentType.CV,
          fileName: cvFileName,
          filePath: cvFilePath,
          fileSize: Buffer.from(cvContent).length,
          mimeType: 'application/json',
          promptUsed: 'generateCV',
          modelUsed: 'gpt-4o',
          inputContext: { profileData, jobOffer } as unknown as Prisma.InputJsonValue,
          generatedJson: generatedCV as unknown as Prisma.InputJsonValue,
          version: nextVersion,
          isLatest: true,
        },
      });

      // Save Cover Letter document
      const clFileName = `CoverLetter_${profile.firstName}_${profile.lastName}_${application.jobOffer.company.replace(/\s+/g, '_')}_v${nextVersion}.json`;
      const clContent = JSON.stringify(generatedCoverLetter, null, 2);
      const clFile = await this.storageService.store(
        Buffer.from(clContent),
        clFileName,
        'documents',
        userId,
      );
      const clFilePath = clFile.path;

      await this.prisma.generatedDocument.create({
        data: {
          applicationId,
          userId,
          type: DocumentType.COVER_LETTER,
          fileName: clFileName,
          filePath: clFilePath,
          fileSize: Buffer.from(clContent).length,
          mimeType: 'application/json',
          promptUsed: 'generateCoverLetter',
          modelUsed: 'gpt-4o',
          inputContext: {
            profile: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              summary: profile.summary,
            },
            jobOffer,
          },
          generatedJson: generatedCoverLetter as unknown as Prisma.InputJsonValue,
          version: nextVersion,
          isLatest: true,
        },
      });

      // Update application status to pending review
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.PENDING_REVIEW },
      });

      await this.logService.log({
        userId,
        entityType: 'application',
        entityId: applicationId,
        action: ActionType.DOCUMENT_GENERATED,
        metadata: { version: nextVersion },
        testMode,
      });

      return { success: true, version: nextVersion };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.application.update({
        where: { id: applicationId },
        data: { status: ApplicationStatus.GENERATION_FAILED },
      });

      await this.logService.log({
        userId,
        entityType: 'application',
        entityId: applicationId,
        action: ActionType.DOCUMENT_GENERATION_FAILED,
        status: 'failure',
        errorMessage,
        testMode,
      });

      throw error;
    }
  }
}
