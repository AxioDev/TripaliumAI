import { getSession } from 'next-auth/react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiResponse<T> {
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

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: unknown;
  headers?: Record<string, string>;
  apiKey?: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const session = await getSession();
  if (session?.accessToken) {
    return { Authorization: `Bearer ${session.accessToken}` };
  }
  return {};
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {}, apiKey } = options;

  const authHeaders = apiKey
    ? { 'X-API-Key': apiKey }
    : await getAuthHeader();

  const requestHeaders: Record<string, string> = {
    ...authHeaders,
    ...headers,
  };

  if (body && !(body instanceof FormData)) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}/api${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });

  // Handle non-JSON responses (like file downloads)
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes('application/json')) {
    if (!response.ok) {
      throw new ApiError(response.status, 'REQUEST_FAILED', 'Request failed');
    }
    return response as unknown as T;
  }

  const data = await response.json();

  if (!response.ok) {
    // Handle error responses
    const errorData = data as ApiResponse<T>;
    throw new ApiError(
      response.status,
      errorData.error?.code || data.error || 'UNKNOWN_ERROR',
      errorData.error?.message || data.message || 'An error occurred',
      errorData.error?.details
    );
  }

  // Handle both wrapped { success, data } format and direct data format
  if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
    return data.data as T;
  }

  // Direct data format (API returns data directly)
  return data as T;
}

// ============================================================================
// Auth API
// ============================================================================

export const authApi = {
  signup: (email: string, password: string, consentGiven: boolean, privacyPolicyVersion?: string) =>
    apiRequest<{ accessToken: string; user: { id: string; email: string } }>(
      '/auth/signup',
      { method: 'POST', body: { email, password, consentGiven, privacyPolicyVersion } }
    ),

  login: (email: string, password: string) =>
    apiRequest<{ accessToken: string; user: { id: string; email: string } }>(
      '/auth/login',
      { method: 'POST', body: { email, password } }
    ),

  me: () => apiRequest<{ id: string; email: string }>('/auth/me'),

  deleteAccount: () =>
    apiRequest<{ success: boolean }>('/auth/account', { method: 'DELETE' }),

  exportData: () =>
    apiRequest<Record<string, unknown>>('/auth/data-export'),

  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  resetPassword: (token: string, password: string) =>
    apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password },
    }),
};

// ============================================================================
// Profile API
// ============================================================================

export interface Profile {
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
  workExperiences: WorkExperience[];
  educations: Education[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  title: string;
  location: string | null;
  startDate: string;
  endDate: string | null;
  description: string | null;
  highlights: string[];
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  gpa: string | null;
  description: string | null;
}

export interface Skill {
  id: string;
  name: string;
  category: string | null;
  level: string | null;
  yearsOfExp: number | null;
}

export interface Language {
  id: string;
  name: string;
  proficiency: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  url: string | null;
}

export const profileApi = {
  get: () => apiRequest<Profile | null>('/profile'),

  update: (data: Partial<Profile>) =>
    apiRequest<Profile>('/profile', { method: 'PUT', body: data }),

  uploadPhoto: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<{ photoUrl: string }>('/profile/photo', {
      method: 'POST',
      body: formData,
    });
  },

  updateExperiences: (experiences: Omit<WorkExperience, 'id'>[]) =>
    apiRequest('/profile/experiences', {
      method: 'PUT',
      body: { experiences },
    }),

  updateEducation: (educations: Omit<Education, 'id'>[]) =>
    apiRequest('/profile/education', {
      method: 'PUT',
      body: { educations },
    }),

  updateSkills: (skills: Omit<Skill, 'id'>[]) =>
    apiRequest('/profile/skills', {
      method: 'PUT',
      body: { skills },
    }),

  updateLanguages: (languages: Omit<Language, 'id'>[]) =>
    apiRequest('/profile/languages', {
      method: 'PUT',
      body: { languages },
    }),

  regenerateEmbedding: () =>
    apiRequest<{ success: boolean }>('/profile/regenerate-embedding', {
      method: 'POST',
    }),
};

// ============================================================================
// CV API
// ============================================================================

export interface CV {
  id: string;
  userId: string;
  type: 'UPLOADED' | 'GENERATED';
  fileName: string;
  fileSize: number;
  parsingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  parsingError: string | null;
  isBaseline: boolean;
  parsedData: CVParsedData | null;
  createdAt: string;
  updatedAt: string;
}

export interface CVParsedData {
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

export const cvApi = {
  list: () => apiRequest<CV[]>('/cvs'),

  get: (id: string) => apiRequest<CV>(`/cvs/${id}`),

  upload: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiRequest<CV>('/cvs/upload', {
      method: 'POST',
      body: formData,
    });
  },

  triggerParse: (id: string) =>
    apiRequest<{ jobQueued: boolean }>(`/cvs/${id}/parse`, { method: 'POST' }),

  getParsedData: (id: string) => apiRequest<CVParsedData>(`/cvs/${id}/parsed-data`),

  setBaseline: (id: string) =>
    apiRequest<CV>(`/cvs/${id}/baseline`, { method: 'POST' }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/cvs/${id}`, { method: 'DELETE' }),

  getDownloadUrl: (id: string) => `${API_URL}/api/cvs/${id}/download`,
};

// ============================================================================
// Campaign API
// ============================================================================

export interface Campaign {
  id: string;
  name: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  targetRoles: string[];
  targetLocations: string[];
  contractTypes: string[];
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  remoteOk: boolean;
  matchThreshold: number;
  testMode: boolean;
  autoApply: boolean;
  createdAt: string;
  startedAt: string | null;
  _count?: {
    jobOffers: number;
    applications: number;
  };
}

export interface CreateCampaignData {
  name: string;
  targetRoles: string[];
  targetLocations: string[];
  contractTypes?: string[];
  salaryMin?: number;
  maxApplications?: number;
  anonymizeApplications?: boolean;
  salaryMax?: number;
  salaryCurrency?: string;
  remoteOk?: boolean;
  matchThreshold?: number;
  testMode?: boolean;
  autoApply?: boolean;
  jobSourceIds?: string[];
}

export const campaignApi = {
  list: () => apiRequest<Campaign[]>('/campaigns'),

  get: (id: string) => apiRequest<Campaign>(`/campaigns/${id}`),

  create: (data: CreateCampaignData) =>
    apiRequest<Campaign>('/campaigns', { method: 'POST', body: data }),

  update: (id: string, data: Partial<CreateCampaignData>) =>
    apiRequest<Campaign>(`/campaigns/${id}`, { method: 'PUT', body: data }),

  start: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/start`, { method: 'POST' }),

  pause: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/pause`, { method: 'POST' }),

  stop: (id: string) =>
    apiRequest<Campaign>(`/campaigns/${id}/stop`, { method: 'POST' }),

  delete: (id: string) =>
    apiRequest<{ success: boolean }>(`/campaigns/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// Job API
// ============================================================================

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description: string;
  requirements: string[];
  salary: string | null;
  contractType: string | null;
  remoteType: string | null;
  url: string;
  matchScore: number | null;
  discriminationFlags?: string[];
  status: 'DISCOVERED' | 'ANALYZING' | 'MATCHED' | 'REJECTED' | 'APPLIED' | 'EXPIRED' | 'ERROR';
  discoveredAt: string;
  application?: { id: string; status: string } | null;
  jobSource?: {
    id: string;
    name: string;
    displayName: string;
    type: 'API' | 'SCRAPER' | 'RSS' | 'MANUAL' | 'MOCK';
  };
}

export interface JobSource {
  id: string;
  name: string;
  displayName: string;
  type: 'API' | 'SCRAPER' | 'RSS' | 'MANUAL' | 'MOCK';
  supportsAutoApply: boolean;
  isActive: boolean;
}

export const jobApi = {
  listForCampaign: (campaignId: string, params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<{ data: JobOffer[]; meta: { page: number; limit: number; total: number; hasMore: boolean } }>(
      `/campaigns/${campaignId}/jobs${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) => apiRequest<JobOffer>(`/jobs/${id}`),

  reject: (id: string) => apiRequest<JobOffer>(`/jobs/${id}/reject`, { method: 'POST' }),

  listSources: () => apiRequest<JobSource[]>('/job-sources'),
};

// ============================================================================
// Application API
// ============================================================================

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

export interface ApplicationJobOffer {
  id: string;
  title: string;
  company: string;
  location: string | null;
  description?: string;
  requirements?: string[];
  salary?: string | null;
  contractType?: string | null;
  remoteType?: string | null;
  url?: string;
  matchScore?: number | null;
  matchAnalysis?: JobMatchAnalysis | null;
}

export interface Application {
  id: string;
  status: 'PENDING_GENERATION' | 'GENERATING' | 'GENERATION_FAILED' | 'PENDING_REVIEW' | 'READY_TO_SUBMIT' | 'SUBMITTING' | 'SUBMITTED' | 'SUBMISSION_FAILED' | 'WITHDRAWN';
  method: 'AUTO_API' | 'AUTO_FORM' | 'ASSISTED' | 'EMAIL' | 'EXTERNAL' | null;
  requiresConfirm: boolean;
  testMode: boolean;
  confirmedAt: string | null;
  submittedAt: string | null;
  createdAt: string;
  submissionNotes?: string | null;
  jobOffer: ApplicationJobOffer;
  documents?: GeneratedDocument[];
}

export interface GeneratedDocument {
  id: string;
  type: 'CV' | 'COVER_LETTER';
  fileName: string;
  fileSize: number;
  version: number;
  isLatest: boolean;
  generatedAt: string;
}

export const applicationApi = {
  list: (params?: { campaignId?: string; status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.campaignId) searchParams.set('campaignId', params.campaignId);
    if (params?.status) searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<{ data: Application[]; meta: { page: number; limit: number; total: number; hasMore: boolean } }>(
      `/applications${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) => apiRequest<Application>(`/applications/${id}`),

  confirm: (id: string, notes?: string) =>
    apiRequest<Application>(`/applications/${id}/confirm`, {
      method: 'POST',
      body: { notes },
    }),

  withdraw: (id: string) =>
    apiRequest<Application>(`/applications/${id}/withdraw`, { method: 'POST' }),

  markSubmitted: (id: string, notes?: string) =>
    apiRequest<Application>(`/applications/${id}/mark-submitted`, {
      method: 'POST',
      body: { notes },
    }),

  getDocuments: (id: string) =>
    apiRequest<GeneratedDocument[]>(`/applications/${id}/documents`),

  getDocumentDownloadUrl: (documentId: string) =>
    `${API_URL}/api/documents/${documentId}/download`,

  getDocumentContent: (documentId: string) =>
    apiRequest<{
      id: string;
      type: 'CV' | 'COVER_LETTER';
      fileName: string;
      version: number;
      content: unknown;
      generatedAt: string;
    }>(`/documents/${documentId}/content`),

  regenerateDocuments: (id: string) =>
    apiRequest<{ queued: boolean }>(`/applications/${id}/regenerate`, { method: 'POST' }),

  sendEmail: (id: string, recipientEmail: string, customMessage?: string) =>
    apiRequest<{ emailId: string; status: string; dryRun: boolean }>(
      `/applications/${id}/send-email`,
      {
        method: 'POST',
        body: { recipientEmail, customMessage },
      }
    ),

  getEmails: (id: string) =>
    apiRequest<EmailRecord[]>(`/applications/${id}/emails`),
};

// ============================================================================
// Email Records
// ============================================================================

export interface EmailRecord {
  id: string;
  toAddress: string;
  fromAddress: string;
  subject: string;
  status: 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED';
  dryRun: boolean;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

// ============================================================================
// Logs API
// ============================================================================

export interface ActionLog {
  id: string;
  entityType: string;
  entityId: string | null;
  action: string;
  status: string;
  metadata: Record<string, unknown> | null;
  errorMessage: string | null;
  testMode: boolean;
  createdAt: string;
}

export const logsApi = {
  query: (params?: {
    entityType?: string;
    entityId?: string;
    action?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.entityId) searchParams.set('entityId', params.entityId);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    const query = searchParams.toString();
    return apiRequest<{ data: ActionLog[]; meta: { page: number; limit: number; total: number; hasMore: boolean } }>(
      `/logs${query ? `?${query}` : ''}`
    );
  },
};

// ============================================================================
// API Keys API
// ============================================================================

export interface ApiKeyInfo {
  id: string;
  name: string;
  scope: 'READ' | 'WRITE' | 'ADMIN' | 'TEST';
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
}

export const apiKeysApi = {
  list: () => apiRequest<ApiKeyInfo[]>('/api-keys'),

  create: (name: string, scope: 'READ' | 'WRITE' | 'ADMIN' | 'TEST', expiresInDays?: number) =>
    apiRequest<{ key: string; info: ApiKeyInfo }>('/api-keys', {
      method: 'POST',
      body: { name, scope, expiresInDays },
    }),

  revoke: (id: string) =>
    apiRequest<{ success: boolean }>(`/api-keys/${id}`, { method: 'DELETE' }),
};

// ============================================================================
// Dashboard Stats
// ============================================================================

export interface DashboardStats {
  cvCount: number;
  campaignCount: number;
  activeCampaignCount: number;
  jobCount: number;
  applicationCount: number;
  submittedCount: number;
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    // Aggregate stats from multiple endpoints
    const [cvs, campaigns, applications] = await Promise.all([
      cvApi.list().catch(() => []),
      campaignApi.list().catch(() => []),
      applicationApi.list({ limit: 1 }).catch(() => ({ data: [], meta: { total: 0 } })),
    ]);

    const jobCount = campaigns.reduce((sum, c) => sum + (c._count?.jobOffers || 0), 0);

    return {
      cvCount: cvs.length,
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((c) => c.status === 'ACTIVE').length,
      jobCount,
      applicationCount: applications.meta?.total || 0,
      submittedCount: 0, // Would need another query
    };
  },

  getRecentActivity: (limit = 10) => logsApi.query({ limit }),
};
