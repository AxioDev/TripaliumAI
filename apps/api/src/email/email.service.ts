import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { ActionType, EmailStatus } from '@tripalium/shared';

export interface EmailPayload {
  to: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  attachments?: Array<{
    filename: string;
    path: string;
  }>;
}

@Injectable()
export class EmailService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private fromAddress: string;
  private isRealEmailEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  onModuleInit() {
    this.fromAddress =
      this.configService.get<string>('SMTP_FROM') || 'noreply@tripalium.local';

    this.isRealEmailEnabled =
      this.configService.get<string>('ENABLE_REAL_EMAIL') === 'true';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST') || 'localhost',
      port: parseInt(this.configService.get<string>('SMTP_PORT') || '1025', 10),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth:
        this.configService.get<string>('SMTP_USER') &&
        this.configService.get<string>('SMTP_PASS')
          ? {
              user: this.configService.get<string>('SMTP_USER'),
              pass: this.configService.get<string>('SMTP_PASS'),
            }
          : undefined,
    });
  }

  /**
   * Queue an email for sending
   */
  async queueEmail(
    userId: string,
    payload: EmailPayload,
    applicationId?: string,
    testMode = false,
  ) {
    const dryRun = testMode || !this.isRealEmailEnabled;

    const emailRecord = await this.prisma.emailRecord.create({
      data: {
        userId,
        applicationId,
        toAddress: payload.to,
        fromAddress: this.fromAddress,
        subject: payload.subject,
        bodyHtml: payload.bodyHtml,
        bodyText: payload.bodyText,
        attachments: payload.attachments || [],
        status: EmailStatus.QUEUED,
        dryRun,
      },
    });

    await this.logService.log({
      userId,
      entityType: 'email',
      entityId: emailRecord.id,
      action: ActionType.EMAIL_QUEUED,
      metadata: {
        to: payload.to,
        subject: payload.subject,
        dryRun,
      },
      testMode,
    });

    // Process immediately for POC (in production, use queue)
    await this.sendEmail(emailRecord.id);

    return emailRecord;
  }

  /**
   * Send a queued email
   */
  async sendEmail(emailId: string) {
    const email = await this.prisma.emailRecord.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error('Email not found');
    }

    // Update status to sending
    await this.prisma.emailRecord.update({
      where: { id: emailId },
      data: { status: EmailStatus.SENDING },
    });

    try {
      if (email.dryRun) {
        // Dry run - just log, don't send
        console.log(`[DRY RUN] Would send email to ${email.toAddress}`);
        console.log(`  Subject: ${email.subject}`);
        console.log(`  Body preview: ${email.bodyText.substring(0, 100)}...`);

        await this.prisma.emailRecord.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            messageId: `dry-run-${Date.now()}`,
          },
        });
      } else {
        // Actually send the email
        const result = await this.transporter.sendMail({
          from: email.fromAddress,
          to: email.toAddress,
          subject: email.subject,
          html: email.bodyHtml,
          text: email.bodyText,
          attachments: (email.attachments as Array<{ filename: string; path: string }>) || [],
        });

        await this.prisma.emailRecord.update({
          where: { id: emailId },
          data: {
            status: EmailStatus.SENT,
            sentAt: new Date(),
            messageId: result.messageId,
          },
        });
      }

      await this.logService.log({
        userId: email.userId,
        entityType: 'email',
        entityId: emailId,
        action: ActionType.EMAIL_SENT,
        testMode: email.dryRun,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.emailRecord.update({
        where: { id: emailId },
        data: {
          status: EmailStatus.FAILED,
          errorMessage,
          retryCount: { increment: 1 },
        },
      });

      await this.logService.log({
        userId: email.userId,
        entityType: 'email',
        entityId: emailId,
        action: ActionType.EMAIL_FAILED,
        status: 'failure',
        errorMessage,
        testMode: email.dryRun,
      });

      throw error;
    }
  }

  /**
   * Retry a failed email
   */
  async retryEmail(emailId: string, userId: string) {
    const email = await this.prisma.emailRecord.findFirst({
      where: {
        id: emailId,
        userId,
        status: EmailStatus.FAILED,
      },
    });

    if (!email) {
      throw new Error('Email not found or not in failed state');
    }

    if (email.retryCount >= 3) {
      throw new Error('Maximum retry attempts reached');
    }

    await this.prisma.emailRecord.update({
      where: { id: emailId },
      data: { status: EmailStatus.QUEUED },
    });

    await this.sendEmail(emailId);
  }

  /**
   * Get email by ID
   */
  async getEmail(emailId: string, userId: string) {
    return this.prisma.emailRecord.findFirst({
      where: {
        id: emailId,
        userId,
      },
    });
  }

  /**
   * List emails for a user
   */
  async listEmails(userId: string, applicationId?: string) {
    return this.prisma.emailRecord.findMany({
      where: {
        userId,
        ...(applicationId && { applicationId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
