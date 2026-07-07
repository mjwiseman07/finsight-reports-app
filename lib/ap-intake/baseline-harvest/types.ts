export type HarvestSource = "qbo" | "csv";
export interface BaselineHarvestStartInput {
  firmId: string;
  firmClientId: string;
  source: HarvestSource;
  actorUserId: string;
}
export interface BaselineHarvestRun {
  id: string;
  firm_id: string;
  firm_client_id: string;
  source: HarvestSource;
  status: "running" | "completed" | "failed" | "cancelled";
  started_at: string;
  completed_at?: string | null;
  counts: Record<string, number>;
  error_message?: string | null;
}
export interface HarvestedVendorRow {
  externalVendorId: string;
  displayName: string;
  normalizedName: string;
  metaphoneCode: string;
  active: boolean;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  snapshotHash: string;
}
export interface HarvestedPoRow {
  externalPoId: string;
  poNumber: string;
  vendorExternalId?: string | null;
  status: "open" | "partially_received" | "closed" | "cancelled";
  currency: string;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  orderedAt: string;
  memo?: string | null;
  lines: Array<{
    lineNumber: number;
    description: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPriceCents: number;
    lineTotalCents: number;
    glAccountCode?: string | null;
  }>;
}
export interface HarvestedBillRow {
  externalBillId: string;
  vendorExternalId?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  invoiceAmountCents: number | null;
  purchaseOrderExternalId?: string | null;
  receivedAt: string;
}
export interface HarvestedGoodsReceiptRow {
  externalGrId: string;
  purchaseOrderExternalId: string;
  grNumber: string;
  receivedAt: string;
  lines: Array<{
    poLineNumber: number;
    quantityReceived: number;
  }>;
}
export interface HarvestedCoaRow {
  externalAccountId: string;
  accountNumber?: string | null;
  accountName: string;
  accountType?: string | null;
  accountSubtype?: string | null;
  active: boolean;
}
export interface HarvestSourceAdapter {
  fetchVendors(ctx: { firmClientId: string }): Promise<HarvestedVendorRow[]>;
  fetchPurchaseOrders(ctx: { firmClientId: string }): Promise<HarvestedPoRow[]>;
  fetchBills(ctx: { firmClientId: string }): Promise<HarvestedBillRow[]>;
  fetchGoodsReceipts(ctx: { firmClientId: string }): Promise<HarvestedGoodsReceiptRow[]>;
  fetchChartOfAccounts?(ctx: { firmClientId: string }): Promise<HarvestedCoaRow[]>;
}
