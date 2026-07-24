"use client";

import { useMemo, useState } from "react";
import type {
  BsSummaryLine,
  BsTransaction,
} from "@/lib/audit-ready/tie-out/bs-recon-lines";
import { AccountDrilldown } from "@/components/audit-ready/AccountDrilldown";

// Re-export types for convenience (originate in data layer per spec amendment #6)
export type {
  BsSummaryLine,
  BsTransaction,
} from "@/lib/audit-ready/tie-out/bs-recon-lines";

type FilterKey = "all" | "kickouts" | "review" | "tied";

type SortKey =
  | "sort_order"
  | "qbo_account_name"
  | "qbo_account_type"
  | "classification"
  | "ending_balance_cents"
  | "gl_ending_balance_cents"
  | "tie_variance_cents"
  | "totals_status";

type SortDir = "asc" | "desc";

type Props = {
  engagementId: string;
  artifactId: string;
  periodEnd: string;
  lines: BsSummaryLine[];
};

function formatCurrency(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Status pills — AR internal slate/amber/emerald convention (paste-OK). */
const STATUS_STYLES: Record<string, string> = {
  tie: "bg-emerald-50 text-emerald-800 border-emerald-200",
  auto_reconcile: "bg-sky-50 text-sky-800 border-sky-200",
  review: "bg-amber-50 text-amber-800 border-amber-200",
  kickout: "bg-amber-100 text-amber-900 border-amber-400 font-semibold",
  failed: "bg-red-50 text-red-800 border-red-200",
};

const CLASSIFICATION_STYLES: Record<string, string> = {
  Asset: "bg-sky-50 text-sky-800 border-sky-200",
  Liability: "bg-rose-50 text-rose-800 border-rose-200",
  Equity: "bg-violet-50 text-violet-800 border-violet-200",
};

export function BsSummaryLinesTable({
  engagementId,
  artifactId: _artifactId,
  periodEnd,
  lines,
}: Props) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sortKey, setSortKey] = useState<SortKey>("sort_order");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [openLine, setOpenLine] = useState<BsSummaryLine | null>(null);
  const [drilldownTxns, setDrilldownTxns] = useState<BsTransaction[]>([]);
  const [drilldownUrl, setDrilldownUrl] = useState<string | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return lines.filter((l) => {
      if (filter === "all") return true;
      if (filter === "kickouts") return l.totals_status === "kickout";
      if (filter === "review")
        return ["kickout", "review", "failed"].includes(l.totals_status);
      if (filter === "tied") return l.totals_status === "tie";
      return true;
    });
  }, [lines, filter]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [filtered, sortKey, sortDir]);

  const totals = useMemo(() => {
    return lines
      .filter((l) => !l.is_computed_line)
      .reduce(
        (acc, l) => ({
          ending: acc.ending + l.ending_balance_cents,
          gl: acc.gl + l.gl_ending_balance_cents,
          variance: acc.variance + l.tie_variance_cents,
        }),
        { ending: 0, gl: 0, variance: 0 },
      );
  }, [lines]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleViewDetail = async (line: BsSummaryLine) => {
    setOpenLine(line);
    setDrilldownLoading(true);
    setDrilldownError(null);
    setDrilldownTxns([]);
    setDrilldownUrl(null);
    try {
      const res = await fetch(
        `/api/audit-ready/${engagementId}/tie-out/summary-line/${line.id}`,
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error || `HTTP ${res.status}`,
        );
      }
      const body = await res.json();
      setDrilldownTxns(body.transactions || []);
      setDrilldownUrl(body.subledgerSourceUrl || null);
    } catch (err) {
      setDrilldownError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleClose = () => {
    setOpenLine(null);
    setDrilldownTxns([]);
    setDrilldownUrl(null);
    setDrilldownError(null);
  };

  const filterChips: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: lines.length },
    {
      key: "kickouts",
      label: "Kickouts only",
      count: lines.filter((l) => l.totals_status === "kickout").length,
    },
    {
      key: "review",
      label: "Review needed",
      count: lines.filter((l) =>
        ["kickout", "review", "failed"].includes(l.totals_status),
      ).length,
    },
    {
      key: "tied",
      label: "Tied",
      count: lines.filter((l) => l.totals_status === "tie").length,
    },
  ];

  // TODO(4.0.1): render activity_count column once resolver stops hardcoding 0

  if (lines.length === 0) {
    return (
      <p className="text-sm text-[#A29E93]">
        No summary lines for this reconciliation.
      </p>
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => setFilter(chip.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === chip.key
                ? "border-[#C9A961]/40 bg-[#1A1A1C] text-[#ECEBE7]"
                : "border-[#C9A961]/20 bg-[#1A1A1C]/40 text-[#A29E93] hover:border-[#C9A961]/30 hover:text-[#ECEBE7]"
            }`}
          >
            {chip.label} ({chip.count})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-[#C9A961]/20 bg-[#1A1A1C]/50">
        <table className="w-full text-sm">
          <thead className="bg-[#1A1A1C] text-xs uppercase tracking-wide text-[#7A7974]">
            <tr>
              <SortableHeader
                label="Account"
                sortKey="qbo_account_name"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="left"
              />
              <SortableHeader
                label="Type"
                sortKey="qbo_account_type"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="left"
              />
              <SortableHeader
                label="Classification"
                sortKey="classification"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="left"
              />
              <SortableHeader
                label="Ending Balance (from GL detail)"
                sortKey="ending_balance_cents"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortableHeader
                label="GL Ending Balance (from Trial Balance)"
                sortKey="gl_ending_balance_cents"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Variance"
                sortKey="tie_variance_cents"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Status"
                sortKey="totals_status"
                active={sortKey}
                dir={sortDir}
                onClick={toggleSort}
                align="center"
              />
              <th className="px-3 py-2 text-center">Detail</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((line) => {
              const isKickout = line.totals_status === "kickout";
              const isFailed = line.totals_status === "failed";
              const isComputed = line.is_computed_line;
              const canDrill = !isComputed && !!line.child_run_id;
              const varianceClass =
                line.tie_variance_cents !== 0
                  ? "text-red-400 font-medium"
                  : "text-[#ECEBE7]";

              return (
                <tr
                  key={line.id}
                  className={`border-t border-[#C9A961]/15 ${
                    isKickout
                      ? "border-l-4 border-l-amber-500 bg-amber-950/20"
                      : isFailed
                        ? "border-l-4 border-l-red-500 bg-red-950/20"
                        : isComputed
                          ? "bg-[#1A1A1C]/40"
                          : ""
                  }`}
                  title={
                    isFailed && line.error_message
                      ? line.error_message
                      : undefined
                  }
                >
                  <td
                    className={`px-3 py-2 ${
                      isComputed
                        ? "italic text-[#A29E93]"
                        : "text-[#ECEBE7]"
                    }`}
                  >
                    {line.qbo_account_name}
                  </td>
                  <td className="px-3 py-2 text-[#A29E93]">
                    {line.qbo_account_type ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-xs ${
                        CLASSIFICATION_STYLES[line.classification] ||
                        "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {line.classification}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#ECEBE7]">
                    {formatCurrency(line.ending_balance_cents)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-[#ECEBE7]">
                    {formatCurrency(line.gl_ending_balance_cents)}
                  </td>
                  <td
                    className={`px-3 py-2 text-right tabular-nums ${varianceClass}`}
                  >
                    {formatCurrency(line.tie_variance_cents)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={`inline-block rounded border px-2 py-0.5 text-xs ${
                        STATUS_STYLES[line.totals_status] ||
                        "bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {line.totals_status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => canDrill && handleViewDetail(line)}
                      disabled={!canDrill}
                      className={`rounded border px-2 py-1 text-xs font-medium transition ${
                        canDrill
                          ? "border-[#C9A961]/30 bg-[#1A1A1C] text-[#ECEBE7] hover:border-[#C9A961]/50"
                          : "cursor-not-allowed border-[#C9A961]/10 bg-[#1A1A1C]/40 text-[#7A7974]"
                      }`}
                    >
                      View
                    </button>
                    {isKickout && canDrill && (
                      <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-amber-400">
                        Check this
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-6 text-center text-[#A29E93]"
                >
                  No lines match the current filter.
                </td>
              </tr>
            )}
          </tbody>
          {lines.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[#C9A961]/30 bg-[#1A1A1C] font-semibold text-[#ECEBE7]">
                <td className="px-3 py-2" colSpan={3}>
                  Total (real accounts only)
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(totals.ending)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatCurrency(totals.gl)}
                </td>
                <td
                  className={`px-3 py-2 text-right tabular-nums ${
                    totals.variance !== 0 ? "text-red-400" : ""
                  }`}
                >
                  {formatCurrency(totals.variance)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      <AccountDrilldown
        open={openLine !== null}
        onClose={handleClose}
        line={openLine}
        periodEnd={periodEnd}
        transactions={drilldownTxns}
        subledgerSourceUrl={drilldownUrl}
        loading={drilldownLoading}
        error={drilldownError}
      />
    </>
  );
}

function SortableHeader({
  label,
  sortKey,
  active,
  dir,
  onClick,
  align,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: SortDir;
  onClick: (k: SortKey) => void;
  align: "left" | "right" | "center";
}) {
  const isActive = active === sortKey;
  const alignClass =
    align === "right"
      ? "text-right"
      : align === "center"
        ? "text-center"
        : "text-left";
  return (
    <th className={`px-3 py-2 ${alignClass}`}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className={`inline-flex items-center gap-1 uppercase tracking-wide ${
          isActive ? "text-[#ECEBE7]" : "text-[#7A7974]"
        } hover:text-[#ECEBE7]`}
      >
        {label}
        {isActive && (
          <span aria-hidden="true">{dir === "asc" ? "▲" : "▼"}</span>
        )}
      </button>
    </th>
  );
}
