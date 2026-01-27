'use client';

import { useState, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/components/ui/use-toast';
import { AnimatedCheckmark } from '@/components/ui/animated-checkmark';
import { CVParsingProgress } from '@/components/ui/staged-progress';
import { cvApi, CV } from '@/lib/api-client';
import { useApi, useMutation, usePolling } from '@/hooks/use-api';
import { useCVParsingRealtime, useSocketConnection } from '@/hooks/use-realtime';
import {
  Upload,
  FileText,
  Loader2,
  Trash2,
  Star,
  Eye,
  RefreshCw,
  Download,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

// Helper component for CV parsing progress with real-time updates
function CVParsingProgressCard({
  status,
  cvId,
  realtimeProgress,
}: {
  status: string;
  cvId: string;
  realtimeProgress?: number;
}) {
  // Use realtime progress if available, otherwise estimate based on status
  const baseProgress = status === 'PROCESSING' ? 30 : 10;
  const displayProgress = realtimeProgress ?? baseProgress;

  return <CVParsingProgress progress={displayProgress} />;
}

export default function CVsPage() {
  const { toast } = useToast();
  const t = useTranslations('cvs');
  const tCommon = useTranslations('common');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCv, setSelectedCv] = useState<CV | null>(null);
  const [showParsedData, setShowParsedData] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [recentlyCompletedIds, setRecentlyCompletedIds] = useState<Set<string>>(new Set());
  const [cvProgress, setCvProgress] = useState<Map<string, number>>(new Map());
  const { isConnected: isRealtimeConnected } = useSocketConnection();

  // Fetch CVs
  const {
    data: cvs,
    isLoading,
    refetch,
    mutate: setCvs,
  } = useApi(() => cvApi.list(), {
    onError: () => {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.loadFailed'),
        variant: 'destructive',
      });
    },
  });

  // Check if any CV is being parsed
  const hasPendingParse = cvs?.some(
    (cv) => cv.parsingStatus === 'PENDING' || cv.parsingStatus === 'PROCESSING'
  );

  // Real-time CV parsing updates
  useCVParsingRealtime(
    // onProgress
    useCallback((cvId: string, progress: number) => {
      setCvProgress((prev) => new Map(prev).set(cvId, progress));
    }, []),
    // onCompleted
    useCallback(
      (cvId: string, fileName: string) => {
        // Clear progress
        setCvProgress((prev) => {
          const next = new Map(prev);
          next.delete(cvId);
          return next;
        });
        // Show completion animation
        setRecentlyCompletedIds((prev) => new Set(Array.from(prev).concat(cvId)));
        setTimeout(() => {
          setRecentlyCompletedIds((prev) => {
            const next = new Set(Array.from(prev));
            next.delete(cvId);
            return next;
          });
        }, 1500);
        // Show toast
        toast({
          title: (
            <span className="flex items-center gap-2">
              <AnimatedCheckmark size={18} />
              {t('toast.parsed.title')}
            </span>
          ) as unknown as string,
          description: t('toast.parsed.description', { fileName }),
          variant: 'success',
        });
        // Refetch to get full data
        refetch();
      },
      [toast, t, refetch]
    ),
    // onFailed
    useCallback(
      (cvId: string, error: string) => {
        setCvProgress((prev) => {
          const next = new Map(prev);
          next.delete(cvId);
          return next;
        });
        toast({
          title: t('toast.error.title'),
          description: error,
          variant: 'destructive',
        });
        // Refetch to get current state
        refetch();
      },
      [toast, t, refetch]
    ),
    hasPendingParse ?? false
  );

  // Polling fallback when realtime is not connected
  usePolling(() => cvApi.list(), {
    interval: 3000,
    enabled: (hasPendingParse && !isRealtimeConnected) ?? false,
    shouldStop: (data) =>
      !data.some(
        (cv) =>
          cv.parsingStatus === 'PENDING' || cv.parsingStatus === 'PROCESSING'
      ),
    onSuccess: (data) => {
      setCvs(data);
      // Check if any CV just completed parsing
      const justCompleted = data.find(
        (cv) =>
          cv.parsingStatus === 'COMPLETED' &&
          cvs?.find((old) => old.id === cv.id)?.parsingStatus !== 'COMPLETED'
      );
      if (justCompleted) {
        setRecentlyCompletedIds((prev) => new Set(Array.from(prev).concat(justCompleted.id)));
        setTimeout(() => {
          setRecentlyCompletedIds((prev) => {
            const next = new Set(Array.from(prev));
            next.delete(justCompleted.id);
            return next;
          });
        }, 1500);
        toast({
          title: (
            <span className="flex items-center gap-2">
              <AnimatedCheckmark size={18} />
              {t('toast.parsed.title')}
            </span>
          ) as unknown as string,
          description: t('toast.parsed.description', { fileName: justCompleted.fileName }),
          variant: 'success',
        });
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation(
    (cvId: string) => cvApi.delete(cvId),
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

  // Set baseline mutation
  const baselineMutation = useMutation(
    (cvId: string) => cvApi.setBaseline(cvId),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: t('toast.baselineSet.title'),
          description: t('toast.baselineSet.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.baselineFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  // Reparse mutation
  const reparseMutation = useMutation(
    (cvId: string) => cvApi.triggerParse(cvId),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: t('toast.reparseStarted.title'),
          description: t('toast.reparseStarted.description'),
        });
      },
      onError: () => {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.reparseFailed'),
          variant: 'destructive',
        });
      },
    }
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.type !== 'application/pdf') {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.invalidFileType'),
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.fileTooLarge'),
          variant: 'destructive',
        });
        return;
      }

      setIsUploading(true);

      try {
        await cvApi.upload(file);

        toast({
          title: t('toast.uploaded.title'),
          description: t('toast.uploaded.description'),
        });

        refetch();
      } catch {
        toast({
          title: t('toast.error.title'),
          description: t('toast.error.uploadFailed'),
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    },
    [toast, refetch, t]
  );

  const handleViewParsedData = async (cv: CV) => {
    try {
      const data = await cvApi.getParsedData(cv.id);
      setSelectedCv({ ...cv, parsedData: data });
      setShowParsedData(true);
    } catch {
      toast({
        title: t('toast.error.title'),
        description: t('toast.error.parsedDataFailed'),
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PROCESSING':
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600 animate-pulse" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'PROCESSING':
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'FAILED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
        <div className="self-start sm:self-auto">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            id="cv-upload"
            disabled={isUploading}
          />
          <label htmlFor="cv-upload">
            <Button asChild disabled={isUploading}>
              <span>
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('uploadCv')}
                  </>
                )}
              </span>
            </Button>
          </label>
        </div>
      </div>

      {!cvs || cvs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">{t('empty.title')}</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              {t('empty.description')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cvs.map((cv) => (
            <Card key={cv.id} className={`transition-all hover:translate-y-[-2px] hover:shadow-md ${recentlyCompletedIds.has(cv.id) ? 'animate-card-glow' : ''}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="flex items-center gap-4">
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      {cv.fileName}
                      {cv.isBaseline && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </CardTitle>
                    <CardDescription>
                      {t('uploaded')}{' '}
                      {new Date(cv.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {cv.fileSize && (
                        <span className="ml-2">
                          ({(cv.fileSize / 1024).toFixed(0)} KB)
                        </span>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${getStatusColor(cv.parsingStatus)}`}
                  >
                    {getStatusIcon(cv.parsingStatus)}
                    {cv.parsingStatus}
                  </span>
                  <div className="flex items-center gap-1">
                    {cv.parsingStatus === 'COMPLETED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleViewParsedData(cv)}
                        title="View parsed data"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                    {cv.parsingStatus === 'FAILED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => reparseMutation.mutate(cv.id)}
                        disabled={reparseMutation.isLoading}
                        title="Retry parsing"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.open(`/api/backend/cvs/${cv.id}/download`, '_blank')}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!cv.isBaseline && cv.parsingStatus === 'COMPLETED' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => baselineMutation.mutate(cv.id)}
                        disabled={baselineMutation.isLoading}
                        title="Set as baseline"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(cv.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              {(cv.parsingStatus === 'PENDING' || cv.parsingStatus === 'PROCESSING') && (
                <CardContent className="pt-0">
                  <CVParsingProgressCard
                    status={cv.parsingStatus}
                    cvId={cv.id}
                    realtimeProgress={cvProgress.get(cv.id)}
                  />
                </CardContent>
              )}
              {cv.parsingStatus === 'FAILED' && cv.parsingError && (
                <CardContent className="pt-0">
                  <p className="text-sm text-destructive">{cv.parsingError}</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Parsed Data Dialog */}
      <Dialog open={showParsedData} onOpenChange={setShowParsedData}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('parsedData.title')}</DialogTitle>
            <DialogDescription>
              {t('parsedData.subtitle', { fileName: selectedCv?.fileName || '' })}
            </DialogDescription>
          </DialogHeader>
          {selectedCv?.parsedData && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-semibold mb-2">{t('parsedData.personalInfo')}</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('parsedData.name')}:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.firstName}{' '}
                    {selectedCv.parsedData.personalInfo?.lastName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('parsedData.email')}:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.email || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('parsedData.phone')}:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.phone || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('parsedData.location')}:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.location || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {selectedCv.parsedData.summary && (
                <div>
                  <h4 className="font-semibold mb-2">{t('parsedData.summary')}</h4>
                  <p className="text-sm">{selectedCv.parsedData.summary}</p>
                </div>
              )}

              {/* Work Experience */}
              {selectedCv.parsedData.workExperience?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">{t('parsedData.workExperience')}</h4>
                  <div className="space-y-3">
                    {selectedCv.parsedData.workExperience.map(
                      (exp: Record<string, unknown>, idx: number) => (
                        <div key={idx} className="border-l-2 pl-3 py-1">
                          <div className="font-medium">{exp.title as string}</div>
                          <div className="text-sm text-muted-foreground">
                            {exp.company as string} | {exp.startDate as string} -{' '}
                            {(exp.endDate as string) || t('parsedData.present')}
                          </div>
                          {Boolean(exp.description) && (
                            <p className="text-sm mt-1">{exp.description as string}</p>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Skills */}
              {selectedCv.parsedData.skills?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">{t('parsedData.skills')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCv.parsedData.skills.map(
                      (skill: Record<string, unknown>, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                        >
                          {skill.name as string}
                          {Boolean(skill.level) && (
                            <span className="ml-1 text-muted-foreground">
                              ({skill.level as string})
                            </span>
                          )}
                        </span>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Confidence Score */}
              {selectedCv.parsedData.extractionConfidence && (
                <div className="text-sm text-muted-foreground pt-4 border-t">
                  {t('parsedData.extractionConfidence')}:{' '}
                  {selectedCv.parsedData.extractionConfidence}%
                  {selectedCv.parsedData.extractionNotes && (
                    <span className="block mt-1">
                      {selectedCv.parsedData.extractionNotes}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              className="bg-red-600 hover:bg-red-700"
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
