"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { headingFont, focusRing } from "@/components/site-ui";

const STATUS_LABELS = {
  pending: "Pending",
  running: "Running",
  passed: "Passed",
  failed: "Failed",
  skipped: "Skipped",
  manual_confirmed: "Confirmed",
  waived: "Waived",
};

function statusClass(status) {
  if (status === "passed" || status === "manual_confirmed") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }
  if (status === "failed") return "border-red-400/30 bg-red-400/10 text-red-200";
  if (status === "waived") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  if (status === "running") return "border-sky-400/30 bg-sky-400/10 text-sky-200";
  return "border-white/15 bg-white/5 text-white/70";
}

export default function ClosePeriodChecklistPage() {
  const params = useParams();
  const router = useRouter();
  const closePeriodId = params?.id;

  const [run, setRun] = useState(null);
  const [period, setPeriod] = useState(null);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [waiveDraft, setWaiveDraft] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  async function loadRun() {
    if (!closePeriodId) return;
    const res = await fetch(`/api/close-periods/${closePeriodId}/checklist-run`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load checklist run.");
    setRun(data.run || null);
  }

  async function loadPeriod() {
    if (!closePeriodId) return;
    const res = await fetch(`/api/close-periods/${closePeriodId}`);
    if (res.ok) {
      const data = await res.json();
      setPeriod(data.closePeriod || null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setError("");
      try {
        await loadPeriod();
        const existing = await fetch(`/api/close-periods/${closePeriodId}/checklist-run`);
        const existingData = await existing.json();
        if (!existing.ok) throw new Error(existingData.error || "Unable to load checklist run.");
        if (!existingData.run) {
          setIsStarting(true);
          const startRes = await fetch(`/api/close-periods/${closePeriodId}/checklist-run`, {
            method: "POST",
          });
          const startData = await startRes.json();
          if (!startRes.ok) throw new Error(startData.error || "Unable to start checklist run.");
        }
        if (!cancelled) await loadRun();
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to start checklist.");
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [closePeriodId]);

  useEffect(() => {
    if (!run || run.status !== "running") return undefined;
    const timer = setInterval(() => {
      void loadRun().catch(() => {});
    }, 1500);
    return () => clearInterval(timer);
  }, [run?.status, closePeriodId]);

  const runItems = useMemo(() => {
    const items = run?.close_checklist_run_items || [];
    return [...items].sort(
      (a, b) =>
        (a.close_checklist_items?.sort_order || 0) -
        (b.close_checklist_items?.sort_order || 0),
    );
  }, [run]);

  const passedCount = runItems.filter((ri) =>
    ["passed", "manual_confirmed", "waived"].includes(ri.status),
  ).length;

  async function rerunVerifier(itemId) {
    setActionLoading(itemId);
    setError("");
    try {
      const res = await fetch(
        `/api/close-periods/${closePeriodId}/checklist-run/items/${itemId}/verify`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verify failed.");
      await loadRun();
    } catch (err) {
      setError(err.message || "Verify failed.");
    } finally {
      setActionLoading("");
    }
  }

  async function confirmItem(itemId) {
    if (!noteDraft.trim()) return;
    setActionLoading(itemId);
    setError("");
    try {
      const res = await fetch(
        `/api/close-periods/${closePeriodId}/checklist-run/items/${itemId}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: noteDraft.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirm failed.");
      setNoteDraft("");
      setExpandedItemId(null);
      await loadRun();
    } catch (err) {
      setError(err.message || "Confirm failed.");
    } finally {
      setActionLoading("");
    }
  }

  async function waiveItem(itemId) {
    if (!waiveDraft.trim()) return;
    setActionLoading(itemId);
    setError("");
    try {
      const res = await fetch(
        `/api/close-periods/${closePeriodId}/checklist-run/items/${itemId}/waive`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: waiveDraft.trim() }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Waive failed.");
      setWaiveDraft("");
      setExpandedItemId(null);
      await loadRun();
    } catch (err) {
      setError(err.message || "Waive failed.");
    } finally {
      setActionLoading("");
    }
  }

  const canProceed = run?.status === "passed";

  return (
    <div className="min-h-screen bg-[#111112] text-white">
      <SiteNav />
      <section className="mx-auto max-w-4xl px-6 pt-[200px] md:pt-[240px] lg:pt-[260px] pb-24">
        <p className="text-sm uppercase tracking-[0.2em] text-[#C9A961] mb-6">
          Pre-close checklist
        </p>
        <h1
          className={`${headingFont} text-4xl md:text-5xl font-semibold leading-[1.05] tracking-tight`}
        >
          Close pre-flight
        </h1>
        <p className="mt-4 text-white/70 leading-relaxed">
          {period
            ? `Period ${period.period_start} through ${period.period_end}.`
            : "Running checklist before drafting can begin."}
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111112] p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Run status</p>
              <p className="mt-1 text-lg font-semibold capitalize">
                {isStarting ? "Starting…" : run?.status || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Progress</p>
              <p className="mt-1 text-lg font-semibold">
                {passedCount}/{runItems.length} complete
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Mode</p>
              <p className="mt-1 text-lg font-semibold capitalize">{run?.run_mode || "—"}</p>
            </div>
          </div>
        </div>

        {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

        <ul className="mt-8 space-y-4">
          {runItems.map((ri) => {
            const item = ri.close_checklist_items;
            const expanded = expandedItemId === ri.id;
            return (
              <li
                key={ri.id}
                className="rounded-2xl border border-white/10 bg-[#111112] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-white/45">
                      {item?.category}
                    </p>
                    <p className="mt-1 font-semibold text-white">{item?.label}</p>
                    {ri.note && (
                      <p className="mt-2 text-sm text-white/60 leading-relaxed">{ri.note}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClass(ri.status)}`}
                  >
                    {STATUS_LABELS[ri.status] || ri.status}
                  </span>
                </div>

                {(ri.status === "failed" ||
                  (run?.run_mode === "manual" &&
                    ri.status === "pending" &&
                    ["confirm_note", "manual", "file_upload"].includes(item?.item_type))) && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedItemId(expanded ? null : ri.id);
                        setNoteDraft("");
                        setWaiveDraft("");
                      }}
                      className={`rounded-full border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 ${focusRing()}`}
                    >
                      {expanded ? "Close actions" : "Resolve item"}
                    </button>
                    {item?.ai_verifier && (
                      <button
                        type="button"
                        disabled={actionLoading === ri.id}
                        onClick={() => void rerunVerifier(ri.id)}
                        className={`rounded-full border border-[#C9A961]/40 px-4 py-2 text-sm text-[#C9A961] hover:bg-[#C9A961]/10 disabled:opacity-60 ${focusRing()}`}
                      >
                        Re-verify with AI
                      </button>
                    )}
                  </div>
                )}

                {run?.run_mode === "manual" &&
                  ["pending", "failed"].includes(ri.status) &&
                  item?.item_type === "ai_verified" &&
                  item?.ai_verifier && (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={actionLoading === ri.id}
                        onClick={() => void rerunVerifier(ri.id)}
                        className={`rounded-full border border-[#C9A961]/40 px-4 py-2 text-sm text-[#C9A961] hover:bg-[#C9A961]/10 disabled:opacity-60 ${focusRing()}`}
                      >
                        Verify with AI
                      </button>
                    </div>
                  )}

                {expanded && (
                  <div className="mt-4 space-y-4 border-t border-white/10 pt-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                        Confirm manually
                      </label>
                      <textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        rows={3}
                        className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white ${focusRing()}`}
                        placeholder="What did you verify?"
                      />
                      <button
                        type="button"
                        disabled={actionLoading === ri.id}
                        onClick={() => void confirmItem(ri.id)}
                        className={`mt-2 rounded-full bg-[#C9A961] px-5 py-2 text-sm font-semibold text-[#111112] disabled:opacity-60 ${focusRing()}`}
                      >
                        Confirm
                      </button>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">
                        Waive for this close
                      </label>
                      <textarea
                        value={waiveDraft}
                        onChange={(e) => setWaiveDraft(e.target.value)}
                        rows={2}
                        className={`w-full rounded-lg border border-white/15 bg-[#111112] px-4 py-3 text-white ${focusRing()}`}
                        placeholder="Reason for waiver"
                      />
                      <button
                        type="button"
                        disabled={actionLoading === ri.id}
                        onClick={() => void waiveItem(ri.id)}
                        className={`mt-2 rounded-full border border-amber-400/40 px-5 py-2 text-sm text-amber-200 disabled:opacity-60 ${focusRing()}`}
                      >
                        Waive
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <div className="mt-10 flex flex-wrap gap-4">
          <button
            type="button"
            disabled={!canProceed}
            title={
              canProceed
                ? "Proceed to draft close"
                : "Checklist must pass before drafting can begin"
            }
            onClick={() => router.push(`/close-periods/${closePeriodId}`)}
            className={`inline-flex items-center gap-2 rounded-full bg-[#C9A961] px-8 py-4 text-base font-semibold text-[#111112] hover:bg-[#DFC084] transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${focusRing()}`}
          >
            Proceed to draft close
            <span aria-hidden>→</span>
          </button>
          <button
            type="button"
            onClick={() => void loadRun()}
            className={`rounded-full border border-white/15 px-6 py-4 text-sm text-white/80 hover:bg-white/5 ${focusRing()}`}
          >
            Refresh
          </button>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
