import { Module } from '@nestjs/common';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { LogModule } from '../log/log.module';
import { BillingModule } from '../billing/billing.module';

@Module({
  imports: [LogModule, BillingModule],
  controllers: [CampaignController],
  providers: [CampaignService],
  exports: [CampaignService],
})
export class CampaignModule {}
