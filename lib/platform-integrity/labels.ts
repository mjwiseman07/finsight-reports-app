/**
 * MAJOR #2.3 Block B.2 — display labels + chip tones for Platform Integrity.
 *
 * Every string here is the exact label enumerated in
 * Phase_MAJOR_2_3_Block_B_Planning_Doc.md, which traces to
 * research/schema_drift_assertion_mapping_research.md.
 *
 * DO NOT add or change strings here without also updating the planning doc.
 */

import type {
  AssertionId,
  AssertionConfidence,
  FinancialReportingRelevance,
} from "./types";

export function assertionLabel(a: AssertionId | string): string {
  switch (a) {
    case "accuracy":
      return "Accuracy";
    case "classification":
      return "Classification";
    case "completeness":
      return "Completeness";
    case "cutoff":
      return "Cutoff";
    case "existence_occurrence":
      return "Existence / Occurrence";
    case "presentation_disclosure":
      return "Presentation & Disclosure";
    case "rights_obligations":
      return "Rights & Obligations";
    case "valuation_allocation":
      return "Valuation & Allocation";
    default:
      return a;
  }
}

export interface ChipDescriptor {
  label: string;
  tone: "teal" | "amber" | "neutral" | "gray";
  full_text: string;
}

export function confidenceChip(c: AssertionConfidence | string): ChipDescriptor {
  switch (c) {
    case "grounded":
      return {
        label: "Framework-grounded",
        tone: "teal",
        full_text:
          "Direct textual grounding in ISA 315 Para A190(a)(i)-(iii). See methodology.",
      };
    case "framework_definition":
      return {
        label: "Framework-definition minimum",
        tone: "neutral",
        full_text:
          "Grounded in ISA 315 Para 12(d)/(i) definition of information integrity: completeness + accuracy + validity. See methodology.",
      };
    case "judgment_required":
      return {
        label: "Auditor judgment required",
        tone: "amber",
        full_text:
          "Table linkage supported by literature but the specific assertion determination requires auditor judgment against account and materiality per ISA 315 Appendix 5 §19 and KPMG Q3.4.20. See methodology.",
      };
    case "unknown":
    default:
      return {
        label: "Requires review",
        tone: "gray",
        full_text:
          "Confidence cannot be determined without additional context. See methodology.",
      };
  }
}

export function frRelevanceChip(
  r: FinancialReportingRelevance | string,
): ChipDescriptor {
  switch (r) {
    case "in_scope":
      return {
        label: "Financial reporting relevant",
        tone: "teal",
        full_text:
          "Table feeds financial-statement-relevant accounts per ISA 315 Para 12(g)(i) and KPMG Handbook Q3.4.20 materiality gate.",
      };
    case "out_of_scope":
      return {
        label: "Outside financial reporting scope",
        tone: "gray",
        full_text:
          "Table does not feed financial-statement-relevant accounts. Per ISA 315 Appendix 5 §19, such drift may not affect financial reporting.",
      };
    case "unknown":
    default:
      return {
        label: "Scope pending review",
        tone: "amber",
        full_text:
          "Financial reporting relevance not determined. Per ISA 315 Appendix 5 §19, this determination requires materiality analysis.",
      };
  }
}

export function severityDot(level: string): { color: string; label: string } {
  const normalized = (level || "").toLowerCase();
  switch (normalized) {
    case "error":
      return { color: "#DC2626", label: "Error" };
    case "warn":
    case "warning":
      return { color: "#DFC084", label: "Warning" };
    case "info":
      return { color: "#C9A961", label: "Info" };
    default:
      return { color: "#7A7974", label: level || "Unknown" };
  }
}

export function driftHeadline(f: {
  drift_table: string | null;
  drift_column: string | null;
  fingerprint: string;
}): string {
  if (f.drift_table && f.drift_column) return `${f.drift_table}.${f.drift_column}`;
  if (f.drift_table) return f.drift_table;
  return `${f.fingerprint.slice(0, 12)}…`;
}

export function issueKindLabel(k: string): string {
  switch (k) {
    case "schema_drift_accepted_baseline":
      return "Baseline drift";
    case "schema_drift_detector_degraded":
      return "Detector degraded";
    case "schema_drift_scanner_unable_to_classify":
      return "Unable to classify";
    default:
      return k;
  }
}
