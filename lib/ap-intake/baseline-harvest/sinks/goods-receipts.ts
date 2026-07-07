import type { SupabaseClient } from "@supabase/supabase-js";
import type { HarvestedGoodsReceiptRow, HarvestSource } from "../types";
export async function sinkGoodsReceipts(args: {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  source: HarvestSource;
  runId: string;
  rows: HarvestedGoodsReceiptRow[];
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
  // Resolve PO ids by external_id
  const externalPoIds = Array.from(new Set(args.rows.map((r) => r.purchaseOrderExternalId)));
  const { data: pos } = await args.supabase
    .from("purchase_orders")
    .select("id, source_external_id")
    .eq("firm_client_id", args.firmClientId)
    .in("source_external_id", externalPoIds);
  const poIdByExternal = new Map((pos ?? []).map((r) => [r.source_external_id, r.id]));
  let count = 0;
  for (const g of args.rows) {
    const poId = poIdByExternal.get(g.purchaseOrderExternalId);
    if (!poId) continue;
    const { data: gr, error } = await args.supabase
      .from("goods_receipts")
      .upsert(
        {
          firm_id: args.firmId,
          firm_client_id: args.firmClientId,
          company_id: companyId,
          purchase_order_id: poId,
          gr_number: g.grNumber,
          received_at: g.receivedAt,
          source: sourceValue,
          source_external_id: g.externalGrId,
          baseline_harvest_run_id: args.runId,
        },
        { onConflict: "firm_client_id,source,source_external_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`sinkGoodsReceipts failed: ${error.message}`);
    // Resolve po lines by line_number
    const { data: poLines } = await args.supabase
      .from("purchase_order_line_items")
      .select("id, line_number")
      .eq("purchase_order_id", poId);
    const lineIdByNumber = new Map((poLines ?? []).map((r) => [r.line_number, r.id]));
    const grLineRows = g.lines
      .map((l) => {
        const poLineId = lineIdByNumber.get(l.poLineNumber);
        if (!poLineId) return null;
        return {
          goods_receipt_id: gr.id,
          purchase_order_line_id: poLineId,
          quantity_received: l.quantityReceived,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);
    if (grLineRows.length > 0) {
      await args.supabase.from("goods_receipt_line_items").upsert(grLineRows, {
        onConflict: "goods_receipt_id,purchase_order_line_id",
      });
    }
    count++;
  }
  return count;
}
