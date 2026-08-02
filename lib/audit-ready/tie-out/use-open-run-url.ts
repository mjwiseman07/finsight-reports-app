// lib/audit-ready/tie-out/use-open-run-url.ts
//
// Hook that syncs a single "?open_run=<runId>" URL param to local state.
//
// - Read: on mount and whenever the URL param changes.
// - Write: caller invokes setOpenRunId(next); the hook writes the URL via
//   router.replace() so back/forward history stays clean.
// - Regenerate: caller may pass a new runId — same setter, no separate API.
//
// This hook is intentionally client-only ("use client" enforced by useRouter
// / useSearchParams / usePathname from next/navigation).

"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const OPEN_RUN_PARAM = "open_run" as const;

export type UseOpenRunUrlResult = {
  openRunId: string | null;
  setOpenRunId: (next: string | null) => void;
};

/**
 * @param initialOpenRunId - Server-rendered initial value (avoids client flash).
 *   Pass sp.open_run from the parent server component; the hook takes over on mount.
 */
export function useOpenRunUrl(
  initialOpenRunId: string | null = null,
): UseOpenRunUrlResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [openRunId, setLocalOpenRunId] = useState<string | null>(
    initialOpenRunId,
  );

  // Read side: keep local state in sync with the URL when it changes externally
  // (back/forward buttons, direct link paste, other components mutating the URL).
  useEffect(() => {
    const fromUrl = searchParams?.get(OPEN_RUN_PARAM) ?? null;
    setLocalOpenRunId((prev) => (prev === fromUrl ? prev : fromUrl));
  }, [searchParams]);

  const setOpenRunId = useCallback(
    (next: string | null) => {
      setLocalOpenRunId(next);
      if (!router || !pathname) return;
      // Preserve all other params (as_of, highlight_run, open_line, etc.).
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      if (next) {
        params.set(OPEN_RUN_PARAM, next);
      } else {
        params.delete(OPEN_RUN_PARAM);
      }
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      // replace, not push — deep-link deltas shouldn't grow the history stack.
      router.replace(url, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return { openRunId, setOpenRunId };
}
