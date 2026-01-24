# TripaliumAI

Job search automation SaaS — Proof of Concept

## Overview

TripaliumAI automates the job application process:

1. **Upload CV** — PDF parsed via OpenAI Vision
2. **Edit Profile** — Review and enrich extracted data
3. **Launch Campaign** — Define search criteria and job sources
4. **Auto-Discovery** — System finds matching job offers
5. **Smart Matching** — LLM analyzes fit, scores candidates
6. **Doc Generation** — Custom CV and cover letter per job
7. **Apply** — Automated, assisted, or email-based

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind, shadcn/ui |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL 15 + pgvector |
| Auth | Auth.js (email/password) + API keys |
| LLM | OpenAI API (Vision, Chat, Embeddings) |
| Queue | BullMQ + Redis |
| Email | SMTP (Mailhog for dev) |

## Quick Start

```bash
# Prerequisites: Node.js 20+, pnpm, Docker

# Clone and setup
git clone <repo>
cd tripalium
pnpm install
cp .env.example .env  # Configure OpenAI key, etc.

# Start infrastructure
docker-compose -f docker/docker-compose.dev.yml up -d

# Setup database
pnpm db:migrate
pnpm db:seed

# Run development servers
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001
- API Docs: http://localhost:3001/api/docs
- Mailhog: http://localhost:8025

## Project Structure

```
tripalium/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # NestJS backend
├── packages/
│   └── shared/       # Shared types
├── docker/           # Docker configs
├── docs/             # Architecture docs
└── storage/          # File storage (gitignored)
```

## E2E Testing

All features accessible via API for automated testing:

```bash
# Get an API key from the UI or seed data
API_KEY="trpl_test_..."

# Upload and parse CV
curl -X POST http://localhost:3001/api/cvs/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@resume.pdf"

# Create campaign (test mode)
curl -X POST http://localhost:3001/api/campaigns \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","targetRoles":["Engineer"],"testMode":true}'

# Trigger job discovery
curl -X POST http://localhost:3001/api/test/trigger-discovery \
  -H "X-API-Key: $API_KEY"

# Check results
curl http://localhost:3001/api/applications \
  -H "X-API-Key: $API_KEY"
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) — System design, workflows, API surface
- [Database Schema](docs/DATABASE_SCHEMA.md) — Prisma schema with all entities

## Automation Levels

| Step | Level | Notes |
|------|-------|-------|
| CV Parsing | Fully automated | Vision API extraction |
| Job Discovery | Fully automated | Scheduled background job |
| Job Matching | Fully automated | Embeddings + LLM analysis |
| Doc Generation | Fully automated | LLM with structured output |
| Application | **Assisted** | User confirms before submit |
| Email Send | Automated | With throttling, logged |

## Test Mode

When `testMode=true`:
- Jobs are discovered and analyzed normally
- Documents are generated normally
- Emails are logged but **not sent**
- Form submissions are logged but **not executed**

API keys with `TEST` scope force test mode on all operations.

## Limitations (POC Scope)

- Single VPS deployment only
- No real-time notifications (polling)
- No job board API integrations (uses RSS/manual/mock)
- Browser automation disabled by default
- 2-3 users max
- English UI only

## License

Proprietary — Internal POC only
