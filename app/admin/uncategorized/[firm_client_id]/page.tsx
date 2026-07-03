"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SiteNav } from "../../../../components/SiteNav";
import { SiteFooter } from "../../../../components/SiteFooter";
import { headingFont, focusRing } from "../../../../components/site-ui";

type Proposal = {
  proposal_id: string;
  txn_id: string;
  txn_type: string;
  txn_date: string;
  txn_amount: number;
  vendor_name: string | null;
  current_account_name: string;
  suggested_account_name: string | null;
  confidence: number;
  confidence_bucket: "green" | "yellow" | "red";
  source: string;
  status: string;
};

const BUCKET_STYLES = {
  green: { bg: "#437A22", label: "Green" },
  yellow: { bg: "#D19900", label: "Yellow" },
  red: { bg: "#A12C7B", label: "Red" },
} as const;

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function UncategorizedAdminPage() {
  const params = useParams();
  const router = useRouter();
  const firmClientId = String(params?.firm_client_id ?? "");

  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isBulkAccepting, setIsBulkAccepting] = useState(false);

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("supabase_access_token") || "";
  }, []);

  const greenPending = useMemo(
    () => proposals.filter((p) => p.status === "pending" && p.confidence_bucket === "green"),
    [proposals],
  );

  const loadProposals = useCallback(async () => {
    if (!token) {
      router.replace(`/signin?next=/admin/uncategorized/${firmClientId}`);
      return;
    }
    setError("");
    setIsLoading(true);
    const response = await fetch(
      `/api/uncategorized/proposals?firm_client_id=${encodeURIComponent(firmClientId)}&status=pending&limit=200`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Failed to load proposals.");
      setIsLoading(false);
      return;
    }
    setProposals(result.proposals || []);
    setIsLoading(false);
  }, [firmClientId, router, token]);

  useEffect(() => {
    void loadProposals();
  }, [loadProposals]);

  async function runScan() {
    if (!token) return;
    setIsScanning(true);
    setToast("");
    const response = await fetch("/api/uncategorized/scan", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ firm_client_id: firmClientId }),
    });
    const result = await response.json();
    setIsScanning(false);
    if (!response.ok) {
      setError(result.error || "Scan failed.");
      return;
    }
    setToast(
      `Scan complete — ${result.proposals_generated} new proposals (green ${result.by_bucket?.green ?? 0}, yellow ${result.by_bucket?.yellow ?? 0}, red ${result.by_bucket?.red ?? 0}).`,
    );
    await loadProposals();
  }

  async function act(proposalId: string, action: "accept" | "reject" | "skip") {
    if (!token) return;
    let body: Record<string, string> | undefined;
    if (action === "reject") {
      const reason = window.prompt("Reject reason:");
      if (!reason) return;
      body = { reject_reason: reason };
    }
    const response = await fetch(`/api/uncategorized/proposals/${proposalId}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || `${action} failed.`);
      return;
    }
    setToast(`Proposal ${action}ed.`);
    await loadProposals();
  }

  async function bulkAcceptGreen() {
    if (!token || greenPending.length < 5) return;
    setIsBulkAccepting(true);
    const response = await fetch("/api/uncategorized/bulk-accept", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ proposal_ids: greenPending.map((p) => p.proposal_id) }),
    });
    const result = await response.json();
    setIsBulkAccepting(false);
    if (!response.ok) {
      setError(result.error || "Bulk accept failed.");
      return;
    }
    setToast(`Bulk accept: ${result.accepted} posted, ${result.failed} failed.`);
    await loadProposals();
  }

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#F9FAFB]">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5B8CFF]">
              D4 Pilot — Uncategorized Cleanup
            </p>
            <h1 className={`mt-2 text-3xl font-bold text-white ${headingFont}`}>
              Uncategorized Proposals
            </h1>
            <p className="mt-2 text-sm text-[#94A3B8]">
              Client <span className="font-mono text-[#CBD5E1]">{firmClientId}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin"
              className={`rounded-xl border border-white/10 px-4 py-2 text-sm text-[#CBD5E1] hover:bg-white/5 ${focusRing}`}
            >
              Back to Admin
            </Link>
            <button
              type="button"
              onClick={() => void runScan()}
              disabled={isScanning}
              className={`rounded-xl bg-[#5B8CFF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${focusRing}`}
            >
              {isScanning ? "Scanning…" : "Run Scan"}
            </button>
            {greenPending.length >= 5 && (
              <button
                type="button"
                onClick={() => void bulkAcceptGreen()}
                disabled={isBulkAccepting}
                className={`rounded-xl bg-[#437A22] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${focusRing}`}
              >
                {isBulkAccepting
                  ? "Accepting…"
                  : `Accept All Green (${greenPending.length})`}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}
        {toast && (
          <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {toast}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-[#243041] bg-[#111827]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-[#243041] text-xs uppercase tracking-wide text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3">Bucket</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vendor</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">From</th>
                <th className="px-4 py-3">Suggested</th>
                <th className="px-4 py-3">Conf.</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#94A3B8]">
                    Loading proposals…
                  </td>
                </tr>
              ) : proposals.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-[#94A3B8]">
                    No pending proposals. Run a scan to detect uncategorized transactions.
                  </td>
                </tr>
              ) : (
                proposals.map((p) => {
                  const bucket = BUCKET_STYLES[p.confidence_bucket];
                  return (
                    <tr key={p.proposal_id} className="border-t border-[#243041]/70">
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-white"
                          style={{ backgroundColor: bucket.bg }}
                          title={`${p.confidence.toFixed(3)} · ${p.source}`}
                        >
                          {bucket.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">{p.txn_date}</td>
                      <td className="px-4 py-3">{p.vendor_name || "—"}</td>
                      <td className="px-4 py-3">{formatUsd(p.txn_amount)}</td>
                      <td className="px-4 py-3">{p.current_account_name}</td>
                      <td className="px-4 py-3">{p.suggested_account_name || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{p.confidence.toFixed(3)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void act(p.proposal_id, "accept")}
                            className={`rounded-lg bg-[#437A22]/20 px-2 py-1 text-xs text-[#B7E4A3] hover:bg-[#437A22]/30 ${focusRing}`}
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => void act(p.proposal_id, "reject")}
                            className={`rounded-lg bg-[#A12C7B]/20 px-2 py-1 text-xs text-[#F0B8D8] hover:bg-[#A12C7B]/30 ${focusRing}`}
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => void act(p.proposal_id, "skip")}
                            className={`rounded-lg bg-white/5 px-2 py-1 text-xs text-[#CBD5E1] hover:bg-white/10 ${focusRing}`}
                          >
                            Skip
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
