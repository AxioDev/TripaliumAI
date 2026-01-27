import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { OpenAIService } from '../llm/openai.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { ProfileService } from '../profile/profile.service';
import { StorageService } from '../storage/storage.service';
import { RealtimeService } from '../realtime/realtime.service';
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
import {
  PdfGeneratorService,
  GeneratedCVContent,
  GeneratedCoverLetterContent,
} from './pdf-generator.service';

@Injectable()
export class DocumentGeneratorService implements OnModuleInit {
  private readonly logger = new Logger(DocumentGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly openaiService: OpenAIService,
    private readonly queueService: QueueService,
    private readonly profileService: ProfileService,
    private readonly storageService: StorageService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly realtimeService: RealtimeService,
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

    // Emit document generation started event
    this.realtimeService.documentGenerationStarted(
      userId,
      applicationId,
      application.jobOffer.title,
      application.jobOffer.company,
    );

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

      // Generate CV content using AI
      const generatedCV = (await this.openaiService.generateCV(
        profileData,
        jobOffer,
        generatedCVSchema,
        'generated_cv',
      )) as GeneratedCVContent;

      // Generate Cover Letter content using AI
      const generatedCoverLetter = (await this.openaiService.generateCoverLetter(
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          summary: profile.summary || '',
          motivationText: profile.motivationText || undefined,
        },
        jobOffer,
        generatedCoverLetterSchema,
        'generated_cover_letter',
      )) as GeneratedCoverLetterContent;

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

      const companySlug = application.jobOffer.company.replace(/\s+/g, '_');
      const nameSlug = `${profile.firstName}_${profile.lastName}`;

      // Generate and save CV (both JSON and PDF)
      await this.saveDocument({
        applicationId,
        userId,
        type: DocumentType.CV,
        version: nextVersion,
        content: generatedCV,
        profileData,
        jobOffer,
        nameSlug,
        companySlug,
        profile,
      });

      // Generate and save Cover Letter (both JSON and PDF)
      await this.saveDocument({
        applicationId,
        userId,
        type: DocumentType.COVER_LETTER,
        version: nextVersion,
        content: generatedCoverLetter,
        profileData,
        jobOffer,
        nameSlug,
        companySlug,
        profile,
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
        metadata: { version: nextVersion, formats: ['json', 'pdf'] },
        testMode,
      });

      // Emit CV generated event
      this.realtimeService.documentGenerated(
        userId,
        applicationId,
        'cv',
        nextVersion,
      );

      // Emit cover letter generated event
      this.realtimeService.documentGenerated(
        userId,
        applicationId,
        'cover_letter',
        nextVersion,
      );

      // Emit documents ready event with notification
      this.realtimeService.documentsReady(
        userId,
        applicationId,
        application.jobOffer.title,
        application.jobOffer.company,
      );

      return { success: true, version: nextVersion };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Document generation failed: ${errorMessage}`);

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

      // Emit document generation failed event
      this.realtimeService.documentGenerationFailed(
        userId,
        applicationId,
        errorMessage,
      );

      throw error;
    }
  }

  /**
   * Save a document in both JSON and PDF formats
   */
  private async saveDocument(params: {
    applicationId: string;
    userId: string;
    type: DocumentType;
    version: number;
    content: GeneratedCVContent | GeneratedCoverLetterContent;
    profileData: Record<string, unknown>;
    jobOffer: Record<string, unknown>;
    nameSlug: string;
    companySlug: string;
    profile: {
      firstName: string;
      lastName: string;
      email: string | null;
      phone: string | null;
      location: string | null;
    };
  }) {
    const {
      applicationId,
      userId,
      type,
      version,
      content,
      profileData,
      jobOffer,
      nameSlug,
      companySlug,
      profile,
    } = params;

    const typePrefix = type === DocumentType.CV ? 'CV' : 'CoverLetter';

    // Save JSON version
    const jsonFileName = `${typePrefix}_${nameSlug}_${companySlug}_v${version}.json`;
    const jsonContent = JSON.stringify(content, null, 2);
    const jsonFile = await this.storageService.store(
      Buffer.from(jsonContent),
      jsonFileName,
      'documents',
      userId,
    );

    await this.prisma.generatedDocument.create({
      data: {
        applicationId,
        userId,
        type,
        fileName: jsonFileName,
        filePath: jsonFile.path,
        fileSize: Buffer.from(jsonContent).length,
        mimeType: 'application/json',
        promptUsed: type === DocumentType.CV ? 'generateCV' : 'generateCoverLetter',
        modelUsed: 'gpt-4o',
        inputContext: { profileData, jobOffer } as unknown as Prisma.InputJsonValue,
        generatedJson: content as unknown as Prisma.InputJsonValue,
        version,
        isLatest: true,
      },
    });

    // Generate and save PDF version
    try {
      let pdfBuffer: Buffer;

      if (type === DocumentType.CV) {
        pdfBuffer = await this.pdfGeneratorService.generateCVPdf(
          content as GeneratedCVContent,
        );
      } else {
        pdfBuffer = await this.pdfGeneratorService.generateCoverLetterPdf(
          content as GeneratedCoverLetterContent,
          {
            firstName: profile.firstName,
            lastName: profile.lastName,
            email: profile.email || undefined,
            phone: profile.phone || undefined,
            location: profile.location || undefined,
          },
        );
      }

      const pdfFileName = `${typePrefix}_${nameSlug}_${companySlug}_v${version}.pdf`;
      const pdfFile = await this.storageService.store(
        pdfBuffer,
        pdfFileName,
        'documents',
        userId,
      );

      await this.prisma.generatedDocument.create({
        data: {
          applicationId,
          userId,
          type,
          fileName: pdfFileName,
          filePath: pdfFile.path,
          fileSize: pdfBuffer.length,
          mimeType: 'application/pdf',
          promptUsed: type === DocumentType.CV ? 'generateCV' : 'generateCoverLetter',
          modelUsed: 'gpt-4o',
          inputContext: { profileData, jobOffer } as unknown as Prisma.InputJsonValue,
          generatedJson: content as unknown as Prisma.InputJsonValue,
          version,
          isLatest: true,
        },
      });

      this.logger.log(`Generated PDF: ${pdfFileName}`);
    } catch (pdfError) {
      // Log PDF generation failure but don't fail the whole process
      // JSON documents are still available
      this.logger.error(
        `PDF generation failed for ${type}: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`,
      );
    }
  }
}
