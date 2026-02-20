// Shared status color configurations used across pages

// Campaign statuses
export const campaignStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  PAUSED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  COMPLETED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
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
  PENDING_GENERATION: 'bg-blue-100 text-blue-800',
  GENERATING: 'bg-blue-100 text-blue-800',
  GENERATION_FAILED: 'bg-red-100 text-red-800',
  PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
  READY_TO_SUBMIT: 'bg-green-100 text-green-800',
  SUBMITTING: 'bg-purple-100 text-purple-800',
  SUBMITTED: 'bg-green-100 text-green-800',
  SUBMISSION_FAILED: 'bg-red-100 text-red-800',
  WITHDRAWN: 'bg-gray-100 text-gray-800',
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
  DISCOVERED: 'bg-blue-100 text-blue-800',
  ANALYZING: 'bg-yellow-100 text-yellow-800',
  MATCHED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-gray-100 text-gray-800',
  APPLIED: 'bg-purple-100 text-purple-800',
  EXPIRED: 'bg-red-100 text-red-800',
  ERROR: 'bg-red-100 text-red-800',
};

// Match score color helper
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return 'text-green-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 40) return 'text-yellow-500';
  return 'text-red-500';
}

export function getMatchScoreBadgeColor(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-blue-100 text-blue-800';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}
