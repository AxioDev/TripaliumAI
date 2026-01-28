import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { OpenAIService } from '../llm/openai.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { ProfileService } from '../profile/profile.service';
import { StorageService } from '../storage/storage.service';
import { RealtimeService } from '../realtime/realtime.service';
import { JobUnderstandingService } from '../job/job-understanding.service';
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
import { TemplateSelectorService } from './template-selector.service';
import { QualityAssessorService } from './quality-assessor.service';
import { CVTemplateId } from './templates/template-config';

// Define interfaces locally to avoid build order issues
interface JobUnderstanding {
  roleCategory: string;
  seniorityLevel: string;
  industryDomain: string;
  companySize: string | null;
  companyCulture: string[];
  companyValues: string[];
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  softSkillsRequired: string[];
  postingTone: string;
  expectedCommunicationStyle: string;
  keySellingPoints: string[];
  potentialConcerns: string[];
  uniqueHooks: string[];
}

interface PersonalizationScore {
  overallScore: number;
  dimensions: {
    companySpecificity: number;
    roleRelevance: number;
    toneAlignment: number;
    uniqueHookUsage: number;
    genericPhraseAvoidance: number;
  };
  genericPhrases: Array<{
    phrase: string;
    location: 'summary' | 'experience' | 'coverLetter';
    suggestion: string;
  }>;
  improvements: string[];
  verdict: 'excellent' | 'good' | 'acceptable' | 'needs_improvement' | 'rejected';
}

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
    private readonly jobUnderstandingService: JobUnderstandingService,
    private readonly templateSelectorService: TemplateSelectorService,
    private readonly qualityAssessorService: QualityAssessorService,
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

      // Get or generate job understanding for deep personalization
      let jobUnderstanding: JobUnderstanding | null = application.jobOffer.jobUnderstanding as JobUnderstanding | null;

      if (!jobUnderstanding) {
        // Try to generate job understanding if not already available
        try {
          this.logger.log(`Generating job understanding for application ${applicationId}`);
          jobUnderstanding = await this.jobUnderstandingService.analyzeJobPosting({
            title: application.jobOffer.title,
            company: application.jobOffer.company,
            description: application.jobOffer.description,
            requirements: application.jobOffer.requirements,
            location: application.jobOffer.location,
            salary: application.jobOffer.salary,
            contractType: application.jobOffer.contractType,
            remoteType: application.jobOffer.remoteType,
          });

          // Store the job understanding for future use
          await this.prisma.jobOffer.update({
            where: { id: application.jobOffer.id },
            data: { jobUnderstanding: jobUnderstanding as unknown as Prisma.InputJsonValue },
          });
        } catch (error) {
          this.logger.warn(`Failed to generate job understanding: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Extract candidate highlights relevant to this specific job
      const candidateHighlights = this.extractCandidateHighlights(profileData, jobUnderstanding);

      // Generate CV content using AI with deep job understanding
      const generatedCV = (await this.openaiService.generateCVWithContext(
        profileData,
        jobOffer,
        jobUnderstanding,
        generatedCVSchema,
        'generated_cv',
      )) as GeneratedCVContent;

      // Generate Cover Letter content using AI with deep job understanding
      const generatedCoverLetter = (await this.openaiService.generateCoverLetterWithContext(
        {
          firstName: profile.firstName,
          lastName: profile.lastName,
          summary: profile.summary || '',
          motivationText: profile.motivationText || undefined,
        },
        jobOffer,
        jobUnderstanding,
        candidateHighlights,
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

      // Select appropriate CV template based on job understanding and user/campaign preferences
      const userPreference = profile.preferredCVTemplate as CVTemplateId | null;
      const campaignPreference = application.campaign.cvTemplateId as CVTemplateId | null;
      const selectedTemplate = this.templateSelectorService.selectCVTemplate(
        jobUnderstanding,
        campaignPreference || userPreference,
      );

      this.logger.log(`Selected CV template: ${selectedTemplate} for ${jobOffer.title}`);

      // Assess personalization quality before saving
      let qualityScore: PersonalizationScore | null = null;
      try {
        this.logger.log(`Assessing personalization quality for application ${applicationId}`);
        qualityScore = await this.qualityAssessorService.assessPersonalization(
          generatedCV,
          generatedCoverLetter,
          jobOffer,
          jobUnderstanding,
        );

        this.logger.log(
          `Quality score: ${qualityScore.overallScore}/100 (${qualityScore.verdict}) for ${jobOffer.title}`,
        );

        // Log quality assessment result
        await this.logService.log({
          userId,
          entityType: 'application',
          entityId: applicationId,
          action: 'document.quality_assessed',
          metadata: {
            overallScore: qualityScore.overallScore,
            verdict: qualityScore.verdict,
            dimensions: qualityScore.dimensions,
            genericPhrasesCount: qualityScore.genericPhrases.length,
          },
          testMode,
        });
      } catch (error) {
        this.logger.warn(`Quality assessment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

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
        templateId: selectedTemplate,
        qualityScore,
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
        qualityScore,
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
        metadata: {
          version: nextVersion,
          formats: ['json', 'pdf'],
          templateId: selectedTemplate,
          qualityScore: qualityScore?.overallScore,
          qualityVerdict: qualityScore?.verdict,
        },
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
   * Extract candidate highlights relevant to a specific job
   */
  private extractCandidateHighlights(
    profileData: Record<string, unknown>,
    jobUnderstanding: JobUnderstanding | null,
  ): { relevantAchievements: string[]; matchingSkills: string[] } | null {
    if (!jobUnderstanding) {
      return null;
    }

    const skills = profileData.skills as string[] || [];
    const workExperiences = profileData.workExperiences as Array<{
      highlights: string[];
      title: string;
      company: string;
      description?: string;
    }> || [];

    // Find matching skills
    const mustHaveSkillsLower = jobUnderstanding.mustHaveSkills.map((s) => s.toLowerCase());
    const niceToHaveSkillsLower = jobUnderstanding.niceToHaveSkills?.map((s) => s.toLowerCase()) || [];
    const allTargetSkills = [...mustHaveSkillsLower, ...niceToHaveSkillsLower];

    const matchingSkills = skills.filter((skill) =>
      allTargetSkills.some(
        (target) =>
          skill.toLowerCase().includes(target) || target.includes(skill.toLowerCase()),
      ),
    );

    // Extract relevant achievements from work experience
    const relevantAchievements: string[] = [];
    const keyTerms = [
      ...jobUnderstanding.mustHaveSkills,
      ...jobUnderstanding.keySellingPoints,
      ...jobUnderstanding.uniqueHooks,
    ].map((t) => t.toLowerCase());

    for (const exp of workExperiences) {
      for (const highlight of exp.highlights || []) {
        const highlightLower = highlight.toLowerCase();
        if (keyTerms.some((term) => highlightLower.includes(term))) {
          relevantAchievements.push(highlight);
        }
      }
    }

    // If no direct matches, take top highlights from recent experiences
    if (relevantAchievements.length === 0 && workExperiences.length > 0) {
      for (const exp of workExperiences.slice(0, 2)) {
        relevantAchievements.push(...(exp.highlights || []).slice(0, 2));
      }
    }

    return {
      relevantAchievements: relevantAchievements.slice(0, 5),
      matchingSkills: matchingSkills.slice(0, 10),
    };
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
    templateId?: CVTemplateId;
    qualityScore?: PersonalizationScore | null;
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
      templateId,
      qualityScore,
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
        qualityScore: qualityScore as unknown as Prisma.InputJsonValue,
        templateId: templateId || null,
        version,
        isLatest: true,
      },
    });

    // Generate and save PDF version
    try {
      let pdfBuffer: Buffer;

      if (type === DocumentType.CV) {
        pdfBuffer = await this.pdfGeneratorService.generateCVPdfWithTemplate(
          content as GeneratedCVContent,
          templateId || 'professional',
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
          qualityScore: qualityScore as unknown as Prisma.InputJsonValue,
          templateId: templateId || null,
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
