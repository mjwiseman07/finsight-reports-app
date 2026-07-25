"use client";

import { useEffect, useState } from "react";
import type { WorkpaperPayload } from "@/lib/audit-ready/tie-out/workpaper-emitter";

export type WorkpaperDownloads = {
  xlsx: string | null;
  pdf: string | null;
};

export type WorkpaperResponse = {
  payload: WorkpaperPayload;
  downloads: WorkpaperDownloads;
};

export type WorkpaperError = {
  status: number;
  code: string;
  kind?: string;
  message: string;
};

export function useWorkpaper(runId: string | null) {
  const [data, setData] = useState<WorkpaperResponse | null>(null);
  const [error, setError] = useState<WorkpaperError | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(runId));

  useEffect(() => {
    if (!runId) {
      setData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setData(null);

    (async () => {
      try {
        const res = await fetch(`/api/audit-ready/runs/${runId}/workpaper`);
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (cancelled) return;
        if (!res.ok) {
          const code = String(body.error ?? `http_${res.status}`);
          setError({
            status: res.status,
            code,
            kind: typeof body.kind === "string" ? body.kind : undefined,
            message:
              res.status === 501
                ? "This kind does not yet have a workpaper — coming in Block F"
                : res.status === 404
                  ? "Run not found or has been deleted"
                  : res.status === 403
                    ? "You do not have access to this workpaper"
                    : code,
          });
          setData(null);
          return;
        }
        setData(body as unknown as WorkpaperResponse);
      } catch (e: unknown) {
        if (cancelled) return;
        setError({
          status: 0,
          code: "network_error",
          message: e instanceof Error ? e.message : "Failed to load workpaper",
        });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [runId]);

  return { data, error, isLoading };
}
