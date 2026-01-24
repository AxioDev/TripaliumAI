import { z } from 'zod';

// =============================================================================
// Common Schemas
// =============================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// =============================================================================
// Auth Schemas
// =============================================================================

export const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scope: z.enum(['READ', 'WRITE', 'ADMIN', 'TEST']),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

// =============================================================================
// Profile Schemas
// =============================================================================

export const workExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1, 'Company name is required'),
  title: z.string().min(1, 'Job title is required'),
  location: z.string().nullish(),
  startDate: z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Invalid date format'),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Invalid date format')
    .nullish(),
  description: z.string().nullish(),
  highlights: z.array(z.string()).default([]),
});

export const educationSchema = z.object({
  id: z.string().optional(),
  institution: z.string().min(1, 'Institution name is required'),
  degree: z.string().min(1, 'Degree is required'),
  field: z.string().nullish(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Invalid date format')
    .nullish(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, 'Invalid date format')
    .nullish(),
  gpa: z.string().nullish(),
  description: z.string().nullish(),
});

export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Skill name is required'),
  category: z.string().nullish(),
  level: z.string().nullish(),
  yearsOfExp: z.number().min(0).nullish(),
});

export const languageSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Language name is required'),
  proficiency: z.string().min(1, 'Proficiency level is required'),
});

export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().nullish(),
  issueDate: z.string().nullish(),
  expiryDate: z.string().nullish(),
  url: z.string().url().nullish(),
});

export const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: z.string().email().nullish(),
  phone: z.string().max(50).nullish(),
  location: z.string().max(200).nullish(),
  linkedIn: z.string().url().nullish(),
  website: z.string().url().nullish(),
  summary: z.string().max(5000).nullish(),
  motivationText: z.string().max(10000).nullish(),
  workExperiences: z.array(workExperienceSchema).optional(),
  educations: z.array(educationSchema).optional(),
  skills: z.array(skillSchema).optional(),
  languages: z.array(languageSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
});

// =============================================================================
// Campaign Schemas
// =============================================================================

export const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(200),
  targetRoles: z.array(z.string()).min(1, 'At least one target role is required'),
  targetLocations: z.array(z.string()).min(1, 'At least one target location is required'),
  contractTypes: z.array(z.string()).default([]),
  salaryMin: z.number().int().min(0).nullish(),
  salaryMax: z.number().int().min(0).nullish(),
  salaryCurrency: z.string().length(3).default('EUR'),
  remoteOk: z.boolean().default(true),
  matchThreshold: z.number().int().min(0).max(100).default(60),
  testMode: z.boolean().default(false),
  autoApply: z.boolean().default(false),
  jobSourceIds: z.array(z.string()).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

// =============================================================================
// Application Schemas
// =============================================================================

export const confirmApplicationSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const markSubmittedSchema = z.object({
  notes: z.string().max(2000).optional(),
});

export const updateResponseSchema = z.object({
  responseStatus: z.enum(['interview', 'rejected', 'offer', 'no_response', 'other']),
  responseNotes: z.string().max(5000).optional(),
});

// =============================================================================
// Action Log Schemas
// =============================================================================

export const actionLogQuerySchema = z
  .object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    action: z.string().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .merge(paginationSchema);

// =============================================================================
// CV Parsing Schema (for OpenAI structured output)
// =============================================================================

export const cvParseResultSchema = z.object({
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email().nullable(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    linkedIn: z.string().url().nullable(),
    website: z.string().url().nullable(),
  }),
  summary: z.string().nullable(),
  workExperience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string().nullable(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      description: z.string(),
      highlights: z.array(z.string()),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string().nullable(),
      startDate: z.string().nullable(),
      endDate: z.string().nullable(),
      gpa: z.string().nullable(),
      description: z.string().nullable(),
    })
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.string().nullable(),
      level: z.string().nullable(),
    })
  ),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.string(),
    })
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string().nullable(),
      date: z.string().nullable(),
    })
  ),
  extractionConfidence: z.number().min(0).max(100),
  extractionNotes: z.string().nullable(),
});

// =============================================================================
// Job Analysis Schema (for OpenAI structured output)
// =============================================================================

export const jobAnalysisSchema = z.object({
  matchScore: z.number().min(0).max(100),
  matchBreakdown: z.object({
    skillsMatch: z.number().min(0).max(100),
    experienceMatch: z.number().min(0).max(100),
    educationMatch: z.number().min(0).max(100),
    locationMatch: z.number().min(0).max(100),
    salaryMatch: z.number().min(0).max(100).nullable(),
  }),
  matchingRequirements: z.array(z.string()),
  missingRequirements: z.array(z.string()),
  redFlags: z.array(z.string()),
  recommendation: z.enum([
    'strong_match',
    'good_match',
    'possible_match',
    'weak_match',
    'no_match',
  ]),
  reasoning: z.string(),
});

// =============================================================================
// Generated CV Schema (for OpenAI structured output)
// =============================================================================

export const generatedCVSchema = z.object({
  personalInfo: z.object({
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string().nullable(),
    location: z.string().nullable(),
    linkedIn: z.string().nullable(),
  }),
  summary: z.string().describe('A tailored professional summary highlighting relevant experience for this specific job'),
  workExperience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      location: z.string().nullable(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      highlights: z.array(z.string()).describe('3-5 achievement-focused bullet points tailored to the job requirements'),
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string().nullable(),
      endDate: z.string().nullable(),
    })
  ),
  skills: z.array(z.string()).describe('Relevant skills prioritized based on job requirements'),
  languages: z.array(
    z.object({
      name: z.string(),
      proficiency: z.string(),
    })
  ),
});

// =============================================================================
// Generated Cover Letter Schema (for OpenAI structured output)
// =============================================================================

export const generatedCoverLetterSchema = z.object({
  recipientName: z.string().nullable().describe('Hiring manager name if known'),
  recipientTitle: z.string().nullable().describe('Hiring manager title if known'),
  companyName: z.string(),
  opening: z.string().describe('Engaging opening paragraph expressing interest in the specific role'),
  body: z.array(z.string()).describe('2-3 paragraphs highlighting relevant qualifications and achievements'),
  closing: z.string().describe('Strong closing paragraph with call to action'),
  signature: z.string().describe('Professional sign-off with candidate name'),
});

// =============================================================================
// Type exports from schemas
// =============================================================================

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type CVParseResultSchema = z.infer<typeof cvParseResultSchema>;
export type JobAnalysisSchema = z.infer<typeof jobAnalysisSchema>;
export type ActionLogQueryInput = z.infer<typeof actionLogQuerySchema>;
export type GeneratedCV = z.infer<typeof generatedCVSchema>;
export type GeneratedCoverLetter = z.infer<typeof generatedCoverLetterSchema>;
