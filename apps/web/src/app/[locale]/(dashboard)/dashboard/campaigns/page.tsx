'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { campaignApi, Campaign, CreateCampaignData } from '@/lib/api-client';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Search,
  Copy,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/date-utils';
import { campaignStatusColors, campaignStatusKeyMap } from '@/lib/status-config';

const statusIcons: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="h-3 w-3" />,
  ACTIVE: <CheckCircle className="h-3 w-3" />,
  PAUSED: <Pause className="h-3 w-3" />,
  COMPLETED: <Square className="h-3 w-3" />,
  FAILED: <AlertTriangle className="h-3 w-3" />,
};


export default function CampaignsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const t = useTranslations('campaigns');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  const {
    data: campaigns,
    isLoading,
    refetch,
  } = useApi(() => campaignApi.list(), {
    onError: () => {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.loadFailed'),
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
          title: t('toast.started.title'),
          description: t('toast.started.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.startFailed'),
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
          title: t('toast.paused.title'),
          description: t('toast.paused.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.pauseFailed'),
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
          title: t('toast.stopped.title'),
          description: t('toast.stopped.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.stopFailed'),
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
          title: t('toast.deleted.title'),
          description: t('toast.deleted.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.deleteFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  const cloneMutation = useMutation(
    (campaign: Campaign) =>
      campaignApi.create({
        name: `${campaign.name} (${t('copy')})`,
        targetRoles: campaign.targetRoles,
        targetLocations: campaign.targetLocations,
        contractTypes: campaign.contractTypes,
        salaryMin: campaign.salaryMin ?? undefined,
        salaryMax: campaign.salaryMax ?? undefined,
        salaryCurrency: campaign.salaryCurrency ?? undefined,
        remoteOk: campaign.remoteOk,
        matchThreshold: campaign.matchThreshold,
        testMode: campaign.testMode,
        autoApply: campaign.autoApply,
      }),
    {
      onSuccess: (newCampaign) => {
        toast({
          title: t('toast.cloned.title'),
          description: t('toast.cloned.description'),
        });
        router.push(`/dashboard/campaigns/${newCampaign.id}`);
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.cloneFailed'),
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
          <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {t('subtitle')}
          </p>
        </div>
        <Link href="/dashboard/campaigns/new" className="self-start sm:self-auto">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('newCampaign')}
          </Button>
        </Link>
      </div>

      {/* Search and Filter Bar */}
      {campaigns && campaigns.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('filterAll')}</SelectItem>
                <SelectItem value="DRAFT">{t('status.draft')}</SelectItem>
                <SelectItem value="ACTIVE">{t('status.active')}</SelectItem>
                <SelectItem value="PAUSED">{t('status.paused')}</SelectItem>
                <SelectItem value="COMPLETED">{t('status.completed')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t('sortNewest')}</SelectItem>
                <SelectItem value="oldest">{t('sortOldest')}</SelectItem>
                <SelectItem value="name">{t('sortName')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {!campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{t('empty.title')}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              {t('empty.description')}
            </p>
            <Link href="/dashboard/campaigns/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                {t('empty.action')}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {campaigns
            .filter((c: Campaign) => {
              if (statusFilter !== 'all' && c.status !== statusFilter) return false;
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return c.name.toLowerCase().includes(q) ||
                  c.targetRoles.some(r => r.toLowerCase().includes(q)) ||
                  c.targetLocations.some(l => l.toLowerCase().includes(q));
              }
              return true;
            })
            .sort((a: Campaign, b: Campaign) => {
              if (sortBy === 'name') return a.name.localeCompare(b.name);
              if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
              return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            })
            .map((campaign: Campaign) => {
            const statusKey = campaignStatusKeyMap[campaign.status] || 'draft';
            const statusColor = campaignStatusColors[campaign.status] || campaignStatusColors.DRAFT;
            const statusIcon = statusIcons[campaign.status] || statusIcons.DRAFT;
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
                        <span className="text-xs bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
                          {t('practice')}
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
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${statusColor}`}
                    >
                      {statusIcon}
                      {t(`status.${statusKey}`)}
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
                        <span className="text-muted-foreground">{t('jobs')}</span>
                      </div>
                      <div>
                        <span className="font-medium">
                          {campaign._count?.applications || 0}
                        </span>{' '}
                        <span className="text-muted-foreground">{t('applications')}</span>
                      </div>
                      <div className="text-muted-foreground">
                        {t('created')}{' '}
                        {formatRelativeTime(campaign.createdAt, locale)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/dashboard/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="icon" title={t('actions.view')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      {canStart && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('actions.start')}
                          onClick={() => startMutation.mutate(campaign.id)}
                          disabled={startMutation.isLoading}
                        >
                          <Play className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                      {canPause && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('actions.pause')}
                          onClick={() => pauseMutation.mutate(campaign.id)}
                          disabled={pauseMutation.isLoading}
                        >
                          <Pause className="h-4 w-4 text-amber-600" />
                        </Button>
                      )}
                      {canStop && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('actions.stop')}
                          onClick={() => stopMutation.mutate(campaign.id)}
                          disabled={stopMutation.isLoading}
                        >
                          <Square className="h-4 w-4 text-rose-600" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t('actions.duplicate')}
                        onClick={() => cloneMutation.mutate(campaign)}
                        disabled={cloneMutation.isLoading}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('actions.delete')}
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
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                  setDeleteId(null);
                }
              }}
            >
              {deleteMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
