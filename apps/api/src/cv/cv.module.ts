import { Module } from '@nestjs/common';
import { CvController } from './cv.controller';
import { CvService } from './cv.service';
import { CvParserService } from './cv-parser.service';
import { LogModule } from '../log/log.module';
import { StorageModule } from '../storage/storage.module';
import { ProfileModule } from '../profile/profile.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [LogModule, StorageModule, ProfileModule, BillingModule],
  controllers: [CvController],
  providers: [CvService, CvParserService],
  exports: [CvService],
})
export class CvModule {}
