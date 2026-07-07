export interface PurchaseOrderCreateFromReqInput {
  requisitionId: string;
  actorUserId: string;
  vendorId?: string | null;
  expectedDeliveryAt?: string | null;
}
export interface GoodsReceiptRecordInput {
  purchaseOrderId: string;
  actorUserId: string;
  lines: Array<{ purchase_order_line_id: string; quantity_received: number }>;
  receivedAt?: string;
}
export type PoStatus = "draft" | "open" | "partially_received" | "closed" | "cancelled";
