import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { ActionType, JobOfferStatus } from '@tripalium/shared';

@Injectable()
export class JobService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {}

  async getJobOffer(jobId: string, userId: string) {
    const job = await this.prisma.jobOffer.findFirst({
      where: {
        id: jobId,
        campaign: { userId },
      },
      include: {
        application: true,
        jobSource: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Job offer not found');
    }

    return job;
  }

  async listJobOffers(
    campaignId: string,
    userId: string,
    options?: {
      status?: JobOfferStatus;
      page?: number;
      limit?: number;
    },
  ) {
    const { page = 1, limit = 20, status } = options || {};
    const skip = (page - 1) * limit;

    const where = {
      campaignId,
      campaign: { userId },
      ...(status && { status }),
    };

    const [jobs, total] = await Promise.all([
      this.prisma.jobOffer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { discoveredAt: 'desc' },
        include: {
          application: {
            select: { id: true, status: true },
          },
        },
      }),
      this.prisma.jobOffer.count({ where }),
    ]);

    return {
      data: jobs,
      meta: {
        page,
        limit,
        total,
        hasMore: skip + jobs.length < total,
      },
    };
  }

  async rejectJob(jobId: string, userId: string) {
    const job = await this.getJobOffer(jobId, userId);

    const updated = await this.prisma.jobOffer.update({
      where: { id: jobId },
      data: { status: JobOfferStatus.REJECTED },
    });

    await this.logService.log({
      userId,
      entityType: 'job_offer',
      entityId: jobId,
      action: ActionType.JOB_REJECTED,
      metadata: { reason: 'user_rejected' },
    });

    return updated;
  }

  async listJobSources() {
    return this.prisma.jobSource.findMany({
      where: { isActive: true },
      orderBy: { displayName: 'asc' },
    });
  }

  async getJobSource(sourceId: string) {
    const source = await this.prisma.jobSource.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      throw new NotFoundException('Job source not found');
    }

    return source;
  }
}
