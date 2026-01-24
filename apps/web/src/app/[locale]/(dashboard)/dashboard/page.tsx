'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AnimatedCheckmark } from '@/components/ui/animated-checkmark';
import {
  FileText,
  Target,
  Briefcase,
  CheckCircle,
  Loader2,
  ArrowRight,
  Clock,
  Upload,
  Play,
  Eye,
  AlertCircle,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useApi } from '@/hooks/use-api';
import { dashboardApi, DashboardStats, ActionLog, applicationApi, campaignApi } from '@/lib/api-client';
import { formatDistanceToNow } from 'date-fns';

const actionKeyMap: Record<string, string> = {
  'user.login': 'userLogin',
  'profile.created': 'profileCreated',
  'profile.updated': 'profileUpdated',
  'cv.uploaded': 'cvUploaded',
  'cv.parse_started': 'cvParseStarted',
  'cv.parsed': 'cvParsed',
  'cv.parse_failed': 'cvParseFailed',
  'campaign.created': 'campaignCreated',
  'campaign.started': 'campaignStarted',
  'campaign.paused': 'campaignPaused',
  'campaign.stopped': 'campaignStopped',
  'job.discovered': 'jobDiscovered',
  'job.analyzed': 'jobAnalyzed',
  'job.matched': 'jobMatched',
  'job.rejected': 'jobRejected',
  'job.discovery_started': 'jobDiscoveryStarted',
  'job.discovery_completed': 'jobDiscoveryCompleted',
  'job.analysis_started': 'jobAnalysisStarted',
  'application.created': 'applicationCreated',
  'application.confirmed': 'applicationConfirmed',
  'application.submitted': 'applicationSubmitted',
  'application.withdrawn': 'applicationWithdrawn',
  'document.generation_started': 'documentGenerationStarted',
  'document.generated': 'documentGenerated',
  'api_key.created': 'apiKeyCreated',
  'api_key.revoked': 'apiKeyRevoked',
};

function getActionIcon(action: string) {
  if (action.includes('cv') || action.includes('document')) return <FileText className="h-4 w-4" />;
  if (action.includes('campaign')) return <Target className="h-4 w-4" />;
  if (action.includes('job')) return <Briefcase className="h-4 w-4" />;
  if (action.includes('application')) return <CheckCircle className="h-4 w-4" />;
  return <Clock className="h-4 w-4" />;
}

function getStatusColor(status: string) {
  if (status === 'failure') return 'text-red-500';
  if (status === 'success') return 'text-green-500';
  return 'text-muted-foreground';
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [activeCampaigns, setActiveCampaigns] = useState<Array<{ id: string; name: string; jobCount: number }>>([]);

  const {
    data: activityData,
    isLoading: activityLoading,
  } = useApi(() => dashboardApi.getRecentActivity(10));

  const loadStats = async () => {
    setStatsLoading(true);
    setStatsError(false);
    try {
      const [data, applicationsData, campaignsData] = await Promise.all([
        dashboardApi.getStats(),
        applicationApi.list({ status: 'PENDING_REVIEW', limit: 1 }),
        campaignApi.list(),
      ]);
      setStats(data);
      setPendingReviewCount(applicationsData.meta?.total || 0);
      setActiveCampaigns(
        campaignsData
          .filter((c) => c.status === 'ACTIVE')
          .map((c) => ({ id: c.id, name: c.name, jobCount: c._count?.jobOffers || 0 }))
      );
    } catch (error) {
      console.error('Failed to load stats:', error);
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const activity = activityData?.data || [];
  const hasCompletedSetup = stats && stats.cvCount > 0;
  const hasActiveCampaigns = activeCampaigns.length > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {t('subtitle')}
          </p>
        </div>
        {hasCompletedSetup && (
          <Link href="/dashboard/campaigns/new" className="self-start sm:self-auto">
            <Button>
              <Play className="mr-2 h-4 w-4" />
              {t('newCampaign')}
            </Button>
          </Link>
        )}
      </div>

      {/* Error State */}
      {statsError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="font-medium text-red-900">
                    {t('error.title')}
                  </p>
                  <p className="text-sm text-red-800">
                    {t('error.description')}
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-700 hover:bg-red-100"
                onClick={loadStats}
              >
                {tCommon('actions.retry')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Actions Alert */}
      {pendingReviewCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-900">
                    {t('pendingReview.title', { count: pendingReviewCount })}
                  </p>
                  <p className="text-sm text-yellow-800">
                    {t('pendingReview.description')}
                  </p>
                </div>
              </div>
              <Link href="/dashboard/applications?status=PENDING_REVIEW">
                <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                  {t('pendingReview.action')}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.cvsUploaded')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.cvCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.cvCount === 0
                    ? t('stats.cvsUploadedEmpty')
                    : t('stats.cvsUploadedHint')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.activeCampaigns')}
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.activeCampaignCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.campaignCount
                    ? t('stats.activeCampaignsHint', { total: stats.campaignCount })
                    : t('stats.activeCampaignsEmpty')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.jobsDiscovered')}
            </CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.jobCount || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.jobCount === 0
                    ? t('stats.jobsDiscoveredEmpty')
                    : t('stats.jobsDiscoveredHint')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('stats.applications')}
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.applicationCount || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.submittedCount
                    ? t('stats.applicationsSubmitted', { count: stats.submittedCount })
                    : t('stats.applicationsHint')}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Getting Started / Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>
              {hasCompletedSetup ? t('quickActions.title') : t('gettingStarted.title')}
            </CardTitle>
            <CardDescription>
              {hasCompletedSetup
                ? t('quickActions.subtitle')
                : t('gettingStarted.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCompletedSetup ? (
              <div className="space-y-3">
                <Link href="/dashboard/cvs">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      {t('quickActions.uploadCv')}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/campaigns/new">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      {t('quickActions.createCampaign')}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/applications">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      {t('quickActions.reviewApplications')}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/profile">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {t('quickActions.updateProfile')}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Step 1: Upload CV */}
                <div className={`flex items-start gap-4 p-3 rounded-lg transition-all ${stats?.cvCount ? 'animate-success-pulse' : ''}`}>
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      stats?.cvCount
                        ? 'bg-success-muted text-success'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {stats?.cvCount ? <AnimatedCheckmark size={16} /> : '1'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{t('gettingStarted.step1.title')}</p>
                      {!stats?.cvCount && (
                        <Link href="/dashboard/cvs">
                          <Button size="sm" variant="outline">
                            {tCommon('actions.upload')}
                          </Button>
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats?.cvCount
                        ? t('gettingStarted.step1.complete')
                        : t('gettingStarted.step1.pending')}
                    </p>
                  </div>
                </div>
                {/* Step 2: Create Campaign */}
                <div className={`flex items-start gap-4 p-3 rounded-lg transition-all ${stats?.campaignCount ? 'animate-success-pulse' : ''}`}>
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      stats?.campaignCount
                        ? 'bg-success-muted text-success'
                        : stats?.cvCount
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {stats?.campaignCount ? <AnimatedCheckmark size={16} /> : '2'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{t('gettingStarted.step2.title')}</p>
                      {stats?.cvCount && !stats?.campaignCount && (
                        <Link href="/dashboard/campaigns/new">
                          <Button size="sm" variant="outline">
                            {tCommon('actions.create')}
                          </Button>
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats?.campaignCount
                        ? t('gettingStarted.step2.complete')
                        : t('gettingStarted.step2.pending')}
                    </p>
                  </div>
                </div>
                {/* Step 3: Start Campaign */}
                <div className={`flex items-start gap-4 p-3 rounded-lg transition-all ${stats?.activeCampaignCount ? 'animate-success-pulse' : ''}`}>
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      stats?.activeCampaignCount
                        ? 'bg-success-muted text-success'
                        : stats?.campaignCount
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {stats?.activeCampaignCount ? <AnimatedCheckmark size={16} /> : '3'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{t('gettingStarted.step3.title')}</p>
                      {stats?.campaignCount && !stats?.activeCampaignCount && (
                        <Link href="/dashboard/campaigns">
                          <Button size="sm" variant="outline">
                            {tCommon('actions.start')}
                          </Button>
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats?.activeCampaignCount
                        ? t('gettingStarted.step3.complete')
                        : t('gettingStarted.step3.pending')}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Campaigns */}
        {hasActiveCampaigns && (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-green-500" />
                {t('activeCampaigns.title')}
              </CardTitle>
              <CardDescription>
                {t('activeCampaigns.subtitle')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeCampaigns.slice(0, 3).map((campaign) => (
                  <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 hover:translate-y-[-2px] hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {t('activeCampaigns.jobs', { count: campaign.jobCount })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-600">{t('activeCampaigns.running')}</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {activeCampaigns.length > 3 && (
                  <Link href="/dashboard/campaigns">
                    <Button variant="ghost" size="sm" className="w-full">
                      {t('activeCampaigns.viewAll')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <Card className={hasActiveCampaigns ? 'lg:col-span-1' : 'lg:col-span-2'}>
          <CardHeader>
            <CardTitle>{t('recentActivity.title')}</CardTitle>
            <CardDescription>{t('recentActivity.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('recentActivity.empty')}
              </p>
            ) : (
              <div className="space-y-4">
                {activity.map((log: ActionLog) => {
                  const actionKey = actionKeyMap[log.action];
                  return (
                    <div key={log.id} className="flex items-start gap-3">
                      <div className="rounded-full bg-muted p-2">
                        {getActionIcon(log.action)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {actionKey ? t(`actions.${actionKey}`) : log.action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.createdAt), {
                            addSuffix: true,
                          })}
                          {log.testMode && (
                            <span className="ml-2 text-orange-600">{t('recentActivity.practice')}</span>
                          )}
                        </p>
                      </div>
                      {log.status === 'failure' && (
                        <span className="text-xs text-destructive">{t('recentActivity.failed')}</span>
                      )}
                    </div>
                  );
                })}
                {activity.length >= 10 && (
                  <Link href="/dashboard/activity">
                    <Button variant="ghost" size="sm" className="w-full">
                      {t('recentActivity.viewAll')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
