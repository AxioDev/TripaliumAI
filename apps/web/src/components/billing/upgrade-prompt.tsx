'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { billingApi } from '@/lib/api-client';

interface UpgradePromptProps {
  messageKey: string;
  plan?: 'STARTER' | 'PRO';
  compact?: boolean;
}

export function UpgradePrompt({ messageKey, plan = 'STARTER', compact = false }: UpgradePromptProps) {
  const t = useTranslations('billing');
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { url } = await billingApi.createCheckout(plan);
      window.location.href = url;
    } catch {
      // If checkout fails, redirect to pricing page
      window.location.href = '/pricing';
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
        <p className="text-sm text-amber-800 dark:text-amber-200">{t(messageKey)}</p>
        <Button
          size="sm"
          variant="outline"
          onClick={handleUpgrade}
          disabled={loading}
          className="ml-auto shrink-0 border-amber-300 text-amber-700 hover:bg-amber-100"
        >
          {t('upgrade')}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-transparent bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:from-amber-950/20 dark:to-orange-950/20">
      <div className="absolute inset-0 rounded-xl border-2 border-amber-300/50 dark:border-amber-700/50" />
      <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-amber-100 p-2 dark:bg-amber-900/50">
            <Sparkles className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-amber-900 dark:text-amber-100">
              {t(messageKey)}
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {t('upgradeDescription')}
            </p>
          </div>
        </div>
        <Button
          onClick={handleUpgrade}
          disabled={loading}
          className="shrink-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
        >
          {loading ? t('upgrading') : t('upgrade')}
        </Button>
      </div>
    </div>
  );
}
