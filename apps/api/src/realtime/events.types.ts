/**
 * WebSocket Event Types and Payloads
 * Naming convention: entity:action
 */

// CV Events
export type CvParseStartedPayload = {
  cvId: string;
  fileName: string;
};

export type CvParseProgressPayload = {
  cvId: string;
  progress: number;
  stage: 'uploading' | 'converting' | 'analyzing' | 'extracting' | 'finalizing';
};

export type CvParseCompletedPayload = {
  cvId: string;
  fileName: string;
};

export type CvParseFailedPayload = {
  cvId: string;
  error: string;
};

// Job Discovery Events
export type JobDiscoveryStartedPayload = {
  campaignId: string;
  campaignName: string;
};

export type JobDiscoveredPayload = {
  campaignId: string;
  job: {
    id: string;
    title: string;
    company: string;
    location?: string;
    source?: string;
  };
};

export type JobMatchedPayload = {
  campaignId: string;
  jobId: string;
  matchScore: number;
  matchReason?: string;
};

export type JobDiscoveryCompletedPayload = {
  campaignId: string;
  jobsFound: number;
  newJobs: number;
  matchedJobs: number;
};

// Document Generation Events
export type DocumentGenerationStartedPayload = {
  applicationId: string;
  jobTitle: string;
  company: string;
};

export type DocumentGeneratedPayload = {
  applicationId: string;
  documentType: 'cv' | 'cover_letter';
  version: number;
};

export type DocumentsReadyPayload = {
  applicationId: string;
  jobTitle: string;
  company: string;
};

export type DocumentGenerationFailedPayload = {
  applicationId: string;
  error: string;
};

// Application Events
export type ApplicationStatusChangedPayload = {
  applicationId: string;
  status: string;
  jobTitle: string;
  company: string;
};

export type ApplicationSubmittedPayload = {
  applicationId: string;
  jobTitle: string;
  company: string;
};

// Notification Event
export type NotificationPayload = {
  id: string;
  type:
    | 'cv_parsed'
    | 'jobs_discovered'
    | 'documents_ready'
    | 'campaign_status'
    | 'application_submitted'
    | 'match_found';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

// Event Map for type safety
export interface ServerToClientEvents {
  'cv:parse_started': (payload: CvParseStartedPayload) => void;
  'cv:parse_progress': (payload: CvParseProgressPayload) => void;
  'cv:parse_completed': (payload: CvParseCompletedPayload) => void;
  'cv:parse_failed': (payload: CvParseFailedPayload) => void;
  'job:discovery_started': (payload: JobDiscoveryStartedPayload) => void;
  'job:discovered': (payload: JobDiscoveredPayload) => void;
  'job:matched': (payload: JobMatchedPayload) => void;
  'job:discovery_completed': (payload: JobDiscoveryCompletedPayload) => void;
  'document:generation_started': (payload: DocumentGenerationStartedPayload) => void;
  'document:generated': (payload: DocumentGeneratedPayload) => void;
  'document:documents_ready': (payload: DocumentsReadyPayload) => void;
  'document:generation_failed': (payload: DocumentGenerationFailedPayload) => void;
  'application:status_changed': (payload: ApplicationStatusChangedPayload) => void;
  'application:submitted': (payload: ApplicationSubmittedPayload) => void;
  notification: (payload: NotificationPayload) => void;
}

export interface ClientToServerEvents {
  subscribe: (data: { type: 'campaign' | 'cv' | 'application'; id: string }) => void;
  unsubscribe: (data: { type: 'campaign' | 'cv' | 'application'; id: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  userId: string;
  email: string;
}

// Event names as constants for easier imports
export const RealtimeEvents = {
  // CV
  CV_PARSE_STARTED: 'cv:parse_started',
  CV_PARSE_PROGRESS: 'cv:parse_progress',
  CV_PARSE_COMPLETED: 'cv:parse_completed',
  CV_PARSE_FAILED: 'cv:parse_failed',
  // Job
  JOB_DISCOVERY_STARTED: 'job:discovery_started',
  JOB_DISCOVERED: 'job:discovered',
  JOB_MATCHED: 'job:matched',
  JOB_DISCOVERY_COMPLETED: 'job:discovery_completed',
  // Document
  DOCUMENT_GENERATION_STARTED: 'document:generation_started',
  DOCUMENT_GENERATED: 'document:generated',
  DOCUMENTS_READY: 'document:documents_ready',
  DOCUMENT_GENERATION_FAILED: 'document:generation_failed',
  // Application
  APPLICATION_STATUS_CHANGED: 'application:status_changed',
  APPLICATION_SUBMITTED: 'application:submitted',
  // General
  NOTIFICATION: 'notification',
} as const;
