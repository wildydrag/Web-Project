"use client";

/**
 * Minimal data-fetching hooks for server-computed resources.
 *
 * Dashboard figures (counts, sums, revenue) are aggregated by the backend and
 * fetched as-is — the frontend never reduces raw lists to produce them
 * (a requirement of the project brief).
 */

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api/client";

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: unknown;
  /** Re-fetch, e.g. after a mutation changes the underlying numbers. */
  refresh: () => void;
}

/** GET `path` once on mount (and whenever `path` changes). */
export function useApiResource<T>(path: string | null): ApiResource<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get<T>(path)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, loading, error, refresh };
}

/** GET a paginated collection and unwrap it to a plain array. */
export function useApiList<T>(path: string | null): ApiResource<T[]> {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<unknown>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (path === null) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .list<T>(path)
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, tick]);

  return { data, loading, error, refresh };
}
