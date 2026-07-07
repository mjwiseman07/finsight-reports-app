import type { SupabaseClient } from "@supabase/supabase-js";

export async function writeBillHistoryRow(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  vendorId: string;
  billId: string;
  invoiceAmountCents: number | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  receivedAt: string;
  quarantined: boolean;
}): Promise<void> {
  await args.supabase.from("bill_history").upsert(
    {
      firm_id: args.firmId,
      firm_client_id: args.firmClientId,
      vendor_id: args.vendorId,
      bill_id: args.billId,
      invoice_amount_cents: args.invoiceAmountCents,
      invoice_date: args.invoiceDate,
      invoice_number: args.invoiceNumber,
      received_at: args.receivedAt,
      quarantined: args.quarantined,
    },
    { onConflict: "bill_id", ignoreDuplicates: true },
  );
}
