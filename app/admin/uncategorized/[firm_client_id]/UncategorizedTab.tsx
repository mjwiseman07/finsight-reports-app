"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { focusRing } from "../../../../components/site-ui";

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
  green: { bg: "#6DAA45", label: "Green" },
  yellow: { bg: "#D19900", label: "Yellow" },
  red: { bg: "#B85C5C", label: "Red" },
} as const;

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function UncategorizedTab({ firmClientId }: { firmClientId: string }) {
  const router = useRouter();
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
    <div>
      <div className="mb-6 flex flex-wrap justify-end gap-3">
        <button
          type="button"
          onClick={() => void runScan()}
          disabled={isScanning}
          className={`rounded-full bg-[#C9A961] px-4 py-2 text-sm font-semibold text-[#111112] hover:bg-[#DFC084] disabled:opacity-50 ${focusRing()}`}
        >
          {isScanning ? "Scanning…" : "Run Scan"}
        </button>
        {greenPending.length >= 5 && (
          <button
            type="button"
            onClick={() => void bulkAcceptGreen()}
            disabled={isBulkAccepting}
            className={`rounded-full bg-[#6DAA45] px-4 py-2 text-sm font-semibold text-[#111112] hover:bg-[#B5E28A] disabled:opacity-50 ${focusRing()}`}
          >
            {isBulkAccepting ? "Accepting…" : `Accept All Green (${greenPending.length})`}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-[#B85C5C]/40 bg-[#B85C5C]/10 px-4 py-3 text-sm text-[#F0BFBF]">
          {error}
        </div>
      )}
      {toast && (
        <div className="mb-4 rounded-xl border border-[#6DAA45]/40 bg-[#6DAA45]/10 px-4 py-3 text-sm text-[#B5E28A]">
          {toast}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-[#C9A961]/20 bg-[#1A1A1C]/85">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#C9A961]/20 text-xs uppercase tracking-wide text-[#A29E93]">
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
                <td colSpan={8} className="px-4 py-8 text-center text-[#A29E93]">
                  Loading proposals…
                </td>
              </tr>
            ) : proposals.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[#A29E93]">
                  No pending proposals. Run a scan to detect uncategorized transactions.
                </td>
              </tr>
            ) : (
              proposals.map((p) => {
                const bucket = BUCKET_STYLES[p.confidence_bucket];
                return (
                  <tr key={p.proposal_id} className="border-t border-[#C9A961]/10 text-[#ECEBE7]">
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold text-[#111112]"
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
                    <td className="px-4 py-3 font-mono text-xs text-[#A29E93]">{p.confidence.toFixed(3)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void act(p.proposal_id, "accept")}
                          className={`rounded-full bg-[#6DAA45]/20 px-2.5 py-1 text-xs font-semibold text-[#B5E28A] hover:bg-[#6DAA45]/30 ${focusRing()}`}
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(p.proposal_id, "reject")}
                          className={`rounded-full bg-[#B85C5C]/20 px-2.5 py-1 text-xs font-semibold text-[#F0BFBF] hover:bg-[#B85C5C]/30 ${focusRing()}`}
                        >
                          Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => void act(p.proposal_id, "skip")}
                          className={`rounded-full bg-[#C9A961]/10 px-2.5 py-1 text-xs font-semibold text-[#ECEBE7] hover:bg-[#C9A961]/20 ${focusRing()}`}
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
    </div>
  );
}
