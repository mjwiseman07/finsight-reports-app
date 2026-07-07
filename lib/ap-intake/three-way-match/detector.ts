/**
 * D6.5 Part 2 — Block 6a: L3 Three-Way-Match detector.
 * Matches an incoming bill to an open PO for the same firm_client + vendor.
 * Scoring: abs(amount_delta) + 0.001 * days_delta.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAllowedDelta } from "./schema";
import type { ThreeWayMatchInput, ThreeWayMatchResult, ThreeWayMatchSignal } from "./types";
export async function evaluateThreeWayMatch(
  supabase: SupabaseClient,
  input: ThreeWayMatchInput,
): Promise<ThreeWayMatchResult> {
  const signals: ThreeWayMatchSignal[] = [];
  if (input.invoiceAmountCents == null || input.vendorId == null) {
    return {
      status: "not_evaluated",
      purchaseOrderId: null,
      signals: [],
      shouldQuarantine: false,
    };
  }
  const { data: pos, error } = await supabase
    .from("purchase_orders")
    .select("id, po_number, status, total_cents, ordered_at, closed_at")
    .eq("firm_client_id", input.firmClientId)
    .eq("vendor_id", input.vendorId)
    .in("status", ["open", "partially_received", "closed"])
    .order("ordered_at", { ascending: false })
    .limit(50);
  if (error || !pos || pos.length === 0) {
    signals.push({
      code: "no_matching_po",
      severity: "LOW",
      detail: { firm_client_id: input.firmClientId, vendor_id: input.vendorId },
    });
    return {
      status: "no_po",
      purchaseOrderId: null,
      signals,
      shouldQuarantine: false,
    };
  }
  const invoiceEpoch = input.invoiceDate ? Date.parse(input.invoiceDate) : Date.now();
  let best: { id: string; status: string; total_cents: number; ordered_at: string; closed_at: string | null; score: number } | null = null;
  for (const po of pos) {
    const amountDelta = Math.abs((po.total_cents ?? 0) - input.invoiceAmountCents);
    const daysDelta = Math.abs((invoiceEpoch - Date.parse(po.ordered_at)) / (1000 * 60 * 60 * 24));
    const score = amountDelta + 0.001 * daysDelta;
    if (best === null || score < best.score) {
      best = { id: po.id, status: po.status, total_cents: po.total_cents ?? 0, ordered_at: po.ordered_at, closed_at: po.closed_at, score };
    }
  }
  if (!best) {
    signals.push({ code: "no_matching_po", severity: "LOW", detail: {} });
    return { status: "no_po", purchaseOrderId: null, signals, shouldQuarantine: false };
  }
  const allowedDelta = computeAllowedDelta(input.invoiceAmountCents);
  const amountDelta = Math.abs(best.total_cents - input.invoiceAmountCents);
  // Fetch lines for over-received check
  const { data: lines } = await supabase
    .from("purchase_order_line_items")
    .select("quantity_ordered, quantity_received")
    .eq("purchase_order_id", best.id);
  let overReceived = false;
  if (lines && lines.length > 0) {
    for (const l of lines) {
      const ordered = Number(l.quantity_ordered);
      const received = Number(l.quantity_received);
      if (ordered > 0 && received / ordered > 1.05) {
        overReceived = true;
        break;
      }
    }
  }
  let status: ThreeWayMatchResult["status"] = "matched";
  let shouldQuarantine = false;
  if (best.status === "closed") {
    signals.push({
      code: "po_closed_bill_arrived",
      severity: "HIGH",
      detail: { purchase_order_id: best.id, closed_at: best.closed_at },
    });
    status = "po_closed";
    shouldQuarantine = true;
  }
  if (amountDelta > allowedDelta) {
    signals.push({
      code: "po_price_variance_exceeded",
      severity: "HIGH",
      detail: {
        purchase_order_id: best.id,
        po_total_cents: best.total_cents,
        invoice_amount_cents: input.invoiceAmountCents,
        amount_delta_cents: amountDelta,
        allowed_delta_cents: allowedDelta,
      },
    });
    if (status === "matched") status = "price_variance";
    shouldQuarantine = true;
  }
  if (overReceived) {
    signals.push({
      code: "po_quantity_over_received",
      severity: "MEDIUM",
      detail: { purchase_order_id: best.id },
    });
    if (status === "matched") status = "quantity_variance";
  }
  return {
    status,
    purchaseOrderId: best.id,
    signals,
    shouldQuarantine,
  };
}
