import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';

@ApiTags('Job Sources')
@Controller('job-sources')
@UseGuards(CombinedAuthGuard)
@ApiBearerAuth()
@ApiSecurity('api-key')
export class JobSourceController {
  constructor(private readonly jobService: JobService) {}

  @Get()
  @ApiOperation({ summary: 'List available job sources' })
  async listJobSources() {
    return this.jobService.listJobSources();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job source by ID' })
  async getJobSource(@Param('id') sourceId: string) {
    return this.jobService.getJobSource(sourceId);
  }
}
