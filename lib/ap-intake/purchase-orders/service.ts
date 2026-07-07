/**
 * D6.5 Part 2 — Block 6a: Purchase Orders + Goods Receipts service.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import { resolveEngagementId } from "@/lib/engagements/resolve";
import { publishEvent } from "@/lib/events/publisher";
import { nextDocumentNumber } from "@/lib/ap-intake/requisitions/numbering";
import type { PurchaseOrderCreateFromReqInput, GoodsReceiptRecordInput } from "./types";
export async function createPurchaseOrderFromRequisition(
  input: PurchaseOrderCreateFromReqInput,
): Promise<{ id: string; po_number: string }> {
  const supabase = createServiceClient();
  const { data: req, error: reqErr } = await supabase
    .from("requisitions")
    .select("id, firm_id, firm_client_id, company_id, engagement_id, status, vendor_id, currency, subtotal_cents, total_cents")
    .eq("id", input.requisitionId)
    .single();
  if (reqErr || !req) throw new Error(`requisition not found: ${input.requisitionId}`);
  if (req.status !== "approved") {
    throw new Error(`cannot create PO from requisition status '${req.status}'`);
  }
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "purchase_orders.create_from_req",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_requisitions", req.firm_id);
  const poNumber = await nextDocumentNumber(supabase, req.company_id, "purchase_order");
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .insert({
      firm_id: req.firm_id,
      firm_client_id: req.firm_client_id,
      company_id: req.company_id,
      po_number: poNumber,
      vendor_id: input.vendorId ?? req.vendor_id ?? null,
      status: "open",
      currency: req.currency,
      subtotal_cents: req.subtotal_cents,
      total_cents: req.total_cents,
      expected_delivery_at: input.expectedDeliveryAt ?? null,
      requisition_id: req.id,
      source: "requisition",
    })
    .select("id, po_number")
    .single();
  if (poErr || !po) throw new Error(`purchase_order insert failed: ${poErr?.message ?? "no row"}`);
  // Copy lines
  const { data: reqLines, error: reqLinesErr } = await supabase
    .from("requisition_line_items")
    .select("line_number, description, quantity, unit_price_cents, line_total_cents, gl_account_code")
    .eq("requisition_id", req.id)
    .order("line_number", { ascending: true });
  if (reqLinesErr) throw new Error(`req line fetch failed: ${reqLinesErr.message}`);
  const poLines = (reqLines ?? []).map((l) => ({
    purchase_order_id: po.id,
    line_number: l.line_number,
    description: l.description,
    quantity_ordered: l.quantity,
    quantity_received: 0,
    unit_price_cents: l.unit_price_cents,
    line_total_cents: l.line_total_cents,
    gl_account_code: l.gl_account_code,
  }));
  if (poLines.length > 0) {
    const { error: poLinesErr } = await supabase.from("purchase_order_line_items").insert(poLines);
    if (poLinesErr) throw new Error(`po_line insert failed: ${poLinesErr.message}`);
  }
  // Link requisition to PO
  const { error: linkErr } = await supabase
    .from("requisitions")
    .update({
      status: "converted_to_po",
      purchase_order_id: po.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.id);
  if (linkErr) throw new Error(`requisition link failed: ${linkErr.message}`);
  await publishEvent(
    {
      eventType: "purchase_order.created",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "purchase_order",
      aggregateId: po.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: { po_number: po.po_number, requisition_id: req.id, line_count: poLines.length },
    },
    supabase,
  );
  await publishEvent(
    {
      eventType: "requisition.converted_to_po",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: { purchase_order_id: po.id, po_number: po.po_number },
    },
    supabase,
  );
  return { id: po.id, po_number: po.po_number };
}
export async function recordGoodsReceipt(
  input: GoodsReceiptRecordInput,
): Promise<{ id: string; gr_number: string }> {
  const supabase = createServiceClient();
  const { data: po, error: poErr } = await supabase
    .from("purchase_orders")
    .select("id, firm_id, firm_client_id, company_id, status")
    .eq("id", input.purchaseOrderId)
    .single();
  if (poErr || !po) throw new Error(`purchase_order not found: ${input.purchaseOrderId}`);
  if (!["open", "partially_received"].includes(po.status)) {
    throw new Error(`cannot record goods_receipt against PO status '${po.status}'`);
  }
  const engagementId = await resolveEngagementId(supabase, po.firm_client_id);
  await assertEntitlement("ap_requisitions", engagementId, {
    caller: "goods_receipts.record",
    firmClientId: po.firm_client_id,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_requisitions", po.firm_id);
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    throw new Error("at least one line required");
  }
  for (const l of input.lines) {
    if (!l.purchase_order_line_id) throw new Error("purchase_order_line_id required");
    if (!Number.isFinite(l.quantity_received) || l.quantity_received <= 0) {
      throw new Error("quantity_received must be > 0");
    }
  }
  const grNumber = await nextDocumentNumber(supabase, po.company_id, "goods_receipt");
  const { data: gr, error: grErr } = await supabase
    .from("goods_receipts")
    .insert({
      firm_id: po.firm_id,
      firm_client_id: po.firm_client_id,
      company_id: po.company_id,
      purchase_order_id: po.id,
      gr_number: grNumber,
      received_at: input.receivedAt ?? new Date().toISOString(),
      received_by_user_id: input.actorUserId,
      source: "manual",
    })
    .select("id, gr_number")
    .single();
  if (grErr || !gr) throw new Error(`goods_receipt insert failed: ${grErr?.message ?? "no row"}`);
  const grLines = input.lines.map((l) => ({
    goods_receipt_id: gr.id,
    purchase_order_line_id: l.purchase_order_line_id,
    quantity_received: l.quantity_received,
  }));
  const { error: grLinesErr } = await supabase.from("goods_receipt_line_items").insert(grLines);
  if (grLinesErr) throw new Error(`gr_line insert failed: ${grLinesErr.message}`);
  // Update PO line quantities
  for (const l of input.lines) {
    const { data: cur } = await supabase
      .from("purchase_order_line_items")
      .select("quantity_ordered, quantity_received")
      .eq("id", l.purchase_order_line_id)
      .single();
    if (cur) {
      const newQty = Number(cur.quantity_received) + Number(l.quantity_received);
      await supabase
        .from("purchase_order_line_items")
        .update({ quantity_received: newQty })
        .eq("id", l.purchase_order_line_id);
    }
  }
  // Recompute PO status
  const { data: allLines } = await supabase
    .from("purchase_order_line_items")
    .select("quantity_ordered, quantity_received")
    .eq("purchase_order_id", po.id);
  const totalOrdered = (allLines ?? []).reduce((s, x) => s + Number(x.quantity_ordered), 0);
  const totalReceived = (allLines ?? []).reduce((s, x) => s + Number(x.quantity_received), 0);
  let newStatus: string = po.status;
  if (totalReceived >= totalOrdered && totalOrdered > 0) newStatus = "partially_received";
  if (totalReceived > 0 && totalReceived < totalOrdered) newStatus = "partially_received";
  if (newStatus !== po.status) {
    await supabase.from("purchase_orders").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", po.id);
  }
  await publishEvent(
    {
      eventType: "goods_receipt.recorded",
      eventCategory: "ap",
      firmId: po.firm_id,
      firmClientId: po.firm_client_id,
      engagementId: engagementId ?? undefined,
      aggregateType: "goods_receipt",
      aggregateId: gr.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: {
        gr_number: gr.gr_number,
        purchase_order_id: po.id,
        line_count: input.lines.length,
        new_po_status: newStatus,
      },
    },
    supabase,
  );
  return { id: gr.id, gr_number: gr.gr_number };
}
export async function closePurchaseOrder(purchaseOrderId: string, actorUserId: string): Promise<void> {
  const supabase = createServiceClient();
  const { data: po, error } = await supabase
    .from("purchase_orders")
    .select("id, firm_id, firm_client_id, status")
    .eq("id", purchaseOrderId)
    .single();
  if (error || !po) throw new Error(`purchase_order not found: ${purchaseOrderId}`);
  if (po.status === "closed" || po.status === "cancelled") return;
  const engagementId = await resolveEngagementId(supabase, po.firm_client_id);
  await assertEntitlement("ap_requisitions", engagementId, {
    caller: "purchase_orders.close",
    firmClientId: po.firm_client_id,
    actorType: "user",
    actorId: actorUserId,
  });
  await assertPilotFeature("ap_requisitions", po.firm_id);
  await supabase
    .from("purchase_orders")
    .update({ status: "closed", closed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", po.id);
  await publishEvent(
    {
      eventType: "purchase_order.closed",
      eventCategory: "ap",
      firmId: po.firm_id,
      firmClientId: po.firm_client_id,
      engagementId: engagementId ?? undefined,
      aggregateType: "purchase_order",
      aggregateId: po.id,
      actorType: "user",
      actorId: actorUserId,
      payload: { prior_status: po.status },
    },
    supabase,
  );
}
