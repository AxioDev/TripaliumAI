'use client';

import * as React from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  FileText,
  Target,
  Briefcase,
  User,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

type FocusType =
  | 'pending_review'
  | 'new_matches'
  | 'incomplete_profile'
  | 'no_cv'
  | 'no_campaign'
  | 'draft_campaign'
  | 'all_good';

interface FocusConfig {
  type: FocusType;
  priority: number;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
  textColor: string;
  getMessage: (count?: number) => string;
  getAction: () => string;
  getLink: () => string;
}

function getFocusConfigs(t: ReturnType<typeof useTranslations>): FocusConfig[] {
  return [
    {
      type: 'pending_review',
      priority: 1,
      icon: <Briefcase className="h-5 w-5" />,
      bgColor: 'bg-warning-muted',
      borderColor: 'border-warning/30',
      textColor: 'text-warning',
      getMessage: (count) => t('focusArea.pendingReview', { count: count || 0 }),
      getAction: () => t('focusArea.actions.reviewNow'),
      getLink: () => '/dashboard/applications?status=PENDING_REVIEW',
    },
    {
      type: 'new_matches',
      priority: 2,
      icon: <Sparkles className="h-5 w-5" />,
      bgColor: 'bg-success-muted',
      borderColor: 'border-success/30',
      textColor: 'text-success',
      getMessage: (count) => t('focusArea.newMatches', { count: count || 0 }),
      getAction: () => t('focusArea.actions.viewMatches'),
      getLink: () => '/dashboard/campaigns',
    },
    {
      type: 'incomplete_profile',
      priority: 3,
      icon: <User className="h-5 w-5" />,
      bgColor: 'bg-info-muted',
      borderColor: 'border-info/30',
      textColor: 'text-info',
      getMessage: (pct) => t('focusArea.incompleteProfile', { pct: pct || 0 }),
      getAction: () => t('focusArea.actions.completeProfile'),
      getLink: () => '/dashboard/profile',
    },
    {
      type: 'no_cv',
      priority: 4,
      icon: <FileText className="h-5 w-5" />,
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/20',
      textColor: 'text-primary',
      getMessage: () => t('focusArea.noCv'),
      getAction: () => t('focusArea.actions.uploadCv'),
      getLink: () => '/dashboard/cvs',
    },
    {
      type: 'no_campaign',
      priority: 5,
      icon: <Target className="h-5 w-5" />,
      bgColor: 'bg-primary/5',
      borderColor: 'border-primary/20',
      textColor: 'text-primary',
      getMessage: () => t('focusArea.noCampaign'),
      getAction: () => t('focusArea.actions.createCampaign'),
      getLink: () => '/dashboard/campaigns/new',
    },
    {
      type: 'draft_campaign',
      priority: 6,
      icon: <Target className="h-5 w-5" />,
      bgColor: 'bg-warning-muted',
      borderColor: 'border-warning/30',
      textColor: 'text-warning',
      getMessage: () => t('focusArea.draftCampaign'),
      getAction: () => t('focusArea.actions.launchCampaign'),
      getLink: () => '/dashboard/campaigns',
    },
    {
      type: 'all_good',
      priority: 100,
      icon: <CheckCircle2 className="h-5 w-5" />,
      bgColor: 'bg-success-muted',
      borderColor: 'border-success/30',
      textColor: 'text-success',
      getMessage: () => t('focusArea.allGood'),
      getAction: () => t('focusArea.actions.viewDashboard'),
      getLink: () => '/dashboard',
    },
  ];
}

interface FocusAreaProps {
  pendingReviewCount: number;
  newMatchCount: number;
  profileCompleteness: number;
  hasCv: boolean;
  hasCampaign: boolean;
  hasDraftCampaign: boolean;
  hasActiveCampaign: boolean;
  className?: string;
}

export function FocusArea({
  pendingReviewCount,
  newMatchCount,
  profileCompleteness,
  hasCv,
  hasCampaign,
  hasDraftCampaign,
  hasActiveCampaign,
  className,
}: FocusAreaProps) {
  const t = useTranslations('dashboard');
  const focusConfigs = React.useMemo(() => getFocusConfigs(t), [t]);

  // Determine the most important focus
  const focus = React.useMemo(() => {
    if (pendingReviewCount > 0) {
      return { ...focusConfigs[0], count: pendingReviewCount };
    }
    if (newMatchCount > 0) {
      return { ...focusConfigs[1], count: newMatchCount };
    }
    if (!hasCv) {
      return { ...focusConfigs[3] };
    }
    if (!hasCampaign) {
      return { ...focusConfigs[4] };
    }
    if (hasDraftCampaign) {
      return { ...focusConfigs[5] };
    }
    if (profileCompleteness < 70) {
      return { ...focusConfigs[2], count: profileCompleteness };
    }
    if (hasActiveCampaign) {
      return { ...focusConfigs[6] };
    }
    return null;
  }, [focusConfigs, pendingReviewCount, newMatchCount, profileCompleteness, hasCv, hasCampaign, hasDraftCampaign, hasActiveCampaign]);

  if (!focus) return null;

  const config = focus as FocusConfig & { count?: number };

  return (
    <div className={cn(
      'rounded-lg border p-4 transition-all animate-slide-in-up',
      config.bgColor,
      config.borderColor,
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex-shrink-0', config.textColor)}>
            {config.icon}
          </div>
          <p className="font-medium">
            {config.getMessage(config.count)}
          </p>
        </div>
        <Link href={config.getLink()}>
          <Button size="sm" variant="outline" className="flex-shrink-0">
            {config.getAction()}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
