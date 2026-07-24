"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type {
  KickoutRow,
  ResolutionStatus,
} from "@/lib/audit-ready/kickouts/list-kickouts";
import { AccountDrilldown } from "@/components/audit-ready/AccountDrilldown";
import { InvestigationModal } from "@/components/audit-ready/InvestigationModal";
import type {
  BsSummaryLine,
  BsTransaction,
} from "@/lib/audit-ready/tie-out/bs-recon-lines";
import { focusRing } from "@/components/site-ui";

type AgeFilter = "all" | "new_this_close" | "carried_over" | "stale";

function formatCents(cents: number): string {
  const dollars = cents / 100;
  const sign = dollars < 0 ? "-" : "";
  return `${sign}$${Math.abs(dollars).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function ageBucketLabel(bucket: string): string {
  return (
    {
      new_this_close: "New this close",
      carried_over: "Carried over",
      stale: "Stale >90d",
    }[bucket] ?? bucket
  );
}

function statusBadge(status: ResolutionStatus | "none") {
  const styles: Record<string, string> = {
    none: "bg-slate-100 text-slate-700",
    pending: "bg-amber-100 text-amber-800",
    escalated: "bg-red-100 text-red-800",
    resolved: "bg-emerald-100 text-emerald-800",
  };
  const labels: Record<string, string> = {
    none: "Not investigated",
    pending: "Investigated · pending",
    escalated: "Escalated",
    resolved: "Resolved",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function KickoutInboxClient({
  initialRows,
}: {
  initialRows: KickoutRow[];
}) {
  const router = useRouter();
  const [ageFilter, setAgeFilter] = useState<AgeFilter>("all");
  const [showResolved, setShowResolved] = useState(false);

  const [drilldownRow, setDrilldownRow] = useState<KickoutRow | null>(null);
  const [drilldownLine, setDrilldownLine] = useState<BsSummaryLine | null>(
    null,
  );
  const [drilldownTxns, setDrilldownTxns] = useState<BsTransaction[]>([]);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);
  const [drilldownSourceUrl, setDrilldownSourceUrl] = useState<string | null>(
    null,
  );

  const [investigateRow, setInvestigateRow] = useState<KickoutRow | null>(null);

  const filtered = useMemo(() => {
    return initialRows.filter((r) => {
      if (ageFilter !== "all" && r.age_bucket !== ageFilter) return false;
      const status = r.latest_investigation?.resolution_status ?? "pending";
      if (!showResolved && status === "resolved") return false;
      return true;
    });
  }, [initialRows, ageFilter, showResolved]);

  const counts = useMemo(
    () => ({
      all: initialRows.length,
      new_this_close: initialRows.filter((r) => r.age_bucket === "new_this_close")
        .length,
      carried_over: initialRows.filter((r) => r.age_bucket === "carried_over")
        .length,
      stale: initialRows.filter((r) => r.age_bucket === "stale").length,
    }),
    [initialRows],
  );

  const openBsDrilldown = useCallback(async (row: KickoutRow) => {
    if (row.source_type !== "bs_summary_line" || !row.bs_line_id) return;
    setDrilldownRow(row);
    setDrilldownLoading(true);
    setDrilldownError(null);
    setDrilldownLine(null);
    setDrilldownTxns([]);
    setDrilldownSourceUrl(null);
    try {
      const res = await fetch(
        `/api/audit-ready/${row.engagement_id}/tie-out/summary-line/${row.bs_line_id}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `HTTP ${res.status}`,
        );
      }
      const data = await res.json();
      setDrilldownLine(data.line ?? null);
      setDrilldownTxns(data.transactions ?? []);
      setDrilldownSourceUrl(
        data.subledgerSourceUrl ?? data.subledger_source_url ?? null,
      );
    } catch (e: unknown) {
      setDrilldownError(
        e instanceof Error ? e.message : "Failed to load account transactions",
      );
    } finally {
      setDrilldownLoading(false);
    }
  }, []);

  const openPbcTarget = (row: KickoutRow) => {
    if (row.source_type !== "pbc_run" || !row.pbc_run_id) return;
    const url = `/audit-ready/${row.engagement_id}/tie-out-summary?as_of=${encodeURIComponent(row.period_end)}&highlight_run=${row.pbc_run_id}`;
    window.location.href = url;
  };

  const handleInvestigated = () => {
    setInvestigateRow(null);
    router.refresh();
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip
          active={ageFilter === "all"}
          onClick={() => setAgeFilter("all")}
        >
          All ({counts.all})
        </FilterChip>
        <FilterChip
          active={ageFilter === "new_this_close"}
          onClick={() => setAgeFilter("new_this_close")}
        >
          New this close ({counts.new_this_close})
        </FilterChip>
        <FilterChip
          active={ageFilter === "carried_over"}
          onClick={() => setAgeFilter("carried_over")}
        >
          Carried over ({counts.carried_over})
        </FilterChip>
        <FilterChip
          active={ageFilter === "stale"}
          onClick={() => setAgeFilter("stale")}
        >
          Stale &gt;90d ({counts.stale})
        </FilterChip>
        <label className="ml-auto flex items-center gap-2 text-sm text-[#A29E93]">
          <input
            type="checkbox"
            checked={showResolved}
            onChange={(e) => setShowResolved(e.target.checked)}
            className="rounded border-[#C9A961]/30 bg-[#1A1A1C]"
          />
          Show resolved
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-8 text-center">
          <p className="text-sm text-[#A29E93]">
            No kickouts match the current filter.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50">
          <table className="min-w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-[#7A7974]">
              <tr>
                <th className="px-3 py-2 text-left">Account / Kind</th>
                <th className="px-3 py-2 text-left">Engagement</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">Variance</th>
                <th className="px-3 py-2 text-left">Age</th>
                <th className="px-3 py-2 text-left">Investigation</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const status =
                  row.latest_investigation?.resolution_status ?? "none";
                return (
                  <tr
                    key={row.id}
                    className="border-t border-[#C9A961]/20 hover:bg-[#1A1A1C]/60"
                  >
                    <td className="px-3 py-2">
                      <div className="font-medium text-[#ECEBE7]">
                        {row.account_or_kind}
                      </div>
                      {row.account_type && (
                        <div className="text-xs text-[#7A7974]">
                          {row.account_type}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-[#A29E93]">
                      {row.engagement_name}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-[#A29E93]">
                      {row.period_end}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-[#ECEBE7]">
                      {formatCents(row.variance_cents)}
                    </td>
                    <td className="px-3 py-2 text-[#A29E93]">
                      {ageBucketLabel(row.age_bucket)}
                    </td>
                    <td className="px-3 py-2">{statusBadge(status)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-2">
                        {row.source_type === "bs_summary_line" ? (
                          <button
                            type="button"
                            className={`mr-1 rounded border border-[#C9A961]/30 bg-[#1A1A1C] px-2 py-1 text-xs font-medium text-[#ECEBE7] hover:border-[#C9A961]/50 ${focusRing()}`}
                            onClick={() => openBsDrilldown(row)}
                          >
                            View
                          </button>
                        ) : (
                          <button
                            type="button"
                            className={`mr-1 rounded border border-[#C9A961]/30 bg-[#1A1A1C] px-2 py-1 text-xs font-medium text-[#ECEBE7] hover:border-[#C9A961]/50 ${focusRing()}`}
                            onClick={() => openPbcTarget(row)}
                          >
                            Open
                          </button>
                        )}
                        <button
                          type="button"
                          className={`rounded border border-[#C9A961]/40 bg-[#C9A961]/15 px-2 py-1 text-xs font-medium text-[#C9A961] hover:bg-[#C9A961]/25 ${focusRing()}`}
                          onClick={() => setInvestigateRow(row)}
                        >
                          Investigate
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <AccountDrilldown
        open={drilldownRow !== null}
        onClose={() => {
          setDrilldownRow(null);
          setDrilldownLine(null);
          setDrilldownTxns([]);
          setDrilldownError(null);
        }}
        line={drilldownLine}
        periodEnd={drilldownRow?.period_end ?? ""}
        transactions={drilldownTxns}
        subledgerSourceUrl={drilldownSourceUrl}
        loading={drilldownLoading}
        error={drilldownError}
      />

      {investigateRow && (
        <InvestigationModal
          row={investigateRow}
          onClose={() => setInvestigateRow(null)}
          onSuccess={handleInvestigated}
        />
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition ${focusRing()} ${
        active
          ? "bg-[#C9A961] text-[#111112]"
          : "border border-[#C9A961]/30 bg-[#1A1A1C]/50 text-[#A29E93] hover:border-[#C9A961]/50"
      }`}
    >
      {children}
    </button>
  );
}
