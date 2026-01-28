import { Module } from '@nestjs/common';
import { ApplicationController, DocumentController } from './application.controller';
import { ApplicationService } from './application.service';
import { DocumentGeneratorService } from './document-generator.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { TemplateSelectorService } from './template-selector.service';
import { QualityAssessorService } from './quality-assessor.service';
import { CanvaExportService } from './canva-export.service';
import { LogModule } from '../log/log.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';
import { LlmModule } from '../llm/llm.module';
import { ProfileModule } from '../profile/profile.module';
import { QueueModule } from '../queue/queue.module';
import { JobModule } from '../job/job.module';

@Module({
  imports: [LogModule, EmailModule, StorageModule, LlmModule, ProfileModule, QueueModule, JobModule],
  controllers: [ApplicationController, DocumentController],
  providers: [
    ApplicationService,
    DocumentGeneratorService,
    PdfGeneratorService,
    TemplateSelectorService,
    QualityAssessorService,
    CanvaExportService,
  ],
  exports: [
    ApplicationService,
    PdfGeneratorService,
    TemplateSelectorService,
    QualityAssessorService,
    CanvaExportService,
  ],
})
export class ApplicationModule {}
