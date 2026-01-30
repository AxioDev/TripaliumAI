import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { StorageService } from '../storage/storage.service';
import { EmailService } from '../email/email.service';
import { EmailTemplateService } from '../email/email-template.service';
import { ActionType, PlanTier } from '@tripalium/shared';
import { BillingService } from '../billing/billing.service';

export interface JwtPayload {
  sub: string;
  email: string;
}

export interface AuthResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    plan: PlanTier;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly logService: LogService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly billingService: BillingService,
  ) {}

  async signup(
    email: string,
    password: string,
    consentGiven: boolean,
    privacyPolicyVersion?: string,
  ): Promise<AuthResponse> {
    // Require consent for GDPR compliance
    if (!consentGiven) {
      throw new BadRequestException(
        'You must agree to the Privacy Policy and Terms of Service to create an account',
      );
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user with consent
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        consentGiven: true,
        consentGivenAt: new Date(),
        privacyPolicyVersion: privacyPolicyVersion || '1.0',
      },
    });

    // Initialize billing (FREE plan + Stripe Customer)
    await this.billingService.initializeUserBilling(user.id, user.email);

    // Log action
    await this.logService.log({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: ActionType.USER_SIGNUP,
      metadata: { email },
    });

    // Log consent
    await this.logService.logSensitive({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: ActionType.USER_CONSENT_GIVEN,
      metadata: { privacyPolicyVersion: privacyPolicyVersion || '1.0' },
    });

    // Generate token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        plan: PlanTier.FREE,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Log action
    await this.logService.log({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: ActionType.USER_LOGIN,
    });

    // Get user plan
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    });

    // Generate token
    const accessToken = this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        plan: (subscription?.plan as PlanTier) || PlanTier.FREE,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        subscription: {
          select: { plan: true },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
      plan: (user.subscription?.plan as PlanTier) || PlanTier.FREE,
    };
  }

  /**
   * Delete user account (GDPR Article 17 - Right to Erasure)
   * Performs a soft delete first, hard delete after retention period
   */
  async deleteAccount(userId: string): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        campaigns: true,
        cvs: true,
        applications: { include: { documents: true } },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // 0. Cancel billing (Stripe subscription + local records)
    await this.billingService.cancelUserBilling(userId);

    // 1. Cancel all active campaigns
    await this.prisma.campaign.updateMany({
      where: {
        userId,
        status: { in: ['DRAFT', 'ACTIVE', 'PAUSED'] },
      },
      data: {
        status: 'COMPLETED',
        stoppedAt: new Date(),
      },
    });

    // 2. Delete all storage files (CVs, documents, photos)
    await this.storageService.deleteUserFiles(userId);

    // 3. Delete CV records and generated documents
    await this.prisma.generatedDocument.deleteMany({
      where: { userId },
    });

    await this.prisma.cV.deleteMany({
      where: { userId },
    });

    // 4. Delete applications
    await this.prisma.application.deleteMany({
      where: { userId },
    });

    // 5. Delete email records
    await this.prisma.emailRecord.deleteMany({
      where: { userId },
    });

    // 6. Delete job offers (cascade from campaigns)
    for (const campaign of user.campaigns) {
      await this.prisma.jobOffer.deleteMany({
        where: { campaignId: campaign.id },
      });
    }

    // 7. Delete campaigns
    await this.prisma.campaign.deleteMany({
      where: { userId },
    });

    // 8. Delete profile (will cascade to work experiences, education, skills, etc.)
    await this.prisma.profile.deleteMany({
      where: { userId },
    });

    // 9. Delete password reset tokens
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId },
    });

    // 10. Delete API keys
    await this.prisma.apiKey.deleteMany({
      where: { userId },
    });

    // 11. Anonymize action logs (keep for audit but remove user reference)
    await this.prisma.actionLog.updateMany({
      where: { userId },
      data: { userId: null },
    });

    // 12. Log the deletion as a sensitive action (before soft delete)
    await this.logService.logSensitive({
      userId: null, // Already anonymized
      entityType: 'user',
      entityId: userId,
      action: ActionType.USER_DELETED,
      metadata: { deletedAt: new Date().toISOString() },
    });

    // 13. Soft delete user (will be hard deleted after retention period)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted_${userId}@deleted.local`, // Anonymize email
        passwordHash: '', // Clear password
      },
    });

    return { success: true };
  }

  /**
   * Export user data (GDPR Article 20 - Right to Data Portability)
   */
  async exportData(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            workExperiences: true,
            educations: true,
            skills: true,
            languages: true,
            certifications: true,
          },
        },
        cvs: true,
        campaigns: {
          include: {
            jobOffers: true,
          },
        },
        applications: {
          include: {
            documents: true,
            emails: true,
            jobOffer: true,
          },
        },
        actionLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1000, // Limit to recent logs
        },
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Log the export action
    await this.logService.logSensitive({
      userId,
      entityType: 'user',
      entityId: userId,
      action: ActionType.USER_DATA_EXPORTED,
    });

    // Return sanitized data (remove sensitive fields)
    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
        consentGivenAt: user.consentGivenAt,
        privacyPolicyVersion: user.privacyPolicyVersion,
      },
      profile: user.profile
        ? {
            ...user.profile,
            embedding: undefined, // Don't export embeddings
          }
        : null,
      cvs: user.cvs.map((cv) => ({
        id: cv.id,
        type: cv.type,
        fileName: cv.fileName,
        parsingStatus: cv.parsingStatus,
        parsedData: cv.parsedData,
        createdAt: cv.createdAt,
      })),
      campaigns: user.campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        targetRoles: c.targetRoles,
        targetLocations: c.targetLocations,
        testMode: c.testMode,
        createdAt: c.createdAt,
        jobOffersCount: c.jobOffers.length,
      })),
      applications: user.applications.map((a) => ({
        id: a.id,
        status: a.status,
        testMode: a.testMode,
        createdAt: a.createdAt,
        submittedAt: a.submittedAt,
        jobOffer: a.jobOffer
          ? {
              title: a.jobOffer.title,
              company: a.jobOffer.company,
              location: a.jobOffer.location,
            }
          : null,
      })),
      activityLog: user.actionLogs.map((log) => ({
        action: log.action,
        entityType: log.entityType,
        status: log.status,
        createdAt: log.createdAt,
      })),
      exportedAt: new Date().toISOString(),
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage =
      'If an account with that email exists, a password reset link has been sent.';

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    // Always return the same message to prevent email enumeration
    if (!user || user.deletedAt) {
      return { message: genericMessage };
    }

    // Delete any existing tokens for this user
    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    // Generate a secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    // Store hashed token with 1-hour expiry
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Build reset URL
    const frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    // Send email
    const expiresInMinutes = 60;
    try {
      await this.emailService.queueEmail(user.id, {
        to: user.email,
        subject: this.emailTemplateService.generatePasswordResetSubject(),
        bodyHtml: this.emailTemplateService.generatePasswordResetHtml({
          resetUrl,
          expiresInMinutes,
        }),
        bodyText: this.emailTemplateService.generatePasswordResetText({
          resetUrl,
          expiresInMinutes,
        }),
      });
    } catch {
      // Don't expose email sending errors to the user
    }

    // Log the request
    await this.logService.logSensitive({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: ActionType.PASSWORD_RESET_REQUESTED,
    });

    return { message: genericMessage };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    // Hash the incoming token
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find the token record
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt < new Date() ||
      resetToken.user.deletedAt
    ) {
      throw new BadRequestException(
        'This password reset link is invalid or has expired.',
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 12);

    // Update password, mark token as used, and delete other tokens in a transaction
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
        },
      }),
    ]);

    // Log the reset
    await this.logService.logSensitive({
      userId: resetToken.userId,
      entityType: 'user',
      entityId: resetToken.userId,
      action: ActionType.PASSWORD_RESET_COMPLETED,
    });

    return { message: 'Your password has been successfully reset.' };
  }

  private generateToken(user: { id: string; email: string }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    return this.jwtService.sign(payload);
  }
}
