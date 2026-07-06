"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReviewItemRow } from "@/lib/cash-app/review-queue-types";
import { ReviewItemDetailModal } from "./_components/ReviewItemDetailModal";

async function fetchReviewItems(
  cursor: string | null,
): Promise<{ items: ReviewItemRow[]; nextCursor: string | null }> {
  const url = new URL("/api/ar/cash-app/review-items", window.location.origin);
  url.searchParams.set("status", "pending");
  url.searchParams.set("limit", "25");
  if (cursor) url.searchParams.set("cursor", cursor);
  const res = await fetch(url.toString(), {
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error(`Failed to load review items (status ${res.status})`);
  }
  return res.json();
}

export default function CashAppReviewQueuePage() {
  const [items, setItems] = useState<ReviewItemRow[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<ReviewItemRow | null>(null);

  const loadFirstPage = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchReviewItems(null)
      .then((res) => {
        setItems(res.items);
        setCursor(res.nextCursor);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const loadMore = useCallback(() => {
    if (!cursor) return;
    setLoading(true);
    fetchReviewItems(cursor)
      .then((res) => {
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [cursor]);

  const handleResolved = useCallback((resolvedId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== resolvedId));
    setSelectedItem(null);
  }, []);

  return (
    <main aria-labelledby="cash-app-review-heading" className="mx-auto max-w-5xl">
      <h1 id="cash-app-review-heading" className="text-2xl font-semibold text-slate-100">
        Cash App Review Queue
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        Payments Layer 2 could not confidently match. Review candidates, LLM reasoning, and resolve
        each item.
      </p>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-md border border-red-400/40 bg-red-950/40 p-4 text-sm text-red-200"
        >
          {error}{" "}
          <button type="button" onClick={loadFirstPage} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {!error && items.length === 0 && !loading && (
        <div className="mt-8 rounded-md border border-white/10 bg-slate-900/50 p-8 text-center text-sm text-slate-400">
          No items are waiting for review. Nice work.
        </div>
      )}

      <ul
        className="mt-6 divide-y divide-white/10 rounded-md border border-white/10 bg-slate-900/30"
        aria-label="Pending review items"
      >
        {items.map((item) => {
          const score = item.ar_cash_app_match_scores?.[0];
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setSelectedItem(item)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-white/5 focus:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">Payment {item.payment_id}</p>
                  <p className="text-xs text-slate-500">
                    {item.top_candidates.length} candidate
                    {item.top_candidates.length === 1 ? "" : "s"} · received{" "}
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-300">
                    {score?.llm_tier_used ? `LLM: ${score.llm_tier_used}` : "No LLM candidate"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Confidence:{" "}
                    {score?.final_confidence != null
                      ? `${Math.round(score.final_confidence * 100)}%`
                      : "n/a"}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {cursor && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loading}
          className="mt-4 rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/5 disabled:opacity-50"
        >
          {loading ? "Loading…" : "Load more"}
        </button>
      )}

      {selectedItem && (
        <ReviewItemDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onResolved={handleResolved}
        />
      )}
    </main>
  );
}
