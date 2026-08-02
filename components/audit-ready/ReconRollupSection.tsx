// components/audit-ready/ReconRollupSection.tsx
//
// Async server component that owns the rollup fetch + renders one of two
// terminal states:
//
//   - rows.length === 0 → empty-state notice ("No tie-out runs recorded")
//   - rows.length > 0   → <ReconRollupStrip> with missing-kinds diagnostic
//
// The parent page wraps this in <Suspense> with <ReconRollupStripSkeleton>
// as the fallback. This isolates any slow-rollup latency from the rest of
// the tie-out summary page shell.
//
// Palette: AR internal only.

import { headingFont } from "@/components/site-ui";
import { ReconRollupStrip } from "@/components/audit-ready/ReconRollupStrip";
import {
  getReconRollupByPeriodEnd,
  ROLLUP_KIND_ORDER,
  type RollupKind,
} from "@/lib/audit-ready/tie-out/rollup";

export type ReconRollupSectionProps = {
  engagementId: string;
  periodEnd: string;
  initialOpenRunId: string | null;
};

export async function ReconRollupSection({
  engagementId,
  periodEnd,
  initialOpenRunId,
}: ReconRollupSectionProps) {
  const rows = await getReconRollupByPeriodEnd({
    engagementId,
    periodEnd,
  });

  if (rows.length === 0) {
    return <ReconRollupEmptyState periodEnd={periodEnd} />;
  }

  const presentKinds = new Set<RollupKind>(rows.map((r) => r.kind));
  const missingKinds: RollupKind[] = ROLLUP_KIND_ORDER.filter(
    (k) => !presentKinds.has(k),
  );

  return (
    <ReconRollupStrip
      engagementId={engagementId}
      periodEnd={periodEnd}
      rows={rows}
      initialOpenRunId={initialOpenRunId}
      missingKinds={missingKinds}
    />
  );
}

// -----------------------------------------------------------------------------
// Empty state
// -----------------------------------------------------------------------------

function ReconRollupEmptyState({ periodEnd }: { periodEnd: string }) {
  return (
    <section
      aria-labelledby="recon-rollup-empty-heading"
      className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-4"
      data-testid="recon-rollup-empty"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="recon-rollup-empty-heading"
          className={`${headingFont} text-sm font-semibold text-[#ECEBE7]`}
        >
          Reconciliation Rollup — as of {periodEnd}
        </h2>
        <span className="text-xs text-[#7A7974]">0 of 7 kinds run</span>
      </div>
      <div className="mt-3 rounded-md border border-dashed border-[#C9A961]/30 bg-[#111112]/50 p-4">
        <p className="text-sm font-medium text-[#ECEBE7]">
          No tie-out runs recorded for {periodEnd}
        </p>
        <p className="mt-1 text-sm text-[#A29E93]">
          Trigger a classify or resolver run from the PBC row table below to
          populate this rollup.
        </p>
      </div>
    </section>
  );
}
