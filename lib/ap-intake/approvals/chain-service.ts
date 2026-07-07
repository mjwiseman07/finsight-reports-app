/**
 * D6.5 Part 2 · Block 6b — Approval chain service.
 * Sequential strategy in Block 6b (parallel/any_of reserved for later).
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import {
  ApprovalValidationError,
  type CreateApprovalChainInput,
  type ApproveStepInput,
  type RejectStepInput,
  type DelegateStepInput,
} from "./types";
import { resolveActiveDelegation } from "./delegation-service";
import { evaluateBudgetForRequisition } from "@/lib/ap-intake/budget/budget-service";

export { ApprovalValidationError } from "./types";

interface RequisitionRow {
  id: string;
  firm_id: string;
  firm_client_id: string;
  engagement_id: string | null;
  company_id: string;
  status: string;
  total_cents: number;
  approver_user_id: string | null;
}

async function loadRequisition(reqId: string): Promise<RequisitionRow> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisitions")
    .select(
      "id, firm_id, firm_client_id, engagement_id, company_id, status, total_cents, approver_user_id",
    )
    .eq("id", reqId)
    .single();
  if (error || !data) throw new Error(`requisition not found: ${reqId}`);
  return data as RequisitionRow;
}

export async function createApprovalChain(input: CreateApprovalChainInput): Promise<string> {
  if (!input.steps.length) {
    throw new ApprovalValidationError("steps", "chain must have at least one step");
  }
  const orderIndexes = input.steps.map((s) => s.orderIndex);
  if (new Set(orderIndexes).size !== orderIndexes.length) {
    throw new ApprovalValidationError("steps", "order_index must be unique per step");
  }
  const req = await loadRequisition(input.requisitionId);
  if (req.status !== "submitted") {
    throw new ApprovalValidationError(
      "status",
      `cannot build chain from status '${req.status}' — requisition must be submitted`,
    );
  }
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "approvals.createChain",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_approval_matrix", req.firm_id);
  const supabase = createServiceClient();
  const { data: chain, error: chainErr } = await supabase
    .from("requisition_approval_chains")
    .insert({
      firm_id: req.firm_id,
      firm_client_id: req.firm_client_id,
      requisition_id: req.id,
      strategy: input.strategy ?? "sequential",
      status: "active",
      total_steps: input.steps.length,
      completed_steps: 0,
    })
    .select("id")
    .single();
  if (chainErr || !chain) throw new Error(`chain insert failed: ${chainErr?.message}`);
  const stepRows = input.steps.map((s) => ({
    chain_id: chain.id,
    requisition_id: req.id,
    firm_id: req.firm_id,
    order_index: s.orderIndex,
    required_role: s.requiredRole ?? null,
    approver_user_id: s.approverUserId,
    threshold_amount_cents: s.thresholdAmountCents ?? null,
    status: "pending",
  }));
  const { error: stepErr } = await supabase
    .from("requisition_approval_steps")
    .insert(stepRows);
  if (stepErr) throw new Error(`step insert failed: ${stepErr.message}`);
  await publishEvent(
    {
      eventType: "requisition.approval_chain_created",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: {
        chain_id: chain.id,
        strategy: input.strategy ?? "sequential",
        total_steps: input.steps.length,
      },
    },
    supabase,
  );
  for (const s of input.steps) {
    await publishEvent(
      {
        eventType: "requisition.approval_step_assigned",
        eventCategory: "ap",
        firmId: req.firm_id,
        firmClientId: req.firm_client_id,
        engagementId: req.engagement_id ?? undefined,
        aggregateType: "requisition",
        aggregateId: req.id,
        actorType: "user",
        actorId: input.actorUserId,
        payload: {
          chain_id: chain.id,
          order_index: s.orderIndex,
          approver_user_id: s.approverUserId,
          threshold_amount_cents: s.thresholdAmountCents ?? null,
        },
      },
      supabase,
    );
  }
  return chain.id;
}

async function loadStep(stepId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_approval_steps")
    .select(
      "id, chain_id, requisition_id, firm_id, order_index, approver_user_id, status, threshold_amount_cents",
    )
    .eq("id", stepId)
    .single();
  if (error || !data) throw new Error(`approval step not found: ${stepId}`);
  return data;
}

async function loadChain(chainId: string) {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_approval_chains")
    .select(
      "id, firm_id, firm_client_id, requisition_id, strategy, status, total_steps, completed_steps",
    )
    .eq("id", chainId)
    .single();
  if (error || !data) throw new Error(`approval chain not found: ${chainId}`);
  return data;
}

async function nextPendingStepOrder(chainId: string): Promise<number | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("requisition_approval_steps")
    .select("order_index")
    .eq("chain_id", chainId)
    .eq("status", "pending")
    .order("order_index", { ascending: true })
    .limit(1);
  if (error) throw new Error(`nextPendingStepOrder failed: ${error.message}`);
  return data && data.length > 0 ? data[0].order_index : null;
}

export async function approveApprovalStep(input: ApproveStepInput): Promise<void> {
  const step = await loadStep(input.stepId);
  if (step.status !== "pending") {
    throw new ApprovalValidationError("status", `step already in status '${step.status}'`);
  }
  const chain = await loadChain(step.chain_id);
  const req = await loadRequisition(step.requisition_id);
  if (chain.strategy === "sequential") {
    const nextOrder = await nextPendingStepOrder(chain.id);
    if (nextOrder !== step.order_index) {
      throw new ApprovalValidationError(
        "order_index",
        `sequential chain requires order ${nextOrder} before ${step.order_index}`,
      );
    }
  }
  let actingAs: "self" | "delegate" = "self";
  if (step.approver_user_id !== input.approverUserId) {
    const delegation = await resolveActiveDelegation({
      firmId: chain.firm_id,
      delegatorUserId: step.approver_user_id,
      delegateUserId: input.approverUserId,
    });
    if (!delegation) {
      throw new ApprovalValidationError(
        "approverUserId",
        "user is not the assigned approver and has no active delegation",
      );
    }
    actingAs = "delegate";
  }
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "approvals.approveStep",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.approverUserId,
  });
  await assertPilotFeature("ap_approval_matrix", req.firm_id);
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { error: stepUpdErr } = await supabase
    .from("requisition_approval_steps")
    .update({
      status: "approved",
      acted_at: nowIso,
      acted_by_user_id: input.approverUserId,
      comment: input.comment ?? null,
    })
    .eq("id", step.id);
  if (stepUpdErr) throw new Error(`step update failed: ${stepUpdErr.message}`);
  await publishEvent(
    {
      eventType: "requisition.approval_step_approved",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.approverUserId,
      payload: {
        chain_id: chain.id,
        step_id: step.id,
        order_index: step.order_index,
        acting_as: actingAs,
        assigned_approver: step.approver_user_id,
      },
    },
    supabase,
  );
  const completed = chain.completed_steps + 1;
  const chainDone = completed >= chain.total_steps;
  await supabase
    .from("requisition_approval_chains")
    .update({
      completed_steps: completed,
      status: chainDone ? "completed" : "active",
      completed_at: chainDone ? nowIso : null,
    })
    .eq("id", chain.id);
  if (chainDone) {
    const budgetResult = await evaluateBudgetForRequisition({
      requisitionId: req.id,
      evaluatedByUserId: input.approverUserId,
    });
    if (budgetResult.result === "exceeds_budget") {
      await supabase
        .from("requisition_approval_chains")
        .update({
          status: "active",
          completed_steps: chain.total_steps,
          completed_at: null,
        })
        .eq("id", chain.id);
      throw new ApprovalValidationError(
        "budget",
        `budget exceeded on ${budgetResult.glAccountCode}: budget=${budgetResult.budgetAmountCents}c committed=${budgetResult.committedCents}c incoming=${budgetResult.incomingCents}c`,
      );
    }
    await supabase
      .from("requisitions")
      .update({
        status: "approved",
        approved_at: nowIso,
        approved_by: input.approverUserId,
        updated_at: nowIso,
      })
      .eq("id", req.id);
    await publishEvent(
      {
        eventType: "requisition.approval_chain_completed",
        eventCategory: "ap",
        firmId: req.firm_id,
        firmClientId: req.firm_client_id,
        engagementId: req.engagement_id ?? undefined,
        aggregateType: "requisition",
        aggregateId: req.id,
        actorType: "user",
        actorId: input.approverUserId,
        payload: { chain_id: chain.id },
      },
      supabase,
    );
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
        payload: { via: "approval_chain", chain_id: chain.id },
      },
      supabase,
    );
  }
}

export async function rejectApprovalStep(input: RejectStepInput): Promise<void> {
  const step = await loadStep(input.stepId);
  if (step.status !== "pending") {
    throw new ApprovalValidationError("status", `step already in status '${step.status}'`);
  }
  if (step.approver_user_id !== input.approverUserId) {
    const delegation = await resolveActiveDelegation({
      firmId: step.firm_id,
      delegatorUserId: step.approver_user_id,
      delegateUserId: input.approverUserId,
    });
    if (!delegation) {
      throw new ApprovalValidationError(
        "approverUserId",
        "user is not the assigned approver and has no active delegation",
      );
    }
  }
  const chain = await loadChain(step.chain_id);
  const req = await loadRequisition(step.requisition_id);
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "approvals.rejectStep",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.approverUserId,
  });
  await assertPilotFeature("ap_approval_matrix", req.firm_id);
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  await supabase
    .from("requisition_approval_steps")
    .update({
      status: "rejected",
      acted_at: nowIso,
      acted_by_user_id: input.approverUserId,
      comment: input.reason,
    })
    .eq("id", step.id);
  await supabase
    .from("requisition_approval_chains")
    .update({ status: "rejected", completed_at: nowIso })
    .eq("id", chain.id);
  await supabase
    .from("requisitions")
    .update({
      status: "rejected",
      rejected_at: nowIso,
      rejection_reason: input.reason,
      updated_at: nowIso,
    })
    .eq("id", req.id);
  await publishEvent(
    {
      eventType: "requisition.approval_step_rejected",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.approverUserId,
      payload: { chain_id: chain.id, step_id: step.id, reason: input.reason },
    },
    supabase,
  );
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
      payload: { via: "approval_chain", chain_id: chain.id, reason: input.reason },
    },
    supabase,
  );
}

export async function delegateApprovalStep(input: DelegateStepInput): Promise<void> {
  const step = await loadStep(input.stepId);
  if (step.status !== "pending") {
    throw new ApprovalValidationError("status", `step already in status '${step.status}'`);
  }
  if (step.approver_user_id !== input.fromUserId) {
    throw new ApprovalValidationError(
      "fromUserId",
      "only the assigned approver can delegate the step",
    );
  }
  if (input.fromUserId === input.toUserId) {
    throw new ApprovalValidationError("toUserId", "cannot delegate to self");
  }
  const chain = await loadChain(step.chain_id);
  const req = await loadRequisition(step.requisition_id);
  await assertEntitlement("ap_requisitions", req.engagement_id, {
    caller: "approvals.delegateStep",
    firmClientId: req.firm_client_id,
    actorType: "user",
    actorId: input.fromUserId,
  });
  await assertPilotFeature("ap_approval_matrix", req.firm_id);
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  await supabase
    .from("requisition_approval_steps")
    .update({
      status: "delegated",
      delegated_to_user_id: input.toUserId,
      comment: input.comment ?? null,
      acted_at: nowIso,
      acted_by_user_id: input.fromUserId,
    })
    .eq("id", step.id);
  await supabase.from("requisition_approval_steps").insert({
    chain_id: chain.id,
    requisition_id: req.id,
    firm_id: req.firm_id,
    order_index: step.order_index,
    approver_user_id: input.toUserId,
    threshold_amount_cents: step.threshold_amount_cents,
    status: "pending",
  });
  await publishEvent(
    {
      eventType: "requisition.approval_step_delegated",
      eventCategory: "ap",
      firmId: req.firm_id,
      firmClientId: req.firm_client_id,
      engagementId: req.engagement_id ?? undefined,
      aggregateType: "requisition",
      aggregateId: req.id,
      actorType: "user",
      actorId: input.fromUserId,
      payload: {
        chain_id: chain.id,
        step_id: step.id,
        from_user_id: input.fromUserId,
        to_user_id: input.toUserId,
      },
    },
    supabase,
  );
}
