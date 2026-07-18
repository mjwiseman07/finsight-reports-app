/**
 * D6.5 Part 2 · Block 7a — Credit / debit memo service.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";
import {
  CreditValidationError,
  type IssueCreditInput,
  type ApplyCreditInput,
  type ReverseCreditApplicationInput,
  type VoidCreditInput,
  type EvaluateAutoApplyInput,
  type EvaluateAutoApplyResult,
} from "./types";

export { CreditValidationError } from "./types";

export async function issueCredit(input: IssueCreditInput): Promise<string> {
  if (input.originalAmountCents <= 0) {
    throw new CreditValidationError("originalAmountCents", "must be > 0");
  }
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "credits.issueCredit",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("vendor_credits")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      engagement_id: input.engagementId,
      vendor_id: input.vendorId,
      credit_type: input.creditType,
      source_document_type: input.sourceDocumentType,
      source_document_ref: input.sourceDocumentRef ?? null,
      original_amount_cents: input.originalAmountCents,
      remaining_amount_cents: input.originalAmountCents,
      currency: input.currency,
      issued_date: input.issuedDate,
      expiration_date: input.expirationDate ?? null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`vendor_credits insert failed: ${error?.message}`);
  await publishEvent({
    eventType: "vendor_credit.issued",
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_credit",
    aggregateId: data.id,
    actorType: "user",
    actorId: input.actorUserId,
    payload: {
      vendor_id: input.vendorId,
      credit_type: input.creditType,
      amount_cents: input.originalAmountCents,
      currency: input.currency,
    },
  });
  return data.id;
}

export async function applyCredit(input: ApplyCreditInput): Promise<string> {
  if (input.appliedAmountCents <= 0) {
    throw new CreditValidationError("appliedAmountCents", "must be > 0");
  }
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "credits.applyCredit",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const supabase = createServiceClient();
  const { data: credit, error: cErr } = await supabase
    .from("vendor_credits")
    .select("id, firm_id, remaining_amount_cents, status, currency")
    .eq("id", input.creditId)
    .single();
  if (cErr || !credit) throw new CreditValidationError("creditId", "credit not found");
  if (credit.firm_id !== input.firmId) {
    throw new CreditValidationError("firmId", "firm mismatch");
  }
  // MC-4b (Gap C-2): Currency-equality gate. A credit memo can only be applied
  // to a bill in the same currency. No FX conversion at apply time (mirrors
  // MC-3/MC-4a "reject, never fallback" policy).
  if (credit.currency !== input.billCurrency) {
    throw new CreditValidationError(
      "currency",
      `credit currency ${credit.currency} does not match bill currency ${input.billCurrency}`,
    );
  }
  if (credit.status !== "open" && credit.status !== "partially_applied") {
    throw new CreditValidationError("status", `credit not applicable (status=${credit.status})`);
  }
  if (input.appliedAmountCents > credit.remaining_amount_cents) {
    throw new CreditValidationError("appliedAmountCents", "exceeds remaining_amount_cents");
  }
  const { data: app, error: aErr } = await supabase
    .from("credit_applications")
    .insert({
      firm_id: input.firmId,
      vendor_credit_id: input.creditId,
      bill_id: input.billId,
      applied_amount_cents: input.appliedAmountCents,
      applied_by: input.appliedBy,
    })
    .select("id")
    .single();
  if (aErr || !app) throw new Error(`credit_applications insert failed: ${aErr?.message}`);
  const newRemaining = credit.remaining_amount_cents - input.appliedAmountCents;
  const newStatus = newRemaining === 0 ? "fully_applied" : "partially_applied";
  const { error: uErr } = await supabase
    .from("vendor_credits")
    .update({
      remaining_amount_cents: newRemaining,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.creditId);
  if (uErr) throw new Error(`vendor_credits update failed: ${uErr.message}`);
  await publishEvent({
    eventType: "vendor_credit.applied",
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_credit",
    aggregateId: input.creditId,
    actorType: "user",
    actorId: input.actorUserId,
    payload: {
      application_id: app.id,
      bill_id: input.billId,
      applied_amount_cents: input.appliedAmountCents,
      applied_by: input.appliedBy,
      new_status: newStatus,
      credit_currency: credit.currency,
      bill_currency: input.billCurrency,
    },
  });
  return app.id;
}

export async function reverseCreditApplication(input: ReverseCreditApplicationInput): Promise<void> {
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "credits.reverseCreditApplication",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const supabase = createServiceClient();
  const { data: app, error: aErr } = await supabase
    .from("credit_applications")
    .select("id, firm_id, vendor_credit_id, applied_amount_cents, reversed_at")
    .eq("id", input.applicationId)
    .single();
  if (aErr || !app) throw new CreditValidationError("applicationId", "application not found");
  if (app.firm_id !== input.firmId) throw new CreditValidationError("firmId", "firm mismatch");
  if (app.reversed_at) throw new CreditValidationError("applicationId", "already reversed");
  const { error: uAppErr } = await supabase
    .from("credit_applications")
    .update({ reversed_at: new Date().toISOString(), reversal_reason: input.reversalReason })
    .eq("id", input.applicationId);
  if (uAppErr) throw new Error(`credit_applications reverse update failed: ${uAppErr.message}`);
  const { data: credit, error: cErr } = await supabase
    .from("vendor_credits")
    .select("remaining_amount_cents, original_amount_cents")
    .eq("id", app.vendor_credit_id)
    .single();
  if (cErr || !credit) throw new Error(`vendor_credits load failed after reversal: ${cErr?.message}`);
  const restoredRemaining = credit.remaining_amount_cents + app.applied_amount_cents;
  const newStatus =
    restoredRemaining === credit.original_amount_cents ? "open" : "partially_applied";
  const { error: uCErr } = await supabase
    .from("vendor_credits")
    .update({
      remaining_amount_cents: restoredRemaining,
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", app.vendor_credit_id);
  if (uCErr) throw new Error(`vendor_credits reverse update failed: ${uCErr.message}`);
  await publishEvent({
    eventType: "vendor_credit.application_reversed",
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_credit",
    aggregateId: app.vendor_credit_id,
    actorType: "user",
    actorId: input.actorUserId,
    payload: {
      application_id: input.applicationId,
      reversed_amount_cents: app.applied_amount_cents,
      reason: input.reversalReason,
      new_status: newStatus,
    },
  });
}

export async function voidCredit(input: VoidCreditInput): Promise<void> {
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "credits.voidCredit",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const supabase = createServiceClient();
  const { data: credit, error: cErr } = await supabase
    .from("vendor_credits")
    .select("id, firm_id, status")
    .eq("id", input.creditId)
    .single();
  if (cErr || !credit) throw new CreditValidationError("creditId", "credit not found");
  if (credit.firm_id !== input.firmId) throw new CreditValidationError("firmId", "firm mismatch");
  if (credit.status === "voided") throw new CreditValidationError("status", "already voided");
  const { error: uErr } = await supabase
    .from("vendor_credits")
    .update({ status: "voided", updated_at: new Date().toISOString() })
    .eq("id", input.creditId);
  if (uErr) throw new Error(`vendor_credits void failed: ${uErr.message}`);
  await publishEvent({
    eventType: "vendor_credit.voided",
    eventCategory: "ap",
    firmId: input.firmId,
    firmClientId: input.firmClientId,
    engagementId: input.engagementId,
    aggregateType: "vendor_credit",
    aggregateId: input.creditId,
    actorType: "user",
    actorId: input.actorUserId,
    payload: { reason: input.reason },
  });
}

export async function evaluateAutoApply(
  input: EvaluateAutoApplyInput,
): Promise<EvaluateAutoApplyResult> {
  await assertEntitlement("ap_credit_prepayment", input.engagementId, {
    caller: "credits.evaluateAutoApply",
    firmClientId: input.firmClientId,
    actorType: "system",
  });
  await assertPilotFeature("ap_credit_prepayment", input.firmId);
  const supabase = createServiceClient();
  const { data: credits, error } = await supabase
    .from("vendor_credits")
    .select("id, remaining_amount_cents, issued_date, expiration_date, status")
    .eq("firm_id", input.firmId)
    .eq("vendor_id", input.vendorId)
    .eq("currency", input.currency)
    .in("status", ["open", "partially_applied"])
    .order("issued_date", { ascending: true });
  if (error) throw new Error(`evaluateAutoApply query failed: ${error.message}`);
  const today = new Date().toISOString().slice(0, 10);
  let remaining = input.billAmountCents;
  const eligible: Array<{ creditId: string; appliedAmountCents: number }> = [];
  for (const c of credits ?? []) {
    if (remaining <= 0) break;
    if (c.expiration_date && c.expiration_date < today) continue;
    const applied = Math.min(remaining, c.remaining_amount_cents);
    if (applied > 0) {
      eligible.push({ creditId: c.id, appliedAmountCents: applied });
      remaining -= applied;
    }
  }
  return { eligibleApplications: eligible, remainingBillAmountCents: remaining };
}
