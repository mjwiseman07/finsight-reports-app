/**
 * D6.5 Part 2 · Block 6b — Vendor spend history updater.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { assertEntitlement } from "@/lib/entitlements/gate";
import { assertPilotFeature } from "@/lib/entitlements/pilot-features";

export interface AccumulateSpendInput {
  firmId: string;
  firmClientId: string;
  companyId: string;
  vendorId: string | null;
  vendorExternalId?: string | null;
  glAccountCode: string | null;
  periodYear: number;
  periodMonth: number;
  amountCents: number;
  currency?: string;
  actorUserId: string;
  engagementId: string;
}

export async function accumulateVendorSpend(input: AccumulateSpendInput): Promise<void> {
  await assertEntitlement("ap_budget_controls", input.engagementId, {
    caller: "budget.accumulateVendorSpend",
    firmClientId: input.firmClientId,
    actorType: "user",
    actorId: input.actorUserId,
    metadata: {
      operation: "accumulateVendorSpend",
      firmId: input.firmId,
      vendorId: input.vendorId,
    },
  });
  await assertPilotFeature("ap_budget_controls", input.firmId);
  if (input.amountCents <= 0) return;
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("vendor_spend_history")
    .select("id, spend_amount_cents, invoice_count")
    .eq("company_id", input.companyId)
    .eq("vendor_id", input.vendorId)
    .eq("gl_account_code", input.glAccountCode)
    .eq("period_year", input.periodYear)
    .eq("period_month", input.periodMonth)
    .maybeSingle();
  const nowIso = new Date().toISOString();
  if (existing) {
    await supabase
      .from("vendor_spend_history")
      .update({
        spend_amount_cents: Number(existing.spend_amount_cents) + input.amountCents,
        invoice_count: Number(existing.invoice_count) + 1,
        last_updated_at: nowIso,
      })
      .eq("id", existing.id);
  } else {
    await supabase.from("vendor_spend_history").insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      company_id: input.companyId,
      vendor_id: input.vendorId,
      vendor_external_id: input.vendorExternalId ?? null,
      gl_account_code: input.glAccountCode,
      period_year: input.periodYear,
      period_month: input.periodMonth,
      spend_amount_cents: input.amountCents,
      invoice_count: 1,
      currency: input.currency ?? "USD",
      last_updated_at: nowIso,
    });
  }
  await publishEvent(
    {
      eventType: "vendor_spend.updated",
      eventCategory: "ap",
      firmId: input.firmId,
      firmClientId: input.firmClientId,
      aggregateType: "vendor_spend",
      aggregateId: input.vendorId ?? input.companyId,
      actorType: "user",
      actorId: input.actorUserId,
      payload: {
        gl_account_code: input.glAccountCode,
        period_year: input.periodYear,
        period_month: input.periodMonth,
        amount_added_cents: input.amountCents,
      },
    },
    supabase,
  );
}
