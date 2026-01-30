import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService, StripeService],
  exports: [BillingService],
})
export class BillingModule {}
