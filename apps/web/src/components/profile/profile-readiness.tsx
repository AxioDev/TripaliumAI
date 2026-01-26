'use client';

import * as React from 'react';
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

const readinessChecks: ReadinessCheck[] = [
  {
    key: 'name',
    label: 'Full name added',
    description: 'Your first and last name are set',
    weight: 10,
    icon: <User className="h-4 w-4" />,
    check: (p) => !!(p?.firstName && p?.lastName),
    suggestion: 'Add your full name',
  },
  {
    key: 'contact',
    label: 'Contact information',
    description: 'Email and phone number provided',
    weight: 10,
    icon: <User className="h-4 w-4" />,
    check: (p) => !!(p?.email && p?.phone),
    suggestion: 'Add email and phone number',
  },
  {
    key: 'location',
    label: 'Location specified',
    description: 'Your location helps with job matching',
    weight: 5,
    icon: <User className="h-4 w-4" />,
    check: (p) => !!p?.location,
    suggestion: 'Add your location',
    boost: '+5% local matches',
  },
  {
    key: 'summary',
    label: 'Professional summary',
    description: 'A brief overview of your background',
    weight: 15,
    icon: <FileText className="h-4 w-4" />,
    check: (p) => !!(p?.summary && p.summary.length >= 50),
    suggestion: 'Add a professional summary',
    boost: '+15% match rate',
  },
  {
    key: 'experience',
    label: 'Work experience',
    description: 'At least one work experience entry',
    weight: 25,
    icon: <Briefcase className="h-4 w-4" />,
    check: (p) => !!(p?.workExperiences && p.workExperiences.length > 0),
    suggestion: 'Add work experience',
    boost: '+20% match rate',
  },
  {
    key: 'experienceDetails',
    label: 'Detailed experience',
    description: 'Descriptions for your work experience',
    weight: 10,
    icon: <Briefcase className="h-4 w-4" />,
    check: (p) => !!(p?.workExperiences?.some(w => w.description && w.description.length > 50)),
    suggestion: 'Add descriptions to work experience',
  },
  {
    key: 'education',
    label: 'Education background',
    description: 'At least one education entry',
    weight: 10,
    icon: <GraduationCap className="h-4 w-4" />,
    check: (p) => !!(p?.educations && p.educations.length > 0),
    suggestion: 'Add education background',
  },
  {
    key: 'skills',
    label: 'Skills documented',
    description: 'At least 3 skills listed',
    weight: 15,
    icon: <Wrench className="h-4 w-4" />,
    check: (p) => !!(p?.skills && p.skills.length >= 3),
    suggestion: 'Add at least 3 skills',
    boost: '+10% skill matches',
  },
];

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
  const [isExpanded, setIsExpanded] = React.useState(!compact);

  const results = React.useMemo(() => {
    return readinessChecks.map(check => ({
      ...check,
      passed: check.check(profile),
    }));
  }, [profile]);

  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0);
  const score = results.reduce((sum, r) => sum + (r.passed ? r.weight : 0), 0);
  const percentage = Math.round((score / totalWeight) * 100);

  const passedChecks = results.filter(r => r.passed);
  const failedChecks = results.filter(r => !r.passed);

  const getScoreLabel = (pct: number) => {
    if (pct >= 90) return 'Excellent';
    if (pct >= 70) return 'Strong';
    if (pct >= 50) return 'Good';
    if (pct >= 30) return 'Getting started';
    return 'Needs attention';
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
            <h3 className="font-semibold">Profile Readiness</h3>
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
                What&apos;s working
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
                To improve match rates
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
              Your profile is strong! Complete the remaining items to maximize your match potential.
            </p>
          )}

          {percentage === 100 && (
            <div className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Your profile is fully optimized!</span>
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
  const results = React.useMemo(() => {
    return readinessChecks.map(check => ({
      ...check,
      passed: check.check(profile),
    }));
  }, [profile]);

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
          Complete Profile
        </Button>
      )}
    </div>
  );
}
