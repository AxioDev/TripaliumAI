'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Upload,
  User,
  Target,
  Sparkles,
  Send,
  Trophy,
} from 'lucide-react';

interface Milestone {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  achieved: boolean;
  achievedAt?: Date;
}

interface MilestonesProps {
  cvUploaded: boolean;
  profileComplete: boolean;
  firstCampaignLaunched: boolean;
  firstStrongMatch: boolean;
  firstApplicationSent: boolean;
  tenApplicationsSubmitted: boolean;
  className?: string;
}

export function Milestones({
  cvUploaded,
  profileComplete,
  firstCampaignLaunched,
  firstStrongMatch,
  firstApplicationSent,
  tenApplicationsSubmitted,
  className,
}: MilestonesProps) {
  const milestones: Milestone[] = [
    {
      key: 'cv_uploaded',
      label: 'First CV uploaded',
      description: 'Started your job search journey',
      icon: <Upload className="h-4 w-4" />,
      achieved: cvUploaded,
    },
    {
      key: 'profile_complete',
      label: 'Profile complete',
      description: 'Ready for matching',
      icon: <User className="h-4 w-4" />,
      achieved: profileComplete,
    },
    {
      key: 'first_campaign',
      label: 'First campaign launched',
      description: 'Searching for opportunities',
      icon: <Target className="h-4 w-4" />,
      achieved: firstCampaignLaunched,
    },
    {
      key: 'first_match',
      label: 'First strong match (80%+)',
      description: 'Found a great fit',
      icon: <Sparkles className="h-4 w-4" />,
      achieved: firstStrongMatch,
    },
    {
      key: 'first_application',
      label: 'First application sent',
      description: 'Taking action',
      icon: <Send className="h-4 w-4" />,
      achieved: firstApplicationSent,
    },
    {
      key: 'ten_applications',
      label: '10 applications submitted',
      description: 'Building momentum',
      icon: <Trophy className="h-4 w-4" />,
      achieved: tenApplicationsSubmitted,
    },
  ];

  const achievedCount = milestones.filter(m => m.achieved).length;
  const showSection = achievedCount > 0 && achievedCount < milestones.length;

  // Don't show if nothing achieved or everything achieved
  if (!showSection) return null;

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Your Journey</h3>
        <span className="text-xs text-muted-foreground">
          {achievedCount} of {milestones.length}
        </span>
      </div>

      <div className="flex gap-1">
        {milestones.map((milestone, idx) => (
          <div
            key={milestone.key}
            className="group relative flex-1"
          >
            {/* Progress bar segment */}
            <div className={cn(
              'h-1.5 rounded-full transition-all duration-500',
              milestone.achieved
                ? 'bg-success'
                : 'bg-secondary'
            )} />

            {/* Tooltip on hover */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md whitespace-nowrap border">
                <div className="flex items-center gap-1.5">
                  {milestone.achieved ? (
                    <CheckCircle2 className="h-3 w-3 text-success" />
                  ) : (
                    <Circle className="h-3 w-3 text-muted-foreground" />
                  )}
                  {milestone.label}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Next milestone hint */}
      {achievedCount < milestones.length && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Next:</span>
          <span className="font-medium text-foreground">
            {milestones.find(m => !m.achieved)?.label}
          </span>
        </div>
      )}
    </div>
  );
}

// Compact inline version for sidebar
export function MilestonesCompact({
  cvUploaded,
  profileComplete,
  firstCampaignLaunched,
  firstStrongMatch,
  firstApplicationSent,
  tenApplicationsSubmitted,
}: MilestonesProps) {
  const milestones = [
    cvUploaded,
    profileComplete,
    firstCampaignLaunched,
    firstStrongMatch,
    firstApplicationSent,
    tenApplicationsSubmitted,
  ];

  const achievedCount = milestones.filter(Boolean).length;

  return (
    <div className="flex items-center gap-1">
      {milestones.map((achieved, idx) => (
        <div
          key={idx}
          className={cn(
            'h-1 w-4 rounded-full transition-all',
            achieved ? 'bg-success' : 'bg-secondary'
          )}
        />
      ))}
      <span className="ml-1 text-xs text-muted-foreground">
        {achievedCount}/{milestones.length}
      </span>
    </div>
  );
}
