// components/audit-ready/ReconRollupStripSkeleton.tsx
//
// Suspense fallback for <ReconRollupSection>. Mirrors the real strip's
// grid dimensions to avoid layout shift on hydration.
//
// Palette: AR internal only (do NOT introduce Nexus marketing tokens).

import { headingFont } from "@/components/site-ui";
import { ROLLUP_KIND_ORDER } from "@/lib/audit-ready/tie-out/rollup";

export type ReconRollupStripSkeletonProps = {
  /** Optional — matches the real heading exactly. If omitted, header shows a shimmer bar. */
  periodEnd?: string;
};

export function ReconRollupStripSkeleton({
  periodEnd,
}: ReconRollupStripSkeletonProps = {}) {
  return (
    <section
      aria-busy="true"
      aria-labelledby="recon-rollup-skeleton-heading"
      className="rounded-lg border border-[#C9A961]/30 bg-[#1A1A1C]/50 p-4"
      data-testid="recon-rollup-skeleton"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2
          id="recon-rollup-skeleton-heading"
          className={`${headingFont} text-sm font-semibold text-[#ECEBE7]`}
        >
          {periodEnd ? (
            <>Reconciliation Rollup — as of {periodEnd}</>
          ) : (
            <span className="inline-block h-4 w-64 animate-pulse rounded bg-[#2A2A2C]" />
          )}
        </h2>
        <span
          className="inline-block h-3 w-24 animate-pulse rounded bg-[#2A2A2C]"
          aria-hidden="true"
        />
      </div>

      <ul className="mt-3 divide-y divide-[#C9A961]/10">
        {ROLLUP_KIND_ORDER.map((kind) => (
          <li
            key={kind}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] items-center gap-4 py-3"
          >
            <div className="min-w-0 space-y-1.5">
              <span className="block h-3.5 w-40 animate-pulse rounded bg-[#2A2A2C]" />
              <span className="block h-3 w-24 animate-pulse rounded bg-[#2A2A2C]" />
            </div>
            <span
              className="h-5 w-20 animate-pulse rounded-full bg-[#2A2A2C]"
              aria-hidden="true"
            />
            <span
              className="h-5 w-20 animate-pulse rounded-full bg-[#2A2A2C]"
              aria-hidden="true"
            />
            <div className="space-y-1 text-right">
              <span className="block h-2.5 w-14 animate-pulse rounded bg-[#2A2A2C] ml-auto" />
              <span className="block h-3.5 w-20 animate-pulse rounded bg-[#2A2A2C] ml-auto" />
            </div>
            <span
              className="h-7 w-28 animate-pulse rounded-lg bg-[#2A2A2C]"
              aria-hidden="true"
            />
          </li>
        ))}
      </ul>

      <span className="sr-only">Loading reconciliation rollup…</span>
    </section>
  );
}
