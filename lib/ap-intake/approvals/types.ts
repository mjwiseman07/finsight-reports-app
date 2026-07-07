/**
 * D6.5 Part 2 · Block 6b — Approval chain types.
 */
export type ApprovalChainStrategy = "sequential" | "parallel" | "any_of";
export type ApprovalChainStatus = "active" | "completed" | "cancelled" | "rejected";
export type ApprovalStepStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "delegated"
  | "skipped";
export type DelegationScope = "ap_requisitions" | "ap_amendments" | "ap_all";
export interface ApprovalStepDefinition {
  orderIndex: number;
  approverUserId: string;
  requiredRole?: string;
  thresholdAmountCents?: number;
}
export interface CreateApprovalChainInput {
  requisitionId: string;
  strategy?: ApprovalChainStrategy;
  steps: ApprovalStepDefinition[];
  actorUserId: string;
}
export interface ApproveStepInput {
  stepId: string;
  approverUserId: string;
  comment?: string;
}
export interface RejectStepInput {
  stepId: string;
  approverUserId: string;
  reason: string;
}
export interface DelegateStepInput {
  stepId: string;
  fromUserId: string;
  toUserId: string;
  comment?: string;
}
export interface CreateDelegationInput {
  firmId: string;
  delegatorUserId: string;
  delegateUserId: string;
  scope: DelegationScope;
  effectiveFrom?: Date;
  effectiveTo: Date;
  reason?: string;
  actorUserId: string;
}
export interface RevokeDelegationInput {
  delegationId: string;
  actorUserId: string;
}
export class ApprovalValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "ApprovalValidationError";
    this.field = field;
  }
}
