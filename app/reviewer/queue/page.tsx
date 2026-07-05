"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { GapQueueItem, ReviewerQueueItem, ReviewerQueueResponse } from "@/lib/pre-close/reviewer-types";

function severityClass(severity: string) {
  if (severity === "error") return "bg-red-500/20 text-red-200";
  if (severity === "warn") return "bg-amber-500/20 text-amber-100";
  return "bg-slate-500/20 text-slate-200";
}

export default function ReviewerQueuePage() {
  const [items, setItems] = useState<ReviewerQueueItem[]>([]);
  const [gapItems, setGapItems] = useState<GapQueueItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(
    async (nextCursor?: string | null, append = false) => {
      setLoading(true);
      setError("");
      const token = window.localStorage.getItem("supabase_access_token") || "";
      const params = new URLSearchParams({ status, limit: "50" });
      if (nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/reviewer/queue?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as ReviewerQueueResponse & { error?: string };
      if (!res.ok) {
        setError(data.error || "load_failed");
        setLoading(false);
        return;
      }
      setItems((prev) => (append ? [...prev, ...data.items] : data.items));
      setGapItems(data.gapItems ?? []);
      setCursor(data.cursor);
      setLoading(false);
    },
    [status],
  );

  useEffect(() => {
    load(null, false);
  }, [load]);

  if (error) {
    return (
      <div>
        <p className="text-red-300">{error}</p>
        <button type="button" onClick={() => load(null, false)} className="mt-2 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {["all", "pending", "decided", "posted", "blocked"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={`px-3 py-1 rounded text-xs ${status === s ? "bg-teal-800" : "bg-white/10"}`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading && items.length === 0 ? (
        <p className="text-slate-400">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-400">No review items found</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-400 border-b border-white/10">
              <th className="py-2">Severity</th>
              <th>Rule</th>
              <th>Client · Engagement</th>
              <th>Created</th>
              <th>Decision</th>
              <th>Post</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${severityClass(item.severity)}`}>
                    {item.severity}
                  </span>
                </td>
                <td>{item.ruleId}</td>
                <td>
                  {item.firmClientName} · {item.engagementName}
                </td>
                <td>{new Date(item.createdAt).toLocaleString()}</td>
                <td>{item.decision ?? "pending"}</td>
                <td>
                  {item.postedJeAttemptId
                    ? "posted"
                    : item.postBlockReason
                      ? "blocked"
                      : "—"}
                </td>
                <td className="text-right">
                  <Link href={`/reviewer/queue/${item.id}`} className="underline mr-2">
                    Open
                  </Link>
                  <button
                    type="button"
                    className="underline text-xs"
                    onClick={() => {
                      const token = window.localStorage.getItem("supabase_access_token") || "";
                      window.open(
                        `/api/reviewer/review/${item.id}/packet?persist=true`,
                        "_blank",
                      );
                      void token;
                    }}
                  >
                    Export PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {cursor ? (
        <button
          type="button"
          className="mt-4 px-4 py-2 bg-white/10 rounded"
          onClick={() => load(cursor, true)}
          disabled={loading}
        >
          Load more
        </button>
      ) : null}

      {gapItems.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-lg font-medium text-teal-200 mb-3">Assertion Gaps</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-white/10">
                <th className="py-2">Severity</th>
                <th>Account · Assertion</th>
                <th>Client · Engagement</th>
                <th>Root cause</th>
                <th>Created</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {gapItems.map((gap) => (
                <tr key={gap.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${severityClass(gap.severity)}`}>
                      {gap.severity}
                    </span>
                  </td>
                  <td>
                    {gap.accountCategory} · {gap.assertionId}
                  </td>
                  <td>
                    {gap.firmClientName} · {gap.engagementName}
                  </td>
                  <td className="text-xs">{gap.gapRootCauseCode}</td>
                  <td>{new Date(gap.createdAt).toLocaleString()}</td>
                  <td>{gap.status}</td>
                  <td className="text-right">
                    <Link href={`/reviewer/gap-items/${gap.id}`} className="underline">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
