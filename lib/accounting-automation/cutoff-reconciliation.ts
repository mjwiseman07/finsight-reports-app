import type { AdvisacorNormalizedEntity, AdvisacorNormalizedFinancialData } from "@/lib/integrations/accounting/types";

export type CutoffResult = {
  status: "clear" | "review_required" | "unavailable";
  source_count: number;
  exception_count: number;
  exception_amount_cents: number;
  evidence_codes: string[];
};

function text(row: AdvisacorNormalizedEntity): string {
  return `${row.name || ""} ${row.type || ""} ${row.source?.sourceReport || ""} ${JSON.stringify(row.metadata || {})}`.toLowerCase();
}

function amountCents(row: AdvisacorNormalizedEntity): number {
  const value = Number(row.amount ?? row.balance ?? row.metadata?.amount ?? row.metadata?.total);
  return Number.isFinite(value) ? Math.round(Math.abs(value) * 100) : 0;
}

function key(row: AdvisacorNormalizedEntity, fields: string[]): string | null {
  for (const field of fields) {
    const value = row.metadata?.[field];
    if (typeof value === "string" && value.trim()) return value.trim().toLowerCase();
  }
  return null;
}

export function reconcileRevenueCutoff(payload: AdvisacorNormalizedFinancialData): CutoffResult {
  const transactions = payload.normalizedTransactions || [];
  const shipped = transactions.filter((row) => /shipment|shipped|fulfilled|fulfillment/.test(text(row)));
  if (!shipped.length) {
    return { status: "unavailable", source_count: 0, exception_count: 0, exception_amount_cents: 0, evidence_codes: ["shipment_evidence_unavailable"] };
  }

  const invoices = [...transactions, ...(payload.normalizedARAging || [])].filter((row) => /invoice|accounts receivable|\bar\b/.test(text(row)));
  const invoiceKeys = new Set(invoices.flatMap((row) => {
    const value = key(row, ["salesOrderId", "sales_order_id", "orderId", "order_id", "shipmentId", "shipment_id"]);
    return value ? [value] : [];
  }));
  const missing = shipped.filter((row) => {
    const link = key(row, ["salesOrderId", "sales_order_id", "orderId", "order_id", "shipmentId", "shipment_id"]);
    return !link || !invoiceKeys.has(link);
  });
  return {
    status: missing.length ? "review_required" : "clear",
    source_count: shipped.length,
    exception_count: missing.length,
    exception_amount_cents: missing.reduce((sum, row) => sum + amountCents(row), 0),
    evidence_codes: missing.some((row) => !key(row, ["salesOrderId", "sales_order_id", "orderId", "order_id", "shipmentId", "shipment_id"]))
      ? ["shipment_invoice_link_key_missing"]
      : [],
  };
}

export function reconcileExpenseCutoff(payload: AdvisacorNormalizedFinancialData): CutoffResult {
  const bills = (payload.normalizedAPAging || []).filter((row) => /bill|payable|invoice|vendor/.test(text(row)));
  if (!bills.length) {
    return { status: "unavailable", source_count: 0, exception_count: 0, exception_amount_cents: 0, evidence_codes: ["bill_evidence_unavailable"] };
  }

  const incomplete = bills.filter((row) => {
    const value = text(row);
    const hasPostingState = /posted|approved|open|paid|partially paid|unpaid|void/.test(value);
    const hasDate = ["postedAt", "posted_at", "transactionDate", "transaction_date", "date"].some((field) => Boolean(row.metadata?.[field]));
    return !hasPostingState || !hasDate;
  });
  return {
    status: incomplete.length ? "review_required" : "clear",
    source_count: bills.length,
    exception_count: incomplete.length,
    exception_amount_cents: incomplete.reduce((sum, row) => sum + amountCents(row), 0),
    evidence_codes: incomplete.length ? ["bill_posting_or_payment_state_incomplete"] : [],
  };
}
