"use client";

import { Chip } from "./Chip";
import {
  assertionLabel,
  confidenceChip,
  driftHeadline,
  frRelevanceChip,
  issueKindLabel,
  severityDot,
} from "@/lib/platform-integrity/labels";
import { platformIntegrityCopy } from "@/lib/platform-integrity/copy";
import type { PlatformIntegrityFinding } from "@/lib/platform-integrity/types";
import { focusRing } from "@/components/site-ui";

export function IntegrityFindingCard({
  finding,
  onOpenMethodology,
}: {
  finding: PlatformIntegrityFinding;
  onOpenMethodology?: () => void;
}) {
  const headline = driftHeadline(finding);
  const dot = severityDot(finding.level);
  const cc = confidenceChip(finding.assertion_confidence);
  const rr = frRelevanceChip(finding.financial_reporting_relevance);
  const detected = new Date(finding.detected_at);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[#C9A961]/20 bg-[#1A1A1C]/50 p-4">
      <header className="flex flex-wrap items-center gap-3">
        <span
          aria-label={dot.label}
          title={dot.label}
          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: dot.color }}
        />
        <div className="flex flex-col gap-0.5">
          <div className="font-mono text-[15px] font-semibold text-[#ECEBE7]">
            {headline}
          </div>
          <div className="text-xs text-[#7A7974]">
            {issueKindLabel(finding.issue_kind)} · Detected{" "}
            {detected.toLocaleString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {finding.detector_version
              ? ` · detector ${finding.detector_version}`
              : null}
          </div>
        </div>
      </header>

      <section>
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#7A7974]">
          {platformIntegrityCopy.finding.assertionRiskEyebrow}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {finding.assertion_impact.length === 0 ? (
            <span className="text-xs text-[#7A7974]">None</span>
          ) : (
            finding.assertion_impact.map((a) => (
              <Chip
                key={a}
                size="sm"
                descriptor={{
                  label: assertionLabel(a),
                  tone: "neutral",
                  full_text: `Assertion: ${assertionLabel(a)}`,
                }}
              />
            ))
          )}
        </div>
      </section>

      <section className="flex flex-wrap gap-2">
        <Chip descriptor={cc} />
        <Chip descriptor={rr} />
      </section>

      <footer className="border-t border-[#C9A961]/20 pt-2.5 text-xs text-[#A29E93]">
        <span className="mr-1.5">
          {platformIntegrityCopy.finding.citationSourceLabelPrefix}
        </span>
        <a
          href={finding.citation.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${focusRing()} text-[#C9A961] underline underline-offset-[3px] hover:text-[#DFC084]`}
        >
          {finding.citation.label}
        </a>
        <button
          type="button"
          onClick={onOpenMethodology}
          className={`${focusRing()} ml-3 border-0 bg-transparent p-0 text-xs text-[#C9A961] underline underline-offset-[3px] hover:text-[#DFC084]`}
        >
          {platformIntegrityCopy.finding.citationCtaLabel}
        </button>
        <div className="mt-1.5 text-[11px] text-[#7A7974]">
          {finding.citation.note}
        </div>
      </footer>
    </article>
  );
}
