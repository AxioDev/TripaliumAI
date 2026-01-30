import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { PlanTier } from '@tripalium/shared';

@ApiTags('billing')
@Controller('billing')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('subscription')
  async getSubscription(@Request() req: { user: { id: string } }) {
    return this.billingService.getUserPlan(req.user.id);
  }

  @Get('usage')
  async getUsage(@Request() req: { user: { id: string } }) {
    return this.billingService.getUsageSummary(req.user.id);
  }

  @Post('checkout')
  async createCheckout(
    @Request() req: { user: { id: string } },
    @Body() body: { plan: string },
  ) {
    const plan = body.plan as PlanTier;
    if (plan !== PlanTier.STARTER && plan !== PlanTier.PRO) {
      throw new BadRequestException('Invalid plan. Choose STARTER or PRO.');
    }
    return this.billingService.createCheckoutSession(req.user.id, plan);
  }

  @Get('portal')
  async getPortal(@Request() req: { user: { id: string } }) {
    return this.billingService.createPortalSession(req.user.id);
  }
}
