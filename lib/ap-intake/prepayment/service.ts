/**
 * D6.5 Part 2 · Block 7a — Prepayment sub-ledger + aging sweep + refund draft.
 *
 * NO REFUND TRANSMISSION CODE PATH — reviewer queue is terminal.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import {
  PrepaymentValidationError,
  type RecordPrepaymentInput,
  type ApplyPrepaymentInput,
  type AgingSweepInput,
  type AgingSweepResult,
  type ReviewRefundDraftInput,
} from "./types";

export { PrepaymentValidationError } from "./types";

const DEFAULT_AGING_THRESHOLD_DAYS = 181;

async function resolveEngagementIdForFirmAddon(
  firmId: string,
  addonCode: string,
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data: engs } = await supabase.from("engagements").select("id").eq("firm_id", firmId);
  if (!engs?.length) return null;
  for (const eng of engs) {
    const { data: row } = await supabase
      .from("engagement_addons")
      .select("is_active")
      .eq("engagement_id", eng.id)
      .eq("addon_code", addonCode)
      .maybeSingle();
    if (row?.is_active) return eng.id as string;
  }
  return null;
}

async function upsertBalance(
  supabase: ReturnType<typeof createServiceClient>,
  firmId: string,
  firmClientId: string,
  vendorId: string,
  currency: string,
): Promise<{ id: string }> {
  const { data: existing } = await supabase
    .from("vendor_prepayment_balances")
    .select("id")
    .eq("firm_id", firmId)
    .eq("vendor_id", vendorId)
    .eq("currency", currency)
    .maybeSingle();
  if (existing?.id) return { id: existing.id };
  const { data, error } = await supabase
    .from("vendor_prepayment_balances")
    .insert({
      firm_id: firmId,
      firm_client_id: firmClientId,
      vendor_id: vendorId,
      currency,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`prepayment_balance upsert failed: ${error?.message}`);
  return { id: data.id };
}

export async function recordPrepayment(input: RecordPrepaymentInput): Promise<string> {
  if (input.amountCents <= 0) {
    throw new PrepaymentValidationError("amountCents", "must be > 0");
  }
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "prepayment.recordPrepayment",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const supabase = createServiceClient();
  await upsertBalance(supabase, input.firmId, input.firmClientId, input.vendorId, input.currency);
  const nowISO = new Date().toISOString();
  const today = nowISO.slice(0, 10);
  const { data: led, error: lErr } = await supabase
    .from("prepayment_ledger")
    .insert({
      firm_id: input.firmId,
      vendor_id: input.vendorId,
      currency: input.currency,
      movement_type: "prepayment_received",
      amount_cents: input.amountCents,
      notes: input.notes ?? null,
      created_by_user_id: input.actorUserId,
    })
    .select("id")
    .single();
  if (lErr || !led) throw new Error(`prepayment_ledger insert failed: ${lErr?.message}`);
  const { data: bal, error: bErr } = await supabase
    .from("vendor_prepayment_balances")
    .select("id, total_paid_cents, oldest_open_prepayment_date")
    .eq("firm_id", input.firmId)
    .eq("vendor_id", input.vendorId)
    .eq("currency", input.currency)
    .single();
  if (bErr || !bal) throw new Error(`prepayment_balance load failed: ${bErr?.message}`);
  const { error: uErr } = await supabase
    .from("vendor_prepayment_balances")
    .update({
      total_paid_cents: bal.total_paid_cents + input.amountCents,
      oldest_open_prepayment_date: bal.oldest_open_prepayment_date ?? today,
      last_movement_at: nowISO,
      updated_at: nowISO,
    })
    .eq("id", bal.id);
  if (uErr) throw new Error(`prepayment_balance update failed: ${uErr.message}`);
  await publishEvent({
    eventType: "prepayment.received",
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "prepayment_balance",
    aggregateId: bal.id,
    actorType: "user",
    actorId: input.actorUserId,
    payload: {
      vendor_id: input.vendorId,
      ledger_id: led.id,
      amount_cents: input.amountCents,
      currency: input.currency,
    },
  });
  return led.id;
}

export async function applyPrepayment(input: ApplyPrepaymentInput): Promise<string> {
  if (input.amountCents <= 0) {
    throw new PrepaymentValidationError("amountCents", "must be > 0");
  }
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "prepayment.applyPrepayment",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const supabase = createServiceClient();
  const { data: bal, error: bErr } = await supabase
    .from("vendor_prepayment_balances")
    .select("id, total_paid_cents, total_applied_cents")
    .eq("firm_id", input.firmId)
    .eq("vendor_id", input.vendorId)
    .eq("currency", input.currency)
    .single();
  if (bErr || !bal) {
    throw new PrepaymentValidationError("balance", "no prepayment balance for vendor/currency");
  }
  const available = bal.total_paid_cents - bal.total_applied_cents;
  if (input.amountCents > available) {
    throw new PrepaymentValidationError("amountCents", "exceeds available balance");
  }
  const nowISO = new Date().toISOString();
  const { data: led, error: lErr } = await supabase
    .from("prepayment_ledger")
    .insert({
      firm_id: input.firmId,
      vendor_id: input.vendorId,
      currency: input.currency,
      movement_type: "prepayment_applied",
      amount_cents: input.amountCents,
      source_bill_id: input.billId,
      created_by_user_id: input.actorUserId,
    })
    .select("id")
    .single();
  if (lErr || !led) throw new Error(`prepayment_ledger apply insert failed: ${lErr?.message}`);
  const newApplied = bal.total_applied_cents + input.amountCents;
  const newBalance = bal.total_paid_cents - newApplied;
  const balancePatch: Record<string, unknown> = {
    total_applied_cents: newApplied,
    last_movement_at: nowISO,
    updated_at: nowISO,
  };
  if (newBalance === 0) balancePatch.oldest_open_prepayment_date = null;
  const { error: uErr } = await supabase
    .from("vendor_prepayment_balances")
    .update(balancePatch)
    .eq("id", bal.id);
  if (uErr) throw new Error(`prepayment_balance apply update failed: ${uErr.message}`);
  await publishEvent({
    eventType: "prepayment.applied",
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "prepayment_balance",
    aggregateId: bal.id,
    actorType: "user",
    actorId: input.actorUserId,
    payload: {
      vendor_id: input.vendorId,
      bill_id: input.billId,
      ledger_id: led.id,
      amount_cents: input.amountCents,
      currency: input.currency,
    },
  });
  return led.id;
}

export async function runAgingSweep(input: AgingSweepInput): Promise<AgingSweepResult> {
  const engagementId = await resolveEngagementIdForFirmAddon(input.firmId, "ap_credit_prepayment");
  await assertEntitlement("ap_credit_prepayment", engagementId, {
    caller: "prepayment.runAgingSweep",
    actorType: "system",
    metadata: { firmId: input.firmId },
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const threshold = input.agingThresholdDays ?? DEFAULT_AGING_THRESHOLD_DAYS;
  const supabase = createServiceClient();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - threshold);
  const cutoffISO = cutoff.toISOString().slice(0, 10);
  const { data: aged, error } = await supabase
    .from("vendor_prepayment_balances")
    .select("id, firm_client_id, vendor_id, currency, balance_cents, oldest_open_prepayment_date")
    .eq("firm_id", input.firmId)
    .gt("balance_cents", 0)
    .lte("oldest_open_prepayment_date", cutoffISO);
  if (error) throw new Error(`aging sweep query failed: ${error.message}`);
  const draftIds: string[] = [];
  const today = new Date();
  for (const row of aged ?? []) {
    const agingDays = row.oldest_open_prepayment_date
      ? Math.floor(
          (today.getTime() - new Date(row.oldest_open_prepayment_date).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : threshold;
    await publishEvent({
      eventType: "prepayment.aged_flagged",
      eventCategory: "ap",
      firmId: input.firmId,
      firmClientId: row.firm_client_id,
      aggregateType: "prepayment_balance",
      aggregateId: row.id,
      actorType: "system",
      payload: {
        vendor_id: row.vendor_id,
        balance_cents: row.balance_cents,
        currency: row.currency,
        aging_days: agingDays,
        threshold_days: threshold,
      },
    });
    const { data: draft, error: dErr } = await supabase
      .from("refund_request_drafts")
      .insert({
        firm_id: input.firmId,
        firm_client_id: row.firm_client_id,
        vendor_id: row.vendor_id,
        prepayment_balance_id: row.id,
        draft_amount_cents: row.balance_cents,
        currency: row.currency,
        aging_days: agingDays,
        status: "pending_reviewer",
      })
      .select("id")
      .single();
    if (dErr || !draft) throw new Error(`refund_request_drafts insert failed: ${dErr?.message}`);
    draftIds.push(draft.id);
    await publishEvent({
      eventType: "prepayment.refund_draft_created",
      eventCategory: "ap",
      firmId: input.firmId,
      firmClientId: row.firm_client_id,
      aggregateType: "refund_request_draft",
      aggregateId: draft.id,
      actorType: "system",
      payload: {
        vendor_id: row.vendor_id,
        prepayment_balance_id: row.id,
        draft_amount_cents: row.balance_cents,
        currency: row.currency,
        aging_days: agingDays,
      },
    });
  }
  return {
    vendorsScanned: (aged ?? []).length,
    drafted: draftIds.length,
    draftIds,
  };
}

export async function reviewRefundDraft(input: ReviewRefundDraftInput): Promise<void> {
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "prepayment.reviewRefundDraft",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.reviewerUserId,
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const statusMap = {
    approved: "reviewer_approved",
    rejected: "reviewer_rejected",
    deferred: "reviewer_deferred",
  } as const;
  const supabase = createServiceClient();
  const { data: draft, error: dErr } = await supabase
    .from("refund_request_drafts")
    .select("id, firm_id, firm_client_id, status")
    .eq("id", input.draftId)
    .single();
  if (dErr || !draft) throw new PrepaymentValidationError("draftId", "draft not found");
  if (draft.firm_id !== input.firmId) throw new PrepaymentValidationError("firmId", "firm mismatch");
  if (draft.status !== "pending_reviewer") {
    throw new PrepaymentValidationError("status", `draft already decided (status=${draft.status})`);
  }
  const nowISO = new Date().toISOString();
  const { error: uErr } = await supabase
    .from("refund_request_drafts")
    .update({
      status: statusMap[input.decision],
      reviewer_user_id: input.reviewerUserId,
      reviewer_decided_at: nowISO,
      reviewer_notes: input.notes ?? null,
    })
    .eq("id", input.draftId);
  if (uErr) throw new Error(`refund_request_drafts review update failed: ${uErr.message}`);
  await publishEvent({
    eventType: "prepayment.refund_draft_reviewed",
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "refund_request_draft",
    aggregateId: input.draftId,
    actorType: "user",
    actorId: input.reviewerUserId,
    payload: {
      decision: input.decision,
      resulting_status: statusMap[input.decision],
      notes: input.notes ?? null,
    },
  });
}
