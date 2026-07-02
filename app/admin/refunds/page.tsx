"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { AdvisacorLogo } from "../../../components/AdvisacorLogo";
import { SupportHelpButton } from "../../../components/SupportHelpButton";

type RefundQueueItem = {
  id: string;
  status: string;
  path: string;
  tier: string;
  customer_email: string;
  company_name: string;
  subscription_id: string;
  first_charge_id: string | null;
  days_remaining: number;
  message_excerpt: string;
  reason_provided?: string;
  created_at: string;
  resolved_at: string | null;
  decided_by: string | null;
  refundable_amount_cents: number;
};

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents || 0) / 100);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

function statusBadgeClass(status: string) {
  if (status === "pending_review") return "border-amber-300/40 bg-amber-500/15 text-amber-100";
  if (status === "completed") return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100";
  if (status === "denied" || status === "execution_failed") return "border-red-300/40 bg-red-500/15 text-red-100";
  return "border-white/10 bg-white/5 text-slate-200";
}

function RefundQueueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [pending, setPending] = useState<RefundQueueItem[]>([]);
  const [recent, setRecent] = useState<RefundQueueItem[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [modalItem, setModalItem] = useState<RefundQueueItem | null>(null);
  const [modalAction, setModalAction] = useState<"approve" | "deny" | null>(null);
  const [modalReason, setModalReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");

  const loadQueue = useCallback(async () => {
    setError("");
    const token = window.localStorage.getItem("supabase_access_token") || "";
    if (!token) {
      router.replace("/signin?next=/admin/refunds");
      return;
    }

    const response = await fetch("/api/admin/refunds", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await response.json();

    if (!response.ok) {
      setError(result.error || "Super admin access denied.");
      return;
    }

    setPending(result.pending || []);
    setRecent(result.recent || []);
  }, [router]);

  useEffect(() => {
    async function init() {
      setIsLoading(true);
      const token = window.localStorage.getItem("supabase_access_token") || "";
      if (!token) {
        router.replace("/signin?next=/admin/refunds");
        return;
      }

      const overviewResponse = await fetch("/api/admin/overview", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const overview = await overviewResponse.json();
      if (overviewResponse.ok) {
        setAdminEmail(overview.admin?.email || "");
      }

      await loadQueue();
      setIsLoading(false);
    }

    void init();
  }, [loadQueue, router]);

  const openModal = (item: RefundQueueItem, action: "approve" | "deny") => {
    setModalItem(item);
    setModalAction(action);
    setModalReason("");
  };

  const submitDecision = async () => {
    if (!modalItem || !modalAction || !modalReason.trim()) return;
    setIsSubmitting(true);
    setToast("");
    setError("");

    try {
      const token = window.localStorage.getItem("supabase_access_token") || "";
      const response = await fetch(`/api/admin/refunds/${modalItem.id}/decide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: modalAction, reason: modalReason.trim() }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to process refund decision.");
        return;
      }

      setToast(
        modalAction === "approve"
          ? "Refund approved — customer notified"
          : "Refund denied — customer notified",
      );
      setModalItem(null);
      setModalAction(null);
      await loadQueue();
    } catch {
      setError("Unable to process refund decision.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const highlightedPending = useMemo(
    () => pending.find((item) => item.id === highlightId),
    [pending, highlightId],
  );

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#0A1020] px-6 py-10 text-white">
        <p className="text-sm font-bold text-slate-400">Loading refund queue…</p>
      </main>
    );
  }

  if (error && !pending.length && !recent.length) {
    return (
      <main className="min-h-screen bg-[#0A1020] px-6 py-10 text-white">
        <p className="rounded-3xl border border-red-300/40 bg-red-500/15 p-6 text-sm font-bold text-red-100">{error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0A1020] px-6 py-6 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-4 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="block w-[min(420px,40vw)]">
            <AdvisacorLogo priority className="w-full" />
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm font-bold text-slate-300">
            <Link href="/admin" className="rounded-2xl border border-white/10 px-4 py-2 hover:bg-white/5">
              Admin dashboard
            </Link>
            {adminEmail ? <span>Logged in as {adminEmail}</span> : null}
          </div>
          <SupportHelpButton compact />
        </header>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#FFB36F]">Founder operations</p>
          <h1 className="mt-2 text-3xl font-black">Refund Queue</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Governed by Advisacor Refund Policy v1 · Virginia law. Decisions are anchored to subscription tier,
            first-cycle charge dates, and the disclosure validation surfaces that govern Advisacor billing.
          </p>
        </section>

        {toast && (
          <p className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-4 text-sm font-bold text-emerald-100">
            {toast}
          </p>
        )}
        {error && (
          <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm font-bold text-red-100">
            {error}
          </p>
        )}

        {highlightedPending && (
          <p className="mt-5 rounded-2xl border border-[#FF7A1A]/40 bg-[#FF7A1A]/10 p-4 text-sm font-bold text-orange-100">
            Highlighted request: {highlightedPending.company_name} · {highlightedPending.customer_email}
          </p>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">Pending review</h2>
          <p className="mt-2 text-sm text-slate-400">Path B requests awaiting founder decision (oldest first).</p>
          <div className="mt-5 grid gap-4">
            {pending.length === 0 && (
              <p className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-bold text-slate-400">
                No pending requests.
              </p>
            )}
            {pending.map((item) => (
              <article
                key={item.id}
                id={item.id}
                className={`rounded-3xl border bg-slate-950/60 p-5 ${item.id === highlightId ? "border-[#FF7A1A]/60" : "border-white/10"}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">
                      {item.company_name} · {item.customer_email}
                    </p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      Path {item.path} · {item.tier} · {formatUsd(item.refundable_amount_cents)} refundable ·{" "}
                      {item.days_remaining} days left in window
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-400">{item.message_excerpt}</p>
                    <p className="mt-2 text-xs font-bold text-slate-500">Submitted {formatDate(item.created_at)}</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => openModal(item, "approve")}
                      className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-500"
                    >
                      Approve refund
                    </button>
                    <button
                      type="button"
                      onClick={() => openModal(item, "deny")}
                      className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-black text-white hover:bg-white/5"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <h2 className="text-xl font-black">Recent activity</h2>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.14em] text-slate-500">
                <tr>
                  <th className="px-3 py-2">Company</th>
                  <th className="px-3 py-2">Customer</th>
                  <th className="px-3 py-2">Path</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Resolved</th>
                  <th className="px-3 py-2">Decided by</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="px-3 py-3 font-bold text-white">{item.company_name}</td>
                    <td className="px-3 py-3 text-slate-300">{item.customer_email}</td>
                    <td className="px-3 py-3 text-slate-300">{item.path}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-400">{formatDate(item.resolved_at)}</td>
                    <td className="px-3 py-3 text-slate-400">{item.decided_by || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modalItem && modalAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0A1020] p-6 shadow-2xl">
            <h3 className="text-lg font-black">
              {modalAction === "approve" ? "Approve refund" : "Deny refund"} — {modalItem.company_name}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Amount: {formatUsd(modalItem.refundable_amount_cents)} · Customer: {modalItem.customer_email}
            </p>
            <p className="mt-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
              {modalItem.reason_provided || modalItem.message_excerpt}
            </p>
            <label className="mt-4 block text-sm font-bold text-slate-300">
              Reason (required)
              <textarea
                value={modalReason}
                onChange={(event) => setModalReason(event.target.value)}
                rows={4}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#FF7A1A]/40"
              />
            </label>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setModalItem(null);
                  setModalAction(null);
                }}
                className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !modalReason.trim()}
                onClick={() => void submitDecision()}
                className="rounded-2xl bg-[#FF7A1A] px-4 py-2 text-sm font-black text-white disabled:opacity-50"
              >
                {isSubmitting ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default function AdminRefundsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#0A1020] px-6 py-10 text-white">
          <p className="text-sm font-bold text-slate-400">Loading refund queue…</p>
        </main>
      }
    >
      <RefundQueueContent />
    </Suspense>
  );
}
