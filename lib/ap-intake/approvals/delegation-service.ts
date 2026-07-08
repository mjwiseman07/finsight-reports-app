/**
 * D6.5 Part 2 · Block 6b — Delegation service.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import {
  ApprovalValidationError,
  type CreateDelegationInput,
  type RevokeDelegationInput,
  type DelegationScope,
} from "./types";

export interface ActiveDelegationRow {
  id: string;
  firm_id: string;
  delegator_user_id: string;
  delegate_user_id: string;
  scope: DelegationScope;
  effective_from: string;
  effective_to: string;
}

interface ResolveArgs {
  firmId: string;
  delegatorUserId: string;
  delegateUserId: string;
  scope?: DelegationScope;
}

export async function resolveActiveDelegation(
  args: ResolveArgs,
): Promise<ActiveDelegationRow | null> {
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const scopeSet: DelegationScope[] = args.scope
    ? [args.scope, "ap_all"]
    : ["ap_requisitions", "ap_amendments", "ap_all"];
  const { data, error } = await supabase
    .from("approval_delegations")
    .select(
      "id, firm_id, delegator_user_id, delegate_user_id, scope, effective_from, effective_to",
    )
    .eq("firm_id", args.firmId)
    .eq("delegator_user_id", args.delegatorUserId)
    .eq("delegate_user_id", args.delegateUserId)
    .is("revoked_at", null)
    .lte("effective_from", nowIso)
    .gte("effective_to", nowIso)
    .in("scope", scopeSet)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return null;
  return data && data.length > 0 ? (data[0] as ActiveDelegationRow) : null;
}

export async function createDelegation(input: CreateDelegationInput): Promise<string> {
  await assertEntitlement("ap_requisitions", input.engagementId, {
    caller: "delegations.create",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
    metadata: { operation: "createDelegation", firmId: input.firmId },
  });
  await assertPilotFeature("ap_approval_matrix", input.firmId);
  if (input.delegatorUserId === input.delegateUserId) {
    throw new ApprovalValidationError("delegateUserId", "cannot delegate to self");
  }
  const from = input.effectiveFrom ?? new Date();
  if (input.effectiveTo <= from) {
    throw new ApprovalValidationError(
      "effectiveTo",
      "effectiveTo must be after effectiveFrom",
    );
  }
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("approval_delegations")
    .insert({
      firm_id: input.firmId,
      delegator_user_id: input.delegatorUserId,
      delegate_user_id: input.delegateUserId,
      scope: input.scope,
      effective_from: from.toISOString(),
      effective_to: input.effectiveTo.toISOString(),
      reason: input.reason ?? null,
      created_by: input.actorUserId,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`delegation insert failed: ${error?.message}`);
  await publishEvent(
    {
      eventType: "approval.delegation_created",
      eventCategory: "ap",
      firmId: input.firmId,
      aggregateType: "delegation",
      aggregateId: data.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: {
        delegator_user_id: input.delegatorUserId,
        delegate_user_id: input.delegateUserId,
        scope: input.scope,
        effective_from: from.toISOString(),
        effective_to: input.effectiveTo.toISOString(),
      },
    },
    supabase,
  );
  return data.id;
}

export async function revokeDelegation(input: RevokeDelegationInput): Promise<void> {
  await assertEntitlement("ap_requisitions", input.engagementId, {
    caller: "delegations.revoke",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
    metadata: {
      operation: "revokeDelegation",
      firmId: input.firmId,
      delegationId: input.delegationId,
    },
  });
  await assertPilotFeature("ap_approval_matrix", input.firmId);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("approval_delegations")
    .select("id, firm_id, delegator_user_id, delegate_user_id, scope, revoked_at")
    .eq("id", input.delegationId)
    .single();
  if (error || !data) throw new Error(`delegation not found: ${input.delegationId}`);
  if (data.revoked_at) return;
  const nowIso = new Date().toISOString();
  await supabase
    .from("approval_delegations")
    .update({ revoked_at: nowIso })
    .eq("id", input.delegationId);
  await publishEvent(
    {
      eventType: "approval.delegation_revoked",
      eventCategory: "ap",
      firmId: data.firm_id,
      aggregateType: "delegation",
      aggregateId: data.id,
      actorType: "user",
      actorId: input.actorUserId,
      payload: {
        delegator_user_id: data.delegator_user_id,
        delegate_user_id: data.delegate_user_id,
        scope: data.scope,
      },
    },
    supabase,
  );
}
