'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Loader2 } from 'lucide-react';

export interface ProgressStage {
  threshold: number; // 0-100, stage is active when progress >= threshold
  message: string;
  completedMessage?: string;
}

interface StagedProgressProps {
  progress: number; // 0-100
  stages: ProgressStage[];
  className?: string;
  showPercentage?: boolean;
}

const defaultCVParsingStages: ProgressStage[] = [
  { threshold: 0, message: 'Reading document structure...', completedMessage: 'Document structure read' },
  { threshold: 20, message: 'Extracting contact information...', completedMessage: 'Contact information extracted' },
  { threshold: 40, message: 'Analyzing work experience...', completedMessage: 'Work experience analyzed' },
  { threshold: 60, message: 'Identifying skills...', completedMessage: 'Skills identified' },
  { threshold: 80, message: 'Building your profile...', completedMessage: 'Profile built' },
];

const defaultDocumentGenerationStages: ProgressStage[] = [
  { threshold: 0, message: 'Analyzing job requirements...', completedMessage: 'Job requirements analyzed' },
  { threshold: 25, message: 'Matching your experience...', completedMessage: 'Experience matched' },
  { threshold: 50, message: 'Crafting tailored CV...', completedMessage: 'CV crafted' },
  { threshold: 75, message: 'Writing cover letter...', completedMessage: 'Cover letter written' },
];

export function StagedProgress({
  progress,
  stages,
  className,
  showPercentage = true,
}: StagedProgressProps) {
  const currentStageIndex = React.useMemo(() => {
    let idx = 0;
    for (let i = stages.length - 1; i >= 0; i--) {
      if (progress >= stages[i].threshold) {
        idx = i;
        break;
      }
    }
    return idx;
  }, [progress, stages]);

  const currentStage = stages[currentStageIndex];
  const isComplete = progress >= 100;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress bar */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            isComplete ? 'bg-success' : 'bg-primary'
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
        {!isComplete && (
          <div
            className="absolute top-0 h-full w-20 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ left: `${Math.min(progress, 100) - 10}%` }}
          />
        )}
      </div>

      {/* Status message */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4 text-success animate-bounce-in" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          )}
          <span className={cn(
            'text-sm font-medium animate-slide-in-up',
            isComplete ? 'text-success' : 'text-foreground'
          )}>
            {isComplete ? 'Complete!' : currentStage.message}
          </span>
        </div>
        {showPercentage && (
          <span className="text-sm font-medium text-muted-foreground">
            {Math.round(progress)}%
          </span>
        )}
      </div>

      {/* Stage indicators */}
      <div className="flex items-center gap-1">
        {stages.map((stage, idx) => {
          const isPast = progress >= stage.threshold + (stages[idx + 1]?.threshold - stage.threshold || 20);
          const isCurrent = idx === currentStageIndex && !isComplete;

          return (
            <div
              key={idx}
              className={cn(
                'flex-1 h-1 rounded-full transition-all duration-300',
                isPast || isComplete
                  ? 'bg-success'
                  : isCurrent
                  ? 'bg-primary'
                  : 'bg-secondary'
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

// Preset components for common use cases
export function CVParsingProgress({ progress }: { progress: number }) {
  return <StagedProgress progress={progress} stages={defaultCVParsingStages} />;
}

export function DocumentGenerationProgress({ progress }: { progress: number }) {
  return <StagedProgress progress={progress} stages={defaultDocumentGenerationStages} />;
}

// Simulated progress hook for demo/preview purposes
export function useSimulatedProgress(
  isActive: boolean,
  duration: number = 10000,
  onComplete?: () => void
) {
  const [progress, setProgress] = React.useState(0);

  React.useEffect(() => {
    if (!isActive) {
      setProgress(0);
      return;
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (100 / (duration / 100));
        if (next >= 100) {
          clearInterval(interval);
          onComplete?.();
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, duration, onComplete]);

  return progress;
}
