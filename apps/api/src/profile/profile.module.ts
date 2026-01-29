import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { AnonymizationService } from './anonymization.service';
import { LogModule } from '../log/log.module';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [LogModule, StorageModule],
  controllers: [ProfileController],
  providers: [ProfileService, AnonymizationService],
  exports: [ProfileService, AnonymizationService],
})
export class ProfileModule {}
