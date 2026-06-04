import type {
  SyntheticExplanationApprovalWorkflowRecord,
  SyntheticExplanationReviewDecision,
  SyntheticExplanationReviewStatus,
  SyntheticReviewLineage,
} from "../types/explanation-persistence";
import type { SyntheticApprovalWorkflowRecordInput } from "./types";
import { resolveReviewRiskCategory } from "./resolveReviewMetadata";

function currentStatus(decision?: SyntheticExplanationReviewDecision): SyntheticExplanationReviewStatus {
  if (!decision) return "queued";
  return decision.decision;
}

function buildReviewLineage(input: SyntheticApprovalWorkflowRecordInput, latestDecision?: SyntheticExplanationReviewDecision): SyntheticReviewLineage {
  const record = input.storedExplanationRecord;
  const lineage = record.explanationLineageSnapshot;
  return {
    workflowRecordId: input.workflowRecordId,
    latestDecisionId: latestDecision?.decisionId,
    storedExplanationId: record.storedExplanationId,
    explanationId: record.explanationId,
    recommendationId: record.recommendationId,
    sourceSignalIds: lineage.sourceSignalIds,
    sourceMetricIds: lineage.sourceMetricIds,
    evidenceIds: lineage.evidenceIds,
    calculationTraceIds: lineage.calculationTraceIds,
    correlationGroupId: lineage.correlationGroupId,
    lineageFrozenAt: input.createdAt,
  };
}

export function buildApprovalWorkflowRecord(input: SyntheticApprovalWorkflowRecordInput): SyntheticExplanationApprovalWorkflowRecord {
  const decisionHistory = input.decisionHistory || [];
  const latestDecision = decisionHistory[decisionHistory.length - 1];
  return {
    workflowRecordId: input.workflowRecordId,
    storedExplanationId: input.storedExplanationRecord.storedExplanationId,
    queueItemId: input.queueItemId,
    explanationId: input.storedExplanationRecord.explanationId,
    currentStatus: currentStatus(latestDecision),
    decisionHistory,
    latestDecision,
    explanationLineageSnapshot: input.storedExplanationRecord.explanationLineageSnapshot,
    reviewLineage: buildReviewLineage(input, latestDecision),
    reviewRiskCategory: resolveReviewRiskCategory(input.storedExplanationRecord),
    explanationGuardrailResult: input.storedExplanationRecord.explanationGuardrailResult,
    createdAt: input.createdAt,
    updatedAt: input.updatedAt || input.createdAt,
  };
}
