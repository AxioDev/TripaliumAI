import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class RetentionService implements OnModuleInit {
  private readonly logger = new Logger(RetentionService.name);
  private readonly logRetentionDays: number;
  private readonly emailRetentionDays: number;
  private readonly deletedUserRetentionDays: number;
  private readonly sensitiveLogRetentionYears: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.logRetentionDays = this.configService.get<number>(
      'DATA_RETENTION_LOGS_DAYS',
      365,
    );
    this.emailRetentionDays = this.configService.get<number>(
      'DATA_RETENTION_EMAILS_DAYS',
      90,
    );
    this.deletedUserRetentionDays = this.configService.get<number>(
      'DATA_RETENTION_DELETED_USERS_DAYS',
      30,
    );
    this.sensitiveLogRetentionYears = this.configService.get<number>(
      'DATA_RETENTION_SENSITIVE_LOGS_YEARS',
      7,
    );
  }

  onModuleInit() {
    this.logger.log('Data retention service initialized');
    this.logger.log(`Log retention: ${this.logRetentionDays} days`);
    this.logger.log(`Email retention: ${this.emailRetentionDays} days`);
    this.logger.log(`Deleted user retention: ${this.deletedUserRetentionDays} days`);
    this.logger.log(`Sensitive log retention: ${this.sensitiveLogRetentionYears} years`);
  }

  /**
   * Run daily at 3:00 AM to clean up old data
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async runRetentionCleanup() {
    this.logger.log('Starting daily data retention cleanup...');

    const results = {
      logs: 0,
      emails: 0,
      users: 0,
    };

    try {
      // 1. Delete old non-sensitive action logs
      results.logs = await this.cleanupActionLogs();

      // 2. Delete old email records
      results.emails = await this.cleanupEmailRecords();

      // 3. Hard delete soft-deleted users after retention period
      results.users = await this.cleanupDeletedUsers();

      this.logger.log(
        `Retention cleanup complete: ${results.logs} logs, ${results.emails} emails, ${results.users} users deleted`,
      );
    } catch (error) {
      this.logger.error('Error during retention cleanup:', error);
    }
  }

  /**
   * Delete action logs older than retention period
   * Sensitive logs are kept for 7 years per legal requirements
   */
  private async cleanupActionLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.logRetentionDays);

    const sensitiveCutoffDate = new Date();
    sensitiveCutoffDate.setFullYear(
      sensitiveCutoffDate.getFullYear() - this.sensitiveLogRetentionYears,
    );

    // Delete non-sensitive logs older than retention period
    const regularResult = await this.prisma.actionLog.deleteMany({
      where: {
        isSensitive: false,
        createdAt: { lt: cutoffDate },
      },
    });

    // Delete sensitive logs older than legal retention period (7 years)
    const sensitiveResult = await this.prisma.actionLog.deleteMany({
      where: {
        isSensitive: true,
        createdAt: { lt: sensitiveCutoffDate },
      },
    });

    const total = regularResult.count + sensitiveResult.count;
    if (total > 0) {
      this.logger.log(
        `Deleted ${regularResult.count} regular logs and ${sensitiveResult.count} sensitive logs`,
      );
    }

    return total;
  }

  /**
   * Delete email records older than retention period
   */
  private async cleanupEmailRecords(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.emailRetentionDays);

    const result = await this.prisma.emailRecord.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });

    if (result.count > 0) {
      this.logger.log(`Deleted ${result.count} old email records`);
    }

    return result.count;
  }

  /**
   * Hard delete users that were soft-deleted over 30 days ago
   */
  private async cleanupDeletedUsers(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.deletedUserRetentionDays);

    // Find soft-deleted users past retention period
    const usersToDelete = await this.prisma.user.findMany({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate,
        },
      },
      select: { id: true },
    });

    if (usersToDelete.length === 0) {
      return 0;
    }

    const userIds = usersToDelete.map((u) => u.id);

    // Hard delete all user data (cascade should handle most)
    await this.prisma.user.deleteMany({
      where: {
        id: { in: userIds },
      },
    });

    this.logger.log(
      `Hard deleted ${usersToDelete.length} users past retention period`,
    );

    return usersToDelete.length;
  }

  /**
   * Manual trigger for testing or immediate cleanup
   */
  async runImmediateCleanup(): Promise<{
    logs: number;
    emails: number;
    users: number;
  }> {
    this.logger.log('Running immediate retention cleanup...');

    const results = {
      logs: await this.cleanupActionLogs(),
      emails: await this.cleanupEmailRecords(),
      users: await this.cleanupDeletedUsers(),
    };

    return results;
  }
}
