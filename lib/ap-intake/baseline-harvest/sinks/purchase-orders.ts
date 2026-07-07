import type { SupabaseClient } from "@supabase/supabase-js";
import type { HarvestedPoRow, HarvestSource } from "../types";
export async function sinkPurchaseOrders(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  source: HarvestSource;
  runId: string;
  rows: HarvestedPoRow[];
}): Promise<number> {
  if (args.rows.length === 0) return 0;
  // Resolve company_id
  const { data: fc, error: fcErr } = await args.supabase
    .from("firm_clients")
    .select("company_id")
    .eq("id", args.firmClientId)
    .single();
  if (fcErr || !fc) throw new Error(`firm_client not found: ${args.firmClientId}`);
  const companyId = fc.company_id;
  const sourceValue = args.source === "qbo" ? "harvest_qbo" : "harvest_csv";
  const insertRows = args.rows.map((p) => ({
    firm_id: args.firmId,
    firm_client_id: args.firmClientId,
    company_id: companyId,
    po_number: p.poNumber,
    vendor_external_id: p.vendorExternalId ?? null,
    status: p.status,
    currency: p.currency,
    subtotal_cents: p.subtotalCents,
    tax_cents: p.taxCents,
    total_cents: p.totalCents,
    ordered_at: p.orderedAt,
    memo: p.memo ?? null,
    source: sourceValue,
    source_external_id: p.externalPoId,
    baseline_harvest_run_id: args.runId,
  }));
  const { data: inserted, error } = await args.supabase
    .from("purchase_orders")
    .upsert(insertRows, { onConflict: "firm_client_id,source,source_external_id" })
    .select("id, source_external_id");
  if (error) throw new Error(`sinkPurchaseOrders failed: ${error.message}`);
  // Now upsert lines (delete-then-insert per PO for idempotency)
  const idByExternal = new Map((inserted ?? []).map((r) => [r.source_external_id, r.id]));
  for (const p of args.rows) {
    const poId = idByExternal.get(p.externalPoId);
    if (!poId) continue;
    if (p.lines.length === 0) continue;
    await args.supabase.from("purchase_order_line_items").delete().eq("purchase_order_id", poId);
    const lineRows = p.lines.map((l) => ({
      purchase_order_id: poId,
      line_number: l.lineNumber,
      description: l.description,
      quantity_ordered: l.quantityOrdered,
      quantity_received: l.quantityReceived,
      unit_price_cents: l.unitPriceCents,
      line_total_cents: l.lineTotalCents,
      gl_account_code: l.glAccountCode ?? null,
    }));
    const { error: linesErr } = await args.supabase.from("purchase_order_line_items").insert(lineRows);
    if (linesErr) throw new Error(`sinkPurchaseOrders lines failed: ${linesErr.message}`);
  }
  return insertRows.length;
}
