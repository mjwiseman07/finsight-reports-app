/** Phase D6.5 Part 2 — Block 8a — Payment batch helpers. */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaymentBatchStatus } from "./types";

export async function insertBatch(
  supabase: SupabaseClient,
  input: {
    firmId: string;
    firmClientId: string;
    engagementId: string;
    batchNumber: string;
    currency: string;
    requestedByUserId: string;
  },
): Promise<{ id: string; status: PaymentBatchStatus }> {
  const { data, error } = await supabase
    .from("payment_batches")
    .insert({
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      engagement_id: input.engagementId,
      batch_number: input.batchNumber,
      currency: input.currency,
      status: "draft",
      requested_by_user_id: input.requestedByUserId,
    })
    .select("id, status")
    .single();
  if (error || !data) throw error ?? new Error("batch_insert_failed");
  return { id: data.id as string, status: data.status as PaymentBatchStatus };
}

export async function insertBatchLine(
  supabase: SupabaseClient,
  input: {
    batchId: string;
    firmId: string;
    firmClientId: string;
    vendorId: string;
    billId: string | null;
    requisitionId: string | null;
    grossAmountCents: number;
    appliedCreditCents: number;
    appliedPrepaymentCents: number;
    netAmountCents: number;
    glAccountCode: string | null;
    memo: string | null;
    currency: string;
  },
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("payment_batch_lines")
    .insert({
      batch_id: input.batchId,
      firm_id: input.firmId,
      firm_client_id: input.firmClientId,
      vendor_id: input.vendorId,
      bill_id: input.billId,
      requisition_id: input.requisitionId,
      gross_amount_cents: input.grossAmountCents,
      applied_credit_cents: input.appliedCreditCents,
      applied_prepayment_cents: input.appliedPrepaymentCents,
      net_amount_cents: input.netAmountCents,
      gl_account_code: input.glAccountCode,
      memo: input.memo,
      currency: input.currency,
    })
    .select("id")
    .single();
  if (error || !data) throw error ?? new Error("batch_line_insert_failed");
  return { id: data.id as string };
}

export async function updateBatchStatus(
  supabase: SupabaseClient,
  batchId: string,
  next: PaymentBatchStatus,
): Promise<void> {
  const { error } = await supabase
    .from("payment_batches")
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq("id", batchId);
  if (error) throw error;
}
