'use client';

import { useState } from 'react';
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
import { AnimatedCheckmark } from '@/components/ui/animated-checkmark';
import { applicationApi, Application } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import {
  Briefcase,
  Loader2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  AlertTriangle,
  Send,
  Ban,
  Building,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusIcons: Record<string, React.ReactNode> = {
  PENDING_GENERATION: <Loader2 className="h-3 w-3 animate-spin" />,
  GENERATING: <Loader2 className="h-3 w-3 animate-spin" />,
  GENERATION_FAILED: <AlertTriangle className="h-3 w-3" />,
  PENDING_REVIEW: <Eye className="h-3 w-3" />,
  READY_TO_SUBMIT: <CheckCircle className="h-3 w-3" />,
  SUBMITTING: <Loader2 className="h-3 w-3 animate-spin" />,
  SUBMITTED: <Send className="h-3 w-3" />,
  SUBMISSION_FAILED: <XCircle className="h-3 w-3" />,
  WITHDRAWN: <Ban className="h-3 w-3" />,
};

const statusColors: Record<string, string> = {
  PENDING_GENERATION: 'bg-blue-100 text-blue-800',
  GENERATING: 'bg-blue-100 text-blue-800',
  GENERATION_FAILED: 'bg-red-100 text-red-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  READY_TO_SUBMIT: 'bg-green-100 text-green-800',
  SUBMITTING: 'bg-purple-100 text-purple-800',
  SUBMITTED: 'bg-green-100 text-green-800',
  SUBMISSION_FAILED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-800',
};

const statusKeyMap: Record<string, string> = {
  PENDING_GENERATION: 'pendingGeneration',
  GENERATING: 'generating',
  GENERATION_FAILED: 'generationFailed',
  PENDING_REVIEW: 'pendingReview',
  READY_TO_SUBMIT: 'readyToSubmit',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  SUBMISSION_FAILED: 'submissionFailed',
  WITHDRAWN: 'withdrawn',
};

export default function ApplicationsPage() {
  const { toast } = useToast();
  const t = useTranslations('applications');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch applications
  const {
    data: applicationsData,
    isLoading,
    refetch,
  } = useApi(
    () =>
      applicationApi.list({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        limit: 50,
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

  // Confirm mutation
  const confirmMutation = useMutation(
    (id: string) => applicationApi.confirm(id),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: (
            <span className="flex items-center gap-2">
              <AnimatedCheckmark size={18} />
              {t('toast.confirmed.title')}
            </span>
          ) as unknown as string,
          description: t('toast.confirmed.description'),
          variant: 'success',
        });
      },
    }
  );

  // Withdraw mutation
  const withdrawMutation = useMutation(
    (id: string) => applicationApi.withdraw(id),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: t('toast.withdrawn.title'),
          description: t('toast.withdrawn.description'),
        });
      },
    }
  );

  // Mark submitted mutation
  const markSubmittedMutation = useMutation(
    (id: string) => applicationApi.markSubmitted(id),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: (
            <span className="flex items-center gap-2">
              <AnimatedCheckmark size={18} />
              {t('toast.markedSubmitted.title')}
            </span>
          ) as unknown as string,
          description: t('toast.markedSubmitted.description'),
          variant: 'success',
        });
      },
    }
  );

  const applications = applicationsData?.data || [];

  // Calculate stats
  const stats = {
    total: applicationsData?.meta?.total || 0,
    pendingReview: applications.filter((a) => a.status === 'PENDING_REVIEW').length,
    ready: applications.filter((a) => a.status === 'READY_TO_SUBMIT').length,
    submitted: applications.filter((a) => a.status === 'SUBMITTED').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          {t('subtitle')}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.total')}</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.pendingReview')}</CardTitle>
            <Eye className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.readyToSubmit')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.submitted')}</CardTitle>
            <Send className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.submitted}</div>
          </CardContent>
        </Card>
      </div>

      {/* Applications List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t('list.title')}</CardTitle>
            <CardDescription>
              {t('list.subtitle')}
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('filter.all')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filter.all')}</SelectItem>
              <SelectItem value="PENDING_REVIEW">{t('filter.needsAttention')}</SelectItem>
              <SelectItem value="READY_TO_SUBMIT">{t('filter.readyToSend')}</SelectItem>
              <SelectItem value="SUBMITTED">{t('filter.sent')}</SelectItem>
              <SelectItem value="WITHDRAWN">{t('filter.withdrawn')}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : applications.length === 0 ? (
            <div className="text-center py-8">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">{t('empty.title')}</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
                {t('empty.description')}
              </p>
              <Link href="/dashboard/campaigns">
                <Button className="mt-4">{t('empty.action')}</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application: Application) => {
                const statusKey = statusKeyMap[application.status] || 'pendingReview';
                const statusColor = statusColors[application.status] || 'bg-yellow-100 text-yellow-800';
                const statusIcon = statusIcons[application.status] || <Eye className="h-3 w-3" />;
                const canConfirm = application.status === 'PENDING_REVIEW';
                const canWithdraw = ['PENDING_REVIEW', 'READY_TO_SUBMIT'].includes(application.status);
                const canMarkSubmitted = application.status === 'READY_TO_SUBMIT';
                const isProcessing = ['PENDING_GENERATION', 'GENERATING', 'SUBMITTING'].includes(application.status);

                return (
                  <div
                    key={application.id}
                    className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-muted/50 hover:translate-y-[-2px] hover:shadow-md transition-all duration-200 sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{application.jobOffer.title}</h4>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${statusColor}`}>
                          {statusIcon}
                          {t(`status.${statusKey}`)}
                        </span>
                        {application.testMode && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                            {t('practice')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {application.jobOffer.company}
                        </span>
                        {application.jobOffer.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {application.jobOffer.location}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {t('created')}{' '}
                        {formatDistanceToNow(new Date(application.createdAt), {
                          addSuffix: true,
                        })}
                        {application.submittedAt && (
                          <span className="ml-2">
                            • {t('stats.submitted')}{' '}
                            {formatDistanceToNow(new Date(application.submittedAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:ml-4">
                      {canConfirm && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => confirmMutation.mutate(application.id)}
                          disabled={confirmMutation.isLoading}
                        >
                          <CheckCircle className="mr-1 h-3 w-3" />
                          {t('actions.confirm')}
                        </Button>
                      )}
                      {canMarkSubmitted && (
                        <Button
                          size="sm"
                          onClick={() => markSubmittedMutation.mutate(application.id)}
                          disabled={markSubmittedMutation.isLoading}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          {t('actions.markSubmitted')}
                        </Button>
                      )}
                      {canWithdraw && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => withdrawMutation.mutate(application.id)}
                          disabled={withdrawMutation.isLoading}
                        >
                          <Ban className="mr-1 h-3 w-3" />
                          {t('actions.withdraw')}
                        </Button>
                      )}
                      {!isProcessing && (
                        <Link href={`/dashboard/applications/${application.id}`}>
                          <Button variant="ghost" size="icon" title={t('actions.viewDetails')}>
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
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
