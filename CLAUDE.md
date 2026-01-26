# CLAUDE.md - TripaliumAI Project Guide

## Deployment Information

- **Production URL:** https://tripalium.projets.work
- **Server IP:** 91.107.207.5
- **Server User:** root
- **Hosting:** Hetzner
- **Container Registry:** ghcr.io (GitHub Container Registry) - **PRIVATE**
- **GitHub PAT (read:packages):** Stored in `/root/.docker/config.json` on server
- **Server Architecture:** ARM64 (aarch64)

### CI/CD Architecture

```
GitHub Push → GitHub Actions → ghcr.io → Watchtower (auto-pull) → Production
```

1. **Push to master** triggers GitHub Actions workflow
2. **GitHub Actions** builds Docker images and pushes to ghcr.io
3. **Watchtower** on production server polls every 5 minutes for new images
4. **Auto-update** pulls new images and restarts containers

### Automatic Deployment (Default)

Deployments happen automatically when you push to `master`:
- GitHub Actions builds `tripalium-api` and `tripalium-web` images
- Images are tagged with `:latest` and `:sha-<commit>`
- Watchtower on the server detects and deploys new images

### Manual Deployment (If Needed)

```bash
# SSH to server
ssh root@91.107.207.5

# Force pull and restart
cd /opt/tripalium
docker compose pull
docker compose up -d
```

### Rollback

```bash
# SSH to server, then:
cd /opt/tripalium

# Stop current containers
docker compose stop api web

# Pull specific version by commit SHA
docker pull ghcr.io/axiodev/tripalium-api:sha-abc123
docker pull ghcr.io/axiodev/tripalium-web:sha-abc123

# Tag as latest and restart
docker tag ghcr.io/axiodev/tripalium-api:sha-abc123 ghcr.io/axiodev/tripalium-api:latest
docker tag ghcr.io/axiodev/tripalium-web:sha-abc123 ghcr.io/axiodev/tripalium-web:latest
docker compose up -d
```

### First-Time Server Setup

Run the setup script on a fresh server:
```bash
curl -sL https://raw.githubusercontent.com/AxioDev/TripaliumAI/master/deploy/server-setup.sh | bash
```

Or manually:
1. Copy `docker-compose.prod.yml` to `/opt/tripalium/docker-compose.yml`
2. Copy `Caddyfile` to `/opt/tripalium/Caddyfile`
3. Create `.env` from `deploy/.env.template`
4. Set up Docker registry auth: `docker login ghcr.io`
5. Run: `docker compose up -d`

### Key Files

| File | Purpose |
|------|---------|
| `.github/workflows/build.yml` | CI pipeline (build + push images) |
| `docker-compose.prod.yml` | Production compose with registry images |
| `deploy/server-setup.sh` | One-time server initialization |
| `deploy/.env.template` | Environment variable template |

---

## Project Overview

TripaliumAI is an automated job application platform that helps users find and apply to jobs. The system discovers job opportunities, matches them against user profiles, generates application documents (CVs, cover letters), and can auto-submit applications.

## Architecture

```
TripaliumAI/
├── apps/
│   ├── web/          # Next.js frontend (this is the main UI)
│   └── api/          # Backend API service
├── packages/         # Shared packages
├── docs/             # Documentation
└── docker/           # Docker configurations
```

## Tech Stack

### Frontend (`apps/web`)
- **Framework:** Next.js 14 with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI primitives with shadcn/ui patterns
- **State Management:** React hooks + custom `useApi` / `useMutation` hooks
- **Authentication:** NextAuth.js

### Key Dependencies
- `@radix-ui/*` - Headless UI components (dialog, select, tooltip, etc.)
- `date-fns` - Date formatting
- `lucide-react` - Icons

## File Structure Conventions

### Dashboard Pages
All dashboard pages follow the pattern:
```
apps/web/src/app/(dashboard)/dashboard/[feature]/page.tsx
```

### UI Components
Reusable UI components live in:
```
apps/web/src/components/ui/
```

### API Client
API calls are centralized in:
```
apps/web/src/lib/api-client.ts
```

## Key Concepts

### Campaigns
A campaign defines job search criteria:
- Target roles (e.g., "Frontend Developer")
- Target locations (e.g., "Paris, France")
- Contract types, salary range, remote preferences
- Match threshold (0-100%)
- Practice mode (test without sending real applications)

**Statuses:** DRAFT → ACTIVE → PAUSED → COMPLETED

### Job Offers
Jobs discovered by campaigns:
- **DISCOVERED** - Newly found job
- **ANALYZING** - Being evaluated against user profile
- **MATCHED** - Good fit based on threshold
- **REJECTED** - User marked as not interested
- **APPLIED** - Application submitted

### Applications
Generated applications for matched jobs:
- **PENDING_GENERATION** - Waiting for document creation
- **GENERATING** - Creating CV/cover letter
- **PENDING_REVIEW** - Ready for user review
- **READY_TO_SUBMIT** - Approved by user
- **SUBMITTING** - Being sent
- **SUBMITTED** - Successfully sent
- **WITHDRAWN** - User cancelled

### CVs
User uploads PDF resumes which are parsed to extract:
- Personal info, work experience, education, skills
- Used to generate tailored application documents

**Parsing statuses:** PENDING → PROCESSING → COMPLETED/FAILED

## Code Patterns

### API Hooks
```tsx
// Fetching data
const { data, isLoading, refetch } = useApi(() => api.list());

// Mutations
const mutation = useMutation(
  (id: string) => api.delete(id),
  {
    onSuccess: () => { refetch(); toast({ title: 'Deleted' }); },
    onError: () => { toast({ variant: 'destructive', ... }); }
  }
);
```

### Toast Notifications
```tsx
const { toast } = useToast();
toast({
  title: 'Success',
  description: 'Action completed.',
  variant: 'default' | 'destructive'
});
```

### Delete Confirmations
Use AlertDialog for destructive actions:
```tsx
const [deleteId, setDeleteId] = useState<string | null>(null);

// Button triggers dialog
<Button onClick={() => setDeleteId(item.id)}>Delete</Button>

// AlertDialog handles confirmation
<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
  ...
</AlertDialog>
```

### Status Badges
Define status configs for consistent styling:
```tsx
const statusConfig: Record<string, { label: string; color: string; icon: ReactNode }> = {
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock /> },
  // ...
};
```

## UX Best Practices

### 1. User-Friendly Terminology
- Use "Practice Mode" instead of "Test Mode"
- Use human-readable status labels ("Creating documents..." not "PENDING_GENERATION")
- Hide technical details (API types, internal IDs) from users

### 2. Progressive Disclosure
- Hide advanced options behind expandable sections
- Show only essential fields by default
- Use tooltips for additional context

### 3. Confirm Destructive Actions
- Always use AlertDialog before deleting items
- Explain consequences clearly
- Provide cancel option

### 4. Provide Feedback
- Show loading states (spinners, progress bars)
- Display success/error toasts
- Add contextual help text
- Show estimated times for long operations

### 5. Guide New Users
- Use numbered checklists for onboarding
- Show completion indicators (checkmarks)
- Prompt next actions clearly
- Display empty states with calls-to-action

### 6. Handle Errors Gracefully
- Show error states with retry buttons
- Distinguish between empty and error states
- Provide helpful error messages

## Running the Project

```bash
# Install dependencies
cd apps/web && npm install

# Development server
npm run dev

# Build for production
npm run build

# Type checking
npx tsc --noEmit
```

## Common Tasks

### Adding a New Dashboard Page
1. Create `apps/web/src/app/(dashboard)/dashboard/[feature]/page.tsx`
2. Add `'use client';` directive at top
3. Import UI components from `@/components/ui/`
4. Use `useApi` for data fetching
5. Follow existing page patterns for consistency

### Adding a New UI Component
1. Create in `apps/web/src/components/ui/`
2. Use Radix UI primitives when available
3. Apply Tailwind classes with `cn()` utility
4. Export named components

### Updating Status Labels
1. Find the `statusConfig` object in the relevant page
2. Update `label` values to user-friendly text
3. Update corresponding filter dropdowns

## Environment Variables

See `.env.example` for required configuration:
- API endpoints
- Authentication secrets
- Feature flags
