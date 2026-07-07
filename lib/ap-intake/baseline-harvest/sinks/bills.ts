import type { SupabaseClient } from "@supabase/supabase-js";
import type { HarvestedBillRow, HarvestSource } from "../types";

export async function sinkBills(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  source: HarvestSource;
  runId: string;
  rows: HarvestedBillRow[];
}): Promise<number> {
  if (args.rows.length === 0) return 0;
  const { data: fc, error: fcErr } = await args.supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", args.firmClientId)
    .single();
  if (fcErr || !fc) throw new Error(`firm_client not found: ${args.firmClientId}`);
  const companyId = fc.company_id;
  const sourceValue = args.source === "qbo" ? "harvest_qbo" : "harvest_csv";
  const erpPlatform = args.source === "qbo" ? "qbo" : "csv";
  const nowIso = new Date().toISOString();

  const vendorExternalIds = [
    ...new Set(
      args.rows
        .map((b) => b.vendorExternalId)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  ];

  const vendorIdByExternal = new Map<string, string>();
  if (vendorExternalIds.length > 0) {
    const { data: vendors, error: vendorErr } = await args.supabase
      .from("vendor_master_mirror")
      .select("id, external_vendor_id")
      .eq("firm_client_id", args.firmClientId)
      .eq("erp_platform", erpPlatform)
      .in("external_vendor_id", vendorExternalIds);
    if (vendorErr) throw new Error(`sinkBills vendor lookup failed: ${vendorErr.message}`);
    for (const v of vendors ?? []) {
      vendorIdByExternal.set(v.external_vendor_id as string, v.id as string);
    }
  }

  const insertRows = args.rows.flatMap((b) => {
    if (!b.vendorExternalId) return [];
    const vendorId = vendorIdByExternal.get(b.vendorExternalId);
    if (!vendorId) return [];
    return [
      {
        firm_id: args.firmId,
        firm_client_id: args.firmClientId,
        company_id: companyId,
        vendor_id: vendorId,
        bill_id: null as string | null,
        invoice_amount_cents: b.invoiceAmountCents,
        invoice_date: b.invoiceDate,
        invoice_number: b.invoiceNumber,
        received_at: b.receivedAt ?? nowIso,
        quarantined: false,
        source: sourceValue,
        source_external_id: b.externalBillId,
        baseline_harvest_run_id: args.runId,
      },
    ];
  });

  if (insertRows.length === 0) return 0;

  const { error } = await args.supabase
    .from("bill_history")
    .upsert(insertRows, { onConflict: "firm_client_id,source,source_external_id" });
  if (error) throw new Error(`sinkBills failed: ${error.message}`);
  return insertRows.length;
}
