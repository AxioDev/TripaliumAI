// =============================================================================
// Billing & Subscription Types
// =============================================================================

export enum PlanTier {
  FREE = 'FREE',
  STARTER = 'STARTER',
  PRO = 'PRO',
}

export enum SubscriptionStatus {
  TRIALING = 'TRIALING',
  ACTIVE = 'ACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  INCOMPLETE = 'INCOMPLETE',
  UNPAID = 'UNPAID',
  PAUSED = 'PAUSED',
}

export enum UsageAction {
  CV_UPLOAD = 'CV_UPLOAD',
  CAMPAIGN_CREATE = 'CAMPAIGN_CREATE',
  CAMPAIGN_ACTIVATE = 'CAMPAIGN_ACTIVATE',
  DOCUMENT_GENERATE = 'DOCUMENT_GENERATE',
  APPLICATION_SUBMIT = 'APPLICATION_SUBMIT',
}

export interface PlanLimits {
  maxCvUploads: number;
  maxCampaigns: number;
  maxActiveCampaigns: number;
  maxDocumentGenerations: number;
  maxApplicationSubmissions: number;
  autoApplyEnabled: boolean;
  allJobSourcesEnabled: boolean;
  practiceModeForcedOn: boolean;
  /** For FREE tier, document generations are lifetime; for paid tiers, per billing period */
  documentGenerationsLifetime: boolean;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  [PlanTier.FREE]: {
    maxCvUploads: 1,
    maxCampaigns: 1,
    maxActiveCampaigns: 1,
    maxDocumentGenerations: 3,
    maxApplicationSubmissions: 0,
    autoApplyEnabled: false,
    allJobSourcesEnabled: false,
    practiceModeForcedOn: true,
    documentGenerationsLifetime: true,
  },
  [PlanTier.STARTER]: {
    maxCvUploads: 3,
    maxCampaigns: 5,
    maxActiveCampaigns: 2,
    maxDocumentGenerations: 30,
    maxApplicationSubmissions: 20,
    autoApplyEnabled: true,
    allJobSourcesEnabled: true,
    practiceModeForcedOn: false,
    documentGenerationsLifetime: false,
  },
  [PlanTier.PRO]: {
    maxCvUploads: 10,
    maxCampaigns: 20,
    maxActiveCampaigns: 5,
    maxDocumentGenerations: 150,
    maxApplicationSubmissions: 100,
    autoApplyEnabled: true,
    allJobSourcesEnabled: true,
    practiceModeForcedOn: false,
    documentGenerationsLifetime: false,
  },
};

export function isActivePlan(status: SubscriptionStatus): boolean {
  return status === SubscriptionStatus.ACTIVE || status === SubscriptionStatus.TRIALING;
}

export interface SubscriptionInfo {
  plan: PlanTier;
  status: SubscriptionStatus;
  limits: PlanLimits;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface UsageSummary {
  cvUploads: { current: number; limit: number };
  campaigns: { current: number; limit: number };
  activeCampaigns: { current: number; limit: number };
  documentGenerations: { current: number; limit: number };
  applicationSubmissions: { current: number; limit: number };
}

export interface EntitlementCheck {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number;
}
