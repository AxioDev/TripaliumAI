'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { campaignApi, Campaign } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Target,
  Play,
  Pause,
  Square,
  Plus,
  Loader2,
  Trash2,
  Eye,
  Briefcase,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ReactNode }
> = {
  DRAFT: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    icon: <Clock className="h-3 w-3" />,
  },
  ACTIVE: {
    label: 'Active',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  PAUSED: {
    label: 'Paused',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: <Pause className="h-3 w-3" />,
  },
  COMPLETED: {
    label: 'Completed',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: <Square className="h-3 w-3" />,
  },
  FAILED: {
    label: 'Failed',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
};

export default function CampaignsPage() {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: campaigns,
    isLoading,
    refetch,
  } = useApi(() => campaignApi.list(), {
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load campaigns',
        variant: 'destructive',
      });
    },
  });

  const startMutation = useMutation(
    (id: string) => campaignApi.start(id),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: 'Campaign started',
          description: 'Job discovery has begun.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to start campaign',
          variant: 'destructive',
        });
      },
    }
  );

  const pauseMutation = useMutation(
    (id: string) => campaignApi.pause(id),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: 'Campaign paused',
          description: 'Job discovery has been paused.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to pause campaign',
          variant: 'destructive',
        });
      },
    }
  );

  const stopMutation = useMutation(
    (id: string) => campaignApi.stop(id),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: 'Campaign stopped',
          description: 'The campaign has been completed.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to stop campaign',
          variant: 'destructive',
        });
      },
    }
  );

  const deleteMutation = useMutation(
    (id: string) => campaignApi.delete(id),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: 'Campaign deleted',
          description: 'The campaign has been removed.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to delete campaign',
          variant: 'destructive',
        });
      },
    }
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Campaigns</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Manage your job search campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new" className="self-start sm:self-auto">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {!campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No campaigns yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Create a campaign to define your job search criteria. We&apos;ll
              find matching opportunities and help you apply.
            </p>
            <Link href="/dashboard/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create your first campaign
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns.map((campaign: Campaign) => {
            const status = statusConfig[campaign.status] || statusConfig.DRAFT;
            const isActive = campaign.status === 'ACTIVE';
            const isPaused = campaign.status === 'PAUSED';
            const isDraft = campaign.status === 'DRAFT';
            const canStart = isDraft || isPaused;
            const canPause = isActive;
            const canStop = isActive || isPaused;
            const canDelete = !isActive;

            return (
              <Card key={campaign.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">{campaign.name}</CardTitle>
                      {campaign.testMode && (
                        <span className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 px-2 py-0.5 rounded">
                          Practice
                        </span>
                      )}
                    </div>
                    <CardDescription className="flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {campaign.targetRoles.slice(0, 2).join(', ')}
                        {campaign.targetRoles.length > 2 &&
                          ` +${campaign.targetRoles.length - 2}`}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {campaign.targetLocations.slice(0, 2).join(', ')}
                        {campaign.targetLocations.length > 2 &&
                          ` +${campaign.targetLocations.length - 2}`}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${status.color}`}
                    >
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="font-medium">
                          {campaign._count?.jobOffers || 0}
                        </span>{' '}
                        <span className="text-muted-foreground">jobs</span>
                      </div>
                      <div>
                        <span className="font-medium">
                          {campaign._count?.applications || 0}
                        </span>{' '}
                        <span className="text-muted-foreground">applications</span>
                      </div>
                      <div className="text-muted-foreground">
                        Created{' '}
                        {formatDistanceToNow(new Date(campaign.createdAt), {
                          addSuffix: true,
                        })}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="icon" title="View details">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {canStart && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Start campaign"
                          onClick={() => startMutation.mutate(campaign.id)}
                          disabled={startMutation.isLoading}
                        >
                          <Play className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                      {canPause && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Pause campaign"
                          onClick={() => pauseMutation.mutate(campaign.id)}
                          disabled={pauseMutation.isLoading}
                        >
                          <Pause className="h-4 w-4 text-yellow-600" />
                        </Button>
                      )}
                      {canStop && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Stop campaign"
                          onClick={() => stopMutation.mutate(campaign.id)}
                          disabled={stopMutation.isLoading}
                        >
                          <Square className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete campaign"
                          onClick={() => setDeleteId(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this campaign? This will remove all discovered jobs and applications associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              {deleteMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Campaign
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
