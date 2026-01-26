'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { applicationApi, profileApi, Application, GeneratedDocument, EmailRecord } from '@/lib/api-client';
import { useApi, useMutation } from '@/hooks/use-api';
import { DocumentPreview } from '@/components/document-preview';
import { ApplicationStrength } from '@/components/applications/application-strength';
import { SubmissionCelebration } from '@/components/applications/submission-celebration';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Eye,
  Send,
  Ban,
  Building,
  MapPin,
  DollarSign,
  ExternalLink,
  FileText,
  Download,
  AlertTriangle,
  Target,
  Clock,
  Briefcase,
  RefreshCw,
  Mail,
  MailCheck,
  MailX,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; description: string }> = {
  PENDING_GENERATION: {
    label: 'Generating Documents',
    color: 'bg-blue-100 text-blue-800',
    description: 'AI is generating your tailored CV and cover letter.',
  },
  GENERATING: {
    label: 'Generating Documents',
    color: 'bg-blue-100 text-blue-800',
    description: 'AI is generating your tailored CV and cover letter.',
  },
  GENERATION_FAILED: {
    label: 'Generation Failed',
    color: 'bg-red-100 text-red-800',
    description: 'Document generation failed. Please try again.',
  },
  PENDING_REVIEW: {
    label: 'Pending Review',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'Please review the generated documents before confirming.',
  },
  READY_TO_SUBMIT: {
    label: 'Ready to Submit',
    color: 'bg-green-100 text-green-800',
    description: 'Application is ready. Mark as submitted after applying externally.',
  },
  SUBMITTING: {
    label: 'Submitting',
    color: 'bg-purple-100 text-purple-800',
    description: 'Application is being submitted.',
  },
  SUBMITTED: {
    label: 'Submitted',
    color: 'bg-green-100 text-green-800',
    description: 'Application has been submitted successfully.',
  },
  SUBMISSION_FAILED: {
    label: 'Submission Failed',
    color: 'bg-red-100 text-red-800',
    description: 'Submission failed. Please try again or submit manually.',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'bg-gray-100 text-gray-800',
    description: 'This application has been withdrawn.',
  },
};

const recommendationLabels: Record<string, { label: string; color: string }> = {
  strong_match: { label: 'Strong Match', color: 'text-green-600' },
  good_match: { label: 'Good Match', color: 'text-blue-600' },
  possible_match: { label: 'Possible Match', color: 'text-yellow-600' },
  weak_match: { label: 'Weak Match', color: 'text-orange-600' },
  no_match: { label: 'Not a Match', color: 'text-red-600' },
};

function MatchScoreCircle({ score }: { score: number }) {
  let color = 'text-gray-500';
  if (score >= 80) color = 'text-green-500';
  else if (score >= 60) color = 'text-blue-500';
  else if (score >= 40) color = 'text-yellow-500';
  else color = 'text-red-500';

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-gray-200"
          strokeWidth="8"
          stroke="currentColor"
          fill="transparent"
          r="42"
          cx="50"
          cy="50"
        />
        <circle
          className={color}
          strokeWidth="8"
          strokeDasharray={`${score * 2.64} 264`}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r="42"
          cx="50"
          cy="50"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-2xl font-bold ${color}`}>{score}%</span>
      </div>
    </div>
  );
}

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const applicationId = params.id as string;

  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    type: 'CV' | 'COVER_LETTER';
    content: unknown;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

  // Email sending state
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  // Celebration state
  const [showCelebration, setShowCelebration] = useState(false);

  const handlePreview = async (doc: GeneratedDocument) => {
    setLoadingPreview(doc.id);
    try {
      const data = await applicationApi.getDocumentContent(doc.id);
      setPreviewDoc({
        id: data.id,
        type: data.type,
        content: data.content,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load document preview',
        variant: 'destructive',
      });
    } finally {
      setLoadingPreview(null);
    }
  };

  // Fetch application
  const {
    data: application,
    isLoading,
    refetch,
  } = useApi(() => applicationApi.get(applicationId), {
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to load application',
        variant: 'destructive',
      });
    },
  });

  // Fetch profile for strength indicator
  const { data: profile } = useApi(() => profileApi.get().catch(() => null));

  // Fetch documents
  const { data: documents } = useApi(
    () => applicationApi.getDocuments(applicationId),
    { enabled: !!application }
  );

  // Fetch emails
  const { data: emails, refetch: refetchEmails } = useApi(
    () => applicationApi.getEmails(applicationId),
    { enabled: !!application }
  );

  // Mutations
  const confirmMutation = useMutation(
    () => applicationApi.confirm(applicationId),
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

  const withdrawMutation = useMutation(
    () => applicationApi.withdraw(applicationId),
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

  const markSubmittedMutation = useMutation(
    () => applicationApi.markSubmitted(applicationId),
    {
      onSuccess: () => {
        refetch();
        setShowCelebration(true);
      },
    }
  );

  const regenerateMutation = useMutation(
    () => applicationApi.regenerateDocuments(applicationId),
    {
      onSuccess: () => {
        refetch();
        toast({
          title: 'Regenerating documents',
          description: 'New documents are being generated.',
        });
      },
    }
  );

  const sendEmailMutation = useMutation(
    () => applicationApi.sendEmail(applicationId, recipientEmail, customMessage || undefined),
    {
      onSuccess: (data) => {
        setShowEmailDialog(false);
        setRecipientEmail('');
        setCustomMessage('');
        refetchEmails();
        toast({
          title: data.dryRun ? 'Email simulated (Test Mode)' : 'Email sent',
          description: data.dryRun
            ? 'Email was simulated in test mode. No actual email was sent.'
            : 'Your application email has been sent successfully.',
        });
      },
      onError: () => {
        toast({
          title: 'Failed to send email',
          description: 'There was an error sending the email. Please try again.',
          variant: 'destructive',
        });
      },
    }
  );

  const handleSendEmail = () => {
    if (!recipientEmail.trim() || !recipientEmail.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      });
      return;
    }
    sendEmailMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Application not found</p>
        <Link href="/dashboard/applications">
          <Button variant="outline" className="mt-4">
            Back to applications
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[application.status] || statusConfig.PENDING_REVIEW;
  const canConfirm = application.status === 'PENDING_REVIEW';
  const canWithdraw = ['PENDING_REVIEW', 'READY_TO_SUBMIT'].includes(application.status);
  const canMarkSubmitted = application.status === 'READY_TO_SUBMIT';
  const canRegenerate = ['PENDING_REVIEW', 'GENERATION_FAILED'].includes(application.status);
  const canSendEmail = ['PENDING_REVIEW', 'READY_TO_SUBMIT', 'SUBMITTED'].includes(application.status);
  const isProcessing = ['PENDING_GENERATION', 'GENERATING', 'SUBMITTING'].includes(application.status);

  const matchAnalysis = application.jobOffer?.matchAnalysis;
  const recommendation = matchAnalysis?.recommendation
    ? recommendationLabels[matchAnalysis.recommendation]
    : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href="/dashboard/applications">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{application.jobOffer.title}</h1>
              {application.testMode && (
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                  Test Mode
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-muted-foreground">
              <span className={`text-xs px-2 py-1 rounded ${status.color}`}>
                {status.label}
              </span>
              <span className="flex items-center gap-1 text-sm">
                <Building className="h-3 w-3" />
                {application.jobOffer.company}
              </span>
              {application.jobOffer.location && (
                <span className="flex items-center gap-1 text-sm">
                  <MapPin className="h-3 w-3" />
                  {application.jobOffer.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canConfirm && (
            <Button
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isLoading}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm
            </Button>
          )}
          {canMarkSubmitted && (
            <Button
              onClick={() => markSubmittedMutation.mutate()}
              disabled={markSubmittedMutation.isLoading}
            >
              <Send className="mr-2 h-4 w-4" />
              Mark as Submitted
            </Button>
          )}
          {canSendEmail && (
            <Button
              variant="outline"
              onClick={() => setShowEmailDialog(true)}
            >
              <Mail className="mr-2 h-4 w-4" />
              Send via Email
            </Button>
          )}
          {canWithdraw && (
            <Button
              variant="outline"
              onClick={() => withdrawMutation.mutate()}
              disabled={withdrawMutation.isLoading}
            >
              <Ban className="mr-2 h-4 w-4" />
              Withdraw
            </Button>
          )}
          {application.jobOffer.url && (
            <a href={application.jobOffer.url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="mr-2 h-4 w-4" />
                View Job
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <Card className={isProcessing ? 'border-blue-200 bg-blue-50' : undefined}>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            {isProcessing && <Loader2 className="h-5 w-5 animate-spin text-blue-600" />}
            <div>
              <p className="font-medium">{status.label}</p>
              <p className="text-sm text-muted-foreground">{status.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Application Strength Indicator */}
      {application && !isProcessing && (
        <ApplicationStrength
          application={application}
          profile={profile ?? null}
          documentsReady={!!documents && documents.length > 0}
        />
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Job Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-4">
                {application.jobOffer.salary && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span>{application.jobOffer.salary}</span>
                  </div>
                )}
                {application.jobOffer.contractType && (
                  <Badge variant="secondary">{application.jobOffer.contractType}</Badge>
                )}
                {application.jobOffer.remoteType && (
                  <Badge variant="secondary">{application.jobOffer.remoteType}</Badge>
                )}
              </div>
              {application.jobOffer.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {application.jobOffer.description}
                    </p>
                  </div>
                </>
              )}
              {application.jobOffer.requirements && application.jobOffer.requirements.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="font-medium mb-2">Requirements</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {application.jobOffer.requirements.map((req, i) => (
                        <li key={i}>{req}</li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Generated Documents */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Generated Documents
                </CardTitle>
                <CardDescription>
                  AI-generated documents tailored for this application
                </CardDescription>
              </div>
              {canRegenerate && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isLoading}
                >
                  {regenerateMutation.isLoading ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-3 w-3" />
                  )}
                  Regenerate
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">
                      Generating your documents...
                    </p>
                  </div>
                </div>
              ) : !documents || documents.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No documents generated yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {documents.map((doc: GeneratedDocument) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{doc.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.type === 'CV' ? 'Tailored Resume' : 'Cover Letter'} •{' '}
                            {(doc.fileSize / 1024).toFixed(1)} KB •{' '}
                            Version {doc.version}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(doc)}
                          disabled={loadingPreview === doc.id}
                        >
                          {loadingPreview === doc.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Eye className="mr-1 h-3 w-3" />
                          )}
                          Preview
                        </Button>
                        <a
                          href={applicationApi.getDocumentDownloadUrl(doc.id)}
                          download={doc.fileName}
                        >
                          <Button variant="outline" size="sm">
                            <Download className="mr-1 h-3 w-3" />
                            Download
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Match Analysis */}
          {matchAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Match Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  <MatchScoreCircle score={matchAnalysis.matchScore} />
                </div>
                {recommendation && (
                  <p className={`text-center font-medium ${recommendation.color}`}>
                    {recommendation.label}
                  </p>
                )}
                <Separator />
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Skills</span>
                      <span>{matchAnalysis.matchBreakdown.skillsMatch}%</span>
                    </div>
                    <Progress value={matchAnalysis.matchBreakdown.skillsMatch} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Experience</span>
                      <span>{matchAnalysis.matchBreakdown.experienceMatch}%</span>
                    </div>
                    <Progress value={matchAnalysis.matchBreakdown.experienceMatch} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Education</span>
                      <span>{matchAnalysis.matchBreakdown.educationMatch}%</span>
                    </div>
                    <Progress value={matchAnalysis.matchBreakdown.educationMatch} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Location</span>
                      <span>{matchAnalysis.matchBreakdown.locationMatch}%</span>
                    </div>
                    <Progress value={matchAnalysis.matchBreakdown.locationMatch} className="h-2" />
                  </div>
                </div>
                {matchAnalysis.reasoning && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2">Analysis</h4>
                      <p className="text-sm text-muted-foreground">
                        {matchAnalysis.reasoning}
                      </p>
                    </div>
                  </>
                )}
                {matchAnalysis.matchingRequirements.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        Matching
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {matchAnalysis.matchingRequirements.slice(0, 5).map((req, i) => (
                          <li key={i}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {matchAnalysis.missingRequirements.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-600" />
                        Missing
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {matchAnalysis.missingRequirements.slice(0, 5).map((req, i) => (
                          <li key={i}>• {req}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
                {matchAnalysis.redFlags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        Red Flags
                      </h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {matchAnalysis.redFlags.map((flag, i) => (
                          <li key={i}>• {flag}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(application.createdAt), 'PPp')}
                    </p>
                  </div>
                </div>
                {application.confirmedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Confirmed</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(application.confirmedAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
                {application.submittedAt && (
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-purple-500" />
                    <div>
                      <p className="text-sm font-medium">Submitted</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(application.submittedAt), 'PPp')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Document Preview Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {previewDoc?.type === 'CV' ? 'Resume Preview' : 'Cover Letter Preview'}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <DocumentPreview type={previewDoc.type} content={previewDoc.content} />
          )}
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Application via Email</DialogTitle>
            <DialogDescription>
              Send your application directly to the hiring manager or recruiter.
              {application.testMode && (
                <span className="block mt-2 text-orange-600">
                  Test Mode: Email will be simulated, not actually sent.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email *</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="recruiter@company.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The email address to send your application to
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customMessage">Custom Message (optional)</Label>
              <Textarea
                id="customMessage"
                placeholder="Add a personal note to your application..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                This will replace the generated cover letter content in the email body
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm">
              <p className="font-medium mb-2">Email will include:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Professional introduction</li>
                <li>Cover letter content (or custom message)</li>
                <li>Your resume as attachment</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={sendEmailMutation.isLoading || !recipientEmail.trim()}
            >
              {sendEmailMutation.isLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Emails Section */}
      {emails && emails.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Sent Emails
            </CardTitle>
            <CardDescription>
              Emails sent for this application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emails.map((email: EmailRecord) => (
                <div
                  key={email.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {email.status === 'SENT' ? (
                      <MailCheck className="h-5 w-5 text-green-500" />
                    ) : email.status === 'FAILED' ? (
                      <MailX className="h-5 w-5 text-red-500" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{email.toAddress}</p>
                      <p className="text-xs text-muted-foreground">
                        {email.subject}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        email.status === 'SENT'
                          ? 'bg-green-100 text-green-800'
                          : email.status === 'FAILED'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {email.status}
                      </span>
                      {email.dryRun && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                          Test
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {email.sentAt
                        ? format(new Date(email.sentAt), 'PPp')
                        : format(new Date(email.createdAt), 'PPp')}
                    </p>
                    {email.errorMessage && (
                      <p className="text-xs text-red-600 mt-1">{email.errorMessage}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Celebration */}
      {application && (
        <SubmissionCelebration
          show={showCelebration}
          jobTitle={application.jobOffer.title}
          company={application.jobOffer.company}
          onClose={() => setShowCelebration(false)}
          onViewApplications={() => router.push('/dashboard/applications')}
        />
      )}
    </div>
  );
}
