'use client';

import { useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { campaignApi, jobApi, profileApi, Campaign, JobOffer } from '@/lib/api-client';
import { useApi, useMutation, usePolling } from '@/hooks/use-api';
import { useJobDiscoveryRealtime, useSocketConnection } from '@/hooks/use-realtime';
import { CampaignLaunchModal } from '@/components/campaigns/campaign-launch-modal';
import { DiscoveryFunnel } from '@/components/campaigns/discovery-funnel';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import {
  Loader2,
  Play,
  Pause,
  Square,
  ExternalLink,
  Briefcase,
  MapPin,
  DollarSign,
  Calendar,
  Target,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ThumbsDown,
  Building,
  Globe,
  Rss,
  Database,
  TestTube2,
  ShieldAlert,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLocale } from 'next-intl';
import { formatRelativeTime } from '@/lib/date-utils';

import { jobStatusColors, getMatchScoreBadgeColor } from '@/lib/status-config';

const campaignStatusColors: Record<string, { color: string; icon: React.ReactNode }> = {
  DRAFT: { color: 'bg-zinc-100 text-zinc-500', icon: <Clock className="h-4 w-4" /> },
  ACTIVE: { color: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle className="h-4 w-4" /> },
  PAUSED: { color: 'bg-amber-50 text-amber-700', icon: <Pause className="h-4 w-4" /> },
  COMPLETED: { color: 'bg-sky-50 text-sky-700', icon: <Square className="h-4 w-4" /> },
  FAILED: { color: 'bg-rose-50 text-rose-700', icon: <AlertTriangle className="h-4 w-4" /> },
};

function MatchScoreBadge({ score, label }: { score: number; label: string }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${getMatchScoreBadgeColor(score)}`}>
      {label}
    </span>
  );
}

// Source badge configuration
const sourceConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  remoteok: {
    icon: <Globe className="h-3 w-3" />,
    color: 'bg-emerald-100 text-emerald-800',
    label: 'RemoteOK',
  },
  wttj: {
    icon: <Database className="h-3 w-3" />,
    color: 'bg-violet-100 text-violet-800',
    label: 'WTTJ',
  },
  mock: {
    icon: <TestTube2 className="h-3 w-3" />,
    color: 'bg-orange-100 text-orange-800',
    label: 'Demo',
  },
  RSS: {
    icon: <Rss className="h-3 w-3" />,
    color: 'bg-amber-100 text-amber-800',
    label: 'RSS',
  },
  API: {
    icon: <Database className="h-3 w-3" />,
    color: 'bg-sky-50 text-sky-700',
    label: 'API',
  },
};

function SourceBadge({ source }: { source?: { name: string; displayName: string; type: string } }) {
  if (!source) return null;

  const config = sourceConfig[source.name] || sourceConfig[source.type] || {
    icon: <Globe className="h-3 w-3" />,
    color: 'bg-gray-100 text-gray-800',
    label: source.displayName,
  };

  return (
    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function DiscriminationBadge({
  flags,
  locale,
  t
}: {
  flags?: string[];
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  if (!flags || flags.length === 0) return null;

  // Map flag keys to translation keys
  const flagKeyMap: Record<string, string> = {
    age_limit: 'ageLimit',
    gender_preference: 'genderPreference',
    origin_requirement: 'originRequirement',
    physical_appearance: 'physicalAppearance',
    family_status: 'familyStatus',
    religious_requirement: 'religiousRequirement',
    health_requirement: 'healthRequirement',
    other_discrimination: 'otherDiscrimination',
  };

  const flagLabels = flags.map((flag) => {
    const translationKey = flagKeyMap[flag];
    return translationKey ? t(`detail.discriminationWarnings.flags.${translationKey}`) : flag;
  }).join(', ');

  const warningTitle = t('detail.discriminationWarnings.title');
  const attentionLabel = t('detail.discriminationWarnings.attention');

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 cursor-help">
            <ShieldAlert className="h-3 w-3" />
            {attentionLabel}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium mb-1">{warningTitle}</p>
          <p className="text-xs text-muted-foreground">{flagLabels}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('campaigns');
  const tStatus = useTranslations('campaigns.status');
  const locale = useLocale();
  const campaignId = params.id as string;

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showLaunchModal, setShowLaunchModal] = useState(false);
  const { isConnected: isRealtimeConnected } = useSocketConnection();

  // Fetch profile for launch modal readiness check
  const { data: profile } = useApi(() => profileApi.get().catch(() => null));

  // Get job status label
  const getJobStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      DISCOVERED: t('detail.jobStatus.discovered'),
      ANALYZING: t('detail.jobStatus.analyzing'),
      MATCHED: t('detail.jobStatus.matched'),
      REJECTED: t('detail.jobStatus.rejected'),
      APPLIED: t('detail.jobStatus.applied'),
      EXPIRED: t('detail.jobStatus.expired'),
      ERROR: t('detail.jobStatus.error'),
    };
    return statusMap[status] || status;
  };

  // Fetch campaign
  const {
    data: campaign,
    isLoading: campaignLoading,
    refetch: refetchCampaign,
  } = useApi(() => campaignApi.get(campaignId), {
    onError: () => {
      toast({
        title: t('detail.toast.loadError.title'),
        description: t('detail.toast.loadError.campaignFailed'),
        variant: 'destructive',
      });
    },
  });

  // Fetch jobs
  const {
    data: jobsData,
    isLoading: jobsLoading,
    refetch: refetchJobs,
  } = useApi(
    () =>
      jobApi.listForCampaign(campaignId, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50,
      }),
    {
      onError: () => {
        toast({
          title: t('detail.toast.loadError.title'),
          description: t('detail.toast.loadError.jobsFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  // Check if campaign needs updates
  const isActive = campaign?.status === 'ACTIVE';
  const hasAnalyzing = jobsData?.data.some((j) => j.status === 'ANALYZING' || j.status === 'DISCOVERED');

  // Real-time job discovery updates
  useJobDiscoveryRealtime(campaignId, {
    onJobDiscovered: useCallback(
      (_job: { id: string; title: string; company: string; location?: string }) => {
        // Add the new job to the list
        refetchJobs();
      },
      [refetchJobs]
    ),
    onJobMatched: useCallback(
      (payload: { campaignId: string; jobId: string; matchScore: number }) => {
        // Update job match score
        refetchJobs();
        if (payload.matchScore >= 70) {
          toast({
            title: t('detail.toast.match.title'),
            description: t('detail.toast.match.description', { score: payload.matchScore }),
          });
        }
      },
      [refetchJobs, toast, t]
    ),
    onDiscoveryCompleted: useCallback(
      (stats: { jobsFound: number; newJobs: number; matchedJobs: number }) => {
        if (stats.newJobs > 0) {
          toast({
            title: t('detail.toast.discovery.title', { count: stats.newJobs }),
            description: t('detail.toast.discovery.description', {
              found: stats.newJobs,
              matched: stats.matchedJobs,
            }),
          });
        }
        refetchJobs();
        refetchCampaign();
      },
      [toast, t, refetchJobs, refetchCampaign]
    ),
  });

  // Polling fallback when realtime is not connected
  usePolling(
    async () => {
      await refetchCampaign();
      return jobApi.listForCampaign(campaignId, {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50,
      });
    },
    {
      interval: 5000,
      enabled: ((isActive || hasAnalyzing) && !isRealtimeConnected) ?? false,
      onSuccess: () => {
        refetchJobs();
      },
    }
  );

  // Campaign actions
  const startMutation = useMutation(
    () => campaignApi.start(campaignId),
    {
      onSuccess: () => {
        refetchCampaign();
        toast({
          title: t('detail.toast.started.title'),
          description: t('detail.toast.started.description'),
        });
      },
    }
  );

  const pauseMutation = useMutation(
    () => campaignApi.pause(campaignId),
    {
      onSuccess: () => {
        refetchCampaign();
        toast({
          title: t('detail.toast.paused.title'),
          description: t('detail.toast.paused.description'),
        });
      },
    }
  );

  const stopMutation = useMutation(
    () => campaignApi.stop(campaignId),
    {
      onSuccess: () => {
        refetchCampaign();
        toast({
          title: t('detail.toast.stopped.title'),
          description: t('detail.toast.stopped.description'),
        });
      },
    }
  );

  // Job actions
  const rejectMutation = useMutation(
    (jobId: string) => jobApi.reject(jobId),
    {
      onSuccess: () => {
        refetchJobs();
        toast({
          title: t('detail.toast.jobRejected.title'),
          description: t('detail.toast.jobRejected.description'),
        });
      },
    }
  );

  if (campaignLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{t('detail.notFound')}</p>
        <Link href="/dashboard/campaigns">
          <Button variant="outline" className="mt-4">
            {t('detail.backToCampaigns')}
          </Button>
        </Link>
      </div>
    );
  }

  const statusStyle = campaignStatusColors[campaign.status] || campaignStatusColors.DRAFT;
  const jobs = jobsData?.data || [];

  const canStart = campaign.status === 'DRAFT' || campaign.status === 'PAUSED';
  const canPause = campaign.status === 'ACTIVE';
  const canStop = campaign.status === 'ACTIVE' || campaign.status === 'PAUSED';

  // Calculate stats
  const stats = {
    total: campaign._count?.jobOffers || 0,
    matched: jobs.filter((j) => j.status === 'MATCHED').length,
    applied: jobs.filter((j) => j.status === 'APPLIED').length,
    rejected: jobs.filter((j) => j.status === 'REJECTED').length,
  };

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: t('title'), href: '/dashboard/campaigns' },
        { label: campaign.name },
      ]} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
              {campaign.testMode && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                  {t('detail.practice')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${statusStyle.color}`}>
                {statusStyle.icon}
                {tStatus(campaign.status.toLowerCase())}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <Briefcase className="h-3 w-3" />
                {campaign.targetRoles.join(', ')}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <MapPin className="h-3 w-3" />
                {campaign.targetLocations.join(', ')}
              </span>
            </div>
          </div>
        <div className="flex items-center gap-2">
          {canStart && (
            <Button
              onClick={() => campaign.status === 'DRAFT' ? setShowLaunchModal(true) : startMutation.mutate()}
              disabled={startMutation.isLoading}
            >
              <Play className="mr-2 h-4 w-4" />
              {campaign.status === 'PAUSED' ? t('detail.resume') : t('detail.start')}
            </Button>
          )}
          {canPause && (
            <Button
              variant="outline"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isLoading}
            >
              <Pause className="mr-2 h-4 w-4" />
              {t('detail.pause')}
            </Button>
          )}
          {canStop && (
            <Button
              variant="outline"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isLoading}
            >
              <Square className="mr-2 h-4 w-4" />
              {t('detail.stop')}
            </Button>
          )}
        </div>
      </div>

      {/* Discovery Funnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('detail.stats.pipeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DiscoveryFunnel
            discovered={stats.total}
            matched={stats.matched}
            applied={stats.applied}
            showInsights={stats.total > 0}
          />
        </CardContent>
      </Card>

      {/* Start Reminder for Draft Campaigns */}
      {campaign.status === 'DRAFT' && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:justify-between">
              <div>
                <h3 className="font-semibold text-emerald-900 text-lg">{t('detail.readyToStart.title')}</h3>
                <p className="text-emerald-800">
                  {t('detail.readyToStart.description')}
                </p>
              </div>
              <Button
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setShowLaunchModal(true)}
                disabled={startMutation.isLoading}
              >
                <Play className="mr-2 h-5 w-5" />
                {t('detail.readyToStart.button')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign Launch Modal */}
      {campaign && (
        <CampaignLaunchModal
          open={showLaunchModal}
          onOpenChange={setShowLaunchModal}
          campaign={campaign}
          profile={profile ?? null}
          onLaunch={async () => {
            await startMutation.mutateAsync();
            setShowLaunchModal(false);
          }}
          isLaunching={startMutation.isLoading}
        />
      )}

      {/* Jobs List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('detail.jobs.title')}</CardTitle>
            <CardDescription>
              {t('detail.jobs.subtitle')}
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('detail.jobs.filterPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('detail.jobs.filterAll')}</SelectItem>
              <SelectItem value="MATCHED">{t('detail.jobs.filterMatched')}</SelectItem>
              <SelectItem value="APPLIED">{t('detail.jobs.filterApplied')}</SelectItem>
              <SelectItem value="DISCOVERED">{t('detail.jobs.filterDiscovered')}</SelectItem>
              <SelectItem value="ANALYZING">{t('detail.jobs.filterAnalyzing')}</SelectItem>
              <SelectItem value="REJECTED">{t('detail.jobs.filterRejected')}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {jobsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {campaign.status === 'DRAFT'
                  ? t('detail.jobs.emptyDraft')
                  : t('detail.jobs.emptyActive')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: JobOffer) => {
                const jobStatusColor = jobStatusColors[job.status] || jobStatusColors.DISCOVERED;
                const isAnalyzing = job.status === 'ANALYZING';
                const canReject = job.status === 'MATCHED' || job.status === 'DISCOVERED';

                return (
                  <div
                    key={job.id}
                    className="flex flex-col gap-2 p-3 border rounded-lg hover:bg-muted/50 transition-colors sm:flex-row sm:items-start sm:justify-between sm:p-4"
                  >
                    <div className="flex-1 min-w-0">
                      {/* Line 1: Title + Status */}
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium truncate">{job.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded ${jobStatusColor}`}>
                          {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
                          {getJobStatusLabel(job.status)}
                        </span>
                        {job.matchScore !== null && (
                          <MatchScoreBadge score={job.matchScore} label={t('detail.jobs.match', { score: job.matchScore })} />
                        )}
                      </div>
                      {/* Line 2: Company + Location + Source/Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {job.company}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                        )}
                        {job.jobSource && (
                          <SourceBadge source={job.jobSource} />
                        )}
                        {job.discriminationFlags && job.discriminationFlags.length > 0 && (
                          <DiscriminationBadge flags={job.discriminationFlags} locale={locale} t={t} />
                        )}
                      </div>
                      {/* Line 3: Secondary info - hidden on mobile */}
                      <div className="hidden sm:flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
                        {job.salary && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {job.salary}
                          </span>
                        )}
                        {job.contractType && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {job.contractType}
                          </span>
                        )}
                        {job.remoteType && (
                          <span className="text-xs bg-muted px-2 py-0.5 rounded">
                            {job.remoteType}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {t('detail.jobs.discovered')}{' '}
                        {formatRelativeTime(job.discoveredAt, locale)}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:ml-4">
                      {canReject && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('detail.jobs.notInterested')}
                          onClick={() => rejectMutation.mutate(job.id)}
                          disabled={rejectMutation.isLoading}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      )}
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" title={t('detail.jobs.viewJobPosting')}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
