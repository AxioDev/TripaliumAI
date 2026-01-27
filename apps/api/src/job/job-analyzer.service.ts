import { Injectable, OnModuleInit } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { OpenAIService } from '../llm/openai.service';
import { QueueService, JobPayload } from '../queue/queue.service';
import { ProfileService } from '../profile/profile.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ActionType, JobOfferStatus, ApplicationStatus } from '@tripalium/shared';
import { jobAnalysisSchema } from '@tripalium/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class JobAnalyzerService implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly openaiService: OpenAIService,
    private readonly queueService: QueueService,
    private readonly profileService: ProfileService,
    private readonly realtimeService: RealtimeService,
  ) {}

  onModuleInit() {
    this.queueService.registerHandler('job.analyze', this.handleAnalyzeJob.bind(this));
  }

  async handleAnalyzeJob(job: Job<JobPayload>) {
    const { jobId, campaignId } = job.data.data as { jobId: string; campaignId: string };
    const testMode = job.data.testMode ?? false;

    // Get job offer with campaign
    const jobOffer = await this.prisma.jobOffer.findUnique({
      where: { id: jobId },
      include: {
        campaign: true,
      },
    });

    if (!jobOffer) {
      throw new Error('Job offer not found');
    }

    const userId = jobOffer.campaign.userId;

    await this.logService.log({
      userId,
      entityType: 'job_offer',
      entityId: jobId,
      action: ActionType.JOB_ANALYSIS_STARTED,
      testMode,
    });

    try {
      // Update status to analyzing
      await this.prisma.jobOffer.update({
        where: { id: jobId },
        data: { status: JobOfferStatus.ANALYZING },
      });

      // Get user profile
      const profile = await this.profileService.getProfile(userId);

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Prepare data for analysis
      const jobData = {
        title: jobOffer.title,
        company: jobOffer.company,
        description: jobOffer.description,
        requirements: jobOffer.requirements,
      };

      const profileData = {
        summary: profile.summary || '',
        skills: profile.skills.map((s) => s.name),
        experience: profile.workExperiences.map((e) => ({
          title: e.title,
          company: e.company,
          description: e.description || '',
        })),
        education: profile.educations.map((e) => ({
          degree: e.degree,
          field: e.field || '',
        })),
      };

      // Call OpenAI for analysis
      const analysis = await this.openaiService.analyzeJobMatch(
        jobData,
        profileData,
        jobAnalysisSchema,
        'job_analysis',
      );

      // Update job offer with analysis results
      const meetsThreshold = analysis.matchScore >= jobOffer.campaign.matchThreshold;
      const newStatus = meetsThreshold
        ? JobOfferStatus.MATCHED
        : JobOfferStatus.REJECTED;

      await this.prisma.jobOffer.update({
        where: { id: jobId },
        data: {
          matchScore: analysis.matchScore,
          matchAnalysis: analysis as unknown as Prisma.InputJsonValue,
          status: newStatus,
        },
      });

      await this.logService.log({
        userId,
        entityType: 'job_offer',
        entityId: jobId,
        action: ActionType.JOB_ANALYZED,
        metadata: {
          matchScore: analysis.matchScore,
          recommendation: analysis.recommendation,
          meetsThreshold,
        },
        testMode,
      });

      // Emit job matched event if meets threshold
      if (meetsThreshold) {
        this.realtimeService.jobMatched(
          userId,
          campaignId,
          jobId,
          analysis.matchScore,
          analysis.recommendation,
        );
      }

      // If matched and auto-apply is enabled, create application
      if (meetsThreshold && jobOffer.campaign.autoApply) {
        await this.createApplication(jobId, campaignId, userId, testMode);

        await this.logService.log({
          userId,
          entityType: 'job_offer',
          entityId: jobId,
          action: ActionType.JOB_MATCHED,
          metadata: { autoApply: true },
          testMode,
        });
      }

      return analysis;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.jobOffer.update({
        where: { id: jobId },
        data: {
          status: JobOfferStatus.ERROR,
        },
      });

      await this.logService.log({
        userId,
        entityType: 'job_offer',
        entityId: jobId,
        action: ActionType.JOB_ANALYSIS_FAILED,
        status: 'failure',
        errorMessage,
        testMode,
      });

      throw error;
    }
  }

  private async createApplication(
    jobId: string,
    campaignId: string,
    userId: string,
    testMode: boolean,
  ) {
    // Create application record
    const application = await this.prisma.application.create({
      data: {
        jobOfferId: jobId,
        userId,
        campaignId,
        status: ApplicationStatus.PENDING_GENERATION,
        requiresConfirm: true, // Always require confirmation for now
        testMode,
      },
    });

    // Update job status
    await this.prisma.jobOffer.update({
      where: { id: jobId },
      data: { status: JobOfferStatus.APPLIED },
    });

    await this.logService.log({
      userId,
      entityType: 'application',
      entityId: application.id,
      action: ActionType.APPLICATION_CREATED,
      testMode,
    });

    // Queue document generation
    await this.queueService.addJob({
      type: 'document.generate',
      data: { applicationId: application.id },
      userId,
      testMode,
    });

    return application;
  }
}
