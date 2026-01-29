import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface LogEntry {
  userId?: string | null;
  entityType: string;
  entityId?: string;
  action: string;
  status?: string;
  metadata?: Record<string, unknown>;
  errorMessage?: string;
  ipAddress?: string;
  userAgent?: string;
  apiKeyId?: string;
  testMode?: boolean;
  isSensitive?: boolean;
}

export interface LogQueryParams {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class LogService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: LogEntry) {
    return this.prisma.actionLog.create({
      data: {
        userId: entry.userId || undefined,
        entityType: entry.entityType,
        entityId: entry.entityId,
        action: entry.action,
        status: entry.status || 'success',
        metadata: (entry.metadata || {}) as Prisma.InputJsonValue,
        errorMessage: entry.errorMessage,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        apiKeyId: entry.apiKeyId,
        testMode: entry.testMode || false,
        isSensitive: entry.isSensitive || false,
      },
    });
  }

  /**
   * Log a sensitive action (GDPR compliance, security events)
   * These logs are retained for 7 years per legal requirements
   */
  async logSensitive(entry: Omit<LogEntry, 'isSensitive'>) {
    return this.log({
      ...entry,
      isSensitive: true,
    });
  }

  async query(params: LogQueryParams) {
    const { page = 1, limit = 20, from, to, ...filters } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = filters.action;

    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Record<string, Date>).gte = from;
      if (to) (where.createdAt as Record<string, Date>).lte = to;
    }

    const [logs, total] = await Promise.all([
      this.prisma.actionLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.actionLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + logs.length < total,
      },
    };
  }

  async getById(id: string) {
    return this.prisma.actionLog.findUnique({
      where: { id },
    });
  }
}
