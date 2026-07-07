/**
 * D6.5 Part 2 — Block 6a: Requisitions service.
 * Two-layer gate: assertEntitlement("ap_requisitions", ...) + assertPilotFeature("ap_requisitions", ...).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import { resolveEngagementId } from "@/lib/engagements/resolve";
import { publishEvent } from "@/lib/events/publisher";
import { nextDocumentNumber } from "./numbering";
import { validateCreate, computeTotals, RequisitionValidationError } from "./validators";
import type {
  RequisitionCreateInput,
  RequisitionSubmitInput,
  RequisitionApproveInput,
  RequisitionRejectInput,
} from "./types";
async function resolveFirmClientContext(
  firmClientId: string,
): Promise<{ firmId: string; companyId: string }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("firm_clients")
    .select("firm_id, company_id")
    .eq("id", firmClientId)
    .single();
  if (error || !data) throw new Error(`firm_client not found: ${firmClientId}`);
  return { firmId: data.firm_id, companyId: data.company_id };
}
async function assertApproverAllowed(
  firmId: string,
  approverUserId: string,
): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("firm_memberships")
    .select("id")
    .eq("firm_id", firmId)
    .eq("user_id", approverUserId)
    .eq("status", "active")
    .eq("can_approve", true)
    .maybeSingle();
  if (error) throw new Error(`approver lookup failed: ${error.message}`);
  if (!data) {
    throw new RequisitionValidationError(
      "approverUserId",
      "approver must be an active firm member with can_approve = true",
    );
  }
}
export async function createRequisition(input: RequisitionCreateInput): Promise<{ id: string; requisition_number: string }> {
  validateCreate(input);
  const supabase = createServiceClient();
  const { firmId, companyId } = await resolveFirmClientContext(input.firmClientId);
  const engagementId = await resolveEngagementId(supabase, input.firmClientId);
  await assertEntitlement("ap_requisitions", engagementId, {
    caller: "requisitions.create",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.requesterUserId,
  });
  await assertPilotFeature("ap_requisitions", firmId);
  const reqNumber = await nextDocumentNumber(supabase, companyId, "requisition");
  const { subtotalCents, totalCents } = computeTotals(input.lines);
  const { data: req, error: reqErr } = await supabase
    .from("requisitions")
    .insert({
      firm_id: firmId,
      firm_client_id: input.firmClientId,
      company_id: companyId,
      engagement_id: engagementId,
      requisition_number: reqNumber,
      requester_user_id: input.requesterUserId,
      vendor_id: input.vendorId ?? null,
      vendor_hint_text: input.vendorHintText ?? null,
      needed_by: input.neededBy ?? null,
      justification: input.justification ?? null,
      currency: input.currency ?? "USD",
      subtotal_cents: subtotalCents,
      total_cents: totalCents,
      status: "draft",
    })
    .select("id, requisition_number")
    .single();
  if (reqErr || !req) throw new Error(`requisition insert failed: ${reqErr?.message ?? "no row"}`);
  const lineRows = input.lines.map((l, i) => ({
    requisition_id: req.id,
    line_number: i + 1,
    description: l.description.trim(),
    quantity: l.quantity,
    unit_price_cents: l.unit_price_cents,
    line_total_cents: Math.round(l.quantity * l.unit_price_cents),
    gl_account_code: l.gl_account_code ?? null,
  }));
  const { error: linesErr } = await supabase.from("requisition_line_items").insert(lineRows);
  if (linesErr) throw new Error(`requisition_line_items insert failed: ${linesErr.message}`);
  await publishEvent(
    {
      eventType: "requisition.created",
      eventCategory: "ap",
      firmId,
      firmClientId: input.firmClientId,
      engagementId: engagementId ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.requesterUserId,
      payload: {
        requisition_number: req.requisition_number,
        line_count: input.lines.length,
        total_cents: totalCents,
      },
    },
    supabase,
  );
  return { id: req.id, requisition_number: req.requisition_number };
}
export async function submitRequisition(input: RequisitionSubmitInput): Promise<void> {
  const supabase = createServiceClient();
  const { data: req, error } = await supabase
    .from("requisitions")
    .select("id, firm_id, firm_client_id, engagement_id, status, requester_user_id")
    .eq("id", input.requisitionId)
    .single();
  if (error || !req) throw new Error(`requisition not found: ${input.requisitionId}`);
  if (req.status !== "draft") {
    throw new RequisitionValidationError("status", `cannot submit from status '${req.status}'`);
  }
  if (req.requester_user_id !== input.actorUserId) {
    throw new RequisitionValidationError("actorUserId", "only requester can submit");
  }
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "requisitions.submit",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_requisitions", req.firm_id);
  await assertApproverAllowed(req.firm_id, input.approverUserId);
  const { error: updErr } = await supabase
    .from("requisitions")
    .update({
      status: "submitted",
      approver_user_id: input.approverUserId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requisitionId);
  if (updErr) throw new Error(`requisition update failed: ${updErr.message}`);
  await publishEvent(
    {
      eventType: "requisition.submitted",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: { approver_user_id: input.approverUserId },
    },
    supabase,
  );
}
export async function approveRequisition(input: RequisitionApproveInput): Promise<void> {
  const supabase = createServiceClient();
  const { data: req, error } = await supabase
    .from("requisitions")
    .select("id, firm_id, firm_client_id, engagement_id, status, approver_user_id")
    .eq("id", input.requisitionId)
    .single();
  if (error || !req) throw new Error(`requisition not found: ${input.requisitionId}`);
  if (req.status !== "submitted") {
    throw new RequisitionValidationError("status", `cannot approve from status '${req.status}'`);
  }
  if (req.approver_user_id !== input.approverUserId) {
    throw new RequisitionValidationError("approverUserId", "only assigned approver can approve");
  }
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "requisitions.approve",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.approverUserId,
  });
  await assertPilotFeature("ap_requisitions", req.firm_id);
  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("requisitions")
    .update({
      status: "approved",
      approved_at: nowIso,
      approved_by: input.approverUserId,
      updated_at: nowIso,
    })
    .eq("id", input.requisitionId);
  if (updErr) throw new Error(`requisition update failed: ${updErr.message}`);
  await publishEvent(
    {
      eventType: "requisition.approved",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.approverUserId,
      payload: { comment: input.comment ?? null },
    },
    supabase,
  );
}
export async function rejectRequisition(input: RequisitionRejectInput): Promise<void> {
  const supabase = createServiceClient();
  const { data: req, error } = await supabase
    .from("requisitions")
    .select("id, firm_id, firm_client_id, engagement_id, status, approver_user_id")
    .eq("id", input.requisitionId)
    .single();
  if (error || !req) throw new Error(`requisition not found: ${input.requisitionId}`);
  if (req.status !== "submitted") {
    throw new RequisitionValidationError("status", `cannot reject from status '${req.status}'`);
  }
  if (req.approver_user_id !== input.approverUserId) {
    throw new RequisitionValidationError("approverUserId", "only assigned approver can reject");
  }
  if (!input.reason || input.reason.trim().length === 0) {
    throw new RequisitionValidationError("reason", "rejection reason required");
  }
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "requisitions.reject",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.approverUserId,
  });
  await assertPilotFeature("ap_requisitions", req.firm_id);
  const nowIso = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("requisitions")
    .update({
      status: "rejected",
      rejected_at: nowIso,
      rejection_reason: input.reason.trim(),
      updated_at: nowIso,
    })
    .eq("id", input.requisitionId);
  if (updErr) throw new Error(`requisition update failed: ${updErr.message}`);
  await publishEvent(
    {
      eventType: "requisition.rejected",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.approverUserId,
      payload: { reason: input.reason.trim() },
    },
    supabase,
  );
}

// Block 6b — Chain-based approval is available via lib/ap-intake/approvals/chain-service.ts
export {
  createApprovalChain,
  approveApprovalStep,
  rejectApprovalStep,
  delegateApprovalStep,
} from "@/lib/ap-intake/approvals/chain-service";
