'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Sparkles, Rocket, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confetti } from '@/components/ui/confetti';

interface SubmissionCelebrationProps {
  show: boolean;
  jobTitle: string;
  company: string;
  onClose: () => void;
  onViewApplications?: () => void;
  onAddNotes?: () => void;
}

export function SubmissionCelebration({
  show,
  jobTitle,
  company,
  onClose,
  onViewApplications,
  onAddNotes,
}: SubmissionCelebrationProps) {
  const [phase, setPhase] = React.useState<'burst' | 'message' | 'actions'>('burst');

  React.useEffect(() => {
    if (show) {
      setPhase('burst');

      // Progress through phases
      const timer1 = setTimeout(() => setPhase('message'), 500);
      const timer2 = setTimeout(() => setPhase('actions'), 1500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-slide-in-up"
        onClick={onClose}
      />

      {/* Confetti */}
      <Confetti active={show} />

      {/* Content */}
      <div className="relative z-10 text-center space-y-6 p-8 max-w-md mx-4">
        {/* Success icon with burst animation */}
        <div className="relative mx-auto w-24 h-24">
          {phase === 'burst' && (
            <div className="absolute inset-0 animate-celebration-burst bg-success/20 rounded-full" />
          )}
          <div className={cn(
            'absolute inset-0 flex items-center justify-center',
            phase !== 'burst' && 'animate-bounce-in'
          )}>
            <div className="w-20 h-20 rounded-full bg-success flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-success-foreground" />
            </div>
          </div>
        </div>

        {/* Message */}
        <div className={cn(
          'space-y-2 transition-opacity duration-300',
          phase === 'burst' ? 'opacity-0' : 'opacity-100 animate-slide-in-up'
        )}>
          <div className="flex items-center justify-center gap-2 text-success">
            <Sparkles className="h-5 w-5" />
            <span className="font-medium">Application Sent!</span>
            <Sparkles className="h-5 w-5" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">
            {jobTitle}
          </h2>
          <p className="text-muted-foreground">
            at {company}
          </p>
        </div>

        {/* Actions */}
        <div className={cn(
          'space-y-3 transition-opacity duration-300',
          phase !== 'actions' ? 'opacity-0' : 'opacity-100 animate-slide-in-up'
        )}>
          <p className="text-sm text-muted-foreground">
            Track your application progress in your dashboard.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={onClose}>
              Continue
            </Button>
            {onViewApplications && (
              <Button variant="outline" onClick={onViewApplications}>
                <ExternalLink className="mr-2 h-4 w-4" />
                View All Applications
              </Button>
            )}
          </div>

          {onAddNotes && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onAddNotes}
            >
              Add notes about this application
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline card glow effect for submitted applications
export function SubmittedGlow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute inset-0 animate-card-glow rounded-lg pointer-events-none" />
      {children}
    </div>
  );
}
