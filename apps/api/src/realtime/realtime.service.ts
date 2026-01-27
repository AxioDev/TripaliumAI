import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import {
  RealtimeEvents,
  CvParseStartedPayload,
  CvParseProgressPayload,
  CvParseCompletedPayload,
  CvParseFailedPayload,
  JobDiscoveryStartedPayload,
  JobDiscoveredPayload,
  JobMatchedPayload,
  JobDiscoveryCompletedPayload,
  DocumentGenerationStartedPayload,
  DocumentGeneratedPayload,
  DocumentsReadyPayload,
  DocumentGenerationFailedPayload,
  ApplicationStatusChangedPayload,
  ApplicationSubmittedPayload,
  NotificationPayload,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
} from './events.types';

type TypedServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private server: TypedServer | null = null;

  setServer(server: TypedServer) {
    this.server = server;
    this.logger.log('WebSocket server attached to RealtimeService');
  }

  private getUserRoom(userId: string): string {
    return `user:${userId}`;
  }

  private emitToUser<E extends keyof ServerToClientEvents>(
    userId: string,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
  ) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized');
      return;
    }

    const room = this.getUserRoom(userId);
    // Use type assertion to handle Socket.IO's complex generic types
    (this.server.to(room) as { emit: (event: string, payload: unknown) => void }).emit(
      event as string,
      payload,
    );
    this.logger.debug(`Emitted ${event} to user ${userId}`);
  }

  // ============= CV Events =============

  cvParseStarted(userId: string, cvId: string, fileName: string) {
    const payload: CvParseStartedPayload = { cvId, fileName };
    this.emitToUser(userId, RealtimeEvents.CV_PARSE_STARTED, payload);

    // Also send notification
    this.sendNotification(userId, {
      id: `cv-parse-${cvId}-${Date.now()}`,
      type: 'cv_parsed',
      title: 'CV Processing Started',
      message: `Your CV "${fileName}" is being analyzed...`,
      actionUrl: '/dashboard/cvs',
    });
  }

  cvParseProgress(
    userId: string,
    cvId: string,
    progress: number,
    stage: CvParseProgressPayload['stage'],
  ) {
    const payload: CvParseProgressPayload = { cvId, progress, stage };
    this.emitToUser(userId, RealtimeEvents.CV_PARSE_PROGRESS, payload);
  }

  cvParseCompleted(userId: string, cvId: string, fileName: string) {
    const payload: CvParseCompletedPayload = { cvId, fileName };
    this.emitToUser(userId, RealtimeEvents.CV_PARSE_COMPLETED, payload);

    this.sendNotification(userId, {
      id: `cv-complete-${cvId}-${Date.now()}`,
      type: 'cv_parsed',
      title: 'CV Parsed Successfully',
      message: `Your CV "${fileName}" has been analyzed and is ready.`,
      actionUrl: '/dashboard/cvs',
    });
  }

  cvParseFailed(userId: string, cvId: string, error: string) {
    const payload: CvParseFailedPayload = { cvId, error };
    this.emitToUser(userId, RealtimeEvents.CV_PARSE_FAILED, payload);

    this.sendNotification(userId, {
      id: `cv-failed-${cvId}-${Date.now()}`,
      type: 'cv_parsed',
      title: 'CV Parsing Failed',
      message: `There was an issue processing your CV. Please try again.`,
      actionUrl: '/dashboard/cvs',
    });
  }

  // ============= Job Discovery Events =============

  jobDiscoveryStarted(userId: string, campaignId: string, campaignName: string) {
    const payload: JobDiscoveryStartedPayload = { campaignId, campaignName };
    this.emitToUser(userId, RealtimeEvents.JOB_DISCOVERY_STARTED, payload);
  }

  jobDiscovered(
    userId: string,
    campaignId: string,
    job: JobDiscoveredPayload['job'],
  ) {
    const payload: JobDiscoveredPayload = { campaignId, job };
    this.emitToUser(userId, RealtimeEvents.JOB_DISCOVERED, payload);
  }

  jobMatched(
    userId: string,
    campaignId: string,
    jobId: string,
    matchScore: number,
    matchReason?: string,
  ) {
    const payload: JobMatchedPayload = {
      campaignId,
      jobId,
      matchScore,
      matchReason,
    };
    this.emitToUser(userId, RealtimeEvents.JOB_MATCHED, payload);

    if (matchScore >= 70) {
      this.sendNotification(userId, {
        id: `job-match-${jobId}-${Date.now()}`,
        type: 'match_found',
        title: 'Great Match Found!',
        message: `A job matching ${matchScore}% of your profile has been found.`,
        actionUrl: `/dashboard/campaigns/${campaignId}`,
        metadata: { matchScore },
      });
    }
  }

  jobDiscoveryCompleted(
    userId: string,
    campaignId: string,
    stats: Omit<JobDiscoveryCompletedPayload, 'campaignId'>,
  ) {
    const payload: JobDiscoveryCompletedPayload = { campaignId, ...stats };
    this.emitToUser(userId, RealtimeEvents.JOB_DISCOVERY_COMPLETED, payload);

    if (stats.newJobs > 0) {
      this.sendNotification(userId, {
        id: `discovery-${campaignId}-${Date.now()}`,
        type: 'jobs_discovered',
        title: `${stats.newJobs} New Jobs Found`,
        message: `Your campaign discovered ${stats.newJobs} new opportunities${stats.matchedJobs > 0 ? `, ${stats.matchedJobs} are great matches` : ''}.`,
        actionUrl: `/dashboard/campaigns/${campaignId}`,
        metadata: stats,
      });
    }
  }

  // ============= Document Generation Events =============

  documentGenerationStarted(
    userId: string,
    applicationId: string,
    jobTitle: string,
    company: string,
  ) {
    const payload: DocumentGenerationStartedPayload = {
      applicationId,
      jobTitle,
      company,
    };
    this.emitToUser(userId, RealtimeEvents.DOCUMENT_GENERATION_STARTED, payload);
  }

  documentGenerated(
    userId: string,
    applicationId: string,
    documentType: 'cv' | 'cover_letter',
    version: number,
  ) {
    const payload: DocumentGeneratedPayload = {
      applicationId,
      documentType,
      version,
    };
    this.emitToUser(userId, RealtimeEvents.DOCUMENT_GENERATED, payload);
  }

  documentsReady(
    userId: string,
    applicationId: string,
    jobTitle: string,
    company: string,
  ) {
    const payload: DocumentsReadyPayload = { applicationId, jobTitle, company };
    this.emitToUser(userId, RealtimeEvents.DOCUMENTS_READY, payload);

    this.sendNotification(userId, {
      id: `docs-ready-${applicationId}-${Date.now()}`,
      type: 'documents_ready',
      title: 'Documents Ready for Review',
      message: `Your application documents for ${jobTitle} at ${company} are ready.`,
      actionUrl: `/dashboard/applications`,
    });
  }

  documentGenerationFailed(
    userId: string,
    applicationId: string,
    error: string,
  ) {
    const payload: DocumentGenerationFailedPayload = { applicationId, error };
    this.emitToUser(userId, RealtimeEvents.DOCUMENT_GENERATION_FAILED, payload);
  }

  // ============= Application Events =============

  applicationStatusChanged(
    userId: string,
    applicationId: string,
    status: string,
    jobTitle: string,
    company: string,
  ) {
    const payload: ApplicationStatusChangedPayload = {
      applicationId,
      status,
      jobTitle,
      company,
    };
    this.emitToUser(userId, RealtimeEvents.APPLICATION_STATUS_CHANGED, payload);
  }

  applicationSubmitted(
    userId: string,
    applicationId: string,
    jobTitle: string,
    company: string,
  ) {
    const payload: ApplicationSubmittedPayload = {
      applicationId,
      jobTitle,
      company,
    };
    this.emitToUser(userId, RealtimeEvents.APPLICATION_SUBMITTED, payload);

    this.sendNotification(userId, {
      id: `app-submitted-${applicationId}-${Date.now()}`,
      type: 'application_submitted',
      title: 'Application Submitted',
      message: `Your application to ${company} for ${jobTitle} has been submitted.`,
      actionUrl: `/dashboard/applications`,
    });
  }

  // ============= Generic Notification =============

  sendNotification(
    userId: string,
    notification: Omit<NotificationPayload, 'id'> & { id?: string },
  ) {
    const payload: NotificationPayload = {
      id: notification.id || `notif-${Date.now()}`,
      ...notification,
    };
    this.emitToUser(userId, RealtimeEvents.NOTIFICATION, payload);
  }

  // ============= Utility Methods =============

  getConnectedUsers(): string[] {
    if (!this.server) return [];

    const users: string[] = [];
    this.server.sockets.sockets.forEach((socket) => {
      if (socket.data.userId) {
        users.push(socket.data.userId);
      }
    });

    return [...new Set(users)];
  }

  isUserConnected(userId: string): boolean {
    if (!this.server) return false;

    const room = this.getUserRoom(userId);
    const sockets = this.server.sockets.adapter.rooms.get(room);
    return sockets !== undefined && sockets.size > 0;
  }
}
