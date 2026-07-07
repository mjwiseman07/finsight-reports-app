/**
 * Phase D6.5 Part 2 — Block 4: Strategy S3 — same vendor + invoice_number within 365 days.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DuplicateMatch } from "@/lib/ap-intake/duplicate/schema";

export function normalizeInvoiceNumber(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

export async function runS3InvoiceNumberVendor(args: {
  supabase: SupabaseClient;
  firmClientId: string;
  vendorId: string;
  billId: string;
  invoiceNumber: string | null;
}): Promise<DuplicateMatch[]> {
  if (!args.invoiceNumber) return [];

  const normalized = normalizeInvoiceNumber(args.invoiceNumber);
  if (!normalized) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 365);

  const { data, error } = await args.supabase
    .from("ap_intake_bills")
    .select("id, invoice_number, created_at")
    .eq("firm_client_id", args.firmClientId)
    .eq("resolved_vendor_id", args.vendorId)
    .not("invoice_number", "is", null)
    .neq("id", args.billId)
    .gte("created_at", cutoff.toISOString());

  if (error) throw error;

  const rows = (data ?? []).filter((r) => {
    const val = (r.invoice_number as string) ?? "";
    return normalizeInvoiceNumber(val) === normalized;
  });

  return rows.map((r) => ({
    matched_bill_id: r.id as string,
    strategy_id: "S3_invoice_number_vendor" as const,
    confidence: 0.98,
    severity: "HIGH" as const,
    evidence: {
      matched_invoice_number: r.invoice_number,
      normalized,
      window_days: 365,
    },
  }));
}
