"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { focusRing, headingFont } from "../site-ui";

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("supabase_access_token") || ""
      : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PostedJesCard({ engagementId }: { engagementId?: string | null }) {
  const [resolvedEngagementId, setResolvedEngagementId] = useState<string | null>(
    engagementId ?? null,
  );
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let eng = engagementId ?? null;
        if (!eng) {
          const def = await fetch("/api/reviewer/pending/default", {
            cache: "no-store",
            headers: authHeaders(),
          });
          if (!def.ok) return;
          const j = await def.json();
          eng = j.engagement_id ?? null;
        }
        if (!eng || cancelled) return;
        setResolvedEngagementId(eng);
        const now = new Date();
        const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
          .toISOString()
          .slice(0, 10);
        const res = await fetch(
          `/api/client/posted-je-report?engagement_id=${encodeURIComponent(eng)}&from=${from}`,
          { cache: "no-store", headers: authHeaders() },
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setCount((data.entries ?? []).length);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  if (!resolvedEngagementId || count === null) return null;

  return (
    <div className="rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-4">
      <h3 className={`${headingFont} text-lg font-semibold text-[#ECEBE7]`}>Posted journal entries</h3>
      <p className="mt-1 text-sm text-[#A29E93]">
        {count} JE{count === 1 ? "" : "s"} posted this month
      </p>
      <Link
        href={`/dashboard/client/posted-jes?engagement_id=${encodeURIComponent(resolvedEngagementId)}`}
        className={`${focusRing()} mt-3 inline-block text-sm text-[#C9A961] underline underline-offset-2`}
      >
        View report
      </Link>
    </div>
  );
}
