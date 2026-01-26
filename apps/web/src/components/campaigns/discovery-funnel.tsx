'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Search, Target, Send, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FunnelStage {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface DiscoveryFunnelProps {
  discovered: number;
  matched: number;
  applied: number;
  className?: string;
  showInsights?: boolean;
}

export function DiscoveryFunnel({
  discovered,
  matched,
  applied,
  className,
  showInsights = true,
}: DiscoveryFunnelProps) {
  const stages: FunnelStage[] = [
    {
      label: 'Discovered',
      value: discovered,
      icon: <Search className="h-4 w-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500',
    },
    {
      label: 'Matched',
      value: matched,
      icon: <Target className="h-4 w-4" />,
      color: 'text-green-600',
      bgColor: 'bg-green-500',
    },
    {
      label: 'Applied',
      value: applied,
      icon: <Send className="h-4 w-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500',
    },
  ];

  const maxValue = Math.max(discovered, 1);
  const matchRate = discovered > 0 ? Math.round((matched / discovered) * 100) : 0;
  const applyRate = matched > 0 ? Math.round((applied / matched) * 100) : 0;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Funnel visualization */}
      <div className="flex items-center gap-2">
        <TooltipProvider>
          {stages.map((stage, idx) => {
            const width = Math.max((stage.value / maxValue) * 100, stage.value > 0 ? 15 : 5);

            return (
              <React.Fragment key={stage.label}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={cn('flex-shrink-0', stage.color)}>
                          {stage.icon}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground truncate">
                          {stage.label}
                        </span>
                      </div>
                      <div className="h-8 bg-secondary rounded-lg overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-lg transition-all duration-700 ease-out flex items-center justify-center',
                            stage.bgColor
                          )}
                          style={{
                            width: `${width}%`,
                            animationDelay: `${idx * 150}ms`,
                          }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow-sm">
                            {stage.value}
                          </span>
                        </div>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{stage.value} jobs {stage.label.toLowerCase()}</p>
                  </TooltipContent>
                </Tooltip>

                {idx < stages.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </TooltipProvider>
      </div>

      {/* Conversion insights */}
      {showInsights && discovered > 0 && (
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            {matchRate >= 20 ? (
              <TrendingUp className="h-3 w-3 text-success" />
            ) : (
              <TrendingDown className="h-3 w-3 text-warning" />
            )}
            <span className="text-muted-foreground">
              Match rate: <span className="font-medium text-foreground">{matchRate}%</span>
            </span>
          </div>
          {matched > 0 && (
            <div className="flex items-center gap-1.5">
              {applyRate >= 50 ? (
                <TrendingUp className="h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="h-3 w-3 text-warning" />
              )}
              <span className="text-muted-foreground">
                Apply rate: <span className="font-medium text-foreground">{applyRate}%</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact version for dashboard cards
export function DiscoveryFunnelCompact({
  discovered,
  matched,
  applied,
}: {
  discovered: number;
  matched: number;
  applied: number;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex items-center gap-1 text-blue-600">
        <Search className="h-3 w-3" />
        {discovered}
      </span>
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <span className="flex items-center gap-1 text-green-600">
        <Target className="h-3 w-3" />
        {matched}
      </span>
      <ChevronRight className="h-3 w-3 text-muted-foreground" />
      <span className="flex items-center gap-1 text-purple-600">
        <Send className="h-3 w-3" />
        {applied}
      </span>
    </div>
  );
}
