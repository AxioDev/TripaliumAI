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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
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

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING_GENERATION: {
    label: 'Creating documents...',
    color: 'bg-blue-100 text-blue-800',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  GENERATING: {
    label: 'Creating documents...',
    color: 'bg-blue-100 text-blue-800',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  GENERATION_FAILED: {
    label: 'Document creation failed',
    color: 'bg-red-100 text-red-800',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  PENDING_REVIEW: {
    label: 'Ready for review',
    color: 'bg-yellow-100 text-yellow-800',
    icon: <Eye className="h-3 w-3" />,
  },
  READY_TO_SUBMIT: {
    label: 'Ready to send',
    color: 'bg-green-100 text-green-800',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  SUBMITTING: {
    label: 'Sending...',
    color: 'bg-purple-100 text-purple-800',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  SUBMITTED: {
    label: 'Sent',
    color: 'bg-green-100 text-green-800',
    icon: <Send className="h-3 w-3" />,
  },
  SUBMISSION_FAILED: {
    label: 'Sending failed',
    color: 'bg-red-100 text-red-800',
    icon: <XCircle className="h-3 w-3" />,
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'bg-gray-100 text-gray-800',
    icon: <Ban className="h-3 w-3" />,
  },
};

export default function ApplicationsPage() {
  const { toast } = useToast();
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
          title: 'Error',
          description: 'Failed to load applications',
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
          title: 'Application confirmed',
          description: 'The application is ready to submit.',
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
          title: 'Application withdrawn',
          description: 'The application has been withdrawn.',
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
          title: 'Marked as submitted',
          description: 'The application has been marked as submitted.',
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
        <h1 className="text-2xl font-bold md:text-3xl">Applications</h1>
        <p className="text-sm text-muted-foreground md:text-base">
          Track and manage your job applications
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Eye className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingReview}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ready to Submit</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submitted</CardTitle>
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
            <CardTitle>All Applications</CardTitle>
            <CardDescription>
              Review and manage your job applications
            </CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All applications</SelectItem>
              <SelectItem value="PENDING_REVIEW">Needs attention</SelectItem>
              <SelectItem value="READY_TO_SUBMIT">Ready to send</SelectItem>
              <SelectItem value="SUBMITTED">Sent</SelectItem>
              <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
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
              <h3 className="font-semibold mb-2">No applications yet</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md mx-auto">
                Start a campaign to discover matching jobs and create
                applications.
              </p>
              <Link href="/dashboard/campaigns">
                <Button className="mt-4">View Campaigns</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {applications.map((application: Application) => {
                const status = statusConfig[application.status] || statusConfig.PENDING_REVIEW;
                const canConfirm = application.status === 'PENDING_REVIEW';
                const canWithdraw = ['PENDING_REVIEW', 'READY_TO_SUBMIT'].includes(application.status);
                const canMarkSubmitted = application.status === 'READY_TO_SUBMIT';
                const isProcessing = ['PENDING_GENERATION', 'GENERATING', 'SUBMITTING'].includes(application.status);

                return (
                  <div
                    key={application.id}
                    className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{application.jobOffer.title}</h4>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded ${status.color}`}>
                          {status.icon}
                          {status.label}
                        </span>
                        {application.testMode && (
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                            Practice
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
                        Created{' '}
                        {formatDistanceToNow(new Date(application.createdAt), {
                          addSuffix: true,
                        })}
                        {application.submittedAt && (
                          <span className="ml-2">
                            • Submitted{' '}
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
                          Confirm
                        </Button>
                      )}
                      {canMarkSubmitted && (
                        <Button
                          size="sm"
                          onClick={() => markSubmittedMutation.mutate(application.id)}
                          disabled={markSubmittedMutation.isLoading}
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Mark Submitted
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
                          Withdraw
                        </Button>
                      )}
                      {!isProcessing && (
                        <Link href={`/dashboard/applications/${application.id}`}>
                          <Button variant="ghost" size="icon" title="View details">
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
