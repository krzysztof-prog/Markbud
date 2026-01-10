import { useRef, useCallback } from 'react';

/**
 * Custom hook for debouncing async functions
 * Prevents duplicate calls when user clicks multiple times quickly
 *
 * @param callback - The async function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns Debounced version of the callback
 *
 * @example
 * const debouncedSave = useDebounce(async () => {
 *   await saveData();
 * }, 500);
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic debounce needs to accept any function signature
export function useDebounce<T extends (...args: any[]) => Promise<any>>(
  callback: T,
  delay: number = 300
): T {
  const pendingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>): Promise<ReturnType<T>> => {
      return new Promise((resolve, reject) => {
        // If already pending, ignore this call
        if (pendingRef.current) {
          console.warn('[useDebounce] Ignoring duplicate call - operation already in progress');
          return;
        }

        // Clear any existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        // Set timeout for debounced execution
        timeoutRef.current = setTimeout(async () => {
          pendingRef.current = true;

          try {
            const result = await callback(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            pendingRef.current = false;
            timeoutRef.current = null;
          }
        }, delay);
      });
    },
    [callback, delay]
  ) as T;

  return debouncedCallback;
}
