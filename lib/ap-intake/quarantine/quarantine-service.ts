/**
 * Phase D6.5 Part 2 — Block 3
 * Quarantine Service — idempotent quarantine writes.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/lib/events/publisher";
import type { QuarantineReason, QuarantineSeverity } from "./schema";

export interface QuarantineBillArgs {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  billId: string;
  intakeMessageId: string;
  reason: QuarantineReason;
  originatingSignals: Array<{ code: string; severity: string; evidence: unknown }>;
  originatingSeverity: QuarantineSeverity;
  fraudScoreAtQuarantine?: number;
}

export async function quarantineBill(
  args: QuarantineBillArgs,
): Promise<{ quarantineId: string }> {
  const {
    supabase,
    firmId,
    firmClientId,
    billId,
    intakeMessageId,
    reason,
    originatingSignals,
    originatingSeverity,
    fraudScoreAtQuarantine = 0,
  } = args;

  // Idempotent: if row already exists for bill_id, return existing id
  const existing = await supabase
    .from("ap_intake_quarantine")
    .select("id")
    .eq("bill_id", billId)
    .maybeSingle();

  if (existing.data?.id) {
    return { quarantineId: existing.data.id as string };
  }

  const { data, error } = await supabase
    .from("ap_intake_quarantine")
    .insert({
      firm_id: firmId,
      firm_client_id: firmClientId,
      bill_id: billId,
      intake_message_id: intakeMessageId,
      quarantine_reason: reason,
      originating_signals: originatingSignals,
      originating_severity: originatingSeverity,
      fraud_score_at_quarantine: fraudScoreAtQuarantine,
      status: "open",
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`quarantineBill insert failed: ${error?.message ?? "no row"}`);
  }

  const quarantineId = data.id as string;

  // Backfill the bill row with quarantine_id
  await supabase
    .from("ap_intake_bills")
    .update({ quarantine_id: quarantineId })
    .eq("id", billId);

  await publishEvent({
    eventType: "bill.quarantined",
    eventCategory: "ap",
    firmId,
    firmClientId,
    aggregateType: "bill",
    aggregateId: billId,
    actorType: "system",
    payload: {
      quarantine_id: quarantineId,
      reason,
      severity: originatingSeverity,
      signals: originatingSignals,
      intake_message_id: intakeMessageId,
    },
  });

  return { quarantineId };
}

export async function getQuarantineForBill(
  supabase: SupabaseClient,
  billId: string,
): Promise<{ id: string; status: string; reason: string } | null> {
  const { data } = await supabase
    .from("ap_intake_quarantine")
    .select("id, status, quarantine_reason")
    .eq("bill_id", billId)
    .maybeSingle();
  if (!data) return null;
  return { id: data.id, status: data.status, reason: data.quarantine_reason };
}

export async function listOpenQuarantinesForFirm(
  supabase: SupabaseClient,
  firmId: string,
): Promise<
  Array<{
    id: string;
    bill_id: string;
    quarantine_reason: string;
    originating_signals: unknown;
    opened_at: string;
  }>
> {
  const { data } = await supabase
    .from("ap_intake_quarantine")
    .select("id, bill_id, quarantine_reason, originating_signals, opened_at")
    .eq("firm_id", firmId)
    .eq("status", "open")
    .order("opened_at", { ascending: false });
  return (data ?? []) as Array<{
    id: string;
    bill_id: string;
    quarantine_reason: string;
    originating_signals: unknown;
    opened_at: string;
  }>;
}
