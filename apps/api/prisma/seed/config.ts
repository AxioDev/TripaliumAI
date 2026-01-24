// =============================================================================
// Demo Seed Configuration
// =============================================================================

// Demo user identifiers
export const DEMO_USER_ID = 'demo_user_marie';
export const DEMO_PROFILE_ID = 'demo_profile_marie';
export const DEMO_EMAIL = 'marie.dupont@demo.tripalium.ai';
export const DEMO_PASSWORD = 'demo123456';

// Campaign IDs
export const DEMO_CAMPAIGN_COMPLETED_ID = 'demo_campaign_completed';
export const DEMO_CAMPAIGN_ACTIVE_ID = 'demo_campaign_active';
export const DEMO_CAMPAIGN_DRAFT_ID = 'demo_campaign_draft';

// CV IDs
export const DEMO_CV_PARSED_ID = 'demo_cv_parsed';
export const DEMO_CV_PROCESSING_ID = 'demo_cv_processing';

// Job source ID for demo data
export const DEMO_JOB_SOURCE_ID = 'demo_job_source_wttj';

// Prefix for all demo entity IDs (for easy cleanup)
export const DEMO_ID_PREFIX = 'demo_';

// Date configuration for the demo timeline
export const DEMO_TIMELINE = {
  // Profile and first campaign created 21 days ago
  profileCreated: 21,
  // First campaign started 21 days ago
  campaign1Started: 21,
  // First campaign completed 3 days ago
  campaign1Completed: 3,
  // Second campaign started 4 days ago
  campaign2Started: 4,
  // Draft campaign created 1 day ago
  campaign3Created: 1,
};

// Thresholds
export const MATCH_THRESHOLDS = {
  completed: 70, // 70% threshold for completed campaign
  active: 65,    // 65% threshold for active campaign
  draft: 75,     // 75% threshold for draft campaign
};
