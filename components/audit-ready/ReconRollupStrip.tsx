// components/audit-ready/ReconRollupStrip.tsx
//
// Client component that renders one row per shipped tie-out kind for the
// active as-of. Sourced from getReconRollupByPeriodEnd() server-side.
//
// Block A: renders + click-to-open slide-over.
// Block B: URL-synced open state via ?open_run=<runId>.
// Block D: adds skeleton + empty state around this component.
//
// Palette: AR internal (slate/amber/emerald + [#C9A961]/[#1A1A1C] chrome).
// Do NOT introduce Nexus marketing tokens here.

"use client";

import { WorkpaperSlideOver } from "@/components/audit-ready/recon-face/WorkpaperSlideOver";
import { focusRing, headingFont } from "@/components/site-ui";
import {
  BsStatusPill,
  RunStatusPill,
  TieOutStatePill,
} from "@/components/audit-ready/status-pills";
import {
  ROLLUP_KIND_LABELS,
  type ReconRollupRow,
  type RollupKind,
} from "@/lib/audit-ready/tie-out/rollup";
import { useOpenRunUrl } from "@/lib/audit-ready/tie-out/use-open-run-url";

// -----------------------------------------------------------------------------
// Formatters
// -----------------------------------------------------------------------------

function formatCents(cents: number | null): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Map run-level totals_status → the closest TieOutState pill vocabulary.
 * This is the semantic bridge between the run row and the per-PBC pill vocab.
 */
function totalsStatusToPill(
  totalsStatus: string | null,
): { state: string; label: string } {
  switch (totalsStatus) {
    case "tie":
      return { state: "tied_out", label: "Tied out" };
    case "auto_reconcile":
      return { state: "auto_reconciled", label: "Auto-reconciled" };
    case "review":
      return { state: "needs_review", label: "Needs review" };
    case "kickout":
      return { state: "kicked_out", label: "Kicked out" };
    case "failed":
      return { state: "failed", label: "Failed" };
    default:
      return { state: "not_yet_classified", label: "Not run" };
  }
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

export type ReconRollupStripProps = {
  engagementId: string;
  periodEnd: string;
  rows: ReconRollupRow[];
  /** Seeds ?open_run from the server render. null = no run open. */
  initialOpenRunId?: string | null;
  /**
   * Kinds in ROLLUP_KIND_ORDER that have zero runs for this period. Rendered
   * as a compact diagnostic line under the counter when non-empty. Omit or
   * pass an empty array to hide the diagnostic.
   */
  missingKinds?: RollupKind[];
};

export function ReconRollupStrip({
  engagementId: _engagementId,
  periodEnd,
  rows,
  initialOpenRunId = null,
  missingKinds = [],
}: ReconRollupStripProps) {
  const { openRunId, setOpenRunId } = useOpenRunUrl(initialOpenRunId);

  return (
    <section
      aria-labelledby="recon-rollup-heading"
      className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="recon-rollup-heading"
          className={`${headingFont} text-sm font-semibold text-[#ECEBE7]`}
        >
          Reconciliation Rollup — as of {periodEnd}
        </h2>
        <span className="text-xs text-[#7A7974]">
          {rows.length} of 7 kinds run
        </span>
      </div>
      {missingKinds.length > 0 && (
        <p
          className="mt-1 text-xs text-[#7A7974]"
          data-testid="recon-rollup-missing-kinds"
        >
          Not yet run:{" "}
          <span className="text-[#A29E93]">
            {missingKinds.map((k) => ROLLUP_KIND_LABELS[k]).join(", ")}
          </span>
        </p>
      )}

      <ul className="mt-3 divide-y divide-[#C9A961]/10">
        {rows.map((r) => (
          <ReconRollupRowView
            key={`${r.kind}:${r.runId}`}
            row={r}
            onOpen={() => setOpenRunId(r.runId)}
          />
        ))}
      </ul>

      <WorkpaperSlideOver
        runId={openRunId}
        onClose={() => setOpenRunId(null)}
        onRegenerated={(newRunId) => setOpenRunId(newRunId)}
      />
    </section>
  );
}

// -----------------------------------------------------------------------------
// Row view
// -----------------------------------------------------------------------------

function ReconRollupRowView({
  row,
  onOpen,
}: {
  row: ReconRollupRow;
  onOpen: () => void;
}) {
  const label = ROLLUP_KIND_LABELS[row.kind];
  const totals = totalsStatusToPill(row.totalsStatus);

  // BS summary gets the dedicated Tied/Needs review/Missing pill;
  // every other kind uses the TieOut state pill mapped from totals_status.
  const statePill =
    row.kind === "bs_recon_summary" && row.totalsStatus ? (
      <BsStatusPill
        status={row.totalsStatus === "tie" ? "tie" : "out_of_balance"}
      />
    ) : (
      <TieOutStatePill state={totals.state}>{totals.label}</TieOutStatePill>
    );

  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[#ECEBE7]">{label}</p>
        <p className="mt-0.5 font-mono text-xs text-[#7A7974]">{row.kind}</p>
      </div>
      <div>{statePill}</div>
      <div>
        <RunStatusPill status={row.runStatus} />
      </div>
      <div className="text-right">
        <p className="text-xs uppercase tracking-wide text-[#7A7974]">
          Variance
        </p>
        <p className="tabular-nums text-sm text-[#ECEBE7]">
          {formatCents(row.varianceCents)}
        </p>
      </div>
      <div>
        <button
          type="button"
          onClick={onOpen}
          disabled={row.runStatus !== "completed"}
          className={`rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C] px-2 py-1 text-xs font-medium text-[#ECEBE7] hover:border-[#C9A961]/50 disabled:opacity-40 disabled:hover:border-[#C9A961]/30 ${focusRing()}`}
        >
          Open workpaper
        </button>
      </div>
    </li>
  );
}
