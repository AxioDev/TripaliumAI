'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { billingApi, SubscriptionInfo, UsageSummary } from '@/lib/api-client';

type UsageAction = 'CV_UPLOAD' | 'CAMPAIGN_CREATE' | 'CAMPAIGN_ACTIVATE' | 'DOCUMENT_GENERATE' | 'APPLICATION_SUBMIT';

interface SubscriptionContextValue {
  plan: 'FREE' | 'STARTER' | 'PRO';
  status: string;
  limits: SubscriptionInfo['limits'] | null;
  usage: UsageSummary | null;
  isPaid: boolean;
  isFreeTier: boolean;
  loading: boolean;
  canPerform: (action: UsageAction) => boolean;
  refresh: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  plan: 'FREE',
  status: 'ACTIVE',
  limits: null,
  usage: null,
  isPaid: false,
  isFreeTier: true,
  loading: true,
  canPerform: () => true,
  refresh: async () => {},
});

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [sub, usg] = await Promise.all([
        billingApi.getSubscription(),
        billingApi.getUsage(),
      ]);
      setSubscription(sub);
      setUsage(usg);
    } catch {
      // Silently fail — user might not have billing yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const plan = subscription?.plan || 'FREE';
  const isPaid = plan !== 'FREE';
  const isFreeTier = plan === 'FREE';

  const canPerform = useCallback(
    (action: UsageAction): boolean => {
      if (!usage || !subscription?.limits) return true;

      switch (action) {
        case 'CV_UPLOAD':
          return usage.cvUploads.current < usage.cvUploads.limit;
        case 'CAMPAIGN_CREATE':
          return usage.campaigns.current < usage.campaigns.limit;
        case 'CAMPAIGN_ACTIVATE':
          return usage.activeCampaigns.current < usage.activeCampaigns.limit;
        case 'DOCUMENT_GENERATE':
          return usage.documentGenerations.current < usage.documentGenerations.limit;
        case 'APPLICATION_SUBMIT':
          return usage.applicationSubmissions.limit > 0 &&
            usage.applicationSubmissions.current < usage.applicationSubmissions.limit;
        default:
          return true;
      }
    },
    [usage, subscription],
  );

  return (
    <SubscriptionContext.Provider
      value={{
        plan,
        status: subscription?.status || 'ACTIVE',
        limits: subscription?.limits || null,
        usage,
        isPaid,
        isFreeTier,
        loading,
        canPerform,
        refresh,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
