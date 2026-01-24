'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiError } from '@/lib/api-client';

interface UseApiOptions<T> {
  initialData?: T;
  autoFetch?: boolean;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
}

interface UseApiResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  mutate: (data: T) => void;
}

export function useApi<T>(
  fetcher: () => Promise<T>,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const { initialData, autoFetch = true, enabled = true, onSuccess, onError } = options;
  const shouldFetch = autoFetch && enabled;

  const [data, setData] = useState<T | undefined>(initialData);
  const [isLoading, setIsLoading] = useState(shouldFetch);
  const [error, setError] = useState<ApiError | null>(null);
  const [fetchCount, setFetchCount] = useState(0);

  // Use refs to store latest callbacks to avoid infinite loops
  const fetcherRef = useRef(fetcher);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Update refs on each render
  fetcherRef.current = fetcher;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetcherRef.current();
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      const apiError =
        err instanceof ApiError
          ? err
          : new ApiError(500, 'UNKNOWN', 'An unexpected error occurred');
      setError(apiError);
      onErrorRef.current?.(apiError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shouldFetch && fetchCount === 0) {
      setFetchCount(1);
      refetch();
    }
  }, [shouldFetch, fetchCount, refetch]);

  const mutate = useCallback((newData: T) => {
    setData(newData);
  }, []);

  return { data, isLoading, error, refetch, mutate };
}

interface UseMutationOptions<T, V> {
  onSuccess?: (data: T, variables: V) => void;
  onError?: (error: ApiError, variables: V) => void;
}

interface UseMutationResult<T, V> {
  mutate: (variables: V) => Promise<T | undefined>;
  mutateAsync: (variables: V) => Promise<T>;
  data: T | undefined;
  isLoading: boolean;
  error: ApiError | null;
  reset: () => void;
}

export function useMutation<T, V = void>(
  mutationFn: (variables: V) => Promise<T>,
  options: UseMutationOptions<T, V> = {}
): UseMutationResult<T, V> {
  const { onSuccess, onError } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const mutateAsync = useCallback(
    async (variables: V): Promise<T> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await mutationFn(variables);
        setData(result);
        onSuccess?.(result, variables);
        return result;
      } catch (err) {
        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError(500, 'UNKNOWN', 'An unexpected error occurred');
        setError(apiError);
        onError?.(apiError, variables);
        throw apiError;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const mutate = useCallback(
    async (variables: V): Promise<T | undefined> => {
      try {
        return await mutateAsync(variables);
      } catch {
        return undefined;
      }
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, mutateAsync, data, isLoading, error, reset };
}

// Polling hook for checking status
export function usePolling<T>(
  fetcher: () => Promise<T>,
  options: {
    interval: number;
    enabled?: boolean;
    shouldStop?: (data: T) => boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
  }
) {
  const { interval, enabled = true, shouldStop, onSuccess, onError } = options;

  const [data, setData] = useState<T | undefined>(undefined);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Use refs to store latest callbacks to avoid infinite loops
  const fetcherRef = useRef(fetcher);
  const shouldStopRef = useRef(shouldStop);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Update refs on each render
  fetcherRef.current = fetcher;
  shouldStopRef.current = shouldStop;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled) {
      setIsPolling(false);
      return;
    }

    let timeoutId: NodeJS.Timeout;
    let isCancelled = false;

    const poll = async () => {
      if (isCancelled) return;

      setIsPolling(true);

      try {
        const result = await fetcherRef.current();
        if (isCancelled) return;

        setData(result);
        setError(null);
        onSuccessRef.current?.(result);

        if (shouldStopRef.current?.(result)) {
          setIsPolling(false);
          return;
        }

        timeoutId = setTimeout(poll, interval);
      } catch (err) {
        if (isCancelled) return;

        const apiError =
          err instanceof ApiError
            ? err
            : new ApiError(500, 'UNKNOWN', 'Polling failed');
        setError(apiError);
        onErrorRef.current?.(apiError);

        // Continue polling on error
        timeoutId = setTimeout(poll, interval);
      }
    };

    poll();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [enabled, interval]);

  return { data, isPolling, error };
}
