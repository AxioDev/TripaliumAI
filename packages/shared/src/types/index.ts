// =============================================================================
// Enums (must match Prisma schema)
// =============================================================================

export enum ApiKeyScope {
  READ = 'READ',
  WRITE = 'WRITE',
  ADMIN = 'ADMIN',
  TEST = 'TEST',
}

export enum CVType {
  UPLOADED = 'UPLOADED',
  GENERATED = 'GENERATED',
}

export enum ParsingStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum JobSourceType {
  API = 'API',
  SCRAPER = 'SCRAPER',
  RSS = 'RSS',
  MANUAL = 'MANUAL',
  MOCK = 'MOCK',
}

export enum JobOfferStatus {
  DISCOVERED = 'DISCOVERED',
  ANALYZING = 'ANALYZING',
  MATCHED = 'MATCHED',
  REJECTED = 'REJECTED',
  APPLIED = 'APPLIED',
  EXPIRED = 'EXPIRED',
  ERROR = 'ERROR',
}

export enum ApplicationStatus {
  PENDING_GENERATION = 'PENDING_GENERATION',
  GENERATING = 'GENERATING',
  GENERATION_FAILED = 'GENERATION_FAILED',
  PENDING_REVIEW = 'PENDING_REVIEW',
  READY_TO_SUBMIT = 'READY_TO_SUBMIT',
  SUBMITTING = 'SUBMITTING',
  SUBMITTED = 'SUBMITTED',
  SUBMISSION_FAILED = 'SUBMISSION_FAILED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum ApplicationMethod {
  AUTO_API = 'AUTO_API',
  AUTO_FORM = 'AUTO_FORM',
  ASSISTED = 'ASSISTED',
  EMAIL = 'EMAIL',
  EXTERNAL = 'EXTERNAL',
}

export enum DocumentType {
  CV = 'CV',
  COVER_LETTER = 'COVER_LETTER',
}

export enum EmailStatus {
  QUEUED = 'QUEUED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

// =============================================================================
// Action Types (for logging)
// =============================================================================

export enum ActionType {
  // Auth
  USER_SIGNUP = 'user.signup',
  USER_LOGIN = 'user.login',
  USER_LOGOUT = 'user.logout',
  USER_DELETED = 'user.deleted',
  USER_DATA_EXPORTED = 'user.data_exported',
  USER_CONSENT_GIVEN = 'user.consent_given',
  PASSWORD_RESET_REQUESTED = 'user.password_reset_requested',
  PASSWORD_RESET_COMPLETED = 'user.password_reset_completed',
  API_KEY_CREATED = 'api_key.created',
  API_KEY_REVOKED = 'api_key.revoked',
  API_KEY_USED = 'api_key.used',

  // Profile
  PROFILE_CREATED = 'profile.created',
  PROFILE_UPDATED = 'profile.updated',
  CV_UPLOADED = 'cv.uploaded',
  CV_PARSE_STARTED = 'cv.parse_started',
  CV_PARSED = 'cv.parsed',
  CV_PARSE_FAILED = 'cv.parse_failed',

  // Campaign
  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_UPDATED = 'campaign.updated',
  CAMPAIGN_STARTED = 'campaign.started',
  CAMPAIGN_PAUSED = 'campaign.paused',
  CAMPAIGN_STOPPED = 'campaign.stopped',

  // Jobs
  JOB_DISCOVERY_STARTED = 'job.discovery_started',
  JOB_DISCOVERY_COMPLETED = 'job.discovery_completed',
  JOB_DISCOVERY_FAILED = 'job.discovery_failed',
  JOB_DISCOVERED = 'job.discovered',
  JOB_ANALYSIS_STARTED = 'job.analysis_started',
  JOB_ANALYZED = 'job.analyzed',
  JOB_ANALYSIS_FAILED = 'job.analysis_failed',
  JOB_MATCHED = 'job.matched',
  JOB_REJECTED = 'job.rejected',

  // Applications
  APPLICATION_CREATED = 'application.created',
  DOCUMENT_GENERATION_STARTED = 'document.generation_started',
  DOCUMENT_GENERATED = 'document.generated',
  DOCUMENT_GENERATION_FAILED = 'document.generation_failed',
  APPLICATION_CONFIRMED = 'application.confirmed',
  APPLICATION_SUBMITTED = 'application.submitted',
  APPLICATION_FAILED = 'application.failed',
  APPLICATION_WITHDRAWN = 'application.withdrawn',

  // Email
  EMAIL_QUEUED = 'email.queued',
  EMAIL_SENT = 'email.sent',
  EMAIL_FAILED = 'email.failed',
}

// =============================================================================
// API Response Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// =============================================================================
// Auth Types
// =============================================================================

export interface AuthUser {
  id: string;
  email: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  scope: ApiKeyScope;
  keyPrefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
}

export interface CreateApiKeyRequest {
  name: string;
  scope: ApiKeyScope;
  expiresInDays?: number;
}

export interface CreateApiKeyResponse {
  key: string; // Full key, only shown once
  info: ApiKeyInfo;
}

// =============================================================================
// Profile Types
// =============================================================================

export interface ProfileSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  location: string | null;
  hasPhoto: boolean;
  completionPercentage: number;
}

export interface WorkExperienceData {
  id?: string;
  company: string;
  title: string;
  location?: string | null;
  startDate: string; // ISO date
  endDate?: string | null;
  description?: string | null;
  highlights: string[];
}

export interface EducationData {
  id?: string;
  institution: string;
  degree: string;
  field?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  gpa?: string | null;
  description?: string | null;
}

export interface SkillData {
  id?: string;
  name: string;
  category?: string | null;
  level?: string | null;
  yearsOfExp?: number | null;
}

export interface LanguageData {
  id?: string;
  name: string;
  proficiency: string;
}

export interface CertificationData {
  id?: string;
  name: string;
  issuer?: string | null;
  issueDate?: string | null;
  expiryDate?: string | null;
  url?: string | null;
}

export interface FullProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  linkedIn: string | null;
  website: string | null;
  summary: string | null;
  photoUrl: string | null;
  motivationText: string | null;
  workExperiences: WorkExperienceData[];
  educations: EducationData[];
  skills: SkillData[];
  languages: LanguageData[];
  certifications: CertificationData[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CV Types
// =============================================================================

export interface CVInfo {
  id: string;
  type: CVType;
  fileName: string;
  fileSize: number;
  parsingStatus: ParsingStatus;
  isBaseline: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CVParseResult {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    location: string | null;
    linkedIn: string | null;
    website: string | null;
  };
  summary: string | null;
  workExperience: Array<{
    company: string;
    title: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    description: string;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
    gpa: string | null;
    description: string | null;
  }>;
  skills: Array<{
    name: string;
    category: string | null;
    level: string | null;
  }>;
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string | null;
    date: string | null;
  }>;
  extractionConfidence: number;
  extractionNotes: string | null;
}

// =============================================================================
// Campaign Types
// =============================================================================

export interface CampaignInfo {
  id: string;
  name: string;
  status: CampaignStatus;
  targetRoles: string[];
  targetLocations: string[];
  contractTypes: string[];
  remoteOk: boolean;
  testMode: boolean;
  jobCount: number;
  applicationCount: number;
  createdAt: string;
  startedAt: string | null;
}

export interface CreateCampaignRequest {
  name: string;
  targetRoles: string[];
  targetLocations: string[];
  contractTypes?: string[];
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  remoteOk?: boolean;
  matchThreshold?: number;
  testMode?: boolean;
  autoApply?: boolean;
  jobSourceIds?: string[];
}

export interface UpdateCampaignRequest extends Partial<CreateCampaignRequest> {
  status?: CampaignStatus;
}

// =============================================================================
// Job Offer Types
// =============================================================================

export interface JobOfferInfo {
  id: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  contractType: string | null;
  remoteType: string | null;
  url: string;
  matchScore: number | null;
  status: JobOfferStatus;
  discoveredAt: string;
  hasApplication: boolean;
}

export interface JobOfferDetails extends JobOfferInfo {
  description: string;
  requirements: string[];
  matchAnalysis: JobMatchAnalysis | null;
  campaignId: string;
  jobSourceId: string;
}

export interface JobMatchAnalysis {
  matchScore: number;
  matchBreakdown: {
    skillsMatch: number;
    experienceMatch: number;
    educationMatch: number;
    locationMatch: number;
    salaryMatch: number | null;
  };
  matchingRequirements: string[];
  missingRequirements: string[];
  redFlags: string[];
  recommendation: 'strong_match' | 'good_match' | 'possible_match' | 'weak_match' | 'no_match';
  reasoning: string;
}

// =============================================================================
// Application Types
// =============================================================================

export interface ApplicationInfo {
  id: string;
  jobTitle: string;
  company: string;
  status: ApplicationStatus;
  method: ApplicationMethod | null;
  requiresConfirm: boolean;
  testMode: boolean;
  createdAt: string;
  submittedAt: string | null;
}

export interface ApplicationDetails extends ApplicationInfo {
  jobOffer: JobOfferInfo;
  documents: GeneratedDocumentInfo[];
  emails: EmailInfo[];
  confirmedAt: string | null;
  confirmedBy: string | null;
  submissionNotes: string | null;
  responseStatus: string | null;
  responseAt: string | null;
}

// =============================================================================
// Document Types
// =============================================================================

export interface GeneratedDocumentInfo {
  id: string;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  version: number;
  isLatest: boolean;
  generatedAt: string;
}

export interface GeneratedCVContent {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedIn: string | null;
  };
  summary: string;
  workExperience: Array<{
    company: string;
    title: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    highlights: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string | null;
    endDate: string | null;
  }>;
  skills: string[];
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
}

export interface GeneratedCoverLetterContent {
  recipientName: string | null;
  recipientTitle: string | null;
  companyName: string;
  opening: string;
  body: string[];
  closing: string;
  signature: string;
}

// =============================================================================
// Email Types
// =============================================================================

export interface EmailInfo {
  id: string;
  toAddress: string;
  subject: string;
  status: EmailStatus;
  dryRun: boolean;
  sentAt: string | null;
  createdAt: string;
}

// =============================================================================
// Action Log Types
// =============================================================================

export interface ActionLogEntry {
  id: string;
  userId: string | null;
  entityType: string;
  entityId: string | null;
  action: string;
  status: string;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  testMode: boolean;
  createdAt: string;
}

export interface ActionLogQuery {
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

// =============================================================================
// Job Source Types
// =============================================================================

export interface JobSourceInfo {
  id: string;
  name: string;
  displayName: string;
  type: JobSourceType;
  supportsAutoApply: boolean;
  isActive: boolean;
}

// =============================================================================
// Billing & Subscription (re-export)
// =============================================================================

export * from './billing';
