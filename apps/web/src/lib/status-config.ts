// Shared status color configurations used across pages

// Campaign statuses
export const campaignStatusColors: Record<string, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
  ACTIVE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  COMPLETED: 'bg-sky-50 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
  FAILED: 'bg-rose-50 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
};

export const campaignStatusKeyMap: Record<string, string> = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Application statuses
export const applicationStatusColors: Record<string, string> = {
  PENDING_GENERATION: 'bg-sky-50 text-sky-700',
  GENERATING: 'bg-sky-50 text-sky-700',
  GENERATION_FAILED: 'bg-rose-50 text-rose-700',
  PENDING_REVIEW: 'bg-amber-50 text-amber-700',
  READY_TO_SUBMIT: 'bg-emerald-50 text-emerald-700',
  SUBMITTING: 'bg-zinc-100 text-zinc-700',
  SUBMITTED: 'bg-emerald-50 text-emerald-700',
  SUBMISSION_FAILED: 'bg-rose-50 text-rose-700',
  WITHDRAWN: 'bg-zinc-100 text-zinc-500',
};

export const applicationStatusKeyMap: Record<string, string> = {
  PENDING_GENERATION: 'pendingGeneration',
  GENERATING: 'generating',
  GENERATION_FAILED: 'generationFailed',
  PENDING_REVIEW: 'pendingReview',
  READY_TO_SUBMIT: 'readyToSubmit',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  SUBMISSION_FAILED: 'submissionFailed',
  WITHDRAWN: 'withdrawn',
};

// Job statuses
export const jobStatusColors: Record<string, string> = {
  DISCOVERED: 'bg-sky-50 text-sky-700',
  ANALYZING: 'bg-amber-50 text-amber-700',
  MATCHED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-zinc-100 text-zinc-500',
  APPLIED: 'bg-zinc-100 text-zinc-700',
  EXPIRED: 'bg-rose-50 text-rose-700',
  ERROR: 'bg-rose-50 text-rose-700',
};

// Match score color helper
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-sky-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-rose-500';
}

export function getMatchScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-emerald-50 text-emerald-700';
  if (score >= 60) return 'bg-sky-50 text-sky-700';
  if (score >= 40) return 'bg-amber-50 text-amber-700';
  return 'bg-rose-50 text-rose-700';
}
