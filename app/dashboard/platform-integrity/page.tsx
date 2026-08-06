"use client";

import * as React from "react";
import { usePlatformIntegrity } from "@/lib/platform-integrity/use-platform-integrity";
import { isPlatformIntegrityEnabled } from "@/lib/platform-integrity/feature-flag";
import { IntegrityFindingCard } from "@/components/platform-integrity/IntegrityFindingCard";
import { MethodologyDrawer } from "@/components/platform-integrity/MethodologyDrawer";
import { ChainStatusBadge } from "@/components/platform-integrity/ChainStatusBadge";
import { focusRing, headingFont } from "@/components/site-ui";

export default function PlatformIntegrityPage() {
  const enabled = isPlatformIntegrityEnabled();
  const { data, loading, error } = usePlatformIntegrity();
  const [methodologyOpen, setMethodologyOpen] = React.useState(false);
  const [confidenceFilter, setConfidenceFilter] = React.useState<string>("all");

  if (!enabled) {
    return (
      <main className="mx-auto min-h-screen max-w-[920px] bg-[#111112] px-8 py-8 text-[#ECEBE7]">
        <h1 className={`${headingFont} text-2xl font-semibold text-[#ECEBE7]`}>
          Platform Integrity
        </h1>
        <p className="mt-3 text-[#A29E93]">
          This surface is not yet enabled in your workspace. Contact support to
          learn more.
        </p>
      </main>
    );
  }

  const findings = data?.findings ?? [];
  const filtered =
    confidenceFilter === "all"
      ? findings
      : findings.filter((f) => f.assertion_confidence === confidenceFilter);

  return (
    <main className="mx-auto min-h-screen max-w-[1080px] bg-[#111112] px-6 py-8 text-[#ECEBE7]">
      <header className="mb-6 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className={`${headingFont} m-0 text-[28px] font-semibold`}>
            Platform Integrity
          </h1>
          {data ? <ChainStatusBadge chain={data.chain} /> : null}
        </div>
        <p className="m-0 max-w-[720px] text-sm text-[#A29E93]">
          {data?.methodology.subtitle ??
            "Contingent risk indicators from data-integrity monitoring."}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="pi-confidence-filter"
            className="text-xs font-medium text-[#7A7974]"
          >
            Confidence
          </label>
          <select
            id="pi-confidence-filter"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
            className={`${focusRing()} rounded-md border border-[#C9A961]/25 bg-[#1A1A1C] px-2.5 py-1.5 text-[13px] text-[#ECEBE7]`}
          >
            <option value="all">All ({findings.length})</option>
            <option value="grounded">Framework-grounded</option>
            <option value="framework_definition">
              Framework-definition minimum
            </option>
            <option value="judgment_required">
              Auditor judgment required
            </option>
            <option value="unknown">Requires review</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setMethodologyOpen(true)}
          className={`${focusRing()} cursor-pointer rounded-md border border-[#C9A961]/40 bg-[#1A1A1C]/50 px-3.5 py-2 text-[13px] font-medium text-[#C9A961] hover:border-[#C9A961]/60 hover:text-[#DFC084]`}
        >
          View methodology
        </button>
      </div>

      <section className="flex flex-col gap-3">
        {loading ? (
          <div className="text-sm text-[#7A7974]">Loading findings…</div>
        ) : error ? (
          <div className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#C9A961]/25 bg-[#1A1A1C]/40 px-8 py-8 text-center text-sm text-[#7A7974]">
            {findings.length === 0
              ? `No data-integrity findings detected. ${
                  data?.detector_next_run_hint ?? ""
                }`
              : `No findings match the current filter.`}
          </div>
        ) : (
          filtered.map((f) => (
            <IntegrityFindingCard
              key={f.id}
              finding={f}
              onOpenMethodology={() => setMethodologyOpen(true)}
            />
          ))
        )}
      </section>

      {data ? (
        <footer className="mt-8 border-t border-[#C9A961]/20 p-4 text-xs leading-relaxed text-[#7A7974]">
          {data.methodology.disclosure}
        </footer>
      ) : null}

      {data ? (
        <MethodologyDrawer
          open={methodologyOpen}
          onClose={() => setMethodologyOpen(false)}
          methodology={data.methodology}
        />
      ) : null}
    </main>
  );
}
