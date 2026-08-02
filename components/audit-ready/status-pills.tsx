// components/audit-ready/status-pills.tsx
//
// Shared status pill vocabulary for Tie-Out Summary + Recon Rollup surfaces.
//
// AR INTERNAL PALETTE — slate/amber/emerald/rose/sky/orange. Do NOT introduce
// Nexus (marketing) tokens here; this module renders on the audit-ready internal
// dashboard, not the marketing scope.
//
// Sourced from TieOutSummaryClient PILL_STYLES (TIEOUT-1 + TIEOUT-2) and the
// inline BS status string that shipped in the page-level BsAsOfBanner. Blocks
// A/B/D (rollup strip, deep-link nav, empty/loading states) all import from
// this module.

import type { ReactNode } from "react";

/** Common pill shell — same shape as the pre-refactor inline JSX. */
const PILL_BASE =
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

const FALLBACK = "bg-slate-100 text-slate-700 ring-slate-200";

// ---------- Tie-Out State (per-PBC row) ----------

/**
 * Tie-out state vocabulary, verbatim from TieOutSummaryClient.PILL_STYLES.
 * Any new state must be added here AND to TieOutState below.
 */
export type TieOutState =
  | "no_tolerance_policy"
  | "not_yet_classified"
  | "requires_manual_review"
  | "classified"
  | "ready_to_run"
  | "tied_out"
  | "auto_reconciled"
  | "needs_review"
  | "kicked_out"
  | "failed";

const TIE_OUT_STATE_STYLES: Record<TieOutState, string> = {
  // shipped in TIEOUT-1:
  no_tolerance_policy: "bg-slate-100 text-slate-700 ring-slate-200",
  not_yet_classified: "bg-amber-50 text-amber-800 ring-amber-200",
  requires_manual_review: "bg-orange-50 text-orange-800 ring-orange-200",
  classified: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  // shipped in TIEOUT-2:
  ready_to_run: "bg-sky-50 text-sky-800 ring-sky-200",
  tied_out: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  auto_reconciled: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  needs_review: "bg-amber-50 text-amber-800 ring-amber-200",
  kicked_out: "bg-rose-50 text-rose-800 ring-rose-200",
  failed: "bg-rose-50 text-rose-900 ring-rose-300",
};

export function TieOutStatePill({
  state,
  children,
}: {
  state: string;
  children?: ReactNode;
}) {
  const cls = TIE_OUT_STATE_STYLES[state as TieOutState] ?? FALLBACK;
  const label = children ?? String(state).replace(/_/g, " ");
  return <span className={`${PILL_BASE} ${cls}`}>{label}</span>;
}

// ---------- BS Equation Status (BS recon summary) ----------

/**
 * Balance-sheet equation status vocabulary.
 * Sourced from bs_equation_status column on audit_ready_bs_recon_summary_artifacts.
 */
export type BsStatus = "tie" | "out_of_balance" | "missing";

const BS_STATUS_STYLES: Record<BsStatus, string> = {
  tie: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  out_of_balance: "bg-amber-50 text-amber-800 ring-amber-200",
  missing: "bg-slate-100 text-slate-700 ring-slate-200",
};

const BS_STATUS_LABELS: Record<BsStatus, string> = {
  tie: "Tied",
  out_of_balance: "Needs review",
  missing: "Missing",
};

export function BsStatusPill({ status }: { status: string }) {
  const key = (status as BsStatus) in BS_STATUS_STYLES ? (status as BsStatus) : "missing";
  return (
    <span className={`${PILL_BASE} ${BS_STATUS_STYLES[key]}`}>
      {BS_STATUS_LABELS[key]}
    </span>
  );
}

// ---------- Run Status (per-workpaper run) ----------

/**
 * Run-level status vocabulary — used on the rollup strip run indicator.
 * Distinct from TieOutState (which is per-PBC-line) and BsStatus (which is
 * per-BS-artifact). Values sourced from audit_ready_workpapers.status.
 */
export type RunStatus = "passed" | "failed" | "not_run" | "superseded";

const RUN_STATUS_STYLES: Record<RunStatus, string> = {
  passed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-50 text-rose-900 ring-rose-300",
  not_run: "bg-slate-100 text-slate-700 ring-slate-200",
  superseded: "bg-amber-50 text-amber-800 ring-amber-200",
};

const RUN_STATUS_LABELS: Record<RunStatus, string> = {
  passed: "Passed",
  failed: "Failed",
  not_run: "Not run",
  superseded: "Superseded",
};

export function RunStatusPill({ status }: { status: string }) {
  const key = (status as RunStatus) in RUN_STATUS_STYLES
    ? (status as RunStatus)
    : "not_run";
  return (
    <span className={`${PILL_BASE} ${RUN_STATUS_STYLES[key]}`}>
      {RUN_STATUS_LABELS[key]}
    </span>
  );
}

// ---------- Test-only exports (Block C acceptance) ----------

/**
 * Exported for the unit test only. Runtime code must not import these directly —
 * always use the <TieOutStatePill>, <BsStatusPill>, <RunStatusPill> components
 * so the pill shell class stays canonical.
 */
export const __TEST_ONLY__ = {
  PILL_BASE,
  FALLBACK,
  TIE_OUT_STATE_STYLES,
  BS_STATUS_STYLES,
  BS_STATUS_LABELS,
  RUN_STATUS_STYLES,
  RUN_STATUS_LABELS,
} satisfies Record<string, unknown>;
