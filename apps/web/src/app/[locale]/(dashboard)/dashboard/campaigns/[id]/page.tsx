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
import {
  ArrowLeft,
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
import { formatDistanceToNow } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

const statusColors: Record<string, string> = {
  DISCOVERED: 'bg-blue-100 text-blue-800',
  ANALYZING: 'bg-yellow-100 text-yellow-800',
  MATCHED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-800',
  APPLIED: 'bg-purple-100 text-purple-800',
  EXPIRED: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
};

const campaignStatusColors: Record<string, { color: string; icon: React.ReactNode }> = {
  DRAFT: { color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-4 w-4" /> },
  ACTIVE: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4" /> },
  PAUSED: { color: 'bg-yellow-100 text-yellow-800', icon: <Pause className="h-4 w-4" /> },
  COMPLETED: { color: 'bg-blue-100 text-blue-800', icon: <Square className="h-4 w-4" /> },
  FAILED: { color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-4 w-4" /> },
};

function MatchScoreBadge({ score, label }: { score: number; label: string }) {
  let color = 'bg-gray-100 text-gray-800';
  if (score >= 80) color = 'bg-green-100 text-green-800';
  else if (score >= 60) color = 'bg-blue-100 text-blue-800';
  else if (score >= 40) color = 'bg-yellow-100 text-yellow-800';
  else color = 'bg-red-100 text-red-800';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>
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
    color: 'bg-blue-100 text-blue-800',
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

// Discrimination flag labels
const discriminationLabels: Record<string, string> = {
  age_limit: 'Age restriction',
  gender_preference: 'Gender preference',
  origin_requirement: 'Origin/nationality requirement',
  physical_appearance: 'Physical appearance requirement',
  family_status: 'Family status preference',
  religious_requirement: 'Religious requirement',
  health_requirement: 'Health/disability requirement',
  other_discrimination: 'Other discriminatory requirement',
};

const discriminationLabelsFr: Record<string, string> = {
  age_limit: 'Restriction d\'âge',
  gender_preference: 'Préférence de genre',
  origin_requirement: 'Exigence d\'origine/nationalité',
  physical_appearance: 'Exigence d\'apparence physique',
  family_status: 'Préférence de situation familiale',
  religious_requirement: 'Exigence religieuse',
  health_requirement: 'Exigence de santé/handicap',
  other_discrimination: 'Autre exigence discriminatoire',
};

function DiscriminationBadge({ flags, locale }: { flags?: string[]; locale: string }) {
  if (!flags || flags.length === 0) return null;

  const labels = locale === 'fr' ? discriminationLabelsFr : discriminationLabels;
  const flagLabels = flags.map((flag) => labels[flag] || flag).join(', ');
  const tooltipTitle = locale === 'fr'
    ? 'Avertissement : Cette offre peut contenir des critères discriminatoires'
    : 'Warning: This job posting may contain discriminatory criteria';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 cursor-help">
            <ShieldAlert className="h-3 w-3" />
            {locale === 'fr' ? 'Attention' : 'Warning'}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="font-medium mb-1">{tooltipTitle}</p>
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
  const dateLocale = locale === 'fr' ? fr : enUS;
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
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
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
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:justify-between">
              <div>
                <h3 className="font-semibold text-green-900 text-lg">{t('detail.readyToStart.title')}</h3>
                <p className="text-green-800">
                  {t('detail.readyToStart.description')}
                </p>
              </div>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
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
                const jobStatusColor = statusColors[job.status] || statusColors.DISCOVERED;
                const isAnalyzing = job.status === 'ANALYZING';
                const canReject = job.status === 'MATCHED' || job.status === 'DISCOVERED';

                return (
                  <div
                    key={job.id}
                    className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-medium truncate">{job.title}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded ${jobStatusColor}`}>
                              {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
                              {getJobStatusLabel(job.status)}
                            </span>
                            {job.matchScore !== null && (
                              <MatchScoreBadge score={job.matchScore} label={t('detail.jobs.match', { score: job.matchScore })} />
                            )}
                            {job.jobSource && (
                              <SourceBadge source={job.jobSource} />
                            )}
                            {job.discriminationFlags && job.discriminationFlags.length > 0 && (
                              <DiscriminationBadge flags={job.discriminationFlags} locale={locale} />
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
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
                            {formatDistanceToNow(new Date(job.discoveredAt), {
                              addSuffix: true,
                              locale: dateLocale,
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
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
