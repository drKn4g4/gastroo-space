import { useEffect, useState, useCallback } from 'react';

/**
 * Hook for handling Firestore query errors in components
 * Provides error state, loading state, and retry mechanism
 */

export interface UseAsyncQueryOptions {
  retry?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  dependencies?: React.DependencyList;
}

export function useAsyncQuery<T>(
  queryFn: () => Promise<T>,
  options: UseAsyncQueryOptions = {}
) {
  const {
    retry = 3,
    retryDelay = 1000,
    onError,
    dependencies = [],
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      onError?.(error);

      // Auto-retry logic
      if (retryCount < retry) {
        setTimeout(() => {
          setRetryCount((prev) => prev + 1);
        }, retryDelay * Math.pow(2, retryCount)); // Exponential backoff
      }
    } finally {
      setLoading(false);
    }
  }, [queryFn, retry, retryDelay, onError, retryCount]);

  useEffect(() => {
    execute();
  }, [...dependencies, execute]);

  const manualRetry = useCallback(() => {
    setRetryCount(0);
    execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    retry: manualRetry,
    isRetrying: retryCount > 0,
    retryCount,
  };
}

/**
 * Hook for Firestore document subscription with error handling
 */

export function useFirestoreDoc<T>(
  docRef: any, // DocumentReference<T>
  options: UseAsyncQueryOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!docRef) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const { onSnapshot } = require('firebase/firestore');
      
      unsubscribe = onSnapshot(
        docRef,
        (doc: any) => {
          setData(doc.exists() ? (doc.data() as T) : null);
          setLoading(false);
          setError(null);
        },
        (err: Error) => {
          setError(err);
          setLoading(false);
          options.onError?.(err);
        }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);
      options.onError?.(error);
    }

    return () => unsubscribe?.();
  }, [docRef, options]);

  return { data, loading, error };
}

/**
 * Hook for Firestore collection query with error handling
 */

export function useFirestoreQuery<T>(
  queryConstraint: any, // Query<T>
  options: UseAsyncQueryOptions = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!queryConstraint) {
      setLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;

    try {
      const { onSnapshot } = require('firebase/firestore');
      
      unsubscribe = onSnapshot(
        queryConstraint,
        (snapshot: any) => {
          const docs = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
          } as T));
          setData(docs);
          setLoading(false);
          setError(null);
        },
        (err: Error) => {
          setError(err);
          setLoading(false);
          options.onError?.(err);
        }
      );
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);
      options.onError?.(error);
    }

    return () => unsubscribe?.();
  }, [queryConstraint, options]);

  return { data, loading, error };
}
