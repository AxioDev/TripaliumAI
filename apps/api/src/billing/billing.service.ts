import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import {
  PlanTier,
  SubscriptionStatus,
  UsageAction,
  PLAN_LIMITS,
  isActivePlan,
  EntitlementCheck,
  UsageSummary,
  SubscriptionInfo,
  PlanLimits,
} from '@tripalium/shared';
import Stripe from 'stripe';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initialize billing for a new user — creates Stripe Customer + local Subscription record
   */
  async initializeUserBilling(userId: string, email: string): Promise<void> {
    try {
      const customer = await this.stripeService.createCustomer(email, { userId });
      await this.prisma.subscription.create({
        data: {
          userId,
          stripeCustomerId: customer.id,
          plan: PlanTier.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
      });
      this.logger.log(`Billing initialized for user ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to initialize billing for user ${userId}: ${error}`);
      // Don't block signup if Stripe is unavailable — create local record with placeholder
      try {
        await this.prisma.subscription.create({
          data: {
            userId,
            stripeCustomerId: `pending_${userId}`,
            plan: PlanTier.FREE,
            status: SubscriptionStatus.ACTIVE,
          },
        });
      } catch {
        this.logger.error(`Failed to create local subscription record for user ${userId}`);
      }
    }
  }

  /**
   * Get user's plan info from DB (fresh lookup)
   */
  async getUserPlan(userId: string): Promise<SubscriptionInfo> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return {
        plan: PlanTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        limits: PLAN_LIMITS[PlanTier.FREE],
        currentPeriodStart: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }

    return {
      plan: subscription.plan as PlanTier,
      status: subscription.status as SubscriptionStatus,
      limits: PLAN_LIMITS[subscription.plan as PlanTier] || PLAN_LIMITS[PlanTier.FREE],
      currentPeriodStart: subscription.currentPeriodStart?.toISOString() || null,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() || null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    };
  }

  /**
   * Check if user is entitled to perform an action
   */
  async checkEntitlement(userId: string, action: UsageAction): Promise<EntitlementCheck> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const plan = (subscription?.plan as PlanTier) || PlanTier.FREE;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS[PlanTier.FREE];

    let limit: number;
    let currentUsage: number;

    switch (action) {
      case UsageAction.CV_UPLOAD:
        limit = limits.maxCvUploads;
        currentUsage = await this.prisma.cV.count({ where: { userId } });
        break;

      case UsageAction.CAMPAIGN_CREATE:
        limit = limits.maxCampaigns;
        currentUsage = await this.prisma.campaign.count({ where: { userId } });
        break;

      case UsageAction.CAMPAIGN_ACTIVATE:
        limit = limits.maxActiveCampaigns;
        currentUsage = await this.prisma.campaign.count({
          where: { userId, status: 'ACTIVE' },
        });
        break;

      case UsageAction.DOCUMENT_GENERATE:
        limit = limits.maxDocumentGenerations;
        if (limits.documentGenerationsLifetime) {
          // FREE tier: count all-time usage records for this action
          currentUsage = await this.prisma.usageRecord.count({
            where: { userId, action: UsageAction.DOCUMENT_GENERATE },
          });
        } else {
          // Paid tiers: count usage in current billing period
          currentUsage = await this.countPeriodUsage(userId, action, subscription);
        }
        break;

      case UsageAction.APPLICATION_SUBMIT:
        limit = limits.maxApplicationSubmissions;
        if (limit === 0) {
          return {
            allowed: false,
            reason: 'Application submissions require a paid plan',
            currentUsage: 0,
            limit: 0,
          };
        }
        currentUsage = await this.countPeriodUsage(userId, action, subscription);
        break;

      default:
        return { allowed: true };
    }

    if (currentUsage >= limit) {
      return {
        allowed: false,
        reason: `You have reached the ${plan} plan limit for this action (${currentUsage}/${limit})`,
        currentUsage,
        limit,
      };
    }

    return { allowed: true, currentUsage, limit };
  }

  /**
   * Record a usage event
   */
  async recordUsage(userId: string, action: UsageAction, entityId?: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return;
    }

    const now = new Date();
    const periodStart = subscription.currentPeriodStart || now;
    const periodEnd = subscription.currentPeriodEnd || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await this.prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        userId,
        action,
        entityId,
        periodStart,
        periodEnd,
      },
    });
  }

  /**
   * Get usage summary for dashboard display
   */
  async getUsageSummary(userId: string): Promise<UsageSummary> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const plan = (subscription?.plan as PlanTier) || PlanTier.FREE;
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS[PlanTier.FREE];

    const [cvCount, campaignCount, activeCampaignCount] = await Promise.all([
      this.prisma.cV.count({ where: { userId } }),
      this.prisma.campaign.count({ where: { userId } }),
      this.prisma.campaign.count({ where: { userId, status: 'ACTIVE' } }),
    ]);

    let docGenCount: number;
    if (limits.documentGenerationsLifetime) {
      docGenCount = await this.prisma.usageRecord.count({
        where: { userId, action: UsageAction.DOCUMENT_GENERATE },
      });
    } else {
      docGenCount = await this.countPeriodUsage(userId, UsageAction.DOCUMENT_GENERATE, subscription);
    }

    const appSubmitCount = await this.countPeriodUsage(userId, UsageAction.APPLICATION_SUBMIT, subscription);

    return {
      cvUploads: { current: cvCount, limit: limits.maxCvUploads },
      campaigns: { current: campaignCount, limit: limits.maxCampaigns },
      activeCampaigns: { current: activeCampaignCount, limit: limits.maxActiveCampaigns },
      documentGenerations: { current: docGenCount, limit: limits.maxDocumentGenerations },
      applicationSubmissions: { current: appSubmitCount, limit: limits.maxApplicationSubmissions },
    };
  }

  /**
   * Create Stripe Checkout session for upgrade
   */
  async createCheckoutSession(userId: string, plan: PlanTier): Promise<{ url: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new ForbiddenException('No billing account found');
    }

    const priceId = this.getPriceId(plan);
    if (!priceId) {
      throw new ForbiddenException('Invalid plan');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripeService.createCheckoutSession({
      customerId: subscription.stripeCustomerId,
      priceId,
      successUrl: `${frontendUrl}/dashboard/settings?billing=success`,
      cancelUrl: `${frontendUrl}/pricing?billing=canceled`,
      metadata: { userId, plan },
    });

    return { url: session.url! };
  }

  /**
   * Create Stripe Customer Portal session
   */
  async createPortalSession(userId: string): Promise<{ url: string }> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      throw new ForbiddenException('No billing account found');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    const session = await this.stripeService.createPortalSession(
      subscription.stripeCustomerId,
      `${frontendUrl}/dashboard/settings`,
    );

    return { url: session.url };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        this.logger.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Cancel billing for account deletion
   */
  async cancelUserBilling(userId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) return;

    // Cancel Stripe subscription if active
    if (subscription.stripeSubscriptionId) {
      await this.stripeService.cancelSubscription(subscription.stripeSubscriptionId);
    }

    // Delete Stripe customer
    if (subscription.stripeCustomerId && !subscription.stripeCustomerId.startsWith('pending_')) {
      await this.stripeService.deleteCustomer(subscription.stripeCustomerId);
    }

    // Delete usage records and subscription
    await this.prisma.usageRecord.deleteMany({ where: { userId } });
    await this.prisma.subscription.delete({ where: { userId } });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async countPeriodUsage(
    userId: string,
    action: UsageAction,
    subscription: { currentPeriodStart: Date | null; currentPeriodEnd: Date | null } | null,
  ): Promise<number> {
    if (!subscription?.currentPeriodStart) {
      // No billing period set — for free users, count all-time
      return this.prisma.usageRecord.count({
        where: { userId, action },
      });
    }

    return this.prisma.usageRecord.count({
      where: {
        userId,
        action,
        createdAt: {
          gte: subscription.currentPeriodStart,
          ...(subscription.currentPeriodEnd ? { lte: subscription.currentPeriodEnd } : {}),
        },
      },
    });
  }

  private getPriceId(plan: PlanTier): string | null {
    switch (plan) {
      case PlanTier.STARTER:
        return this.configService.get<string>('STRIPE_STARTER_PRICE_ID') || null;
      case PlanTier.PRO:
        return this.configService.get<string>('STRIPE_PRO_PRICE_ID') || null;
      default:
        return null;
    }
  }

  private getPlanFromPriceId(priceId: string): PlanTier {
    const starterPriceId = this.configService.get<string>('STRIPE_STARTER_PRICE_ID');
    const proPriceId = this.configService.get<string>('STRIPE_PRO_PRICE_ID');

    if (priceId === starterPriceId) return PlanTier.STARTER;
    if (priceId === proPriceId) return PlanTier.PRO;
    return PlanTier.FREE;
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeCustomerId: customerId },
    });

    if (!subscription) {
      this.logger.error(`No local subscription found for Stripe customer ${customerId}`);
      return;
    }

    // Get the Stripe subscription to determine the plan
    const metadata = session.metadata || {};
    const plan = (metadata.plan as PlanTier) || PlanTier.STARTER;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        stripeSubscriptionId: subscriptionId,
        plan,
        status: SubscriptionStatus.ACTIVE,
      },
    });

    this.logger.log(`Checkout completed: user ${subscription.userId} upgraded to ${plan}`);
  }

  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      this.logger.warn(`No local subscription found for Stripe subscription ${stripeSubscription.id}`);
      return;
    }

    const priceId = stripeSubscription.items.data[0]?.price?.id;
    const plan = priceId ? this.getPlanFromPriceId(priceId) : subscription.plan;

    const statusMap: Record<string, SubscriptionStatus> = {
      active: SubscriptionStatus.ACTIVE,
      past_due: SubscriptionStatus.PAST_DUE,
      canceled: SubscriptionStatus.CANCELED,
      incomplete: SubscriptionStatus.INCOMPLETE,
      unpaid: SubscriptionStatus.UNPAID,
      paused: SubscriptionStatus.PAUSED,
      trialing: SubscriptionStatus.TRIALING,
    };

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        plan: plan as PlanTier,
        status: statusMap[stripeSubscription.status] || SubscriptionStatus.ACTIVE,
        stripePriceId: priceId || subscription.stripePriceId,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
      },
    });

    this.logger.log(`Subscription updated for user ${subscription.userId}: ${plan} (${stripeSubscription.status})`);
  }

  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.CANCELED,
        plan: PlanTier.FREE,
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
      },
    });

    this.logger.log(`Subscription canceled for user ${subscription.userId}, reverted to FREE`);
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) return;

    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });
      this.logger.log(`Payment recovered for user ${subscription.userId}, status set to ACTIVE`);
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    const subscriptionId = invoice.subscription as string;
    if (!subscriptionId) return;

    const subscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscription) return;

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });

    this.logger.log(`Payment failed for user ${subscription.userId}, status set to PAST_DUE`);
  }
}
