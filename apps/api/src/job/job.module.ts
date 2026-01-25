import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobDiscoveryService } from './job-discovery.service';
import { JobAnalyzerService } from './job-analyzer.service';
import { JobDeduplicationService } from './job-deduplication.service';
import { JobSourceController } from './job-source.controller';
import { JobHealthController } from './job-health.controller';
import { LogModule } from '../log/log.module';
import { ProfileModule } from '../profile/profile.module';
import { SourcesModule } from './sources/sources.module';

@Module({
  imports: [LogModule, ProfileModule, SourcesModule],
  controllers: [JobController, JobSourceController, JobHealthController],
  providers: [JobService, JobDiscoveryService, JobAnalyzerService, JobDeduplicationService],
  exports: [JobService],
})
export class JobModule {}
