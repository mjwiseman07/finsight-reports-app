export type ThreeWayMatchStatus =
  | "matched"
  | "no_po"
  | "price_variance"
  | "quantity_variance"
  | "po_closed"
  | "not_evaluated";
export type ThreeWayMatchSeverity = "LOW" | "MEDIUM" | "HIGH";
export interface ThreeWayMatchSignal {
  code:
    | "no_matching_po"
    | "po_price_variance_exceeded"
    | "po_quantity_over_received"
    | "po_closed_bill_arrived";
  severity: ThreeWayMatchSeverity;
  detail: Record<string, unknown>;
}
export interface ThreeWayMatchResult {
  status: ThreeWayMatchStatus;
  purchaseOrderId: string | null;
  signals: ThreeWayMatchSignal[];
  shouldQuarantine: boolean;
}
export interface ThreeWayMatchInput {
  firmId: string;
  firmClientId: string;
  vendorId: string | null;
  billId: string;
  invoiceAmountCents: number | null;
  invoiceDate: string | null;
}
