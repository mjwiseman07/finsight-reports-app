import type {
  SyntheticExplanationReviewDecision,
  SyntheticExplanationReviewDecisionValue,
  SyntheticExplanationReviewerRole,
  SyntheticStoredExplanationRecord,
} from "../types/explanation-persistence";
import type { SyntheticAIExplanationObject } from "../types/explanation";

export interface SyntheticStoredExplanationRecordInput {
  storedExplanationId: string;
  explanationObject: SyntheticAIExplanationObject;
  storageStatus?: SyntheticStoredExplanationRecord["storageStatus"];
  createdAt: string;
  updatedAt?: string;
}

export interface SyntheticReviewQueueItemInput {
  queueItemId: string;
  storedExplanationRecord: SyntheticStoredExplanationRecord;
  assignedReviewerId?: string;
  requiredReviewerRole?: SyntheticExplanationReviewerRole;
  createdAt: string;
  dueAt?: string;
}

export interface SyntheticReviewDecisionInput {
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

export interface SyntheticApprovalWorkflowRecordInput {
  workflowRecordId: string;
  storedExplanationRecord: SyntheticStoredExplanationRecord;
  queueItemId: string;
  decisionHistory?: SyntheticExplanationReviewDecision[];
  createdAt: string;
  updatedAt?: string;
}
