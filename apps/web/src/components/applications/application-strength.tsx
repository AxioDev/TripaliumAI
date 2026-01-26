'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Target,
  FileText,
  User,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Application, Profile } from '@/lib/api-client';

interface StrengthFactor {
  key: string;
  label: string;
  check: (app: Application, profile: Profile | null, documentsReady: boolean) => boolean;
  icon: React.ReactNode;
  weight: number;
}

const strengthFactors: StrengthFactor[] = [
  {
    key: 'match_score',
    label: 'Strong match',
    check: (app) => (app.jobOffer?.matchScore ?? 0) >= 70,
    icon: <Target className="h-3.5 w-3.5" />,
    weight: 35,
  },
  {
    key: 'documents',
    label: 'Documents tailored',
    check: (_, __, docsReady) => docsReady,
    icon: <FileText className="h-3.5 w-3.5" />,
    weight: 30,
  },
  {
    key: 'profile_complete',
    label: 'Profile complete',
    check: (_, profile) => {
      if (!profile) return false;
      const hasBasics = !!(profile.firstName && profile.lastName && profile.email);
      const hasExperience = !!(profile.workExperiences?.length);
      const hasSkills = !!(profile.skills?.length && profile.skills.length >= 3);
      return hasBasics && hasExperience && hasSkills;
    },
    icon: <User className="h-3.5 w-3.5" />,
    weight: 20,
  },
  {
    key: 'requirements_met',
    label: 'Key requirements met',
    check: (app) => {
      const matchAnalysis = app.jobOffer?.matchAnalysis;
      if (!matchAnalysis) return false;
      const matching = matchAnalysis.matchingRequirements?.length || 0;
      const missing = matchAnalysis.missingRequirements?.length || 0;
      return matching > missing;
    },
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    weight: 15,
  },
];

interface ApplicationStrengthProps {
  application: Application;
  profile: Profile | null;
  documentsReady: boolean;
  className?: string;
}

export function ApplicationStrength({
  application,
  profile,
  documentsReady,
  className,
}: ApplicationStrengthProps) {
  const results = React.useMemo(() => {
    return strengthFactors.map(factor => ({
      ...factor,
      passed: factor.check(application, profile, documentsReady),
    }));
  }, [application, profile, documentsReady]);

  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const score = results.reduce((sum, r) => sum + (r.passed ? r.weight : 0), 0);
  const percentage = Math.round((score / totalWeight) * 100);

  const passedFactors = results.filter(r => r.passed);

  const getStrengthLabel = (pct: number) => {
    if (pct >= 85) return 'Excellent';
    if (pct >= 70) return 'Strong';
    if (pct >= 50) return 'Good';
    if (pct >= 30) return 'Fair';
    return 'Needs work';
  };

  const getStrengthColor = (pct: number) => {
    if (pct >= 70) return {
      text: 'text-success',
      bg: 'bg-success',
      bgMuted: 'bg-success-muted',
      border: 'border-success/20',
    };
    if (pct >= 50) return {
      text: 'text-warning',
      bg: 'bg-warning',
      bgMuted: 'bg-warning-muted',
      border: 'border-warning/20',
    };
    return {
      text: 'text-destructive',
      bg: 'bg-destructive',
      bgMuted: 'bg-destructive/10',
      border: 'border-destructive/20',
    };
  };

  const colors = getStrengthColor(percentage);

  return (
    <div className={cn(
      'rounded-lg border p-4',
      colors.bgMuted,
      colors.border,
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <TrendingUp className={cn('h-4 w-4', colors.text)} />
            <span className="text-sm font-medium">Application Strength</span>
          </div>

          {/* Progress bar */}
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-32 h-2 bg-background/50 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className={cn('text-sm font-bold', colors.text)}>
              {getStrengthLabel(percentage)}
            </span>
          </div>
        </div>

        <div className={cn('text-lg font-bold tabular-nums', colors.text)}>
          {percentage}%
        </div>
      </div>

      {/* Factors */}
      <div className="flex flex-wrap gap-2 mt-3">
        {results.map(factor => (
          <div
            key={factor.key}
            className={cn(
              'flex items-center gap-1.5 text-xs px-2 py-1 rounded-full transition-all',
              factor.passed
                ? 'bg-background/50 text-foreground'
                : 'bg-background/30 text-muted-foreground'
            )}
          >
            {factor.passed ? (
              <CheckCircle2 className="h-3 w-3 text-success" />
            ) : (
              <Circle className="h-3 w-3" />
            )}
            {factor.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Simpler inline version
export function ApplicationStrengthBadge({
  application,
  profile,
  documentsReady,
}: {
  application: Application;
  profile: Profile | null;
  documentsReady: boolean;
}) {
  const results = React.useMemo(() => {
    return strengthFactors.map(factor => ({
      ...factor,
      passed: factor.check(application, profile, documentsReady),
    }));
  }, [application, profile, documentsReady]);

  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const score = results.reduce((sum, r) => sum + (r.passed ? r.weight : 0), 0);
  const percentage = Math.round((score / totalWeight) * 100);

  const getColor = (pct: number) => {
    if (pct >= 70) return 'bg-success-muted text-success';
    if (pct >= 50) return 'bg-warning-muted text-warning';
    return 'bg-destructive/10 text-destructive';
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded',
      getColor(percentage)
    )}>
      <Sparkles className="h-3 w-3" />
      {percentage}% strength
    </span>
  );
}
