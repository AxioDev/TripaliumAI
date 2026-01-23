'use client';

import { useState, useCallback } from 'react';
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
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { cvApi, CV } from '@/lib/api-client';
import { useApi, useMutation, usePolling } from '@/hooks/use-api';
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

export default function CVsPage() {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedCv, setSelectedCv] = useState<CV | null>(null);
  const [showParsedData, setShowParsedData] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Fetch CVs
  const {
    data: cvs,
    isLoading,
    refetch,
    mutate: setCvs,
  } = useApi(() => cvApi.list(), {
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load CVs',
        variant: 'destructive',
      });
    },
  });

  // Check if any CV is being parsed - poll for updates
  const hasPendingParse = cvs?.some(
    (cv) => cv.parsingStatus === 'PENDING' || cv.parsingStatus === 'PROCESSING'
  );

  usePolling(() => cvApi.list(), {
    interval: 3000,
    enabled: hasPendingParse ?? false,
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
        toast({
          title: 'CV parsed successfully',
          description: `${justCompleted.fileName} has been analyzed and your profile has been updated.`,
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
          title: 'CV deleted',
          description: 'The CV has been removed.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to delete CV',
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
          title: 'Baseline updated',
          description: 'This CV is now your baseline resume.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to set baseline',
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
          title: 'Re-parsing started',
          description: 'The CV is being analyzed again.',
        });
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to start parsing',
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
          title: 'Invalid file type',
          description: 'Please upload a PDF file',
          variant: 'destructive',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Maximum file size is 10MB',
          variant: 'destructive',
        });
        return;
      }

      setIsUploading(true);

      try {
        await cvApi.upload(file);

        toast({
          title: 'CV uploaded',
          description: 'Your CV is being processed. This may take a moment.',
        });

        refetch();
      } catch {
        toast({
          title: 'Upload failed',
          description: 'Failed to upload CV. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    },
    [toast, refetch]
  );

  const handleViewParsedData = async (cv: CV) => {
    try {
      const data = await cvApi.getParsedData(cv.id);
      setSelectedCv({ ...cv, parsedData: data });
      setShowParsedData(true);
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to load parsed data',
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
          <h1 className="text-2xl font-bold md:text-3xl">CVs</h1>
          <p className="text-sm text-muted-foreground md:text-base">
            Upload and manage your resumes
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
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CV
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
            <h3 className="font-semibold mb-2">No CVs uploaded</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Upload your resume to get started. Our AI will extract your
              experience, skills, and education automatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {cvs.map((cv) => (
            <Card key={cv.id}>
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
                      Uploaded{' '}
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
                  <div className="space-y-2">
                    <Progress value={cv.parsingStatus === 'PROCESSING' ? 60 : 20} className="h-2" />
                    <p className="text-sm text-muted-foreground">
                      Analyzing your CV... Usually takes 30-60 seconds.
                    </p>
                  </div>
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
            <DialogTitle>Parsed CV Data</DialogTitle>
            <DialogDescription>
              Extracted information from {selectedCv?.fileName}
            </DialogDescription>
          </DialogHeader>
          {selectedCv?.parsedData && (
            <div className="space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-semibold mb-2">Personal Information</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.firstName}{' '}
                    {selectedCv.parsedData.personalInfo?.lastName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.email || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.phone || 'N/A'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Location:</span>{' '}
                    {selectedCv.parsedData.personalInfo?.location || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Summary */}
              {selectedCv.parsedData.summary && (
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm">{selectedCv.parsedData.summary}</p>
                </div>
              )}

              {/* Work Experience */}
              {selectedCv.parsedData.workExperience?.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Work Experience</h4>
                  <div className="space-y-3">
                    {selectedCv.parsedData.workExperience.map(
                      (exp: Record<string, unknown>, idx: number) => (
                        <div key={idx} className="border-l-2 pl-3 py-1">
                          <div className="font-medium">{exp.title as string}</div>
                          <div className="text-sm text-muted-foreground">
                            {exp.company as string} | {exp.startDate as string} -{' '}
                            {(exp.endDate as string) || 'Present'}
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
                  <h4 className="font-semibold mb-2">Skills</h4>
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
                  Extraction confidence:{' '}
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
            <AlertDialogTitle>Delete CV</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this CV? This action cannot be undone.
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
              Delete CV
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
