import { useCallback, useRef, useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): [(...args: Parameters<T>) => void, () => void, () => boolean] {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);
  const pendingRef = useRef(false);

  // Keep callback ref fresh
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      pendingRef.current = false;
    }
  }, []);

  const isPending = useCallback(() => pendingRef.current, []);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      pendingRef.current = true;
      timeoutRef.current = setTimeout(() => {
        pendingRef.current = false;
        callbackRef.current(...args);
      }, delay);
    },
    [delay, cancel]
  );

  // Cleanup on unmount
  useEffect(() => cancel, [cancel]);

  return [debouncedFn, cancel, isPending];
}
