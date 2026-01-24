# TripaliumAI — Database Schema

This document provides the complete Prisma schema for the POC.

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [vector]
}

// ============================================================================
// AUTHENTICATION & USERS
// ============================================================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  emailVerified DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  profile      Profile?
  apiKeys      ApiKey[]
  cvs          CV[]
  campaigns    Campaign[]
  applications Application[]
  actionLogs   ActionLog[]
  emails       EmailRecord[]

  @@map("users")
}

model ApiKey {
  id         String    @id @default(cuid())
  userId     String
  keyHash    String    @unique  // SHA-256 hash of the key
  keyPrefix  String              // First 8 chars for identification (e.g., "trpl_abc")
  name       String              // User-friendly name
  scope      ApiKeyScope
  lastUsedAt DateTime?
  expiresAt  DateTime?
  revokedAt  DateTime?
  createdAt  DateTime  @default(now())

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([keyHash])
  @@index([userId])
  @@map("api_keys")
}

enum ApiKeyScope {
  READ
  WRITE
  ADMIN
  TEST
}

// ============================================================================
// PROFILE & CV
// ============================================================================

model Profile {
  id              String   @id @default(cuid())
  userId          String   @unique
  firstName       String
  lastName        String
  email           String?  // Professional email (may differ from account)
  phone           String?
  location        String?
  linkedIn        String?
  website         String?
  summary         String?  @db.Text
  photoUrl        String?
  motivationText  String?  @db.Text  // Generic motivation for cover letters

  // Embedding for matching (1536 dimensions for OpenAI ada-002)
  embedding       Unsupported("vector(1536)")?

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  workExperiences WorkExperience[]
  educations      Education[]
  skills          Skill[]
  languages       Language[]
  certifications  Certification[]
  cvs             CV[]

  @@map("profiles")
}

model WorkExperience {
  id          String    @id @default(cuid())
  profileId   String
  company     String
  title       String
  location    String?
  startDate   DateTime
  endDate     DateTime?  // null = currently employed
  description String?    @db.Text
  highlights  String[]   // Key achievements as array
  sortOrder   Int        @default(0)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Relations
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("work_experiences")
}

model Education {
  id          String    @id @default(cuid())
  profileId   String
  institution String
  degree      String
  field       String?
  startDate   DateTime?
  endDate     DateTime?
  gpa         String?
  description String?   @db.Text
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  // Relations
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("educations")
}

model Skill {
  id         String   @id @default(cuid())
  profileId  String
  name       String
  category   String?  // e.g., "Programming", "Frameworks", "Tools", "Soft Skills"
  level      String?  // e.g., "Expert", "Advanced", "Intermediate", "Beginner"
  yearsOfExp Float?
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  // Relations
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("skills")
}

model Language {
  id          String   @id @default(cuid())
  profileId   String
  name        String
  proficiency String   // e.g., "Native", "Fluent", "Professional", "Conversational", "Basic"
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("languages")
}

model Certification {
  id         String    @id @default(cuid())
  profileId  String
  name       String
  issuer     String?
  issueDate  DateTime?
  expiryDate DateTime?
  url        String?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  // Relations
  profile Profile @relation(fields: [profileId], references: [id], onDelete: Cascade)

  @@index([profileId])
  @@map("certifications")
}

model CV {
  id            String        @id @default(cuid())
  userId        String
  profileId     String?
  type          CVType
  fileName      String
  filePath      String        // Relative path in storage
  fileSize      Int           // In bytes
  mimeType      String        @default("application/pdf")
  parsedData    Json?         // Extracted data as JSON
  parsingStatus ParsingStatus @default(PENDING)
  parsingError  String?
  isBaseline    Boolean       @default(false)  // Primary CV for this user
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  // Relations
  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  profile Profile? @relation(fields: [profileId], references: [id])

  @@index([userId])
  @@index([profileId])
  @@map("cvs")
}

enum CVType {
  UPLOADED   // User uploaded
  GENERATED  // System generated for a specific job
}

enum ParsingStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
}

// ============================================================================
// CAMPAIGNS & JOB SOURCES
// ============================================================================

model Campaign {
  id              String         @id @default(cuid())
  userId          String
  name            String
  status          CampaignStatus @default(DRAFT)

  // Search criteria
  targetRoles     String[]       // e.g., ["Software Engineer", "Backend Developer"]
  targetLocations String[]       // e.g., ["Paris", "Remote", "France"]
  contractTypes   String[]       // e.g., ["CDI", "Full-time", "Permanent"]
  salaryMin       Int?
  salaryMax       Int?
  salaryCurrency  String?        @default("EUR")
  remoteOk        Boolean        @default(true)

  // Configuration
  matchThreshold  Int            @default(60)  // Minimum match score (0-100)
  testMode        Boolean        @default(false)
  autoApply       Boolean        @default(false)  // If true, skip confirmation for AUTO methods

  // Timestamps
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  startedAt       DateTime?
  pausedAt        DateTime?
  stoppedAt       DateTime?

  // Relations
  user         User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  jobSources   CampaignJobSource[]
  jobOffers    JobOffer[]
  applications Application[]

  @@index([userId])
  @@index([status])
  @@map("campaigns")
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  FAILED
}

model JobSource {
  id               String    @id @default(cuid())
  name             String    @unique  // e.g., "linkedin", "indeed", "welcometothejungle"
  displayName      String             // e.g., "LinkedIn", "Indeed"
  type             JobSourceType
  baseUrl          String?
  configSchema     Json?              // JSON Schema for source-specific config
  supportsAutoApply Boolean  @default(false)
  isActive         Boolean  @default(true)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  // Relations
  campaigns CampaignJobSource[]
  jobOffers JobOffer[]

  @@map("job_sources")
}

enum JobSourceType {
  API       // Official API integration
  SCRAPER   // Web scraping
  RSS       // RSS/Atom feed
  MANUAL    // Manual entry
  MOCK      // For testing
}

model CampaignJobSource {
  id         String   @id @default(cuid())
  campaignId String
  sourceId   String
  config     Json?    // Source-specific configuration (search params, etc.)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())

  // Relations
  campaign Campaign  @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  source   JobSource @relation(fields: [sourceId], references: [id])

  @@unique([campaignId, sourceId])
  @@map("campaign_job_sources")
}

// ============================================================================
// JOB OFFERS
// ============================================================================

model JobOffer {
  id            String         @id @default(cuid())
  campaignId    String
  jobSourceId   String
  externalId    String         // ID from the source (for deduplication)

  // Job details
  title         String
  company       String
  location      String?
  description   String         @db.Text
  requirements  String[]       // Extracted requirements
  salary        String?        // As displayed (may not be structured)
  salaryMin     Int?
  salaryMax     Int?
  salaryCurrency String?
  contractType  String?
  remoteType    String?        // "remote", "hybrid", "onsite"
  url           String         // Link to original posting

  // Matching
  matchScore    Int?           // 0-100
  matchAnalysis Json?          // Detailed analysis from LLM
  embedding     Unsupported("vector(1536)")?

  // Status
  status        JobOfferStatus @default(DISCOVERED)

  // Timestamps
  discoveredAt  DateTime       @default(now())
  analyzedAt    DateTime?
  expiresAt     DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  // Relations
  campaign    Campaign     @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  jobSource   JobSource    @relation(fields: [jobSourceId], references: [id])
  application Application?

  @@unique([campaignId, externalId])
  @@index([campaignId])
  @@index([jobSourceId])
  @@index([status])
  @@map("job_offers")
}

enum JobOfferStatus {
  DISCOVERED     // Found, not yet analyzed
  ANALYZING      // Being processed
  MATCHED        // Good fit, proceeding
  REJECTED       // Not a good fit
  APPLIED        // Application submitted
  EXPIRED        // No longer available
  ERROR          // Processing failed
}

// ============================================================================
// APPLICATIONS
// ============================================================================

model Application {
  id              String            @id @default(cuid())
  jobOfferId      String            @unique
  userId          String
  campaignId      String

  // Status tracking
  status          ApplicationStatus @default(PENDING_GENERATION)
  method          ApplicationMethod?

  // Confirmation workflow
  requiresConfirm Boolean           @default(true)
  confirmedAt     DateTime?
  confirmedBy     String?           // "user" or API key name

  // Submission
  submittedAt     DateTime?
  submissionNotes String?           @db.Text

  // Response tracking
  responseStatus  String?           // e.g., "interview", "rejected", "no_response"
  responseAt      DateTime?
  responseNotes   String?           @db.Text

  // Metadata
  testMode        Boolean           @default(false)
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  // Relations
  user       User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  campaign   Campaign            @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  jobOffer   JobOffer            @relation(fields: [jobOfferId], references: [id], onDelete: Cascade)
  documents  GeneratedDocument[]
  emails     EmailRecord[]

  @@index([userId])
  @@index([campaignId])
  @@index([status])
  @@map("applications")
}

enum ApplicationStatus {
  PENDING_GENERATION    // Waiting for document generation
  GENERATING            // Documents being created
  GENERATION_FAILED     // Document generation failed
  PENDING_REVIEW        // Needs user confirmation
  READY_TO_SUBMIT       // Approved, queued for submission
  SUBMITTING            // In progress
  SUBMITTED             // Successfully sent
  SUBMISSION_FAILED     // Could not submit
  WITHDRAWN             // User cancelled
}

enum ApplicationMethod {
  AUTO_API      // Direct API submission
  AUTO_FORM     // Browser automation
  ASSISTED      // User confirms and applies
  EMAIL         // Email-based application
  EXTERNAL      // User applies via external link
}

// ============================================================================
// GENERATED DOCUMENTS
// ============================================================================

model GeneratedDocument {
  id            String       @id @default(cuid())
  applicationId String
  userId        String
  type          DocumentType

  // File info
  fileName      String
  filePath      String
  fileSize      Int
  mimeType      String       @default("application/pdf")

  // Generation metadata
  promptUsed    String       @db.Text  // Full prompt for reproducibility
  modelUsed     String                  // e.g., "gpt-4-turbo"
  inputContext  Json                    // Profile + job data used
  generatedJson Json?                   // Structured output before PDF

  // Versioning
  version       Int          @default(1)
  isLatest      Boolean      @default(true)

  // Timestamps
  generatedAt   DateTime     @default(now())
  createdAt     DateTime     @default(now())

  // Relations
  application Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)

  @@index([applicationId])
  @@index([userId])
  @@map("generated_documents")
}

enum DocumentType {
  CV
  COVER_LETTER
}

// ============================================================================
// EMAIL
// ============================================================================

model EmailRecord {
  id            String      @id @default(cuid())
  applicationId String?
  userId        String

  // Email content
  toAddress     String
  fromAddress   String
  subject       String
  bodyHtml      String      @db.Text
  bodyText      String      @db.Text
  attachments   Json        // Array of { name, path, mimeType }

  // Status
  status        EmailStatus @default(QUEUED)
  sentAt        DateTime?
  errorMessage  String?
  retryCount    Int         @default(0)

  // Metadata
  dryRun        Boolean     @default(false)  // If true, was not actually sent
  messageId     String?                       // From SMTP response

  // Timestamps
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Relations
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  application Application? @relation(fields: [applicationId], references: [id])

  @@index([applicationId])
  @@index([userId])
  @@index([status])
  @@map("email_records")
}

enum EmailStatus {
  QUEUED
  SENDING
  SENT
  FAILED
  BOUNCED
}

// ============================================================================
// ACTION LOGS (AUDIT TRAIL)
// ============================================================================

model ActionLog {
  id           String   @id @default(cuid())
  userId       String?

  // What happened
  entityType   String   // e.g., "user", "cv", "campaign", "job_offer", "application"
  entityId     String?
  action       String   // e.g., "cv.uploaded", "campaign.started", "application.submitted"
  status       String   @default("success")  // "success", "failure", "pending"

  // Details
  metadata     Json?    // Action-specific data
  errorMessage String?  @db.Text

  // Context
  ipAddress    String?
  userAgent    String?
  apiKeyId     String?  // If action was via API key
  testMode     Boolean  @default(false)

  // Timestamp
  createdAt    DateTime @default(now())

  // Relations
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([entityType, entityId])
  @@index([action])
  @@index([createdAt])
  @@map("action_logs")
}

// ============================================================================
// BACKGROUND JOBS (FOR DEBUGGING/MONITORING)
// ============================================================================

model BackgroundJob {
  id          String   @id @default(cuid())
  type        String   // e.g., "cv.parse", "job.discover", "document.generate"
  status      JobStatus @default(PENDING)

  // Input/Output
  payload     Json
  result      Json?
  errorMessage String? @db.Text

  // Execution
  priority    Int      @default(0)
  attempts    Int      @default(0)
  maxAttempts Int      @default(3)

  // Timing
  scheduledAt DateTime @default(now())
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([type, status])
  @@index([scheduledAt])
  @@map("background_jobs")
}

enum JobStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
}
```

## Key Design Decisions

### 1. Vector Embeddings (pgvector)

Using `Unsupported("vector(1536)")` for embeddings because:
- OpenAI's `text-embedding-ada-002` produces 1536-dimensional vectors
- pgvector extension handles similarity search efficiently
- No need for external vector DB at POC scale

Similarity queries use cosine distance:
```sql
SELECT * FROM job_offers
ORDER BY embedding <=> profile_embedding
LIMIT 10;
```

### 2. JSON Fields for Flexibility

Several fields use `Json` type:
- `CV.parsedData`: Full extraction result, schema may evolve
- `JobOffer.matchAnalysis`: LLM analysis output
- `GeneratedDocument.inputContext`: Snapshot of data used
- `BackgroundJob.payload/result`: Job-specific data

This allows iteration without migrations during POC.

### 3. Soft Deletes Not Used

For POC simplicity:
- Hard deletes with `onDelete: Cascade`
- Action logs provide audit trail
- GDPR export/delete not in POC scope

### 4. Status Enums

Explicit status enums for every state machine:
- Makes queries straightforward
- Self-documenting
- TypeScript type safety

### 5. Timestamps Convention

All entities have:
- `createdAt`: When record was created
- `updatedAt`: Last modification

Domain-specific timestamps added as needed:
- `startedAt`, `stoppedAt` for campaigns
- `sentAt` for emails
- `generatedAt` for documents

## Indexes

Optimized for common query patterns:
- User lookups by ID and email
- API key lookup by hash
- Campaign filtering by status
- Job offers by campaign and status
- Applications by user and status
- Logs by entity, action, and time

## Migration Notes

For initial setup:
```bash
# Enable pgvector extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS vector;

# Generate and run migrations
npx prisma migrate dev --name init
```

For production:
```bash
npx prisma migrate deploy
```
