'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  FileText,
  User,
  Target,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { Profile, Campaign } from '@/lib/api-client';

interface ReadinessItem {
  key: string;
  label: string;
  description: string;
  check: (profile: Profile | null, campaign: Campaign) => boolean;
  icon: React.ReactNode;
  required: boolean;
}

function getReadinessItems(t: ReturnType<typeof useTranslations>): ReadinessItem[] {
  return [
    {
      key: 'profile',
      label: t('readiness.profile.label'),
      description: t('readiness.profile.description'),
      check: (p) => !!(p?.firstName && p?.lastName && p?.email),
      icon: <User className="h-4 w-4" />,
      required: true,
    },
    {
      key: 'cv',
      label: t('readiness.cv.label'),
      description: t('readiness.cv.description'),
      check: (p) => !!(p?.workExperiences?.length || p?.skills?.length),
      icon: <FileText className="h-4 w-4" />,
      required: false,
    },
    {
      key: 'roles',
      label: t('readiness.roles.label'),
      description: t('readiness.roles.description'),
      check: (_, c) => c.targetRoles.length > 0,
      icon: <Target className="h-4 w-4" />,
      required: true,
    },
    {
      key: 'locations',
      label: t('readiness.locations.label'),
      description: t('readiness.locations.description'),
      check: (_, c) => c.targetLocations.length > 0,
      icon: <MapPin className="h-4 w-4" />,
      required: true,
    },
  ];
}

interface CampaignLaunchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: Campaign;
  profile: Profile | null;
  onLaunch: () => Promise<void>;
  isLaunching: boolean;
}

export function CampaignLaunchModal({
  open,
  onOpenChange,
  campaign,
  profile,
  onLaunch,
  isLaunching,
}: CampaignLaunchModalProps) {
  const t = useTranslations('campaignLaunch');
  const [phase, setPhase] = React.useState<'checklist' | 'launching' | 'launched'>('checklist');
  const [scanCount, setScanCount] = React.useState(0);

  const readinessItems = React.useMemo(() => getReadinessItems(t), [t]);

  const results = React.useMemo(() => {
    return readinessItems.map(item => ({
      ...item,
      passed: item.check(profile, campaign),
    }));
  }, [readinessItems, profile, campaign]);

  const allRequiredPassed = results.filter(r => r.required).every(r => r.passed);
  const passedCount = results.filter(r => r.passed).length;

  // Reset phase when modal opens
  React.useEffect(() => {
    if (open) {
      setPhase('checklist');
      setScanCount(0);
    }
  }, [open]);

  // Simulate scanning animation during launch
  React.useEffect(() => {
    if (phase === 'launching') {
      const interval = setInterval(() => {
        setScanCount(prev => prev + Math.floor(Math.random() * 50) + 10);
      }, 200);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        setPhase('launched');
      }, 2000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [phase]);

  const handleLaunch = async () => {
    setPhase('launching');
    try {
      await onLaunch();
    } catch {
      setPhase('checklist');
    }
  };

  const handleClose = () => {
    if (phase === 'launched') {
      onOpenChange(false);
    } else if (phase === 'checklist') {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {phase === 'checklist' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-primary" />
                {t('title')}
              </DialogTitle>
              <DialogDescription>
                {t('description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Checklist */}
              <div className="space-y-3">
                {results.map((item, idx) => (
                  <div
                    key={item.key}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg transition-all duration-300',
                      item.passed ? 'bg-success-muted' : 'bg-muted/50'
                    )}
                    style={{
                      animationDelay: `${idx * 100}ms`,
                    }}
                  >
                    <div className={cn(
                      'mt-0.5 transition-all duration-300',
                      item.passed ? 'text-success' : 'text-muted-foreground'
                    )}>
                      {item.passed ? (
                        <CheckCircle2 className="h-5 w-5 animate-bounce-in" />
                      ) : (
                        <Circle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium text-sm',
                          item.passed ? 'text-success' : 'text-foreground'
                        )}>
                          {item.label}
                        </span>
                        {item.required && !item.passed && (
                          <span className="text-xs text-destructive">{t('required')}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress indicator */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t('progress', { passed: passedCount, total: results.length })}
                </span>
                {allRequiredPassed && (
                  <span className="flex items-center gap-1 text-success">
                    <Sparkles className="h-3 w-3" />
                    {t('readyToLaunch')}
                  </span>
                )}
              </div>

              {/* Practice mode notice */}
              {campaign.testMode && (
                <div className="rounded-lg bg-warning-muted p-3 text-sm">
                  <p className="font-medium text-warning">{t('practiceMode.title')}</p>
                  <p className="text-warning/80 text-xs mt-1">
                    {t('practiceMode.description')}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              <Button
                onClick={handleLaunch}
                disabled={!allRequiredPassed || isLaunching}
              >
                <Rocket className="mr-2 h-4 w-4" />
                {t('launch')}
              </Button>
            </div>
          </>
        )}

        {phase === 'launching' && (
          <div className="py-12 text-center">
            <div className="relative mx-auto mb-6 h-20 w-20">
              {/* Expanding ring animation */}
              <div className="absolute inset-0 animate-pulse-ring rounded-full bg-primary/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full bg-primary animate-bounce-in flex items-center justify-center">
                  <Rocket className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
            </div>
            <h3 className="text-lg font-semibold mb-2">{t('launching.title')}</h3>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="tabular-nums">
                {t('launching.scanning', { count: scanCount.toLocaleString() })}
              </span>
            </div>
          </div>
        )}

        {phase === 'launched' && (
          <div className="py-12 text-center">
            <div className="mx-auto mb-6 h-20 w-20 rounded-full bg-success flex items-center justify-center animate-bounce-in">
              <CheckCircle2 className="h-10 w-10 text-success-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-success">{t('launched.title')}</h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t('launched.description')}
            </p>
            <Button onClick={() => onOpenChange(false)}>
              {t('launched.action')}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
