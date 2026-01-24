import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { StorageService } from '../storage/storage.service';
import { QueueService } from '../queue/queue.service';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { ActionType, ApplicationStatus } from '@tripalium/shared';

@Injectable()
export class ApplicationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
    private readonly storageService: StorageService,
    private readonly queueService: QueueService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

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
    recipientEmail: string,
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

    // Get attachments (CV)
    const attachments: Array<{ filename: string; path: string }> = [];
    const cvDoc = application.documents.find((d) => d.type === 'CV' && d.isLatest);
    if (cvDoc) {
      attachments.push({
        filename: cvDoc.fileName,
        path: this.storageService.getAbsolutePath(cvDoc.filePath),
      });
    }

    // Queue email
    const emailRecord = await this.emailService.queueEmail(
      userId,
      {
        to: recipientEmail,
        subject,
        bodyHtml,
        bodyText,
        attachments,
      },
      applicationId,
      application.testMode,
    );

    // Update application method to EMAIL if not already submitted
    if (application.status !== ApplicationStatus.SUBMITTED) {
      await this.prisma.application.update({
        where: { id: applicationId },
        data: { method: 'EMAIL' },
      });
    }

    return {
      emailId: emailRecord.id,
      status: emailRecord.status,
      dryRun: emailRecord.dryRun,
    };
  }

  async getApplicationEmails(applicationId: string, userId: string) {
    await this.getApplication(applicationId, userId);

    return this.emailService.listEmails(userId, applicationId);
  }
}
