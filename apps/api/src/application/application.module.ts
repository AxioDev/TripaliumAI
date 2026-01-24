import { Module } from '@nestjs/common';
import { ApplicationController, DocumentController } from './application.controller';
import { ApplicationService } from './application.service';
import { DocumentGeneratorService } from './document-generator.service';
import { LogModule } from '../log/log.module';
import { EmailModule } from '../email/email.module';
import { StorageModule } from '../storage/storage.module';
import { LlmModule } from '../llm/llm.module';
import { ProfileModule } from '../profile/profile.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [LogModule, EmailModule, StorageModule, LlmModule, ProfileModule, QueueModule],
  controllers: [ApplicationController, DocumentController],
  providers: [ApplicationService, DocumentGeneratorService],
  exports: [ApplicationService],
})
export class ApplicationModule {}
