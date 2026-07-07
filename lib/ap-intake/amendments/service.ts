/**
 * D6.5 Part 2 · Block 6b — Requisition amendments.
 * Same-or-higher-authority approves. Controller-level required when
 * total change exceeds firm-configured threshold.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";

export class AmendmentValidationError extends Error {
  field: string;
  constructor(field: string, message: string) {
    super(message);
    this.name = "AmendmentValidationError";
    this.field = field;
  }
}

const CONTROLLER_THRESHOLD_CENTS = 500_000_00;

export interface RequestAmendmentInput {
  requisitionId: string;
  amenderUserId: string;
  reason: string;
  changesJson: Record<string, unknown>;
  newTotalCents: number;
}

export interface ApproveAmendmentInput {
  amendmentId: string;
  approverUserId: string;
  approverRole?: string;
}

export interface RejectAmendmentInput {
  amendmentId: string;
  approverUserId: string;
  reason: string;
}

interface ReqRow {
  id: string;
  firm_id: string;
  firm_client_id: string;
  engagement_id: string | null;
  status: string;
  total_cents: number;
}

async function loadReq(reqId: string): Promise<ReqRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisitions")
    .select("id, firm_id, firm_client_id, engagement_id, status, total_cents")
    .eq("id", reqId)
    .single();
  if (error || !data) throw new Error(`requisition not found: ${reqId}`);
  return data as ReqRow;
}

export async function requestAmendment(input: RequestAmendmentInput): Promise<string> {
  if (!input.reason.trim()) {
    throw new AmendmentValidationError("reason", "reason required");
  }
  if (input.newTotalCents < 0) {
    throw new AmendmentValidationError("newTotalCents", "must be >= 0");
  }
  const req = await loadReq(input.requisitionId);
  if (!["approved", "converted_to_po"].includes(req.status)) {
    throw new AmendmentValidationError(
      "status",
      `cannot amend requisition in status '${req.status}'`,
    );
  }
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "amendments.request",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.amenderUserId,
  });
  await assertPilotFeature("ap_approval_matrix", req.firm_id);
  const delta = Math.abs(input.newTotalCents - req.total_cents);
  const requiresController = delta >= CONTROLLER_THRESHOLD_CENTS;
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_amendments")
    .insert({
      requisition_id: req.id,
      firm_id: req.firm_id,
      firm_client_id: req.firm_client_id,
      amender_user_id: input.amenderUserId,
      reason: input.reason.trim(),
      changes_json: input.changesJson,
      prior_total_cents: req.total_cents,
      new_total_cents: input.newTotalCents,
      requires_controller: requiresController,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`amendment insert failed: ${error?.message}`);
  await publishEvent(
    {
      eventType: "requisition.amendment_requested",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.amenderUserId,
      payload: {
        amendment_id: data.id,
        prior_total_cents: req.total_cents,
        new_total_cents: input.newTotalCents,
        requires_controller: requiresController,
      },
    },
    supabase,
  );
  return data.id;
}

export async function approveAmendment(input: ApproveAmendmentInput): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_amendments")
    .select(
      "id, requisition_id, firm_id, firm_client_id, status, new_total_cents, requires_controller",
    )
    .eq("id", input.amendmentId)
    .single();
  if (error || !data) throw new Error(`amendment not found: ${input.amendmentId}`);
  if (data.status !== "pending") {
    throw new AmendmentValidationError("status", `already in status '${data.status}'`);
  }
  if (data.requires_controller && input.approverRole !== "controller" && input.approverRole !== "owner") {
    throw new AmendmentValidationError(
      "approverRole",
      "controller or owner role required for large amendments",
    );
  }
  const req = await loadReq(data.requisition_id);
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "amendments.approve",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.approverUserId,
  });
  await assertPilotFeature("ap_approval_matrix", req.firm_id);
  const nowIso = new Date().toISOString();
  await supabase
    .from("requisition_amendments")
    .update({
      status: "approved",
      approved_by: input.approverUserId,
      approved_at: nowIso,
    })
    .eq("id", data.id);
  await supabase
    .from("requisitions")
    .update({ total_cents: data.new_total_cents, updated_at: nowIso })
    .eq("id", req.id);
  await publishEvent(
    {
      eventType: "requisition.amendment_approved",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.approverUserId,
      payload: {
        amendment_id: data.id,
        new_total_cents: data.new_total_cents,
        approver_role: input.approverRole ?? null,
      },
    },
    supabase,
  );
}

export async function rejectAmendment(input: RejectAmendmentInput): Promise<void> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_amendments")
    .select("id, requisition_id, firm_id, firm_client_id, status")
    .eq("id", input.amendmentId)
    .single();
  if (error || !data) throw new Error(`amendment not found: ${input.amendmentId}`);
  if (data.status !== "pending") {
    throw new AmendmentValidationError("status", `already in status '${data.status}'`);
  }
  const req = await loadReq(data.requisition_id);
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "amendments.reject",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.approverUserId,
  });
  const nowIso = new Date().toISOString();
  await supabase
    .from("requisition_amendments")
    .update({
      status: "rejected",
      rejected_by: input.approverUserId,
      rejected_at: nowIso,
      rejection_reason: input.reason,
    })
    .eq("id", data.id);
  await publishEvent(
    {
      eventType: "requisition.amendment_rejected",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.approverUserId,
      payload: { amendment_id: data.id, reason: input.reason },
    },
    supabase,
  );
}
