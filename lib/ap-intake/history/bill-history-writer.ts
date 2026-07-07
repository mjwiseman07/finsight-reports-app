import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeBillHistoryRow(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  companyId: string;
  vendorId: string;
  billId: string;
  invoiceAmountCents: number | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  receivedAt: string;
  quarantined: boolean;
  purchaseOrderId?: string | null;
  threeWayMatchStatus?:
    | "matched"
    | "no_po"
    | "price_variance"
    | "quantity_variance"
    | "po_closed"
    | "not_evaluated"
    | null;
  threeWayMatchSignals?: unknown[];
}): Promise<void> {
  await args.supabase.from("bill_history").upsert(
    {
      firm_id: args.firmId,
      firm_client_id: args.firmClientId,
      company_id: args.companyId,
      vendor_id: args.vendorId,
      bill_id: args.billId,
      invoice_amount_cents: args.invoiceAmountCents,
      invoice_date: args.invoiceDate,
      invoice_number: args.invoiceNumber,
      received_at: args.receivedAt,
      quarantined: args.quarantined,
      source: "intake",
      purchase_order_id: args.purchaseOrderId ?? null,
      three_way_match_status: args.threeWayMatchStatus ?? null,
      three_way_match_signals: args.threeWayMatchSignals ?? [],
    },
    { onConflict: "bill_id", ignoreDuplicates: false },
  );
}
