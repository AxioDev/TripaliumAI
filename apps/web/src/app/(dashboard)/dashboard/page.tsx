'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    'profile.created': 'Profile created',
    'profile.updated': 'Profile updated',
    'cv.uploaded': 'CV uploaded',
    'cv.parse_started': 'CV parsing started',
    'cv.parsed': 'CV parsed successfully',
    'cv.parse_failed': 'CV parsing failed',
    'campaign.created': 'Campaign created',
    'campaign.started': 'Campaign started',
    'campaign.paused': 'Campaign paused',
    'campaign.stopped': 'Campaign stopped',
    'job.discovered': 'Job discovered',
    'job.analyzed': 'Job analyzed',
    'job.matched': 'Job matched',
    'job.rejected': 'Job rejected',
    'job.discovery_started': 'Job discovery started',
    'job.discovery_completed': 'Job discovery completed',
    'job.analysis_started': 'Job analysis started',
    'application.created': 'Application created',
    'application.confirmed': 'Application confirmed',
    'application.submitted': 'Application submitted',
    'application.withdrawn': 'Application withdrawn',
    'document.generation_started': 'Document generation started',
    'document.generated': 'Document generated',
    'api_key.created': 'API key created',
    'api_key.revoked': 'API key revoked',
  };
  return labels[action] || action.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
          <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Your job search at a glance
          </p>
        </div>
        {hasCompletedSetup && (
          <Link href="/dashboard/campaigns/new" className="self-start sm:self-auto">
            <Button>
              <Play className="mr-2 h-4 w-4" />
              New Campaign
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
                    Couldn't load dashboard data
                  </p>
                  <p className="text-sm text-red-800">
                    Please try again or check your connection.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-red-600 text-red-700 hover:bg-red-100"
                onClick={loadStats}
              >
                Retry
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
                    {pendingReviewCount} application{pendingReviewCount !== 1 ? 's' : ''} pending review
                  </p>
                  <p className="text-sm text-yellow-800">
                    Review generated documents before confirming
                  </p>
                </div>
              </div>
              <Link href="/dashboard/applications?status=PENDING_REVIEW">
                <Button size="sm" variant="outline" className="border-yellow-600 text-yellow-700 hover:bg-yellow-100">
                  Review Now
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
            <CardTitle className="text-sm font-medium">CVs Uploaded</CardTitle>
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
                    ? 'Upload your first CV to get started'
                    : 'CVs available for applications'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Campaigns
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
                    ? `of ${stats.campaignCount} total campaigns`
                    : 'Create a campaign to start finding jobs'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Jobs Discovered
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
                    ? 'Matching jobs will appear here'
                    : 'Jobs matching your criteria'}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Applications
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
                    ? `${stats.submittedCount} submitted`
                    : 'Track your application progress'}
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
              {hasCompletedSetup ? 'Quick Actions' : 'Getting Started'}
            </CardTitle>
            <CardDescription>
              {hasCompletedSetup
                ? 'Common tasks and shortcuts'
                : 'Complete these steps to set up your job search'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hasCompletedSetup ? (
              <div className="space-y-3">
                <Link href="/dashboard/cvs">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Upload a new CV
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/campaigns/new">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Create new campaign
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/applications">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Review applications
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/profile">
                  <Button variant="outline" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Update profile
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Step 1: Upload CV */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      stats?.cvCount
                        ? 'bg-green-100 text-green-600'
                        : 'bg-primary text-primary-foreground'
                    }`}
                  >
                    {stats?.cvCount ? <CheckCircle className="h-4 w-4" /> : '1'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Upload your CV</p>
                      {!stats?.cvCount && (
                        <Link href="/dashboard/cvs">
                          <Button size="sm" variant="outline">
                            Upload
                          </Button>
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats?.cvCount
                        ? 'CV uploaded successfully'
                        : 'Upload a PDF resume to extract your profile data'}
                    </p>
                  </div>
                </div>
                {/* Step 2: Create Campaign */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      stats?.campaignCount
                        ? 'bg-green-100 text-green-600'
                        : stats?.cvCount
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {stats?.campaignCount ? <CheckCircle className="h-4 w-4" /> : '2'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Create a campaign</p>
                      {stats?.cvCount && !stats?.campaignCount && (
                        <Link href="/dashboard/campaigns/new">
                          <Button size="sm" variant="outline">
                            Create
                          </Button>
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats?.campaignCount
                        ? 'Campaign created'
                        : 'Define your target roles, locations, and preferences'}
                    </p>
                  </div>
                </div>
                {/* Step 3: Start Campaign */}
                <div className="flex items-start gap-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                      stats?.activeCampaignCount
                        ? 'bg-green-100 text-green-600'
                        : stats?.campaignCount
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {stats?.activeCampaignCount ? <CheckCircle className="h-4 w-4" /> : '3'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Start your campaign</p>
                      {stats?.campaignCount && !stats?.activeCampaignCount && (
                        <Link href="/dashboard/campaigns">
                          <Button size="sm" variant="outline">
                            Start
                          </Button>
                        </Link>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {stats?.activeCampaignCount
                        ? 'Campaign is running'
                        : 'Click "Start" on your campaign to begin finding jobs'}
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
                Active Campaigns
              </CardTitle>
              <CardDescription>
                Currently running job searches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeCampaigns.slice(0, 3).map((campaign) => (
                  <Link key={campaign.id} href={`/dashboard/campaigns/${campaign.id}`}>
                    <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium truncate">{campaign.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {campaign.jobCount} jobs
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-600">Running</span>
                      </div>
                    </div>
                  </Link>
                ))}
                {activeCampaigns.length > 3 && (
                  <Link href="/dashboard/campaigns">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all campaigns
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
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest actions and updates</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent activity. Start by uploading your CV.
              </p>
            ) : (
              <div className="space-y-4">
                {activity.map((log: ActionLog) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="rounded-full bg-muted p-2">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getActionLabel(log.action)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(log.createdAt), {
                          addSuffix: true,
                        })}
                        {log.testMode && (
                          <span className="ml-2 text-orange-600">(practice)</span>
                        )}
                      </p>
                    </div>
                    {log.status === 'failure' && (
                      <span className="text-xs text-destructive">Failed</span>
                    )}
                  </div>
                ))}
                {activity.length >= 10 && (
                  <Link href="/dashboard/activity">
                    <Button variant="ghost" size="sm" className="w-full">
                      View all activity
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
