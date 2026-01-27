'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  socketManager,
  ServerToClientEvents,
  CvParseProgressPayload,
  CvParseCompletedPayload,
  CvParseFailedPayload,
  JobDiscoveredPayload,
  JobMatchedPayload,
  JobDiscoveryCompletedPayload,
  NotificationPayload,
} from '@/lib/socket';

/**
 * Hook to manage WebSocket connection based on session
 */
export function useSocketConnection() {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && session?.accessToken) {
      socketManager.setToken(session.accessToken as string);
      socketManager
        .connect()
        .then(() => {
          setIsConnected(true);
          setError(null);
        })
        .catch((err) => {
          setError(err.message);
          setIsConnected(false);
        });
    } else if (status === 'unauthenticated') {
      socketManager.disconnect();
      setIsConnected(false);
    }

    // Check connection status periodically
    const interval = setInterval(() => {
      setIsConnected(socketManager.isConnected());
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [session, status]);

  return { isConnected, error };
}

/**
 * Generic hook to subscribe to a realtime event
 */
export function useRealtimeEvent<E extends keyof ServerToClientEvents>(
  event: E,
  callback: ServerToClientEvents[E],
  enabled = true
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    const handler = (...args: unknown[]) => {
      (callbackRef.current as (...args: unknown[]) => void)(...args);
    };

    const unsubscribe = socketManager.on(event, handler as ServerToClientEvents[E]);

    return () => {
      unsubscribe();
    };
  }, [event, enabled]);
}

/**
 * Hook to subscribe to entity-specific events (campaign, cv, application)
 */
export function useEntitySubscription(
  type: 'campaign' | 'cv' | 'application',
  id: string | undefined | null
) {
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!id || !socketManager.isConnected()) {
      setSubscribed(false);
      return;
    }

    socketManager
      .subscribe(type, id)
      .then(() => setSubscribed(true))
      .catch((err) => {
        console.error(`Failed to subscribe to ${type}:${id}`, err);
        setSubscribed(false);
      });

    return () => {
      socketManager.unsubscribe(type, id).catch(() => {});
      setSubscribed(false);
    };
  }, [type, id]);

  return subscribed;
}

/**
 * Hook for CV parsing real-time updates
 */
export function useCVParsingRealtime(
  onProgress?: (cvId: string, progress: number, stage: string) => void,
  onCompleted?: (cvId: string, fileName: string) => void,
  onFailed?: (cvId: string, error: string) => void,
  enabled = true
) {
  useRealtimeEvent(
    'cv:parse_progress',
    useCallback(
      (payload: CvParseProgressPayload) => {
        onProgress?.(payload.cvId, payload.progress, payload.stage);
      },
      [onProgress]
    ),
    enabled
  );

  useRealtimeEvent(
    'cv:parse_completed',
    useCallback(
      (payload: CvParseCompletedPayload) => {
        onCompleted?.(payload.cvId, payload.fileName);
      },
      [onCompleted]
    ),
    enabled
  );

  useRealtimeEvent(
    'cv:parse_failed',
    useCallback(
      (payload: CvParseFailedPayload) => {
        onFailed?.(payload.cvId, payload.error);
      },
      [onFailed]
    ),
    enabled
  );
}

/**
 * Hook for job discovery real-time updates
 */
export function useJobDiscoveryRealtime(
  campaignId: string | undefined | null,
  callbacks: {
    onJobDiscovered?: (job: JobDiscoveredPayload['job']) => void;
    onJobMatched?: (payload: JobMatchedPayload) => void;
    onDiscoveryCompleted?: (stats: Omit<JobDiscoveryCompletedPayload, 'campaignId'>) => void;
  }
) {
  const { onJobDiscovered, onJobMatched, onDiscoveryCompleted } = callbacks;

  useRealtimeEvent(
    'job:discovered',
    useCallback(
      (payload: JobDiscoveredPayload) => {
        if (campaignId && payload.campaignId === campaignId) {
          onJobDiscovered?.(payload.job);
        }
      },
      [campaignId, onJobDiscovered]
    ),
    !!campaignId
  );

  useRealtimeEvent(
    'job:matched',
    useCallback(
      (payload: JobMatchedPayload) => {
        if (campaignId && payload.campaignId === campaignId) {
          onJobMatched?.(payload);
        }
      },
      [campaignId, onJobMatched]
    ),
    !!campaignId
  );

  useRealtimeEvent(
    'job:discovery_completed',
    useCallback(
      (payload: JobDiscoveryCompletedPayload) => {
        if (campaignId && payload.campaignId === campaignId) {
          const { campaignId: _, ...stats } = payload;
          onDiscoveryCompleted?.(stats);
        }
      },
      [campaignId, onDiscoveryCompleted]
    ),
    !!campaignId
  );
}

/**
 * Hook for notification real-time updates
 */
export function useNotificationsRealtime(
  onNotification: (notification: NotificationPayload) => void
) {
  useRealtimeEvent(
    'notification',
    useCallback(
      (payload: NotificationPayload) => {
        onNotification(payload);
      },
      [onNotification]
    ),
    true
  );
}

/**
 * Hybrid hook that uses real-time when available, falls back to polling
 */
export function useRealtimeWithFallback<T>(
  fetcher: () => Promise<T>,
  options: {
    pollingInterval?: number;
    onData?: (data: T) => void;
  } = {}
) {
  const { pollingInterval = 5000, onData } = options;
  const { isConnected } = useSocketConnection();
  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
      onData?.(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [fetcher, onData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling fallback when not connected
  useEffect(() => {
    if (isConnected) return;

    const interval = setInterval(fetchData, pollingInterval);
    return () => clearInterval(interval);
  }, [isConnected, fetchData, pollingInterval]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData,
    isRealtimeConnected: isConnected,
  };
}
