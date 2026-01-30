import {
  Controller,
  Post,
  RawBodyRequest,
  Request,
  Headers,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { StripeService } from './stripe.service';

@ApiTags('webhooks')
@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly stripeService: StripeService,
  ) {}

  @Post('stripe')
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Request() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    let event;
    try {
      event = this.stripeService.constructWebhookEvent(rawBody, signature);
    } catch (error) {
      this.logger.error(`Webhook signature verification failed: ${error}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    this.logger.log(`Received Stripe webhook: ${event.type}`);

    try {
      await this.billingService.handleWebhookEvent(event);
    } catch (error) {
      this.logger.error(`Error handling webhook event ${event.type}: ${error}`);
      // Return 200 anyway to prevent Stripe retries for application errors
    }

    return { received: true };
  }
}
