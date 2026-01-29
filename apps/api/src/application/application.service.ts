import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { ActionType, ApplicationStatus } from '@tripalium/shared';

@Injectable()
export class ApplicationService {
  private readonly maxApplicationsPerDay: number;
  private readonly maxApplicationsPerWeek: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly storageService: StorageService,
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly configService: ConfigService,
  ) {
    this.maxApplicationsPerDay = this.configService.get<number>(
      'MAX_APPLICATIONS_PER_DAY',
      20,
    );
    this.maxApplicationsPerWeek = this.configService.get<number>(
      'MAX_APPLICATIONS_PER_WEEK',
      100,
    );
  }

  /**
   * Check rate limits for a user
   * @throws HttpException if rate limit exceeded
   */
  private async checkRateLimits(userId: string, campaignId?: string): Promise<void> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Count submissions in the last 24 hours
    const dailyCount = await this.prisma.application.count({
      where: {
        userId,
        testMode: false,
        submittedAt: { gte: oneDayAgo },
        status: ApplicationStatus.SUBMITTED,
      },
    });

    if (dailyCount >= this.maxApplicationsPerDay) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Daily application limit reached (${this.maxApplicationsPerDay}/day). Please try again tomorrow.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Count submissions in the last week
    const weeklyCount = await this.prisma.application.count({
      where: {
        userId,
        testMode: false,
        submittedAt: { gte: oneWeekAgo },
        status: ApplicationStatus.SUBMITTED,
      },
    });

    if (weeklyCount >= this.maxApplicationsPerWeek) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Weekly application limit reached (${this.maxApplicationsPerWeek}/week). Please try again next week.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Check campaign-specific limit if provided
    if (campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        select: { maxApplications: true },
      });

      if (campaign) {
        const campaignCount = await this.prisma.application.count({
          where: {
            campaignId,
            testMode: false,
            status: ApplicationStatus.SUBMITTED,
          },
        });

        if (campaignCount >= campaign.maxApplications) {
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `Campaign application limit reached (${campaign.maxApplications}). Create a new campaign to continue applying.`,
              error: 'Too Many Requests',
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }
  }

  async getApplication(applicationId: string, userId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, userId },
      include: {
        jobOffer: true,
        documents: { where: { isLatest: true } },
        emails: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async listApplications(
    userId: string,
    options?: {
      campaignId?: string;
      status?: ApplicationStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 20, campaignId, status } = options || {};
    const skip = (page - 1) * limit;

    const where = {
      userId,
      ...(campaignId && { campaignId }),
      ...(status && { status }),
    };

    const [applications, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          jobOffer: {
            select: {
              id: true,
              title: true,
              company: true,
              location: true,
            },
          },
        },
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      data: applications,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + applications.length < total,
      },
    };
  }

  async confirmApplication(applicationId: string, userId: string, notes?: string) {
    const application = await this.getApplication(applicationId, userId);

    if (application.status !== ApplicationStatus.PENDING_REVIEW) {
      throw new BadRequestException('Application not pending review');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.READY_TO_SUBMIT,
        confirmedAt: new Date(),
        confirmedBy: 'user',
        submissionNotes: notes,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'application',
      entityId: applicationId,
      action: ActionType.APPLICATION_CONFIRMED,
      testMode: application.testMode,
    });

    return updated;
  }

  async withdrawApplication(applicationId: string, userId: string) {
    const application = await this.getApplication(applicationId, userId);

    if (application.status === ApplicationStatus.SUBMITTED) {
      throw new BadRequestException('Cannot withdraw submitted application');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.WITHDRAWN },
    });

    await this.logService.log({
      userId,
      entityType: 'application',
      entityId: applicationId,
      action: ActionType.APPLICATION_WITHDRAWN,
    });

    return updated;
  }

  async markSubmitted(applicationId: string, userId: string, notes?: string) {
    const application = await this.getApplication(applicationId, userId);

    if (
      application.status !== ApplicationStatus.READY_TO_SUBMIT &&
      application.status !== ApplicationStatus.PENDING_REVIEW
    ) {
      throw new BadRequestException('Application not ready for submission');
    }

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.SUBMITTED,
        submittedAt: new Date(),
        submissionNotes: notes,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'application',
      entityId: applicationId,
      action: ActionType.APPLICATION_SUBMITTED,
      testMode: application.testMode,
    });

    return updated;
  }

  async getDocuments(applicationId: string, userId: string) {
    await this.getApplication(applicationId, userId);

    return this.prisma.generatedDocument.findMany({
      where: { applicationId },
      orderBy: [{ type: 'asc' }, { version: 'desc' }],
    });
  }

  async getDocument(documentId: string, userId: string) {
    const document = await this.prisma.generatedDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  async downloadDocument(documentId: string, userId: string) {
    const document = await this.getDocument(documentId, userId);
    const filePath = this.storageService.getAbsolutePath(document.filePath);

    return { filePath, fileName: document.fileName };
  }

  async getDocumentContent(documentId: string, userId: string) {
    const document = await this.getDocument(documentId, userId);
    return {
      id: document.id,
      type: document.type,
      fileName: document.fileName,
      version: document.version,
      content: document.generatedJson,
      generatedAt: document.generatedAt,
    };
  }

  async regenerateDocuments(applicationId: string, userId: string) {
    const application = await this.getApplication(applicationId, userId);

    // Only allow regeneration for pending review or generation failed status
    if (
      application.status !== ApplicationStatus.PENDING_REVIEW &&
      application.status !== ApplicationStatus.GENERATION_FAILED
    ) {
      throw new BadRequestException('Cannot regenerate documents in current status');
    }

    // Update status back to pending generation
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.PENDING_GENERATION },
    });

    await this.logService.log({
      userId,
      entityType: 'application',
      entityId: applicationId,
      action: ActionType.DOCUMENT_GENERATION_STARTED,
      metadata: { regenerate: true },
      testMode: application.testMode,
    });

    // Queue document generation
    await this.queueService.addJob({
      type: 'document.generate',
      data: { applicationId },
      userId,
      testMode: application.testMode,
    });

    return { queued: true };
  }

  async sendApplicationEmail(
    applicationId: string,
    userId: string,
    recipientEmail?: string,
    customMessage?: string,
  ) {
    const application = await this.getApplication(applicationId, userId);

    // Check application is ready to submit or already submitted
    if (
      application.status !== ApplicationStatus.READY_TO_SUBMIT &&
      application.status !== ApplicationStatus.SUBMITTED &&
      application.status !== ApplicationStatus.PENDING_REVIEW
    ) {
      throw new BadRequestException(
        'Application must be ready to submit or already submitted to send email',
      );
    }

    // Check rate limits for production applications
    if (!application.testMode) {
      await this.checkRateLimits(userId, application.campaignId);
    }

    // Determine recipient email - use provided email, or fall back to job posting email
    const jobOffer = await this.prisma.jobOffer.findUnique({
      where: { id: application.jobOfferId },
    });

    const finalRecipientEmail =
      recipientEmail || jobOffer?.applicationEmail;

    if (!finalRecipientEmail) {
      throw new BadRequestException(
        'No recipient email provided and no application email found in job posting',
      );
    }

    // Get user profile for applicant info
    const profile = await this.prisma.profile.findFirst({
      where: { userId },
    });

    if (!profile) {
      throw new BadRequestException('Profile not found. Please complete your profile first.');
    }

    const applicantName = `${profile.firstName} ${profile.lastName}`;
    const applicantEmail = profile.email || '';

    // Get cover letter content
    const coverLetterDoc = application.documents.find(
      (d) => d.type === 'COVER_LETTER' && d.isLatest,
    );
    const coverLetterContent = coverLetterDoc
      ? this.emailTemplateService.extractCoverLetterText(coverLetterDoc.generatedJson)
      : undefined;

    // Use custom message as cover letter if provided
    const finalCoverLetter = customMessage || coverLetterContent;

    // Generate email content
    const emailData = {
      applicantName,
      applicantEmail,
      position: application.jobOffer.title,
      company: application.jobOffer.company,
      coverLetterContent: finalCoverLetter,
    };

    const subject = this.emailTemplateService.generateApplicationSubject(emailData);
    const bodyHtml = this.emailTemplateService.generateApplicationHtml(emailData);
    const bodyText = this.emailTemplateService.generateApplicationText(emailData);

    // Get attachments - prefer PDF versions if available
    const attachments: Array<{ filename: string; path: string }> = [];

    // Find CV document - prefer PDF over JSON
    const cvDocs = application.documents.filter((d) => d.type === 'CV' && d.isLatest);
    const cvPdf = cvDocs.find((d) => d.mimeType === 'application/pdf');
    const cvDoc = cvPdf || cvDocs.find((d) => d.mimeType === 'application/json');

    if (cvDoc) {
      attachments.push({
        filename: cvDoc.fileName,
        path: this.storageService.getAbsolutePath(cvDoc.filePath),
      });
    }

    // Also attach cover letter PDF if available
    const coverLetterDocs = application.documents.filter(
      (d) => d.type === 'COVER_LETTER' && d.isLatest,
    );
    const coverLetterPdf = coverLetterDocs.find((d) => d.mimeType === 'application/pdf');

    if (coverLetterPdf) {
      attachments.push({
        filename: coverLetterPdf.fileName,
        path: this.storageService.getAbsolutePath(coverLetterPdf.filePath),
      });
    }

    // Queue email
    const emailRecord = await this.emailService.queueEmail(
      userId,
      {
        to: finalRecipientEmail,
        subject,
        bodyHtml,
        bodyText,
        attachments,
      },
      applicationId,
      application.testMode,
    );

    // Update application method to EMAIL and mark as submitting
    await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        method: 'EMAIL',
        status:
          application.status === ApplicationStatus.READY_TO_SUBMIT
            ? ApplicationStatus.SUBMITTING
            : application.status,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'application',
      entityId: applicationId,
      action: ActionType.APPLICATION_SUBMITTED,
      metadata: {
        method: 'EMAIL',
        recipient: finalRecipientEmail,
        attachments: attachments.map((a) => a.filename),
      },
      testMode: application.testMode,
    });

    return {
      emailId: emailRecord.id,
      status: emailRecord.status,
      dryRun: emailRecord.dryRun,
      recipient: finalRecipientEmail,
    };
  }

  /**
   * Get the suggested recipient email for an application
   */
  async getSuggestedRecipient(applicationId: string, userId: string) {
    const application = await this.getApplication(applicationId, userId);

    const jobOffer = await this.prisma.jobOffer.findUnique({
      where: { id: application.jobOfferId },
    });

    return {
      applicationEmail: jobOffer?.applicationEmail || null,
      applicationUrl: jobOffer?.applicationUrl || null,
      jobUrl: jobOffer?.url || null,
    };
  }

  async getApplicationEmails(applicationId: string, userId: string) {
    await this.getApplication(applicationId, userId);

    return this.emailService.listEmails(userId, applicationId);
  }
}
