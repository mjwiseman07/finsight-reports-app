export interface RequisitionLineInput {
  description: string;
  quantity: number;
  unit_price_cents: number;
  gl_account_code?: string;
}
export interface RequisitionCreateInput {
  firmClientId: string;
  requesterUserId: string;
  vendorId?: string | null;
  vendorHintText?: string | null;
  neededBy?: string | null; // YYYY-MM-DD
  justification?: string | null;
  currency?: string;
  lines: RequisitionLineInput[];
}
export interface RequisitionSubmitInput {
  requisitionId: string;
  actorUserId: string;
  approverUserId: string;
}
export interface RequisitionApproveInput {
  requisitionId: string;
  approverUserId: string;
  comment?: string;
}
export interface RequisitionRejectInput {
  requisitionId: string;
  approverUserId: string;
  reason: string;
}
export type RequisitionStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled"
  | "converted_to_po";
