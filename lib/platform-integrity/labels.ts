/**
 * MAJOR #2.3 Block B.2 / B.4 — display labels + chip tones for Platform Integrity.
 *
 * Chip *labels* re-export from copy.ts (B.4). full_text tooltips remain research
 * citations. DO NOT add or change customer-facing strings without updating copy.ts.
 */

import type {
  AssertionId,
  AssertionConfidence,
  FinancialReportingRelevance,
} from "./types";
import { platformIntegrityCopy } from "./copy";

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
  const f = platformIntegrityCopy.finding;
  switch (c) {
    case "grounded":
      return {
        label: f.confidenceGrounded,
        tone: "teal",
        full_text: f.confidenceGroundedFull,
      };
    case "framework_definition":
      return {
        label: f.confidenceFrameworkFallback,
        tone: "neutral",
        full_text: f.confidenceFrameworkFull,
      };
    case "judgment_required":
      return {
        label: f.confidenceJudgmentRequired,
        tone: "amber",
        full_text: f.confidenceJudgmentFull,
      };
    case "unknown":
    default:
      return {
        label: f.confidenceUnknown,
        tone: "gray",
        full_text: f.confidenceUnknownFull,
      };
  }
}

export function frRelevanceChip(
  r: FinancialReportingRelevance | string,
): ChipDescriptor {
  const f = platformIntegrityCopy.finding;
  switch (r) {
    case "in_scope":
      return {
        label: f.relevanceInScope,
        tone: "teal",
        full_text: f.relevanceInScopeFull,
      };
    case "out_of_scope":
      return {
        label: f.relevanceOutOfScope,
        tone: "gray",
        full_text: f.relevanceOutFull,
      };
    case "unknown":
    default:
      return {
        label: f.relevanceScopePending,
        tone: "amber",
        full_text: f.relevancePendingFull,
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
