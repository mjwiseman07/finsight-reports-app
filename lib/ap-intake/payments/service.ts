/**
 * Phase D6.5 Part 2 — Block 8a — L9 Interlock + L10 Rail Fan-Out service.
 */
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import { publishEvent } from "@/lib/events/publisher";
import { resolveCurrencyForFirmClient } from "@/lib/erp/quickbooks/currency-resolver";
import { createServiceClient } from "@/lib/supabase/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { computeInterlock } from "./interlock";
import { insertBatch, insertBatchLine, updateBatchStatus } from "./batch";
import { evaluateBankAttestation } from "./bank-attestation";
import { getRail } from "./rail-registry";
import { bootstrapRails } from "./rails";
import type { FanoutOutcome, InterlockResult, Rail } from "./types";

const ADDON_INTERLOCK = "ap_payment_interlock" as const;
const ADDON_FANOUT = "ap_banking_fanout" as const;
const PILOT_INTERLOCK = "ap_payment_interlock" as const;
const PILOT_FANOUT = "ap_banking_fanout" as const;

bootstrapRails();

type GateInput = {
  firmId: string;
  firmClientId?: string;
  engagementId: string;
  caller: string;
  actorUserId?: string;
  actorType?: "user" | "system";
  addon: typeof ADDON_INTERLOCK | typeof ADDON_FANOUT;
  pilot: typeof PILOT_INTERLOCK | typeof PILOT_FANOUT;
};

async function gate(input: GateInput): Promise<void> {
  await assertEntitlement(input.addon, input.engagementId, {
    caller: input.caller,
    firmClientId: input.firmClientId,
    actorType: input.actorType ?? "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature(input.pilot, input.firmId);
}

async function emitPaymentsEvent(
  _supabase: SupabaseClient,
  input: {
    firmId: string;
    firmClientId: string;
    engagementId: string;
    aggregateType: "payment_batch" | "vendor_bank_account" | "vendor_bank_fanout";
    aggregateId: string;
    eventType: string;
    payload: Record<string, unknown>;
    actorUserId?: string;
  },
): Promise<void> {
  await publishEvent({
    eventType: input.eventType,
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    actorType: input.actorUserId ? "user" : "system",
    actorId: input.actorUserId,
    payload: input.payload,
  });
}

export async function createPaymentBatch(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchNumber: string;
  currency: string;
  requestedByUserId: string;
}): Promise<{ batch_id: string }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.createBatch",
    actorUserId: input.requestedByUserId,
    addon: ADDON_INTERLOCK,
    pilot: PILOT_INTERLOCK,
  });
  const supabase = createServiceClient();
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("invalid_currency_format");
  }
  const { id } = await insertBatch(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    batchNumber: input.batchNumber,
    currency,
    requestedByUserId: input.requestedByUserId,
  });
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "payment_batch",
    aggregateId: id,
    eventType: "ap_batch.created",
    payload: { batch_number: input.batchNumber, currency },
    actorUserId: input.requestedByUserId,
  });
  return { batch_id: id };
}

export async function addBatchLine(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchId: string;
  vendorId: string;
  billId?: string | null;
  requisitionId?: string | null;
  grossAmountCents: number;
  currencyCode: string;
  appliedCreditCents?: number;
  appliedPrepaymentCents?: number;
  glAccountCode?: string | null;
  memo?: string | null;
  actorUserId: string;
}): Promise<{ line_id: string; net_amount_cents: number }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.addLine",
    actorUserId: input.actorUserId,
    addon: ADDON_INTERLOCK,
    pilot: PILOT_INTERLOCK,
  });
  const supabase = createServiceClient();
  const currency = input.currencyCode.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new Error("invalid_currency_format");
  }
  // MC-4c: line currency must equal parent batch currency.
  const { data: batchRow, error: batchErr } = await supabase
    .from("payment_batches")
    .select("currency")
    .eq("id", input.batchId)
    .single();
  if (batchErr || !batchRow) throw batchErr ?? new Error("batch_not_found");
  const batchCurrency = String(batchRow.currency ?? "").toUpperCase();
  if (!batchCurrency) throw new Error("batch_currency_unset");
  if (batchCurrency !== currency) {
    throw new Error(
      `batch_line_currency_mismatch: line=${currency} batch=${batchCurrency}`,
    );
  }
  const credit = input.appliedCreditCents ?? 0;
  const prepay = input.appliedPrepaymentCents ?? 0;
  const net = input.grossAmountCents - credit - prepay;
  if (net < 0) throw new Error("net_amount_negative");
  const { id } = await insertBatchLine(supabase, {
    batchId: input.batchId,
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    vendorId: input.vendorId,
    billId: input.billId ?? null,
    requisitionId: input.requisitionId ?? null,
    grossAmountCents: input.grossAmountCents,
    appliedCreditCents: credit,
    appliedPrepaymentCents: prepay,
    netAmountCents: net,
    glAccountCode: input.glAccountCode ?? null,
    memo: input.memo ?? null,
    currency,
  });
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "payment_batch",
    aggregateId: input.batchId,
    eventType: "ap_batch.line_added",
    payload: {
      line_id: id,
      vendor_id: input.vendorId,
      currency,
      gross_cents: input.grossAmountCents,
      applied_credit_cents: credit,
      applied_prepayment_cents: prepay,
      net_cents: net,
    },
    actorUserId: input.actorUserId,
  });
  return { line_id: id, net_amount_cents: net };
}

export async function computePaymentInterlock(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchId: string;
  actorUserId: string;
}): Promise<{
  result: InterlockResult;
  interlock_event_id: string;
  reason_codes: string[];
}> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.computeInterlock",
    actorUserId: input.actorUserId,
    actorType: "system",
    addon: ADDON_INTERLOCK,
    pilot: PILOT_INTERLOCK,
  });
  const supabase = createServiceClient();
  // MC-4c: Resolve home currency for this firm_client and load the batch's
  // declared currency. Both are required inputs into computeInterlock.
  const currencyRes = await resolveCurrencyForFirmClient(
    supabase,
    input.firmClientId,
    undefined,
  );
  const home_currency = currencyRes.ok ? currencyRes.home_currency : "";
  const { data: batchRow } = await supabase
    .from("payment_batches")
    .select("currency")
    .eq("id", input.batchId)
    .single();
  const batch_currency = String(batchRow?.currency ?? "").toUpperCase();
  const { data: rawLines, error: lineErr } = await supabase
    .from("payment_batch_lines")
    .select(
      "id, vendor_id, currency, gross_amount_cents, applied_credit_cents, applied_prepayment_cents, net_amount_cents, gl_account_code",
    )
    .eq("batch_id", input.batchId);
  if (lineErr) throw lineErr;
  const lines = rawLines ?? [];
  const now = new Date();
  const period_year = now.getUTCFullYear();
  const period_month = now.getUTCMonth() + 1;
  const interlockLines = lines.map((l) => ({
    vendor_id: l.vendor_id as string,
    currency: String(l.currency ?? "").toUpperCase(),
    gross_amount_cents: Number(l.gross_amount_cents),
    applied_credit_cents: Number(l.applied_credit_cents),
    applied_prepayment_cents: Number(l.applied_prepayment_cents),
    net_amount_cents: Number(l.net_amount_cents),
    gl_account_code: (l.gl_account_code as string | null) ?? null,
    period_year,
    period_month,
  }));
  const vendorIds = Array.from(new Set(interlockLines.map((l) => l.vendor_id)));
  const commitments = await Promise.all(
    vendorIds.map(async (vendorId) => {
      const { data: reqRows } = await supabase
        .from("requisitions")
        .select("total_cents, status")
        .eq("firm_client_id", input.firmClientId)
        .eq("vendor_id", vendorId)
        .eq("status", "approved");
      const approvedTotal = (reqRows ?? []).reduce(
        (a, r) => a + Number(r.total_cents ?? 0),
        0,
      );
      return {
        vendor_id: vendorId,
        requisition_remaining_cents: approvedTotal > 0 ? approvedTotal : null,
        annual_commitment_remaining_cents: null as number | null,
      };
    }),
  );
  const glCodes = Array.from(
    new Set(interlockLines.map((l) => l.gl_account_code).filter((c): c is string => !!c)),
  );
  const gl_budgets = await Promise.all(
    glCodes.map(async (code) => {
      const { data: bRow } = await supabase
        .from("gl_account_budgets")
        .select("budget_amount_cents, tolerance_pct")
        .eq("firm_client_id", input.firmClientId)
        .eq("gl_account_code", code)
        .eq("period_year", period_year)
        .eq("period_month", period_month)
        .maybeSingle();
      return {
        gl_account_code: code,
        period_year,
        period_month,
        budget_amount_cents: Number(bRow?.budget_amount_cents ?? 0),
        tolerance_pct: Number(bRow?.tolerance_pct ?? 0),
        already_committed_cents: 0,
      };
    }),
  );
  const decision = computeInterlock({
    lines: interlockLines,
    vendor_commitments: commitments,
    gl_budgets,
    home_currency,
    batch_currency,
  });
  const result: InterlockResult = decision.passed ? "passed" : "failed";
  const { data: evt, error: evtErr } = await supabase
    .from("payment_batch_interlock_events")
    .insert({
      batch_id: input.batchId,
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      result,
      reason_codes: decision.reason_codes,
      per_vendor_net_positions: decision.per_vendor,
      gl_budget_snapshot: decision.gl_budget_snapshot,
      vendor_commitment_snapshot: commitments,
    })
    .select("id")
    .single();
  if (evtErr || !evt) throw evtErr ?? new Error("interlock_event_insert_failed");
  await updateBatchStatus(
    supabase,
    input.batchId,
    decision.passed ? "interlock_passed" : "interlock_failed",
  );
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "payment_batch",
    aggregateId: input.batchId,
    eventType: "ap_batch.interlock_computed",
    payload: {
      interlock_event_id: evt.id,
      result,
      reason_codes: decision.reason_codes,
    },
  });
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "payment_batch",
    aggregateId: input.batchId,
    eventType: decision.passed ? "ap_batch.interlock_passed" : "ap_batch.interlock_failed",
    payload: {
      interlock_event_id: evt.id,
      reason_codes: decision.reason_codes,
    },
  });
  return {
    result,
    interlock_event_id: evt.id as string,
    reason_codes: decision.reason_codes,
  };
}

async function reviewerInterlockDecision(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchId: string;
  reviewerUserId: string;
  approve: boolean;
}): Promise<{ ok: true; interlock_event_id: string }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: input.approve ? "payments.reviewerApprove" : "payments.reviewerReject",
    actorUserId: input.reviewerUserId,
    addon: ADDON_INTERLOCK,
    pilot: PILOT_INTERLOCK,
  });
  const supabase = createServiceClient();
  const { data: batch, error: bErr } = await supabase
    .from("payment_batches")
    .select("status")
    .eq("id", input.batchId)
    .single();
  if (bErr || !batch) throw bErr ?? new Error("batch_not_found");
  if (batch.status !== "interlock_failed") {
    throw new Error("batch_not_in_interlock_failed_state");
  }
  const nextResult = input.approve ? "reviewer_approved" : "reviewer_rejected";
  const { data: evt, error: eErr } = await supabase
    .from("payment_batch_interlock_events")
    .insert({
      batch_id: input.batchId,
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      result: nextResult,
      reviewer_user_id: input.reviewerUserId,
      reviewer_decided_at: new Date().toISOString(),
      reason_codes: [],
    })
    .select("id")
    .single();
  if (eErr || !evt) throw eErr ?? new Error("reviewer_event_insert_failed");
  await updateBatchStatus(
    supabase,
    input.batchId,
    input.approve ? "interlock_reviewer_approved" : "interlock_reviewer_rejected",
  );
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "payment_batch",
    aggregateId: input.batchId,
    eventType: input.approve
      ? "ap_batch.interlock_reviewer_approved"
      : "ap_batch.interlock_reviewer_rejected",
    payload: { interlock_event_id: evt.id },
    actorUserId: input.reviewerUserId,
  });
  return { ok: true, interlock_event_id: evt.id as string };
}

export async function reviewerApproveInterlock(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchId: string;
  reviewerUserId: string;
}) {
  return reviewerInterlockDecision({ ...input, approve: true });
}

export async function reviewerRejectInterlock(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchId: string;
  reviewerUserId: string;
}) {
  return reviewerInterlockDecision({ ...input, approve: false });
}

export async function registerVendorBankAccount(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  vendorId: string;
  routingNumber: string;
  accountNumber: string;
  preferredRail: Rail;
  nickname?: string | null;
  registeredByUserId: string;
}): Promise<{ vendor_bank_account_id: string; requires_attestation: boolean }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.registerVendorBankAccount",
    actorUserId: input.registeredByUserId,
    addon: ADDON_FANOUT,
    pilot: PILOT_FANOUT,
  });
  const supabase = createServiceClient();
  const attestation = await evaluateBankAttestation(supabase, {
    firmClientId: input.firmClientId,
    vendorId: input.vendorId,
    routingNumber: input.routingNumber,
    accountNumber: input.accountNumber,
  });
  const { data, error } = await supabase
    .from("vendor_bank_accounts")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      vendor_id: input.vendorId,
      nickname: input.nickname ?? null,
      routing_number_last4: attestation.routing_last4,
      account_number_last4: attestation.account_last4,
      account_hash_sha256: attestation.account_hash_sha256,
      preferred_rail: input.preferredRail,
      is_active: !attestation.requires_attestation,
      registered_by_user_id: input.registeredByUserId,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("vendor_bank_account_insert_failed");
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_bank_account",
    aggregateId: data.id as string,
    eventType: "ap_rail.vendor_account_registered",
    payload: {
      vendor_id: input.vendorId,
      preferred_rail: input.preferredRail,
      routing_last4: attestation.routing_last4,
      account_last4: attestation.account_last4,
      requires_attestation: attestation.requires_attestation,
      first_seen: attestation.first_seen,
    },
    actorUserId: input.registeredByUserId,
  });
  return {
    vendor_bank_account_id: data.id as string,
    requires_attestation: attestation.requires_attestation,
  };
}

export async function updateVendorBankAccount(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  vendorBankAccountId: string;
  nickname?: string | null;
  preferredRail?: Rail | null;
  actorUserId: string;
}): Promise<{ ok: true }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.updateVendorBankAccount",
    actorUserId: input.actorUserId,
    addon: ADDON_FANOUT,
    pilot: PILOT_FANOUT,
  });
  const supabase = createServiceClient();
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof input.nickname !== "undefined") update.nickname = input.nickname;
  if (input.preferredRail) update.preferred_rail = input.preferredRail;
  const { error } = await supabase
    .from("vendor_bank_accounts")
    .update(update)
    .eq("id", input.vendorBankAccountId);
  if (error) throw error;
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_bank_account",
    aggregateId: input.vendorBankAccountId,
    eventType: "ap_rail.vendor_account_updated",
    payload: { nickname: input.nickname ?? null, preferred_rail: input.preferredRail ?? null },
    actorUserId: input.actorUserId,
  });
  return { ok: true };
}

export async function deactivateVendorBankAccount(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  vendorBankAccountId: string;
  actorUserId: string;
}): Promise<{ ok: true }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.deactivateVendorBankAccount",
    actorUserId: input.actorUserId,
    addon: ADDON_FANOUT,
    pilot: PILOT_FANOUT,
  });
  const supabase = createServiceClient();
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("vendor_bank_accounts")
    .update({
      is_active: false,
      deactivated_at: nowIso,
      deactivated_by_user_id: input.actorUserId,
      updated_at: nowIso,
    })
    .eq("id", input.vendorBankAccountId);
  if (error) throw error;
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_bank_account",
    aggregateId: input.vendorBankAccountId,
    eventType: "ap_rail.vendor_account_deactivated",
    payload: {},
    actorUserId: input.actorUserId,
  });
  return { ok: true };
}

export async function attemptRailFanout(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchId: string;
  batchLineId: string;
  vendorId: string;
  vendorBankAccountId: string;
  amountCents: number;
  memo?: string | null;
  actorUserId: string;
}): Promise<{
  fanout_event_id: string;
  outcome: FanoutOutcome;
  rail: Rail;
  adapter_version: string;
}> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.attemptRailFanout",
    actorUserId: input.actorUserId,
    actorType: "system",
    addon: ADDON_FANOUT,
    pilot: PILOT_FANOUT,
  });
  const supabase = createServiceClient();
  const { data: acct, error: aErr } = await supabase
    .from("vendor_bank_accounts")
    .select("preferred_rail, is_active")
    .eq("id", input.vendorBankAccountId)
    .single();
  if (aErr || !acct) throw aErr ?? new Error("bank_account_not_found");
  if (!acct.is_active) throw new Error("bank_account_inactive_requires_attestation");
  const rail = acct.preferred_rail as Rail;
  const adapter = getRail(rail);
  const attempt = await adapter.attempt({
    batch_id: input.batchId,
    batch_line_id: input.batchLineId,
    firm_id: input.firmId,
    firm_client_id: input.firmClientId,
    vendor_id: input.vendorId,
    vendor_bank_account_id: input.vendorBankAccountId,
    amount_cents: input.amountCents,
    memo: input.memo ?? null,
  });
  const { data: fe, error: eErr } = await supabase
    .from("vendor_bank_fanout_events")
    .insert({
      batch_id: input.batchId,
      batch_line_id: input.batchLineId,
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      vendor_id: input.vendorId,
      vendor_bank_account_id: input.vendorBankAccountId,
      rail,
      adapter_version: attempt.adapter_version,
      attempt_type: "attempt",
      outcome: attempt.outcome,
      amount_cents: input.amountCents,
      external_reference: attempt.external_reference,
      raw_adapter_payload: attempt.raw_adapter_payload,
    })
    .select("id")
    .single();
  if (eErr || !fe) throw eErr ?? new Error("fanout_event_insert_failed");
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_bank_fanout",
    aggregateId: fe.id as string,
    eventType: "ap_rail.fanout_attempted",
    payload: {
      batch_id: input.batchId,
      batch_line_id: input.batchLineId,
      vendor_id: input.vendorId,
      rail,
      outcome: attempt.outcome,
      amount_cents: input.amountCents,
      adapter_version: attempt.adapter_version,
    },
  });
  return {
    fanout_event_id: fe.id as string,
    outcome: attempt.outcome,
    rail,
    adapter_version: attempt.adapter_version,
  };
}

export async function recordRailFanout(input: {
  firmId: string;
  firmClientId: string;
  engagementId: string;
  batchId: string;
  batchLineId: string;
  vendorId: string;
  vendorBankAccountId: string;
  amountCents: number;
  externalReference: string;
  outcome: FanoutOutcome;
  memo?: string | null;
  actorUserId: string;
}): Promise<{ fanout_event_id: string }> {
  await gate({
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    caller: "payments.recordRailFanout",
    actorUserId: input.actorUserId,
    actorType: "system",
    addon: ADDON_FANOUT,
    pilot: PILOT_FANOUT,
  });
  const supabase = createServiceClient();
  const { data: acct, error: aErr } = await supabase
    .from("vendor_bank_accounts")
    .select("preferred_rail")
    .eq("id", input.vendorBankAccountId)
    .single();
  if (aErr || !acct) throw aErr ?? new Error("bank_account_not_found");
  const rail = acct.preferred_rail as Rail;
  const adapter = getRail(rail);
  const rec = await adapter.record({
    batch_id: input.batchId,
    batch_line_id: input.batchLineId,
    firm_id: input.firmId,
    firm_client_id: input.firmClientId,
    vendor_id: input.vendorId,
    vendor_bank_account_id: input.vendorBankAccountId,
    amount_cents: input.amountCents,
    memo: input.memo ?? null,
    external_reference: input.externalReference,
    outcome: input.outcome,
  });
  const { data: fe, error: eErr } = await supabase
    .from("vendor_bank_fanout_events")
    .insert({
      batch_id: input.batchId,
      batch_line_id: input.batchLineId,
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      vendor_id: input.vendorId,
      vendor_bank_account_id: input.vendorBankAccountId,
      rail,
      adapter_version: rec.adapter_version,
      attempt_type: "record",
      outcome: rec.outcome,
      amount_cents: input.amountCents,
      external_reference: rec.external_reference,
      raw_adapter_payload: rec.raw_adapter_payload,
    })
    .select("id")
    .single();
  if (eErr || !fe) throw eErr ?? new Error("fanout_record_insert_failed");
  await emitPaymentsEvent(supabase, {
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_bank_fanout",
    aggregateId: fe.id as string,
    eventType: "ap_rail.fanout_recorded",
    payload: {
      batch_id: input.batchId,
      batch_line_id: input.batchLineId,
      vendor_id: input.vendorId,
      rail,
      outcome: rec.outcome,
      external_reference: rec.external_reference,
      amount_cents: input.amountCents,
      adapter_version: rec.adapter_version,
    },
  });
  return { fanout_event_id: fe.id as string };
}
