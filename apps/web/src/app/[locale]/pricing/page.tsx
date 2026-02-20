'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Check, X, Sparkles, Crown, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { billingApi } from '@/lib/api-client';

const plans = [
  {
    key: 'free' as const,
    tier: 'FREE' as const,
    price: '0',
    icon: Zap,
    features: {
      cvUploads: 1,
      campaigns: '1 (practice)',
      activeCampaigns: 1,
      docGenerations: '3 (lifetime)',
      submissions: 0,
      autoApply: false,
      allSources: false,
      practiceForced: true,
    },
  },
  {
    key: 'starter' as const,
    tier: 'STARTER' as const,
    price: '9.99',
    icon: Sparkles,
    popular: true,
    features: {
      cvUploads: 3,
      campaigns: 5,
      activeCampaigns: 2,
      docGenerations: '30/mo',
      submissions: '20/mo',
      autoApply: true,
      allSources: true,
      practiceForced: false,
    },
  },
  {
    key: 'pro' as const,
    tier: 'PRO' as const,
    price: '29.99',
    icon: Crown,
    features: {
      cvUploads: 10,
      campaigns: 20,
      activeCampaigns: 5,
      docGenerations: '150/mo',
      submissions: '100/mo',
      autoApply: true,
      allSources: true,
      practiceForced: false,
    },
  },
] as const;

export default function PricingPage() {
  const t = useTranslations('pricing');
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSelectPlan = async (tier: 'FREE' | 'STARTER' | 'PRO') => {
    if (tier === 'FREE') {
      if (session) {
        router.push('/dashboard');
      } else {
        router.push('/signup');
      }
      return;
    }

    if (!session) {
      router.push(`/signup?plan=${tier.toLowerCase()}`);
      return;
    }

    setLoading(tier);
    try {
      const { url } = await billingApi.createCheckout(tier as 'STARTER' | 'PRO');
      window.location.href = url;
    } catch {
      router.push('/dashboard/settings');
    } finally {
      setLoading(null);
    }
  };

  const featureRows: Array<{ key: string; label: string; boolean?: boolean }> = [
    { key: 'cvUploads', label: t('features.cvUploads') },
    { key: 'campaigns', label: t('features.campaigns') },
    { key: 'activeCampaigns', label: t('features.activeCampaigns') },
    { key: 'docGenerations', label: t('features.docGenerations') },
    { key: 'submissions', label: t('features.submissions') },
    { key: 'autoApply', label: t('features.autoApply'), boolean: true },
    { key: 'allSources', label: t('features.allSources'), boolean: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="mx-auto max-w-5xl px-4 pt-16 pb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          {t('title')}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {t('subtitle')}
        </p>
      </div>

      {/* Plan cards */}
      <div className="mx-auto max-w-5xl px-4 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPopular = 'popular' in plan && plan.popular;
            return (
              <div
                key={plan.key}
                className={`relative flex flex-col rounded-2xl border bg-card p-6 shadow-sm ${
                  isPopular
                    ? 'border-[hsl(217,91%,53%)] ring-2 ring-[hsl(217,91%,53%)]/20'
                    : 'border-border'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="rounded-full bg-[hsl(217,91%,53%)] px-3 py-1 text-xs font-medium text-white">
                      {t('popular')}
                    </span>
                  </div>
                )}

                <div className="mb-4 flex items-center gap-2">
                  <Icon className="h-5 w-5 text-[hsl(217,91%,53%)]" />
                  <h3 className="text-lg font-semibold">{t(`plans.${plan.key}.name`)}</h3>
                </div>

                <div className="mb-6">
                  <span className="text-4xl font-bold">{plan.price === '0' ? t('free') : `${plan.price}`}</span>
                  {plan.price !== '0' && (
                    <span className="text-muted-foreground"> EUR/{t('month')}</span>
                  )}
                </div>

                <p className="mb-6 text-sm text-muted-foreground">
                  {t(`plans.${plan.key}.description`)}
                </p>

                <Button
                  className={`mb-6 w-full ${
                    isPopular
                      ? 'bg-[hsl(217,91%,53%)] text-white hover:bg-[hsl(217,91%,45%)]'
                      : ''
                  }`}
                  variant={isPopular ? 'default' : 'outline'}
                  onClick={() => handleSelectPlan(plan.tier)}
                  disabled={loading === plan.tier}
                >
                  {loading === plan.tier
                    ? t('loading')
                    : plan.tier === 'FREE'
                    ? t('getStarted')
                    : t('subscribe')}
                </Button>

                <div className="flex-1 space-y-3">
                  {featureRows.map((row) => {
                    const value = plan.features[row.key as keyof typeof plan.features];
                    return (
                      <div key={row.key} className="flex items-center gap-2 text-sm">
                        {row.boolean ? (
                          value ? (
                            <Check className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <X className="h-4 w-4 text-zinc-300" />
                          )
                        ) : (
                          <Check className="h-4 w-4 text-emerald-500" />
                        )}
                        <span className="text-muted-foreground">
                          {row.boolean
                            ? row.label
                            : `${value} ${row.label}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
