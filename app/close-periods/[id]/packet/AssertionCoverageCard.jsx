"use client";

import { headingFont } from "@/components/site-ui";

const STATUS_STYLES = {
  tested: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  partial: "bg-amber-500/20 text-amber-300 ring-amber-500/40",
  gap: "bg-rose-500/20 text-rose-300 ring-rose-500/40",
  not_applicable: "bg-white/5 text-white/40 ring-white/10",
};

const STATUS_LABELS = {
  tested: "Tested",
  partial: "Partial",
  gap: "Gap",
  not_applicable: "N/A",
};

function formatCategoryLabel(cat) {
  return cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatAssertionLabel(a) {
  const map = {
    existence_occurrence: "Existence / Occurrence",
    completeness: "Completeness",
    rights_obligations: "Rights & Obligations",
    valuation_allocation: "Valuation & Allocation",
    accuracy: "Accuracy",
    cutoff: "Cutoff",
    classification: "Classification",
    presentation_disclosure: "Presentation & Disclosure",
  };
  return map[a] || a;
}

export default function AssertionCoverageCard({ content }) {
  if (!content || content.status === "error") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h3 className={`${headingFont.className} text-lg text-white`}>Assertion Coverage Statement</h3>
        <p className="mt-2 text-sm text-rose-300">
          Coverage statement could not be generated: {content?.error_message || "unknown error"}
        </p>
      </div>
    );
  }

  const cells = content.coverage_cells || [];
  const catalog = content.assertions_catalog || [];
  const summary = content.summary || {};

  const byCategory = {};
  for (const c of cells) {
    if (!byCategory[c.account_category]) byCategory[c.account_category] = {};
    byCategory[c.account_category][c.assertion_id] = c;
  }
  const categories = Object.keys(byCategory).sort();

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-white/60">
            {content.isa_315_baseline_version} · generated{" "}
            {new Date(content.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-semibold text-white">
            {summary.coverage_rate_pct?.toFixed(1)}%
          </div>
          <div className="text-xs text-white/60">coverage rate</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3 text-sm">
        <div className="rounded-lg bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/30">
          <div className="text-xs text-emerald-300/80">Tested</div>
          <div className="text-lg font-semibold text-emerald-200">{summary.tested || 0}</div>
        </div>
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 ring-1 ring-amber-500/30">
          <div className="text-xs text-amber-300/80">Partial</div>
          <div className="text-lg font-semibold text-amber-200">{summary.partial || 0}</div>
        </div>
        <div className="rounded-lg bg-rose-500/10 px-3 py-2 ring-1 ring-rose-500/30">
          <div className="text-xs text-rose-300/80">Gaps</div>
          <div className="text-lg font-semibold text-rose-200">
            {summary.gap || 0}
            {summary.critical_gaps > 0 && (
              <span className="ml-2 text-xs font-normal text-rose-300">
                ({summary.critical_gaps} critical)
              </span>
            )}
          </div>
        </div>
        <div className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
          <div className="text-xs text-white/60">Not Applicable</div>
          <div className="text-lg font-semibold text-white/70">{summary.not_applicable || 0}</div>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[900px] border-separate border-spacing-0 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-black/40 py-2 pr-3 text-left font-medium text-white/80">
                Account Category
              </th>
              {catalog.map((a) => (
                <th
                  key={a.assertion_id}
                  className="px-2 py-2 text-left font-medium text-white/80"
                  title={a.description}
                >
                  {formatAssertionLabel(a.assertion_id)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat} className="border-t border-white/5">
                <th className="sticky left-0 z-10 bg-black/40 py-2 pr-3 text-left font-normal text-white">
                  {formatCategoryLabel(cat)}
                </th>
                {catalog.map((a) => {
                  const cell = byCategory[cat]?.[a.assertion_id];
                  if (!cell) return <td key={a.assertion_id} className="p-2" />;
                  const style = STATUS_STYLES[cell.coverage_status] || STATUS_STYLES.not_applicable;
                  const label = STATUS_LABELS[cell.coverage_status] || cell.coverage_status;
                  return (
                    <td key={a.assertion_id} className="p-1">
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ring-1 ${style}`}
                        title={
                          cell.coverage_status === "gap"
                            ? `Gap: ${cell.gap_root_cause_code || "unclassified"}${cell.gap_recommendation ? ` — ${cell.gap_recommendation}` : ""}`
                            : cell.evidence_strength
                              ? `Evidence: ${cell.evidence_strength}`
                              : label
                        }
                      >
                        {label}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {summary.gap > 0 && Object.keys(summary.gaps_by_root_cause || {}).length > 0 && (
        <div className="mt-6">
          <h4 className="mb-2 text-sm font-medium text-white">
            Gap Root-Cause Breakdown (PCAOB QC 1000 §.15)
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(summary.gaps_by_root_cause).map(([code, count]) => {
              const rc = (content.gap_root_causes || []).find((r) => r.root_cause_code === code);
              return (
                <div key={code} className="rounded-lg bg-white/5 px-3 py-2 ring-1 ring-white/10">
                  <div className="flex items-baseline justify-between">
                    <span className="text-white/80">{rc?.display_name || code}</span>
                    <span className="text-rose-300">{count}</span>
                  </div>
                  <div className="mt-1 text-white/50">{rc?.pcaob_reference}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-white/5 p-4 text-[11px] leading-relaxed text-white/60 ring-1 ring-white/10">
        <p>{content.attestation_footer?.isa_315_citation}</p>
        <p className="mt-1">{content.attestation_footer?.pcaob_as_2301_citation}</p>
        <p className="mt-1">{content.attestation_footer?.pcaob_as_1105_citation}</p>
        <p className="mt-1">{content.attestation_footer?.pcaob_qc_1000_citation}</p>
        <p className="mt-3 italic">{content.attestation_footer?.disclaimer}</p>
      </div>
    </div>
  );
}
