import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RequiredScope } from '../auth/decorators/required-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyScope } from '@tripalium/shared';

@ApiTags('Test')
@Controller('test')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class TestController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @Post('trigger-discovery')
  @RequiredScope(ApiKeyScope.TEST)
  @ApiOperation({ summary: 'Trigger job discovery for a campaign' })
  async triggerDiscovery(
    @CurrentUser() user: { id: string },
    @Body() data: { campaignId: string },
  ) {
    await this.queueService.addJob({
      type: 'job.discover',
      data: { campaignId: data.campaignId },
      userId: user.id,
      testMode: true,
    });

    return { queued: true, campaignId: data.campaignId };
  }

  @Post('trigger-analysis')
  @RequiredScope(ApiKeyScope.TEST)
  @ApiOperation({ summary: 'Trigger job analysis' })
  async triggerAnalysis(
    @CurrentUser() user: { id: string },
    @Body() data: { jobOfferId: string },
  ) {
    await this.queueService.addJob({
      type: 'job.analyze',
      data: { jobOfferId: data.jobOfferId },
      userId: user.id,
      testMode: true,
    });

    return { queued: true, jobOfferId: data.jobOfferId };
  }

  @Post('trigger-generation')
  @RequiredScope(ApiKeyScope.TEST)
  @ApiOperation({ summary: 'Trigger document generation' })
  async triggerGeneration(
    @CurrentUser() user: { id: string },
    @Body() data: { applicationId: string },
  ) {
    await this.queueService.addJob({
      type: 'document.generate',
      data: { applicationId: data.applicationId },
      userId: user.id,
      testMode: true,
    });

    return { queued: true, applicationId: data.applicationId };
  }

  @Post('simulate-application')
  @RequiredScope(ApiKeyScope.TEST)
  @ApiOperation({ summary: 'Simulate full application flow' })
  async simulateApplication(
    @CurrentUser() user: { id: string },
    @Body() data: { campaignId: string; jobOfferId?: string },
  ) {
    // This would run through the full flow in test mode
    // For POC, just queue the discovery job
    await this.queueService.addJob({
      type: 'job.discover',
      data: { campaignId: data.campaignId, simulateOnly: true },
      userId: user.id,
      testMode: true,
    });

    return {
      queued: true,
      message: 'Simulation started',
      campaignId: data.campaignId,
    };
  }

  @Get('queue-status')
  @RequiredScope(ApiKeyScope.TEST)
  @ApiOperation({ summary: 'Get background job queue status' })
  async getQueueStatus() {
    const stats = await this.queueService.getStats();

    const recentJobs = await this.prisma.backgroundJob.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        attempts: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
        errorMessage: true,
      },
    });

    return { stats, recentJobs };
  }

  @Post('clear-data')
  @RequiredScope(ApiKeyScope.TEST)
  @ApiOperation({ summary: 'Clear test user data (use with caution)' })
  async clearData(@CurrentUser() user: { id: string }) {
    // Only clear data for the current user
    // This is safe because we verify the user owns the data

    // Delete in correct order due to foreign keys
    await this.prisma.emailRecord.deleteMany({ where: { userId: user.id } });
    await this.prisma.generatedDocument.deleteMany({ where: { userId: user.id } });
    await this.prisma.application.deleteMany({ where: { userId: user.id } });
    await this.prisma.jobOffer.deleteMany({
      where: { campaign: { userId: user.id } },
    });
    await this.prisma.campaignJobSource.deleteMany({
      where: { campaign: { userId: user.id } },
    });
    await this.prisma.campaign.deleteMany({ where: { userId: user.id } });
    await this.prisma.cV.deleteMany({ where: { userId: user.id } });

    // Clear profile data
    const profile = await this.prisma.profile.findUnique({
      where: { userId: user.id },
    });

    if (profile) {
      await this.prisma.workExperience.deleteMany({ where: { profileId: profile.id } });
      await this.prisma.education.deleteMany({ where: { profileId: profile.id } });
      await this.prisma.skill.deleteMany({ where: { profileId: profile.id } });
      await this.prisma.language.deleteMany({ where: { profileId: profile.id } });
      await this.prisma.certification.deleteMany({ where: { profileId: profile.id } });
      await this.prisma.profile.delete({ where: { id: profile.id } });
    }

    return { success: true, message: 'User data cleared' };
  }
}
