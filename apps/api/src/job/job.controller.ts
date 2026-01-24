import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';
import { RequiredScope } from '../auth/decorators/required-scope.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiKeyScope, JobOfferStatus } from '@tripalium/shared';

@ApiTags('Jobs')
@Controller()
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Get('campaigns/:campaignId/jobs')
  @ApiOperation({ summary: 'List jobs for a campaign' })
  async listJobOffers(
    @CurrentUser() user: { id: string },
    @Param('campaignId') campaignId: string,
    @Query('status') status?: JobOfferStatus,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.jobService.listJobOffers(campaignId, user.id, {
      status,
      page,
      limit: Math.min(limit || 20, 100),
    });
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Get job offer by ID' })
  async getJobOffer(
    @CurrentUser() user: { id: string },
    @Param('id') jobId: string,
  ) {
    return this.jobService.getJobOffer(jobId, user.id);
  }

  @Post('jobs/:id/reject')
  @RequiredScope(ApiKeyScope.WRITE)
  @ApiOperation({ summary: 'Reject a job offer' })
  async rejectJob(
    @CurrentUser() user: { id: string },
    @Param('id') jobId: string,
  ) {
    return this.jobService.rejectJob(jobId, user.id);
  }
}
