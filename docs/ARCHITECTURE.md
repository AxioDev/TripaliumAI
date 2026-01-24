# TripaliumAI — POC Architecture Document

**Version:** 0.1.0
**Status:** Design Phase
**Target Users:** 2–3 internal testers

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SINGLE VPS / LOCAL                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐     ┌─────────────────────────────────────────┐   │
│  │                     │     │              NestJS Backend              │   │
│  │   Next.js Frontend  │────▶│                                         │   │
│  │   (App Router)      │     │  ┌─────────────┐  ┌─────────────────┐   │   │
│  │                     │◀────│  │  REST API   │  │ Background Jobs │   │   │
│  │  - Auth UI          │     │  │  (OpenAPI)  │  │ (In-Process)    │   │   │
│  │  - CV Editor        │     │  └─────────────┘  └─────────────────┘   │   │
│  │  - Campaign Dash    │     │         │                  │            │   │
│  │  - Application Log  │     │         ▼                  ▼            │   │
│  │                     │     │  ┌─────────────────────────────────┐    │   │
│  └─────────────────────┘     │  │         Prisma ORM              │    │   │
│                              │  └─────────────────────────────────┘    │   │
│                              │                   │                      │   │
│                              └───────────────────┼──────────────────────┘   │
│                                                  │                          │
│                                                  ▼                          │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                         PostgreSQL + pgvector                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Local Filesystem / S3-Compatible                    │ │
│  │                    (CVs, Generated Documents, Logs)                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
              ┌───────────────────────────────────────────────┐
              │              External Services                 │
              │  ┌─────────────┐  ┌─────────────┐             │
              │  │ OpenAI API  │  │ SMTP Server │             │
              │  │ - Vision    │  │             │             │
              │  │ - Chat      │  │             │             │
              │  │ - Embeddings│  │             │             │
              │  └─────────────┘  └─────────────┘             │
              │                                                │
              │  ┌─────────────────────────────────────────┐  │
              │  │          Job Board APIs / Scrapers       │  │
              │  │  (LinkedIn, Indeed, etc. — per source)   │  │
              │  └─────────────────────────────────────────┘  │
              └───────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Frontend** | Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui | User interface, auth flows, CV editor, dashboard |
| **Backend API** | NestJS, TypeScript, OpenAPI/Swagger | REST endpoints, business logic, auth, validation |
| **Background Jobs** | BullMQ + Redis (or in-process queue) | Job discovery, document generation, application execution |
| **Database** | PostgreSQL 15+ with pgvector | All persistent data, embeddings for matching |
| **File Storage** | Local filesystem (dev) / MinIO (prod-like) | CV files, generated PDFs, email attachments |
| **LLM Provider** | OpenAI API | Vision parsing, document generation, job analysis |
| **Email** | SMTP (Mailhog for dev, any SMTP for prod) | Application emails, notifications |

### Authentication Architecture

Two parallel authentication mechanisms:

1. **User Auth (Auth.js)**: Email/password for web UI access
2. **API Key Auth**: For programmatic access and E2E testing

```
Request → [Check Auth Header]
              │
              ├─── Bearer token → Auth.js session validation
              │
              └─── X-API-Key header → API key lookup + scope check
                        │
                        ▼
                   [Hash key, lookup in DB]
                        │
                        ▼
                   [Check scope: read|write|admin|test]
                        │
                        ▼
                   [Inject user context into request]
```

---

## 2. Core Domain Model

### Entity Relationship Diagram

```
┌──────────────────┐
│      User        │
├──────────────────┤
│ id               │───────────────────────────────────┐
│ email            │                                   │
│ passwordHash     │                                   │
│ createdAt        │                                   │
│ updatedAt        │                                   │
└────────┬─────────┘                                   │
         │                                             │
         │ 1:N                                         │ 1:N
         ▼                                             ▼
┌──────────────────┐                          ┌──────────────────┐
│     ApiKey       │                          │     Profile      │
├──────────────────┤                          ├──────────────────┤
│ id               │                          │ id               │
│ userId           │                          │ userId (unique)  │
│ keyHash          │                          │ firstName        │
│ keyPrefix        │                          │ lastName         │
│ name             │                          │ email            │
│ scope            │                          │ phone            │
│ lastUsedAt       │                          │ location         │
│ expiresAt        │                          │ summary          │
│ createdAt        │                          │ photoUrl         │
│ revokedAt        │                          │ motivationText   │
└──────────────────┘                          │ embeddingVector  │
                                              │ createdAt        │
                                              │ updatedAt        │
                                              └────────┬─────────┘
                                                       │
         ┌─────────────────┬──────────────────┬────────┴────────┬─────────────────┐
         │ 1:N             │ 1:N              │ 1:N             │ 1:N             │
         ▼                 ▼                  ▼                 ▼                 │
┌─────────────────┐ ┌─────────────┐  ┌──────────────┐  ┌──────────────┐          │
│ WorkExperience  │ │  Education  │  │    Skill     │  │   Language   │          │
├─────────────────┤ ├─────────────┤  ├──────────────┤  ├──────────────┤          │
│ id              │ │ id          │  │ id           │  │ id           │          │
│ profileId       │ │ profileId   │  │ profileId    │  │ profileId    │          │
│ company         │ │ institution │  │ name         │  │ name         │          │
│ title           │ │ degree      │  │ category     │  │ proficiency  │          │
│ location        │ │ field       │  │ level        │  │ createdAt    │          │
│ startDate       │ │ startDate   │  │ yearsOfExp   │  └──────────────┘          │
│ endDate         │ │ endDate     │  │ createdAt    │                            │
│ description     │ │ description │  └──────────────┘                            │
│ highlights[]    │ │ gpa         │                                              │
│ createdAt       │ │ createdAt   │                                              │
└─────────────────┘ └─────────────┘                                              │
                                                                                 │
                                                                                 │
┌──────────────────┐          ┌──────────────────┐                              │
│       CV         │          │     Campaign     │◀─────────────────────────────┘
├──────────────────┤          ├──────────────────┤           (User has many)
│ id               │          │ id               │
│ userId           │          │ userId           │
│ profileId        │          │ name             │
│ type (uploaded/  │          │ status           │
│       generated) │          │ targetRoles[]    │
│ filePath         │          │ targetLocations[]│
│ fileName         │          │ contractTypes[]  │
│ parsedData (JSON)│          │ salaryMin        │
│ parsingStatus    │          │ salaryMax        │
│ isBaseline       │          │ remoteOk         │
│ createdAt        │          │ jobSources[]     │──────────┐
└──────────────────┘          │ testMode         │          │
                              │ createdAt        │          │
                              │ startedAt        │          │
                              │ stoppedAt        │          │
                              └────────┬─────────┘          │
                                       │                    │
                                       │ 1:N                │ N:M (via CampaignJobSource)
                                       ▼                    ▼
                              ┌──────────────────┐  ┌──────────────────┐
                              │    JobOffer      │  │    JobSource     │
                              ├──────────────────┤  ├──────────────────┤
                              │ id               │  │ id               │
                              │ campaignId       │  │ name             │
                              │ jobSourceId      │  │ type (api/scrape/│
                              │ externalId       │  │       rss/manual)│
                              │ title            │  │ baseUrl          │
                              │ company          │  │ configJson       │
                              │ location         │  │ supportsAutoApply│
                              │ description      │  │ isActive         │
                              │ requirements[]   │  │ createdAt        │
                              │ salary           │  └──────────────────┘
                              │ contractType     │
                              │ url              │
                              │ matchScore       │
                              │ embeddingVector  │
                              │ status           │
                              │ discoveredAt     │
                              │ expiresAt        │
                              └────────┬─────────┘
                                       │
                                       │ 1:1
                                       ▼
                              ┌──────────────────┐
                              │   Application    │
                              ├──────────────────┤
                              │ id               │
                              │ jobOfferId       │
                              │ userId           │
                              │ campaignId       │
                              │ status           │
                              │ method           │
                              │ requiresConfirm  │
                              │ confirmedAt      │
                              │ submittedAt      │
                              │ responseReceived │
                              │ notes            │
                              │ createdAt        │
                              └────────┬─────────┘
                                       │
         ┌─────────────────────────────┼─────────────────────────────┐
         │ 1:N                         │ 1:N                         │ 1:N
         ▼                             ▼                             ▼
┌──────────────────┐          ┌──────────────────┐          ┌──────────────────┐
│GeneratedDocument │          │   EmailRecord    │          │   ActionLog      │
├──────────────────┤          ├──────────────────┤          ├──────────────────┤
│ id               │          │ id               │          │ id               │
│ applicationId    │          │ applicationId    │          │ userId           │
│ userId           │          │ userId           │          │ entityType       │
│ type (cv/cover)  │          │ to               │          │ entityId         │
│ filePath         │          │ subject          │          │ action           │
│ promptUsed       │          │ bodyHtml         │          │ status           │
│ modelUsed        │          │ bodyText         │          │ metadata (JSON)  │
│ inputContext     │          │ attachments[]    │          │ errorMessage     │
│ generatedAt      │          │ status           │          │ createdAt        │
│ version          │          │ sentAt           │          └──────────────────┘
└──────────────────┘          │ dryRun           │
                              │ createdAt        │
                              └──────────────────┘
```

### Enums and Status Values

```typescript
// API Key Scopes
enum ApiKeyScope {
  READ = 'read',           // Read-only access to user data
  WRITE = 'write',         // Can modify user data, trigger actions
  ADMIN = 'admin',         // Full access including user management
  TEST = 'test'            // Write access + forces testMode on all operations
}

// Campaign Status
enum CampaignStatus {
  DRAFT = 'draft',         // Being configured
  ACTIVE = 'active',       // Running job discovery
  PAUSED = 'paused',       // Temporarily stopped
  COMPLETED = 'completed', // Finished successfully
  FAILED = 'failed'        // Stopped due to error
}

// Job Offer Status
enum JobOfferStatus {
  DISCOVERED = 'discovered',     // Found, not yet analyzed
  ANALYZING = 'analyzing',       // Being processed by LLM
  MATCHED = 'matched',           // Good fit, ready for application
  REJECTED = 'rejected',         // Not a good fit (by score or user)
  APPLIED = 'applied',           // Application submitted
  EXPIRED = 'expired',           // No longer available
  ERROR = 'error'                // Processing failed
}

// Application Status
enum ApplicationStatus {
  PENDING_GENERATION = 'pending_generation',   // Waiting for docs
  GENERATING = 'generating',                   // Creating CV/cover letter
  PENDING_REVIEW = 'pending_review',           // Needs user confirmation
  READY_TO_SUBMIT = 'ready_to_submit',         // Approved, queued
  SUBMITTING = 'submitting',                   // In progress
  SUBMITTED = 'submitted',                     // Successfully sent
  SUBMISSION_FAILED = 'submission_failed',     // Could not submit
  WITHDRAWN = 'withdrawn',                     // User cancelled
  RESPONSE_RECEIVED = 'response_received'      // Got reply from employer
}

// Application Method
enum ApplicationMethod {
  AUTO_API = 'auto_api',         // Direct API submission (rare)
  AUTO_FORM = 'auto_form',       // Automated form fill (browser automation)
  ASSISTED = 'assisted',         // User confirms + submits via UI
  EMAIL = 'email',               // Email-based application
  EXTERNAL = 'external'          // Link provided, user applies manually
}

// CV Parsing Status
enum ParsingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Email Status
enum EmailStatus {
  QUEUED = 'queued',
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  BOUNCED = 'bounced'
}

// Action Log Actions
enum ActionType {
  // Auth
  USER_SIGNUP = 'user.signup',
  USER_LOGIN = 'user.login',
  API_KEY_CREATED = 'api_key.created',
  API_KEY_USED = 'api_key.used',

  // Profile
  CV_UPLOADED = 'cv.uploaded',
  CV_PARSED = 'cv.parsed',
  PROFILE_UPDATED = 'profile.updated',

  // Campaign
  CAMPAIGN_CREATED = 'campaign.created',
  CAMPAIGN_STARTED = 'campaign.started',
  CAMPAIGN_PAUSED = 'campaign.paused',
  CAMPAIGN_STOPPED = 'campaign.stopped',

  // Jobs
  JOB_DISCOVERED = 'job.discovered',
  JOB_ANALYZED = 'job.analyzed',
  JOB_MATCHED = 'job.matched',
  JOB_REJECTED = 'job.rejected',

  // Applications
  APPLICATION_CREATED = 'application.created',
  DOCUMENT_GENERATED = 'document.generated',
  APPLICATION_CONFIRMED = 'application.confirmed',
  APPLICATION_SUBMITTED = 'application.submitted',
  APPLICATION_FAILED = 'application.failed',

  // Email
  EMAIL_QUEUED = 'email.queued',
  EMAIL_SENT = 'email.sent',
  EMAIL_FAILED = 'email.failed'
}
```

---

## 3. Job Application Workflow

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           JOB APPLICATION WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │  User Setup  │
     └──────┬───────┘
            │
            ▼
┌─────────────────────┐     ┌─────────────────────┐
│ 1. Upload CV (PDF)  │────▶│ 2. Parse via Vision │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ 3. Review & Edit    │
                            │    Profile Data     │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │ 4. Add Motivation   │
                            │    Text             │
                            └──────────┬──────────┘
                                       │
                                       ▼
     ┌───────────────┐      ┌─────────────────────┐
     │ Campaign Loop │◀─────│ 5. Create Campaign  │
     └───────┬───────┘      └─────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              BACKGROUND PROCESSING                               │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────────┐                                                       │
│   │ 6. Discover Jobs    │ ◀─── Runs on schedule (e.g., every 30 min)            │
│   │    from Sources     │                                                       │
│   └──────────┬──────────┘                                                       │
│              │                                                                   │
│              ▼                                                                   │
│   ┌─────────────────────┐                                                       │
│   │ 7. Analyze & Match  │ ◀─── LLM analysis + embedding similarity              │
│   │    (Score 0-100)    │                                                       │
│   └──────────┬──────────┘                                                       │
│              │                                                                   │
│              ├─── Score < threshold ───▶ [REJECTED] ───▶ Log & Skip             │
│              │                                                                   │
│              ▼                                                                   │
│   ┌─────────────────────┐                                                       │
│   │ 8. Generate Docs    │                                                       │
│   │   - Custom CV       │                                                       │
│   │   - Cover Letter    │                                                       │
│   └──────────┬──────────┘                                                       │
│              │                                                                   │
│              ▼                                                                   │
│   ┌─────────────────────┐                                                       │
│   │ 9. Determine Method │                                                       │
│   └──────────┬──────────┘                                                       │
│              │                                                                   │
│              ├─── AUTO_API ────────▶ [Submit via API] ──────────┐               │
│              │                                                   │               │
│              ├─── AUTO_FORM ───────▶ [Fill form + submit] ──────┤               │
│              │    (if enabled)                                   │               │
│              │                                                   │               │
│              ├─── EMAIL ───────────▶ [Queue email] ─────────────┤               │
│              │                                                   │               │
│              └─── ASSISTED ────────▶ [Wait for user confirm] ───┤               │
│                                                                  │               │
│              ┌───────────────────────────────────────────────────┘               │
│              │                                                                   │
│              ▼                                                                   │
│   ┌─────────────────────┐                                                       │
│   │ 10. Log Everything  │                                                       │
│   └─────────────────────┘                                                       │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
             │
             ▼
     ┌───────────────┐
     │   Dashboard   │ ◀─── User sees all activity, can confirm assisted apps
     └───────────────┘
```

### Detailed Step Descriptions

#### Step 1: CV Upload

```
Input:  PDF file (max 10MB)
Output: CV record with file stored

Flow:
1. User uploads PDF via frontend or API
2. Backend validates file (type, size, virus scan if available)
3. File stored in /storage/cvs/{userId}/{uuid}.pdf
4. CV record created with status=PENDING
5. Parse job queued automatically
```

#### Step 2: Vision-Based Parsing

```
Input:  PDF file path
Output: Structured JSON profile data

Flow:
1. Worker picks up parse job
2. Convert PDF pages to images (using pdf-to-img or similar)
3. Send images to OpenAI Vision API with structured output schema
4. Validate returned JSON against schema
5. Store parsed data in CV.parsedData
6. Create/update Profile and child entities from parsed data
7. Generate profile embedding vector
8. Update CV.parsingStatus = COMPLETED
9. Log CV_PARSED action

OpenAI Vision Prompt (simplified):
  "Extract all professional information from this resume image.
   Return a JSON object matching the provided schema.
   Include: personal info, work experience, education, skills, languages."

Structured Output Schema: See Section 6
```

#### Step 3: Profile Review

```
User Action: Review extracted data in CV Editor UI
- Correct OCR errors
- Add missing information
- Enhance descriptions
- Upload photo
- Set as baseline CV

System: Re-generate embedding vector on save
```

#### Step 4: Motivation Text

```
User Action: Write generic motivation/objective text
- Used as base for cover letter generation
- Can include career goals, preferred work style, etc.
```

#### Step 5: Campaign Creation

```
Input:  Campaign configuration
Output: Campaign record (status=DRAFT)

Configuration includes:
- Name (for user reference)
- Target roles (e.g., ["Software Engineer", "Backend Developer"])
- Target locations (e.g., ["Paris", "Remote"])
- Contract types (e.g., ["CDI", "Full-time"])
- Salary range (optional)
- Remote preference
- Job sources to search
- Test mode flag (blocks real submissions)
```

#### Step 6: Job Discovery

```
Trigger: Cron job (every 30 min) OR manual trigger
Input:   Active campaign
Output:  JobOffer records

Flow per source:
1. Check campaign.jobSources
2. For each source:
   a. Call source adapter (API, scraper, RSS)
   b. Deduplicate by externalId
   c. Create JobOffer records (status=DISCOVERED)
   d. Log JOB_DISCOVERED for each new offer
3. Queue analysis job for new offers
```

#### Step 7: Job Analysis & Matching

```
Input:  JobOffer (status=DISCOVERED)
Output: Match score, analysis, status update

Flow:
1. Generate job embedding from title + description
2. Calculate cosine similarity with profile embedding
3. Call LLM for detailed analysis:
   - Requirements match
   - Experience alignment
   - Location/salary compatibility
   - Red flags or concerns
4. Compute final match score (0-100)
5. If score >= threshold (default 60):
   - status = MATCHED
   - Create Application record
6. Else:
   - status = REJECTED
7. Log JOB_ANALYZED action

LLM Analysis Prompt (simplified):
  "Compare this job offer against the candidate profile.
   Score the match from 0-100.
   Identify matching and missing requirements.
   Return structured JSON."
```

#### Step 8: Document Generation

```
Input:  Application (status=PENDING_GENERATION)
Output: GeneratedDocument records (CV + cover letter)

Flow:
1. Fetch profile, job offer, baseline CV
2. Generate customized CV:
   - Emphasize relevant experience
   - Adjust skills ordering
   - Tailor summary to role
3. Generate cover letter:
   - Use motivation text as base
   - Address specific job requirements
   - Company-specific personalization
4. Convert to PDF (using puppeteer or similar)
5. Store files, create GeneratedDocument records
6. Log DOCUMENT_GENERATED actions
7. Update application status

LLM Generation Prompt (simplified):
  "Generate a customized CV for this job application.
   Base CV: [profile data]
   Target Job: [job details]
   Return JSON matching CV schema."
```

#### Step 9: Application Method Determination

```
Input:  JobOffer, JobSource configuration
Output: ApplicationMethod

Decision logic:
1. If source.supportsAutoApply AND platform supports API:
   → AUTO_API (rare, e.g., some ATS systems)

2. If source allows form automation AND user enabled it:
   → AUTO_FORM (requires browser automation setup)

3. If job listing has application email:
   → EMAIL

4. Default:
   → ASSISTED (user must click apply manually)

For POC: Most applications will be ASSISTED or EMAIL.
AUTO_FORM requires Playwright setup and is opt-in.
```

#### Step 10: Application Submission

```
Varies by method:

AUTO_API:
- Call external API with CV and cover letter
- Status: SUBMITTED or SUBMISSION_FAILED

AUTO_FORM:
- Launch headless browser
- Navigate to application page
- Fill form fields
- Attach documents
- Submit (if not test mode)
- Status: SUBMITTED or SUBMISSION_FAILED

EMAIL:
- Compose email with attachments
- Queue via email service
- If testMode: log only, don't send
- Status: SUBMITTED (on send) or QUEUED

ASSISTED:
- Set status = PENDING_REVIEW
- Show in dashboard with "Confirm & Apply" button
- User reviews documents, clicks confirm
- System records confirmation timestamp
- User applies externally
- Mark as SUBMITTED when user confirms completion

All methods log APPLICATION_SUBMITTED or APPLICATION_FAILED
```

---

## 4. API Surface Overview

### Base URL Structure

```
Development: http://localhost:3001/api
Production:  https://api.tripalium.example.com/api

OpenAPI Spec: GET /api/docs
```

### Authentication

All endpoints except `/auth/*` require authentication.

```http
# Session-based (from frontend)
Cookie: next-auth.session-token=...

# API Key (for programmatic access)
X-API-Key: trpl_abc123def456...
```

### Endpoint Categories

#### Auth Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/signup` | Create account | None |
| POST | `/auth/login` | Email/password login | None |
| POST | `/auth/logout` | End session | Session |
| GET | `/auth/me` | Get current user | Any |

#### API Key Management

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/api-keys` | List user's API keys | Session | |
| POST | `/api-keys` | Create new API key | Session | |
| DELETE | `/api-keys/:id` | Revoke API key | Session | |
| GET | `/api-keys/:id/usage` | Get usage stats | Session | |

#### Profile & CV Endpoints

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/profile` | Get user profile | Any | ✓ |
| PUT | `/profile` | Update profile | Write+ | ✓ |
| POST | `/profile/photo` | Upload photo | Write+ | |
| GET | `/profile/embedding` | Get embedding vector | Read+ | |
| POST | `/cvs/upload` | Upload CV PDF | Write+ | ✓ |
| GET | `/cvs` | List user's CVs | Read+ | ✓ |
| GET | `/cvs/:id` | Get CV details | Read+ | ✓ |
| POST | `/cvs/:id/parse` | Trigger parsing | Write+ | ✓ |
| GET | `/cvs/:id/parsed-data` | Get parsed JSON | Read+ | ✓ |
| PUT | `/cvs/:id/baseline` | Set as baseline | Write+ | ✓ |
| DELETE | `/cvs/:id` | Delete CV | Write+ | |

#### Work Experience, Education, Skills, Languages

Standard CRUD on `/profile/experiences`, `/profile/education`, `/profile/skills`, `/profile/languages`.

#### Campaign Endpoints

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/campaigns` | List campaigns | Read+ | ✓ |
| POST | `/campaigns` | Create campaign | Write+ | ✓ |
| GET | `/campaigns/:id` | Get campaign details | Read+ | ✓ |
| PUT | `/campaigns/:id` | Update campaign | Write+ | ✓ |
| POST | `/campaigns/:id/start` | Start campaign | Write+ | ✓ |
| POST | `/campaigns/:id/pause` | Pause campaign | Write+ | ✓ |
| POST | `/campaigns/:id/stop` | Stop campaign | Write+ | ✓ |
| DELETE | `/campaigns/:id` | Delete campaign | Write+ | |

#### Job Sources

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/job-sources` | List available sources | Read+ | ✓ |
| GET | `/job-sources/:id` | Get source details | Read+ | |

#### Job Offers

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/campaigns/:id/jobs` | List jobs for campaign | Read+ | ✓ |
| GET | `/jobs/:id` | Get job details | Read+ | ✓ |
| POST | `/jobs/:id/reject` | Manually reject job | Write+ | ✓ |
| POST | `/jobs/:id/retry-analysis` | Re-run analysis | Write+ | ✓ |

#### Applications

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/applications` | List all applications | Read+ | ✓ |
| GET | `/applications/:id` | Get application details | Read+ | ✓ |
| POST | `/applications/:id/confirm` | Confirm assisted apply | Write+ | ✓ |
| POST | `/applications/:id/withdraw` | Withdraw application | Write+ | ✓ |
| POST | `/applications/:id/mark-submitted` | Mark as submitted | Write+ | ✓ |
| POST | `/applications/:id/regenerate` | Regenerate documents | Write+ | ✓ |

#### Generated Documents

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/applications/:id/documents` | List generated docs | Read+ | ✓ |
| GET | `/documents/:id` | Get document metadata | Read+ | ✓ |
| GET | `/documents/:id/download` | Download PDF | Read+ | ✓ |
| GET | `/documents/:id/prompt` | Get generation prompt | Read+ | ✓ |

#### Email Records

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/applications/:id/emails` | List emails for app | Read+ | ✓ |
| GET | `/emails/:id` | Get email details | Read+ | ✓ |
| POST | `/emails/:id/retry` | Retry failed email | Write+ | ✓ |

#### Action Logs (Audit Trail)

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| GET | `/logs` | Query action logs | Read+ | ✓ |
| GET | `/logs/:id` | Get log entry details | Read+ | ✓ |

Query parameters for `/logs`:
- `entityType`: Filter by entity (user, campaign, job, application, etc.)
- `entityId`: Filter by specific entity ID
- `action`: Filter by action type
- `from`, `to`: Date range
- `limit`, `offset`: Pagination

#### Test/Debug Endpoints (Test scope required)

| Method | Path | Description | Auth | E2E |
|--------|------|-------------|------|-----|
| POST | `/test/trigger-discovery` | Force job discovery | Test | ✓ |
| POST | `/test/trigger-analysis` | Force analysis run | Test | ✓ |
| POST | `/test/trigger-generation` | Force doc generation | Test | ✓ |
| POST | `/test/simulate-application` | Simulate full flow | Test | ✓ |
| GET | `/test/queue-status` | Get background job status | Test | ✓ |
| POST | `/test/clear-data` | Clear test user data | Test | ✓ |

### API Key Scopes and Permissions

```
READ:   GET endpoints only
WRITE:  GET + POST/PUT/DELETE on user's own data
ADMIN:  All endpoints + user management
TEST:   Same as WRITE + test endpoints + forces testMode=true
```

### Test Mode Behavior

When `testMode=true` (set on campaign or forced by TEST scope):

| Component | Normal Mode | Test Mode |
|-----------|-------------|-----------|
| Job Discovery | Fetches from real sources | Fetches from real sources |
| Job Analysis | Full LLM analysis | Full LLM analysis |
| Doc Generation | Full LLM generation | Full LLM generation |
| Email Sending | Sends real emails | Logs email, does not send |
| Form Submission | Submits forms | Logs submission, does not submit |
| API Submission | Calls external APIs | Logs call, does not execute |

All actions still logged with `testMode: true` in metadata.

### Example E2E Test Flow (curl)

```bash
# 1. Create API key (via UI or admin endpoint)
API_KEY="trpl_test_abc123..."

# 2. Upload CV
curl -X POST http://localhost:3001/api/cvs/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@resume.pdf"
# Response: { "id": "cv_123", "status": "pending" }

# 3. Trigger parsing
curl -X POST http://localhost:3001/api/cvs/cv_123/parse \
  -H "X-API-Key: $API_KEY"
# Response: { "jobId": "parse_456" }

# 4. Poll for completion
curl http://localhost:3001/api/cvs/cv_123 \
  -H "X-API-Key: $API_KEY"
# Response: { "id": "cv_123", "parsingStatus": "completed", ... }

# 5. Create campaign (testMode enabled)
curl -X POST http://localhost:3001/api/campaigns \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign",
    "targetRoles": ["Software Engineer"],
    "targetLocations": ["Remote"],
    "jobSources": ["indeed", "linkedin"],
    "testMode": true
  }'
# Response: { "id": "camp_789", "status": "draft" }

# 6. Start campaign
curl -X POST http://localhost:3001/api/campaigns/camp_789/start \
  -H "X-API-Key: $API_KEY"

# 7. Trigger discovery manually
curl -X POST http://localhost:3001/api/test/trigger-discovery \
  -H "X-API-Key: $API_KEY" \
  -d '{ "campaignId": "camp_789" }'

# 8. Check discovered jobs
curl http://localhost:3001/api/campaigns/camp_789/jobs \
  -H "X-API-Key: $API_KEY"

# 9. Check applications
curl http://localhost:3001/api/applications?campaignId=camp_789 \
  -H "X-API-Key: $API_KEY"

# 10. Download generated document
curl http://localhost:3001/api/documents/doc_abc/download \
  -H "X-API-Key: $API_KEY" \
  -o generated_cv.pdf

# 11. Query logs
curl "http://localhost:3001/api/logs?entityType=application&limit=50" \
  -H "X-API-Key: $API_KEY"
```

---

## 5. Automation Levels

### Fully Automated Steps

These steps run without user intervention:

| Step | Automation Level | Notes |
|------|------------------|-------|
| CV Parsing | **Full** | Triggered on upload, runs in background |
| Embedding Generation | **Full** | Triggered on profile save |
| Job Discovery | **Full** | Scheduled or manual trigger |
| Job Analysis | **Full** | Runs for each discovered job |
| Match Scoring | **Full** | Embedding similarity + LLM analysis |
| Document Generation | **Full** | Runs for matched jobs |
| Email Queuing | **Full** | Prepared with throttling |
| Action Logging | **Full** | Every action recorded |

### Assisted (Copilot) Steps

These steps require explicit user confirmation:

| Step | Why Assisted | User Action Required |
|------|--------------|---------------------|
| Profile Review | OCR may have errors | Review and correct data |
| Application Confirm | Legal/accuracy liability | Click "Confirm & Apply" |
| Manual Apply | Platform doesn't allow automation | Click provided link, apply |
| Document Review | User may want to edit | Download, review, optionally regenerate |

### Limitations of This POC

#### Technical Limitations

1. **No real-time job board integration**: Most job boards (LinkedIn, Indeed) don't provide public APIs. POC will use:
   - RSS feeds where available
   - Manual job entry
   - Mock data for testing
   - Real scraping requires legal review and is platform-specific

2. **No browser automation by default**: AUTO_FORM requires Playwright setup and is disabled by default due to:
   - Brittleness of form automation
   - Anti-bot detection on job sites
   - Legal considerations

3. **Single-instance only**: No horizontal scaling, no distributed job processing

4. **Basic email**: SMTP only, no advanced deliverability features

5. **No real-time notifications**: Dashboard requires refresh (no WebSockets)

#### Scope Limitations

1. **No payment/billing**: Free for POC users
2. **No team features**: Single user per account
3. **No mobile app**: Web only
4. **No internationalization**: English UI only
5. **No resume templates**: Single output format
6. **No interview scheduling**: Out of scope
7. **No application tracking sync**: Manual status updates only

#### Security Considerations

1. **API keys stored hashed**: Cannot be retrieved, only regenerated
2. **Rate limiting**: Basic rate limiting on all endpoints
3. **No PII export**: GDPR features not implemented
4. **Test mode isolation**: Test data clearly marked but not strictly isolated

---

## 6. Structured Output Schemas

### CV Parsing Schema (OpenAI Vision)

```typescript
interface ParsedCV {
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
    startDate: string; // YYYY-MM or YYYY
    endDate: string | null; // null = present
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
    category: string | null; // e.g., "Programming", "Languages", "Tools"
    level: string | null; // e.g., "Expert", "Intermediate"
  }>;
  languages: Array<{
    name: string;
    proficiency: string; // e.g., "Native", "Fluent", "Intermediate"
  }>;
  certifications: Array<{
    name: string;
    issuer: string | null;
    date: string | null;
  }>;
  extractionConfidence: number; // 0-100
  extractionNotes: string | null; // Any issues encountered
}
```

### Job Analysis Schema

```typescript
interface JobAnalysis {
  matchScore: number; // 0-100
  matchBreakdown: {
    skillsMatch: number; // 0-100
    experienceMatch: number; // 0-100
    educationMatch: number; // 0-100
    locationMatch: number; // 0-100
    salaryMatch: number | null; // 0-100 or null if not specified
  };
  matchingRequirements: string[];
  missingRequirements: string[];
  redFlags: string[];
  recommendation: 'strong_match' | 'good_match' | 'possible_match' | 'weak_match' | 'no_match';
  reasoning: string;
}
```

### Generated CV Schema

```typescript
interface GeneratedCV {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedIn: string | null;
  };
  summary: string; // Tailored to job
  workExperience: Array<{
    company: string;
    title: string;
    location: string | null;
    startDate: string;
    endDate: string | null;
    highlights: string[]; // Reordered/emphasized for job
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string | null;
    endDate: string | null;
  }>;
  skills: string[]; // Reordered for relevance
  languages: Array<{
    name: string;
    proficiency: string;
  }>;
}
```

### Cover Letter Schema

```typescript
interface GeneratedCoverLetter {
  recipientName: string | null;
  recipientTitle: string | null;
  companyName: string;
  opening: string;
  body: string[]; // Paragraphs
  closing: string;
  signature: string;
}
```

---

## 7. Project Structure

```
tripalium/
├── apps/
│   ├── web/                    # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/         # Auth pages (login, signup)
│   │   │   ├── (dashboard)/    # Protected pages
│   │   │   │   ├── profile/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── applications/
│   │   │   │   └── settings/
│   │   │   ├── api/
│   │   │   │   └── auth/       # Auth.js routes
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/             # shadcn components
│   │   │   ├── cv-editor/
│   │   │   ├── campaign/
│   │   │   └── application/
│   │   ├── lib/
│   │   │   ├── api-client.ts
│   │   │   └── auth.ts
│   │   └── package.json
│   │
│   └── api/                    # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.controller.ts
│       │   │   ├── auth.service.ts
│       │   │   ├── api-key.guard.ts
│       │   │   └── api-key.service.ts
│       │   ├── profile/
│       │   ├── cv/
│       │   │   ├── cv.controller.ts
│       │   │   ├── cv.service.ts
│       │   │   └── cv-parser.service.ts
│       │   ├── campaign/
│       │   ├── job/
│       │   │   ├── job.controller.ts
│       │   │   ├── job.service.ts
│       │   │   ├── job-discovery.service.ts
│       │   │   ├── job-analysis.service.ts
│       │   │   └── sources/
│       │   │       ├── source.interface.ts
│       │   │       ├── rss.source.ts
│       │   │       ├── manual.source.ts
│       │   │       └── mock.source.ts
│       │   ├── application/
│       │   │   ├── application.controller.ts
│       │   │   ├── application.service.ts
│       │   │   └── document-generator.service.ts
│       │   ├── email/
│       │   │   ├── email.service.ts
│       │   │   └── email.queue.ts
│       │   ├── llm/
│       │   │   ├── llm.module.ts
│       │   │   ├── openai.service.ts
│       │   │   └── prompts/
│       │   ├── queue/
│       │   │   ├── queue.module.ts
│       │   │   └── processors/
│       │   ├── log/
│       │   │   ├── log.service.ts
│       │   │   └── log.controller.ts
│       │   └── test/
│       │       └── test.controller.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   └── migrations/
│       └── package.json
│
├── packages/
│   └── shared/                 # Shared types and schemas
│       ├── src/
│       │   ├── types/
│       │   └── schemas/
│       └── package.json
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.dev.yml
│   └── Dockerfile.api
│
├── scripts/
│   ├── setup.sh
│   └── seed.ts
│
├── storage/                    # Local file storage (gitignored)
│   ├── cvs/
│   ├── documents/
│   └── temp/
│
├── .env.example
├── package.json                # Workspace root
├── turbo.json                  # Turborepo config
└── README.md
```

---

## 8. Development & Deployment

### Local Development

```bash
# Prerequisites
- Node.js 20+
- pnpm
- Docker (for PostgreSQL, Redis, Mailhog)

# Setup
pnpm install
cp .env.example .env
docker-compose -f docker/docker-compose.dev.yml up -d
pnpm db:migrate
pnpm db:seed

# Run
pnpm dev  # Starts both frontend (3000) and backend (3001)

# Test
pnpm test           # Unit tests
pnpm test:e2e       # E2E tests with API
```

### Production Deployment (Single VPS)

```bash
# docker-compose.yml handles:
# - PostgreSQL with pgvector
# - Redis (for job queue)
# - API (NestJS)
# - Web (Next.js)
# - Nginx (reverse proxy)

docker-compose up -d
```

### Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/tripalium"

# Auth
NEXTAUTH_SECRET="random-secret"
NEXTAUTH_URL="http://localhost:3000"

# OpenAI
OPENAI_API_KEY="sk-..."

# Email
SMTP_HOST="localhost"
SMTP_PORT="1025"
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="noreply@tripalium.example.com"

# Storage
STORAGE_TYPE="local"  # or "s3"
STORAGE_PATH="./storage"

# Feature Flags
ENABLE_AUTO_FORM=false  # Browser automation
ENABLE_REAL_EMAIL=false # Send real emails (false = dry run)
```

---

## 9. Next Implementation Steps

### Phase 1: Foundation (Current)
- [x] Architecture document
- [ ] Initialize monorepo with Turborepo
- [ ] Set up NestJS backend with Prisma
- [ ] Set up Next.js frontend with shadcn
- [ ] Implement database schema
- [ ] Basic auth (email/password)
- [ ] API key infrastructure

### Phase 2: Core Profile
- [ ] CV upload endpoint
- [ ] Vision-based parsing integration
- [ ] Profile CRUD
- [ ] CV editor UI
- [ ] Embedding generation

### Phase 3: Campaign & Discovery
- [ ] Campaign CRUD
- [ ] Job source adapters (RSS, mock)
- [ ] Job discovery worker
- [ ] Job analysis with LLM
- [ ] Match scoring

### Phase 4: Applications
- [ ] Document generation
- [ ] Application workflow
- [ ] Email service
- [ ] Assisted apply flow
- [ ] Dashboard UI

### Phase 5: Polish & Testing
- [ ] E2E test suite
- [ ] Error handling
- [ ] Rate limiting
- [ ] Documentation
- [ ] Docker deployment

---

*This document serves as the technical foundation for the TripaliumAI POC. It should be updated as implementation progresses and decisions are refined.*
