"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { focusRing, headingFont } from "../site-ui";

interface PendingItem {
  id: string;
  materiality_bucket: "low" | "medium" | "high";
  je_draft_total_debit_cents: number;
  rule_reason_code: string;
  created_at: string;
  requires_mfa_step_up: boolean;
}

function authHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? window.localStorage.getItem("supabase_access_token") || ""
      : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PendingApprovalsCard({
  engagementId,
}: {
  engagementId?: string | null;
}) {
  const [items, setItems] = useState<PendingItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = engagementId
          ? `/api/reviewer/pending?engagement_id=${encodeURIComponent(engagementId)}`
          : "/api/reviewer/pending/default";
        const res = await fetch(url, { cache: "no-store", headers: authHeaders() });
        if (!res.ok) throw new Error(`http_${res.status}`);
        const data = await res.json();
        if (!cancelled) setItems(data.items ?? []);
      } catch (e) {
        if (!cancelled) setErr((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [engagementId]);

  if (err) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
        Failed to load approvals: {err}
      </div>
    );
  }
  if (items === null) {
    return (
      <div className="rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-4 text-sm text-[#A29E93]">
        Loading approvals…
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className={`${headingFont} text-lg font-semibold text-[#ECEBE7]`}>
          Pending JE Approvals ({items.length})
        </h3>
        <Link
          href="/reviewer/mobile"
          className={`${focusRing()} text-sm text-[#C9A961] underline underline-offset-2`}
        >
          Open mobile queue
        </Link>
      </div>
      <ul className="space-y-2">
        {items.slice(0, 5).map((it) => (
          <li
            key={it.id}
            className="flex items-center justify-between gap-3 rounded-md border border-[#C9A961]/20 px-3 py-2"
          >
            <div>
              <div className="text-sm font-medium text-[#ECEBE7]">{it.rule_reason_code}</div>
              <div className="text-xs text-[#A29E93]">
                ${(it.je_draft_total_debit_cents / 100).toLocaleString()} · {it.materiality_bucket}
                {it.requires_mfa_step_up ? (
                  <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-red-200">
                    MFA
                  </span>
                ) : null}
              </div>
            </div>
            <Link
              href={`/reviewer/queue/${it.id}`}
              className={`${focusRing()} rounded-md bg-[#C9A961] px-3 py-1 text-sm font-medium text-[#111112]`}
            >
              Review
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
