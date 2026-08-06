"use client";

import { useEffect, useState } from "react";
import type { PlatformIntegrityResponse } from "./types";

interface State {
  data: PlatformIntegrityResponse | null;
  loading: boolean;
  error: string | null;
}

/**
 * MAJOR #2.3 Block B.2 — client-side reader for the B.1 API.
 * No client-side caching layer — respects the API's cache-control header.
 */
export function usePlatformIntegrity(): State {
  const [state, setState] = useState<State>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/platform-integrity", {
          credentials: "include",
        });
        if (res.status === 401) {
          if (!cancelled) {
            setState({
              data: null,
              loading: false,
              error: "You need to sign in to view Platform Integrity findings.",
            });
          }
          return;
        }
        if (!res.ok) {
          const detail = await res.text();
          if (!cancelled) {
            setState({
              data: null,
              loading: false,
              error: `Failed to load findings (${res.status}). ${detail.slice(0, 200)}`,
            });
          }
          return;
        }
        const json = (await res.json()) as PlatformIntegrityResponse;
        if (!cancelled) {
          setState({ data: json, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            data: null,
            loading: false,
            error: err instanceof Error ? err.message : "Unknown error",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
