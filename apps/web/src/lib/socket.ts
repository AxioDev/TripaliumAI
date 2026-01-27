'use client';

import { io, Socket } from 'socket.io-client';

// Event types matching the backend
export type CvParseStartedPayload = {
  cvId: string;
  fileName: string;
};

export type CvParseProgressPayload = {
  cvId: string;
  progress: number;
  stage: 'uploading' | 'converting' | 'analyzing' | 'extracting' | 'finalizing';
};

export type CvParseCompletedPayload = {
  cvId: string;
  fileName: string;
};

export type CvParseFailedPayload = {
  cvId: string;
  error: string;
};

export type JobDiscoveryStartedPayload = {
  campaignId: string;
  campaignName: string;
};

export type JobDiscoveredPayload = {
  campaignId: string;
  job: {
    id: string;
    title: string;
    company: string;
    location?: string;
    source?: string;
  };
};

export type JobMatchedPayload = {
  campaignId: string;
  jobId: string;
  matchScore: number;
  matchReason?: string;
};

export type JobDiscoveryCompletedPayload = {
  campaignId: string;
  jobsFound: number;
  newJobs: number;
  matchedJobs: number;
};

export type DocumentGenerationStartedPayload = {
  applicationId: string;
  jobTitle: string;
  company: string;
};

export type DocumentGeneratedPayload = {
  applicationId: string;
  documentType: 'cv' | 'cover_letter';
  version: number;
};

export type DocumentsReadyPayload = {
  applicationId: string;
  jobTitle: string;
  company: string;
};

export type DocumentGenerationFailedPayload = {
  applicationId: string;
  error: string;
};

export type NotificationPayload = {
  id: string;
  type:
    | 'cv_parsed'
    | 'jobs_discovered'
    | 'documents_ready'
    | 'campaign_status'
    | 'application_submitted'
    | 'match_found';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
};

export interface ServerToClientEvents {
  'cv:parse_started': (payload: CvParseStartedPayload) => void;
  'cv:parse_progress': (payload: CvParseProgressPayload) => void;
  'cv:parse_completed': (payload: CvParseCompletedPayload) => void;
  'cv:parse_failed': (payload: CvParseFailedPayload) => void;
  'job:discovery_started': (payload: JobDiscoveryStartedPayload) => void;
  'job:discovered': (payload: JobDiscoveredPayload) => void;
  'job:matched': (payload: JobMatchedPayload) => void;
  'job:discovery_completed': (payload: JobDiscoveryCompletedPayload) => void;
  'document:generation_started': (payload: DocumentGenerationStartedPayload) => void;
  'document:generated': (payload: DocumentGeneratedPayload) => void;
  'document:documents_ready': (payload: DocumentsReadyPayload) => void;
  'document:generation_failed': (payload: DocumentGenerationFailedPayload) => void;
  notification: (payload: NotificationPayload) => void;
  error: (payload: { message: string }) => void;
}

export interface ClientToServerEvents {
  subscribe: (
    data: { type: 'campaign' | 'cv' | 'application'; id: string },
    callback?: (response: { success: boolean; room?: string; error?: string }) => void
  ) => void;
  unsubscribe: (
    data: { type: 'campaign' | 'cv' | 'application'; id: string },
    callback?: (response: { success: boolean }) => void
  ) => void;
  ping: (callback: (response: { pong: boolean; timestamp: number }) => void) => void;
}

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketManager {
  private static instance: SocketManager;
  private socket: TypedSocket | null = null;
  private token: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private listeners: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private connectionPromise: Promise<TypedSocket> | null = null;

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  setToken(token: string) {
    this.token = token;
    // If already connected with different token, reconnect
    if (this.socket?.connected) {
      this.disconnect();
      this.connect();
    }
  }

  async connect(): Promise<TypedSocket> {
    if (this.socket?.connected) {
      return this.socket;
    }

    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      if (!this.token) {
        reject(new Error('No authentication token available'));
        this.connectionPromise = null;
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      this.socket = io(apiUrl, {
        auth: { token: this.token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxReconnectAttempts,
        timeout: 20000,
      }) as TypedSocket;

      this.socket.on('connect', () => {
        console.log('[Socket] Connected');
        this.reconnectAttempts = 0;
        this.connectionPromise = null;
        resolve(this.socket!);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error.message);
        this.reconnectAttempts++;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          this.connectionPromise = null;
          reject(error);
        }
      });

      this.socket.on('error', (payload) => {
        console.error('[Socket] Server error:', payload.message);
      });

      // Re-attach all existing listeners
      this.listeners.forEach((callbacks, event) => {
        callbacks.forEach((callback) => {
          this.socket?.on(event as keyof ServerToClientEvents, callback as never);
        });
      });
    });

    return this.connectionPromise;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  on<E extends keyof ServerToClientEvents>(
    event: E,
    callback: ServerToClientEvents[E]
  ): () => void {
    // Store listener for re-attachment on reconnect
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as (...args: unknown[]) => void);

    // Attach to current socket if connected
    this.socket?.on(event, callback as never);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
      this.socket?.off(event, callback as never);
    };
  }

  off<E extends keyof ServerToClientEvents>(
    event: E,
    callback?: ServerToClientEvents[E]
  ) {
    if (callback) {
      this.listeners.get(event)?.delete(callback as (...args: unknown[]) => void);
      this.socket?.off(event, callback as never);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  subscribe(type: 'campaign' | 'cv' | 'application', id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      this.socket.emit('subscribe', { type, id }, (response) => {
        if (response?.success) {
          resolve();
        } else {
          reject(new Error(response?.error || 'Subscription failed'));
        }
      });
    });
  }

  unsubscribe(type: 'campaign' | 'cv' | 'application', id: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        resolve();
        return;
      }

      this.socket.emit('unsubscribe', { type, id }, () => {
        resolve();
      });
    });
  }

  ping(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      const start = Date.now();
      this.socket.emit('ping', (response) => {
        if (response?.pong) {
          resolve(Date.now() - start);
        } else {
          reject(new Error('Ping failed'));
        }
      });
    });
  }
}

export const socketManager = SocketManager.getInstance();

// Convenience exports
export const connectSocket = (token: string) => {
  socketManager.setToken(token);
  return socketManager.connect();
};

export const disconnectSocket = () => socketManager.disconnect();
export const isSocketConnected = () => socketManager.isConnected();
