export type NotificationType =
  | 'cv_parsed'
  | 'jobs_discovered'
  | 'documents_ready'
  | 'campaign_status'
  | 'application_submitted'
  | 'match_found';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}
