import type { AssertionId, AccountCategory } from "./assertions-types";

export const COVERAGE_STATUSES = ["tested", "partial", "gap", "not_applicable"] as const;
export type CoverageStatus = (typeof COVERAGE_STATUSES)[number];

export const EVIDENCE_STRENGTHS = ["strong", "moderate", "weak", "unassessed"] as const;
export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export const RELEVANCE_LEVELS = ["relevant", "usually_not_primary", "not_applicable"] as const;
export type RelevanceLevel = (typeof RELEVANCE_LEVELS)[number];

export const ROOT_CAUSE_CODES = [
  "no_rule_defined",
  "rule_defined_but_not_fired",
  "rule_fired_but_all_suppressed",
  "rule_errored",
  "assertion_not_relevant",
  "coverage_partial_by_design",
  "manual_test_documented",
] as const;
export type RootCauseCode = (typeof ROOT_CAUSE_CODES)[number];

export interface CloseAssertionCoverageRow {
  coverage_id: string;
  firm_client_id: string;
  close_period_id: string;
  account_category: AccountCategory;
  assertion_id: AssertionId;
  relevance_at_computation: RelevanceLevel;
  coverage_status: CoverageStatus;
  covering_rule_ids: string[];
  covering_fire_ids: string[];
  evidence_strength: EvidenceStrength;
  data_source_reliability_basis: string | null;
  manual_test_ref: string | null;
  gap_root_cause_code: RootCauseCode | null;
  gap_reasoning_action_id: string | null;
  gap_recommendation: string | null;
  computed_at: string;
  computed_by_worker_run_id: string | null;
  version: number;
  updated_at: string;
}

export const GAP_RESOLUTION_STATUSES = [
  "open",
  "resolved_remediated",
  "resolved_deferred",
  "resolved_not_applicable",
  "resolved_stale",
] as const;
export type GapResolutionStatus = (typeof GAP_RESOLUTION_STATUSES)[number];

export const GAP_RESOLUTION_TYPES = [
  "manual_test",
  "rule_activation",
  "not_applicable_override",
  "deferred_to_next_period",
] as const;
export type GapResolutionType = (typeof GAP_RESOLUTION_TYPES)[number];

export interface GapReviewItemRow {
  id: string;
  firmClientId: string;
  engagementId: string;
  closePeriodId: string;
  accountCategory: AccountCategory;
  assertionId: AssertionId;
  gapRootCauseCode: RootCauseCode;
  gapRecommendation: string | null;
  relevanceAtDetection: "relevant" | "usually_not_primary";
  severity: "critical" | "warning" | "info";
  resolutionStatus: GapResolutionStatus;
  resolutionType: GapResolutionType | null;
  resolutionMetadata: Record<string, unknown>;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  resolutionStatusPrior: string | null;
  reopenedAt: string | null;
  firstDetectedAt: string;
  lastProjectedAt: string;
  createdAt: string;
  updatedAt: string;
}

const ROOT_CAUSE_HUMAN: Record<RootCauseCode, string> = {
  no_rule_defined: "No rule defined for this account/assertion pair",
  rule_defined_but_not_fired: "Rule defined but did not fire this period",
  rule_fired_but_all_suppressed: "Rule fired but all instances were suppressed",
  rule_errored: "Rule execution errored",
  assertion_not_relevant: "Assertion marked not relevant",
  coverage_partial_by_design: "Coverage is partial by design",
  manual_test_documented: "Manual test documented but not linked",
};

export function rootCauseCodeToHuman(code: RootCauseCode): string {
  return ROOT_CAUSE_HUMAN[code] ?? code;
}

export interface CoverageEventRow {
  event_id: string;
  firm_client_id: string;
  close_period_id: string;
  worker_run_id: string;
  event_type:
    | "projection_started"
    | "projection_completed"
    | "projection_failed"
    | "gap_detected"
    | "gap_reasoner_invoked"
    | "gap_reasoner_completed"
    | "gap_reasoner_skipped_flag_off"
    | "gap_reasoner_failed"
    | "manual_override_applied"
    | "gap_review_items_synced"
    | "gap_review_item_resolved";
  account_category: AccountCategory | null;
  assertion_id: AssertionId | null;
  payload: Record<string, unknown>;
  actor_type: "system" | "user";
  actor_id: string | null;
  linked_action_id: string | null;
  correlation_id: string | null;
  occurred_at: string;
}

export interface RootCauseRow {
  root_cause_code: RootCauseCode;
  display_name: string;
  description: string;
  pcaob_reference: string;
}

export interface ManualTestsByPair {
  [key: string]: Array<{
    evidenceId: string;
    evidenceType: string;
    dataSourceReliabilityBasis: string | null;
  }>;
}

export interface ProjectionInput {
  firmClientId: string;
  closePeriodId: string;
  workerRunId: string;
  relevance: Array<{
    account_category: AccountCategory;
    assertion_id: AssertionId;
    relevance: RelevanceLevel;
  }>;
  ruleCoverage: Array<{
    rule_id: string;
    assertion_id: AssertionId;
    coverage_strength: "primary" | "secondary" | "partial";
    account_categories: AccountCategory[];
  }>;
  fires: Array<{
    fire_id: string;
    rule_id: string;
    outcome: "fired" | "suppressed" | "error" | "not_implemented";
  }>;
  manualTestsByPair?: ManualTestsByPair;
}

export interface ProjectedCoverageRow {
  account_category: AccountCategory;
  assertion_id: AssertionId;
  relevance_at_computation: RelevanceLevel;
  coverage_status: CoverageStatus;
  covering_rule_ids: string[];
  covering_fire_ids: string[];
  covering_manual_test_ids: string[];
  evidence_strength: EvidenceStrength;
  gap_root_cause_code: RootCauseCode | null;
}
