import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobDiscoveryService } from './job-discovery.service';
import { JobAnalyzerService } from './job-analyzer.service';
import { JobSourceController } from './job-source.controller';
import { LogModule } from '../log/log.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [LogModule, ProfileModule],
  controllers: [JobController, JobSourceController],
  providers: [JobService, JobDiscoveryService, JobAnalyzerService],
  exports: [JobService],
})
export class JobModule {}
