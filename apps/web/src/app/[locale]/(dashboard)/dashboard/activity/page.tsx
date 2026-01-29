'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { logsApi, ActionLog } from '@/lib/api-client';
import { useApi } from '@/hooks/use-api';
import {
  Activity,
  Loader2,
  User,
  FileText,
  Target,
  Briefcase,
  Mail,
  Key,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr, enUS } from 'date-fns/locale';
import { useLocale } from 'next-intl';

const entityTypeIcons: Record<string, React.ReactNode> = {
  user: <User className="h-4 w-4" />,
  profile: <User className="h-4 w-4" />,
  cv: <FileText className="h-4 w-4" />,
  campaign: <Target className="h-4 w-4" />,
  job_offer: <Briefcase className="h-4 w-4" />,
  application: <Briefcase className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  api_key: <Key className="h-4 w-4" />,
};

const actionColors: Record<string, string> = {
  created: 'text-green-600 bg-green-50',
  updated: 'text-blue-600 bg-blue-50',
  deleted: 'text-red-600 bg-red-50',
  started: 'text-purple-600 bg-purple-50',
  completed: 'text-green-600 bg-green-50',
  failed: 'text-red-600 bg-red-50',
  paused: 'text-yellow-600 bg-yellow-50',
  stopped: 'text-gray-600 bg-gray-50',
  login: 'text-blue-600 bg-blue-50',
};

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

function getActionColor(action: string): string {
  const actionLower = action.toLowerCase();
  for (const [key, color] of Object.entries(actionColors)) {
    if (actionLower.includes(key)) {
      return color;
    }
  }
  return 'text-gray-600 bg-gray-50';
}

function formatAction(action: string): string {
  return action
    .replace(/\./g, ' ')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failure':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <Activity className="h-4 w-4 text-gray-500" />;
  }
}

export default function ActivityPage() {
  const { toast } = useToast();
  const t = useTranslations('activity');
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale();
  const dateLocale = locale === 'fr' ? fr : enUS;
  const [entityType, setEntityType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Get translated entity type name
  const getEntityTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      user: t('entityTypes.user'),
      profile: t('entityTypes.profile'),
      cv: t('entityTypes.cv'),
      campaign: t('entityTypes.campaign'),
      job_offer: t('entityTypes.job_offer'),
      application: t('entityTypes.application'),
      email: t('entityTypes.email'),
      api_key: t('entityTypes.api_key'),
    };
    return typeMap[type] || type.replace('_', ' ');
  };

  const {
    data: logsData,
    isLoading,
    refetch,
  } = useApi(
    () =>
      logsApi.query({
        entityType: entityType !== 'all' ? entityType : undefined,
        page,
        limit,
      }),
    {
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.loadFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  const logs = logsData?.data || [];
  const meta = logsData?.meta || { page: 1, limit: 20, total: 0, hasMore: false };
  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>{t('filters.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-[200px]">
              <Select value={entityType} onValueChange={(v) => { setEntityType(v); setPage(1); }}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filters.entityType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.all')}</SelectItem>
                  <SelectItem value="profile">{t('filters.profile')}</SelectItem>
                  <SelectItem value="cv">{t('filters.cvs')}</SelectItem>
                  <SelectItem value="campaign">{t('filters.campaigns')}</SelectItem>
                  <SelectItem value="job_offer">{t('filters.jobs')}</SelectItem>
                  <SelectItem value="application">{t('filters.applications')}</SelectItem>
                  <SelectItem value="api_key">{t('filters.apiKeys')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('log.title')}
          </CardTitle>
          <CardDescription>
            {t('log.total', { count: meta.total })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t('empty.title')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('empty.description')}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {logs.map((log: ActionLog) => {
                const icon = entityTypeIcons[log.entityType] || <Activity className="h-4 w-4" />;
                const actionColor = getActionColor(log.action);
                const actionKey = actionKeyMap[log.action];

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      <StatusIcon status={log.status} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-sm font-medium">
                          {icon}
                          <span>{getEntityTypeName(log.entityType)}</span>
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${actionColor}`}>
                          {actionKey ? tDashboard(`actions.${actionKey}`) : formatAction(log.action)}
                        </span>
                        {log.testMode && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                            {t('test')}
                          </span>
                        )}
                      </div>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Object.entries(log.metadata)
                            .slice(0, 3)
                            .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
                            .join(' • ')}
                        </p>
                      )}
                      {log.status === 'failure' && log.errorMessage && (
                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {log.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true, locale: dateLocale })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {tCommon('pagination.page', { current: page, total: totalPages })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {tCommon('actions.previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!meta.hasMore}
                >
                  {tCommon('actions.next')}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
