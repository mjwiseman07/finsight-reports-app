import type { SyntheticAIExplanationObject, SyntheticExplanationGuardrailResult, SyntheticExplanationLineage } from "./explanation";
import type { SyntheticConfidenceTier } from "./confidence";

export type SyntheticExplanationStorageStatus = "draft" | "queued_for_review" | "approved" | "rejected" | "needs_revision" | "expired";
export type SyntheticExplanationReviewStatus = "queued" | "in_review" | "approved" | "rejected" | "needs_revision" | "expired";
export type SyntheticExplanationReviewDecisionValue = "approved" | "rejected" | "needs_revision" | "expired";
export type SyntheticExplanationReviewerRole = "advisor" | "cpa" | "admin" | "compliance";
export type SyntheticReviewRiskCategory = "informational" | "financial" | "working_capital" | "liquidity" | "margin" | "compliance" | "healthcare";

export interface SyntheticStoredExplanationRecord {
  storedExplanationId: string;
  explanationId: string;
  recommendationId: string;
  recommendationType: string;
  explanationObject: SyntheticAIExplanationObject;
  explanationLineageSnapshot: SyntheticExplanationLineage;
  explanationGuardrailResult: SyntheticExplanationGuardrailResult;
  confidenceScore: number;
  confidenceTier: SyntheticConfidenceTier;
  explanationConfidence: SyntheticAIExplanationObject["explanationConfidence"];
  storageStatus: SyntheticExplanationStorageStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SyntheticReviewLineage {
  workflowRecordId: string;
  latestDecisionId?: string;
  storedExplanationId: string;
  explanationId: string;
  recommendationId: string;
  sourceSignalIds: string[];
  sourceMetricIds: string[];
  evidenceIds: string[];
  calculationTraceIds: string[];
  correlationGroupId?: string;
  lineageFrozenAt: string;
}

export interface SyntheticExplanationReviewQueueItem {
  queueItemId: string;
  storedExplanationId: string;
  explanationId: string;
  recommendationId: string;
  priority: "low" | "medium" | "high" | "critical";
  reviewRiskCategory: SyntheticReviewRiskCategory;
  reviewStatus: SyntheticExplanationReviewStatus;
  assignedReviewerId?: string;
  requiredReviewerRole?: SyntheticExplanationReviewerRole;
  guardrailStatus: SyntheticExplanationGuardrailResult["status"];
  createdAt: string;
  dueAt?: string;
}

export interface SyntheticExplanationReviewDecision {
  decisionId: string;
  queueItemId: string;
  storedExplanationId: string;
  decision: SyntheticExplanationReviewDecisionValue;
  reviewerId: string;
  reviewerRole: SyntheticExplanationReviewerRole;
  decisionReasonCodes: string[];
  notes?: string;
  createdAt: string;
}

export interface SyntheticExplanationApprovalWorkflowRecord {
  workflowRecordId: string;
  storedExplanationId: string;
  queueItemId: string;
  explanationId: string;
  currentStatus: SyntheticExplanationReviewStatus;
  decisionHistory: SyntheticExplanationReviewDecision[];
  latestDecision?: SyntheticExplanationReviewDecision;
  explanationLineageSnapshot: SyntheticExplanationLineage;
  reviewLineage: SyntheticReviewLineage;
  reviewRiskCategory: SyntheticReviewRiskCategory;
  explanationGuardrailResult: SyntheticExplanationGuardrailResult;
  createdAt: string;
  updatedAt: string;
}
