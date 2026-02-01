'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Profile } from '@/lib/api-client';
import {
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  User,
  FileText,
  Briefcase,
  GraduationCap,
  Wrench,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReadinessCheck {
  key: string;
  label: string;
  description: string;
  weight: number;
  icon: React.ReactNode;
  check: (profile: Profile | null) => boolean;
  suggestion?: string;
  boost?: string; // e.g., "+15% matches"
}

function getReadinessChecks(t: ReturnType<typeof useTranslations>): ReadinessCheck[] {
  return [
    {
      key: 'name',
      label: t('checks.name.label'),
      description: t('checks.name.description'),
      weight: 10,
      icon: <User className="h-4 w-4" />,
      check: (p) => !!(p?.firstName && p?.lastName),
      suggestion: t('checks.name.suggestion'),
    },
    {
      key: 'contact',
      label: t('checks.contact.label'),
      description: t('checks.contact.description'),
      weight: 10,
      icon: <User className="h-4 w-4" />,
      check: (p) => !!(p?.email && p?.phone),
      suggestion: t('checks.contact.suggestion'),
    },
    {
      key: 'location',
      label: t('checks.location.label'),
      description: t('checks.location.description'),
      weight: 5,
      icon: <User className="h-4 w-4" />,
      check: (p) => !!p?.location,
      suggestion: t('checks.location.suggestion'),
      boost: t('checks.location.boost'),
    },
    {
      key: 'summary',
      label: t('checks.summary.label'),
      description: t('checks.summary.description'),
      weight: 15,
      icon: <FileText className="h-4 w-4" />,
      check: (p) => !!(p?.summary && p.summary.length >= 50),
      suggestion: t('checks.summary.suggestion'),
      boost: t('checks.summary.boost'),
    },
    {
      key: 'experience',
      label: t('checks.experience.label'),
      description: t('checks.experience.description'),
      weight: 25,
      icon: <Briefcase className="h-4 w-4" />,
      check: (p) => !!(p?.workExperiences && p.workExperiences.length > 0),
      suggestion: t('checks.experience.suggestion'),
      boost: t('checks.experience.boost'),
    },
    {
      key: 'experienceDetails',
      label: t('checks.experienceDetails.label'),
      description: t('checks.experienceDetails.description'),
      weight: 10,
      icon: <Briefcase className="h-4 w-4" />,
      check: (p) => !!(p?.workExperiences?.some(w => w.description && w.description.length > 50)),
      suggestion: t('checks.experienceDetails.suggestion'),
    },
    {
      key: 'education',
      label: t('checks.education.label'),
      description: t('checks.education.description'),
      weight: 10,
      icon: <GraduationCap className="h-4 w-4" />,
      check: (p) => !!(p?.educations && p.educations.length > 0),
      suggestion: t('checks.education.suggestion'),
    },
    {
      key: 'skills',
      label: t('checks.skills.label'),
      description: t('checks.skills.description'),
      weight: 15,
      icon: <Wrench className="h-4 w-4" />,
      check: (p) => !!(p?.skills && p.skills.length >= 3),
      suggestion: t('checks.skills.suggestion'),
      boost: t('checks.skills.boost'),
    },
  ];
}

interface ProfileReadinessProps {
  profile: Profile | null;
  className?: string;
  compact?: boolean;
  onNavigate?: (tab: string) => void;
}

export function ProfileReadiness({
  profile,
  className,
  compact = false,
  onNavigate
}: ProfileReadinessProps) {
  const t = useTranslations('profile.readiness');
  const [isExpanded, setIsExpanded] = React.useState(!compact);

  const readinessChecks = React.useMemo(() => getReadinessChecks(t), [t]);

  const results = React.useMemo(() => {
    return readinessChecks.map(check => ({
      ...check,
      passed: check.check(profile),
    }));
  }, [readinessChecks, profile]);

  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const score = results.reduce((sum, r) => sum + (r.passed ? r.weight : 0), 0);
  const percentage = Math.round((score / totalWeight) * 100);

  const passedChecks = results.filter(r => r.passed);
  const failedChecks = results.filter(r => !r.passed);

  const getScoreLabel = (pct: number) => {
    if (pct >= 90) return t('labels.excellent');
    if (pct >= 70) return t('labels.strong');
    if (pct >= 50) return t('labels.good');
    if (pct >= 30) return t('labels.gettingStarted');
    return t('labels.needsAttention');
  };

  const getScoreColor = (pct: number) => {
    if (pct >= 70) return 'text-success';
    if (pct >= 40) return 'text-warning';
    return 'text-destructive';
  };

  const getProgressColor = (pct: number) => {
    if (pct >= 70) return 'bg-success';
    if (pct >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <div className={cn(
      'rounded-lg border bg-card p-4 md:p-6',
      className
    )}>
      {/* Header with score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-secondary"
              />
              <circle
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={94.2}
                strokeDashoffset={94.2 - (94.2 * percentage) / 100}
                strokeLinecap="round"
                className={cn(getProgressColor(percentage), 'transition-all duration-700')}
                style={{
                  '--score-offset': `${94.2 - (94.2 * percentage) / 100}`
                } as React.CSSProperties}
              />
            </svg>
            <span className={cn(
              'absolute inset-0 flex items-center justify-center text-sm font-bold',
              getScoreColor(percentage)
            )}>
              {percentage}%
            </span>
          </div>
          <div>
            <h3 className="font-semibold">{t('title')}</h3>
            <p className={cn('text-sm', getScoreColor(percentage))}>
              {getScoreLabel(percentage)}
            </p>
          </div>
        </div>

        {compact && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-muted-foreground"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-700',
            getProgressColor(percentage)
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-6 space-y-6 animate-slide-in-up">
          {/* What's working */}
          {passedChecks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {t('sections.whatsWorking')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {passedChecks.map(check => (
                  <div
                    key={check.key}
                    className="flex items-center gap-1.5 rounded-full bg-success-muted px-3 py-1 text-sm text-success"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {check.label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions to improve */}
          {failedChecks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">
                {t('sections.toImprove')}
              </h4>
              <div className="space-y-2">
                {failedChecks.slice(0, 3).map(check => (
                  <div
                    key={check.key}
                    className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <Circle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{check.suggestion || check.label}</span>
                    </div>
                    {check.boost && (
                      <span className="flex items-center gap-1 text-xs text-success font-medium">
                        <Sparkles className="h-3 w-3" />
                        {check.boost}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Percentage complete is already > 70 but not 100 */}
          {percentage >= 70 && percentage < 100 && failedChecks.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('messages.strongProfile')}
            </p>
          )}

          {percentage === 100 && (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">{t('messages.fullyOptimized')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact widget for dashboard
export function ProfileReadinessWidget({
  profile,
  onViewProfile
}: {
  profile: Profile | null;
  onViewProfile?: () => void;
}) {
  const t = useTranslations('profile.readiness');
  const readinessChecks = React.useMemo(() => getReadinessChecks(t), [t]);

  const results = React.useMemo(() => {
    return readinessChecks.map(check => ({
      ...check,
      passed: check.check(profile),
    }));
  }, [readinessChecks, profile]);

  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const score = results.reduce((sum, r) => sum + (r.passed ? r.weight : 0), 0);
  const percentage = Math.round((score / totalWeight) * 100);
  const failedChecks = results.filter(r => !r.passed);

  if (percentage === 100) {
    return null; // Don't show widget if profile is complete
  }

  const getProgressColor = (pct: number) => {
    if (pct >= 70) return 'bg-success';
    if (pct >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  const topSuggestion = failedChecks[0];

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Profile</span>
        </div>
        <span className="text-sm font-bold">{percentage}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary mb-3">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            getProgressColor(percentage)
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {topSuggestion && (
        <p className="text-xs text-muted-foreground">
          {topSuggestion.suggestion}
          {topSuggestion.boost && (
            <span className="text-success ml-1">({topSuggestion.boost})</span>
          )}
        </p>
      )}
      {onViewProfile && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 w-full text-xs"
          onClick={onViewProfile}
        >
          {t('action')}
        </Button>
      )}
    </div>
  );
}
