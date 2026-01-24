'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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
import { campaignApi, jobApi, Campaign, JobOffer } from '@/lib/api-client';
import { useApi, useMutation, usePolling } from '@/hooks/use-api';
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string }> = {
  DISCOVERED: { label: 'New jobs', color: 'bg-blue-100 text-blue-800' },
  ANALYZING: { label: 'Being reviewed', color: 'bg-yellow-100 text-yellow-800' },
  MATCHED: { label: 'Good matches', color: 'bg-green-100 text-green-800' },
  REJECTED: { label: 'Not interested', color: 'bg-gray-100 text-gray-800' },
  APPLIED: { label: 'Applied', color: 'bg-purple-100 text-purple-800' },
  EXPIRED: { label: 'Expired', color: 'bg-red-100 text-red-800' },
  ERROR: { label: 'Error', color: 'bg-red-100 text-red-800' },
};

const campaignStatusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: <Clock className="h-4 w-4" /> },
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-4 w-4" /> },
  PAUSED: { label: 'Paused', color: 'bg-yellow-100 text-yellow-800', icon: <Pause className="h-4 w-4" /> },
  COMPLETED: { label: 'Completed', color: 'bg-blue-100 text-blue-800', icon: <Square className="h-4 w-4" /> },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-800', icon: <AlertTriangle className="h-4 w-4" /> },
};

function MatchScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  let color = 'bg-gray-100 text-gray-800';
  if (score >= 80) color = 'bg-green-100 text-green-800';
  else if (score >= 60) color = 'bg-blue-100 text-blue-800';
  else if (score >= 40) color = 'bg-yellow-100 text-yellow-800';
  else color = 'bg-red-100 text-red-800';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>
      {score}% match
    </span>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const campaignId = params.id as string;

  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch campaign
  const {
    data: campaign,
    isLoading: campaignLoading,
    refetch: refetchCampaign,
  } = useApi(() => campaignApi.get(campaignId), {
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load campaign',
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
          title: 'Error',
          description: 'Failed to load jobs',
          variant: 'destructive',
        });
      },
    }
  );

  // Poll for updates when campaign is active
  const isActive = campaign?.status === 'ACTIVE';
  const hasAnalyzing = jobsData?.data.some((j) => j.status === 'ANALYZING' || j.status === 'DISCOVERED');

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
      enabled: (isActive || hasAnalyzing) ?? false,
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
          title: 'Campaign started',
          description: 'Job discovery has begun.',
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
          title: 'Campaign paused',
          description: 'Job discovery has been paused.',
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
          title: 'Campaign stopped',
          description: 'The campaign has been completed.',
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
          title: 'Job rejected',
          description: 'The job has been marked as not interested.',
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
        <p className="text-destructive">Campaign not found</p>
        <Link href="/dashboard/campaigns">
          <Button variant="outline" className="mt-4">
            Back to campaigns
          </Button>
        </Link>
      </div>
    );
  }

  const status = campaignStatusConfig[campaign.status] || campaignStatusConfig.DRAFT;
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
                  Practice
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${status.color}`}>
                {status.icon}
                {status.label}
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
              onClick={() => startMutation.mutate()}
              disabled={startMutation.isLoading}
            >
              <Play className="mr-2 h-4 w-4" />
              {campaign.status === 'PAUSED' ? 'Resume' : 'Start'}
            </Button>
          )}
          {canPause && (
            <Button
              variant="outline"
              onClick={() => pauseMutation.mutate()}
              disabled={pauseMutation.isLoading}
            >
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
          {canStop && (
            <Button
              variant="outline"
              onClick={() => stopMutation.mutate()}
              disabled={stopMutation.isLoading}
            >
              <Square className="mr-2 h-4 w-4" />
              Stop
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matched</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.matched}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applied</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.applied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-500">{stats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Start Reminder for Draft Campaigns */}
      {campaign.status === 'DRAFT' && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-6">
            <div className="flex flex-col items-center text-center gap-4 sm:flex-row sm:text-left sm:justify-between">
              <div>
                <h3 className="font-semibold text-green-900 text-lg">Ready to start?</h3>
                <p className="text-green-800">
                  Your campaign won't find jobs until you start it.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-green-600 hover:bg-green-700"
                onClick={() => startMutation.mutate()}
                disabled={startMutation.isLoading}
              >
                <Play className="mr-2 h-5 w-5" />
                Start Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Discovered Jobs</CardTitle>
            <CardDescription>
              Jobs found matching your criteria
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="MATCHED">Good matches</SelectItem>
              <SelectItem value="APPLIED">Applied</SelectItem>
              <SelectItem value="DISCOVERED">New jobs</SelectItem>
              <SelectItem value="ANALYZING">Being reviewed</SelectItem>
              <SelectItem value="REJECTED">Not interested</SelectItem>
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
                  ? 'Start the campaign to discover jobs'
                  : 'No jobs found yet. Jobs will appear here as they are discovered.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: JobOffer) => {
                const jobStatus = statusConfig[job.status] || statusConfig.DISCOVERED;
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
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{job.title}</h4>
                            <span className={`text-xs px-2 py-0.5 rounded ${jobStatus.color}`}>
                              {isAnalyzing && <Loader2 className="h-3 w-3 animate-spin inline mr-1" />}
                              {jobStatus.label}
                            </span>
                            <MatchScoreBadge score={job.matchScore} />
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
                            Discovered{' '}
                            {formatDistanceToNow(new Date(job.discoveredAt), {
                              addSuffix: true,
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
                          title="Not interested"
                          onClick={() => rejectMutation.mutate(job.id)}
                          disabled={rejectMutation.isLoading}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      )}
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" title="View job posting">
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
