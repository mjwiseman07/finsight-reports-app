/**
 * Phase D6.5 Part 2 — Block 3
 * L3 Bank Change Detector.
 *
 * On every exact-matched vendor bill, compare extracted routing/account against
 * vendor_bank_history. First observation = observed (INFO). Repeat = tick counter.
 * Mismatch = HIGH signal + append-only history row + bank_change_detected event.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { publishEvent } from "@/lib/events/publisher";
import type { ExtractedRemittance } from "@/lib/ap-intake/l3/remittance-extractor";
import { last4 } from "@/lib/ap-intake/l3/remittance-extractor";

export interface BankChangeSignal {
  code: "bank_info_observed" | "bank_change_detected";
  severity: "HIGH" | "INFO";
  evidence: Record<string, unknown>;
}

export interface BankChangeResult {
  changed: boolean;
  known: boolean;
  prior_hash: string | null;
  current_hash: string | null;
  current_last4: { routing: string; account: string } | null;
  signals: BankChangeSignal[];
}

export interface DetectBankChangeArgs {
  supabase: SupabaseClient;
  firmId: string;
  firmClientId: string;
  vendorId: string;
  billId: string;
  extracted: ExtractedRemittance;
  actorUserId: string | null;
}

function hashAccount(routing: string, account: string): string {
  return createHash("sha256").update(`${routing}:${account}`).digest("hex");
}

export async function detectBankChange(
  args: DetectBankChangeArgs,
): Promise<BankChangeResult> {
  const { supabase, firmId, firmClientId, vendorId, billId, extracted, actorUserId } = args;

  // Guard: no remittance parsed → nothing to check
  if (!extracted.routing_number || !extracted.account_number) {
    return {
      changed: false,
      known: false,
      prior_hash: null,
      current_hash: null,
      current_last4: null,
      signals: [],
    };
  }

  const currentHash = hashAccount(extracted.routing_number, extracted.account_number);
  const routingLast4 = last4(extracted.routing_number);
  const accountLast4 = last4(extracted.account_number);

  // Update the bill row with the current hash (denormalized for fast lookups)
  await supabase
    .from("ap_intake_bills")
    .update({ bank_account_hash_current: currentHash })
    .eq("id", billId);

  // Look up existing history for this vendor
  const { data: history } = await supabase
    .from("vendor_bank_history")
    .select("id, account_hash_sha256, observation_count, last_observed_at")
    .eq("firm_client_id", firmClientId)
    .eq("vendor_id", vendorId)
    .order("last_observed_at", { ascending: false });

  const rows = history ?? [];

  // First observation for this vendor
  if (rows.length === 0) {
    await supabase.from("vendor_bank_history").insert({
      firm_id: firmId,
      firm_client_id: firmClientId,
      vendor_id: vendorId,
      routing_number_last4: routingLast4,
      account_number_last4: accountLast4,
      account_hash_sha256: currentHash,
      last_seen_bill_id: billId,
      actor_user_id: actorUserId,
    });

    await publishEvent({
      eventType: "vendor.bank_info_observed",
      eventCategory: "ap",
      firmId,
      firmClientId,
      aggregateType: "vendor",
      aggregateId: vendorId,
      actorType: "system",
      payload: {
        vendor_id: vendorId,
        bill_id: billId,
        routing_last4: routingLast4,
        account_last4: accountLast4,
        first_observation: true,
      },
    });

    return {
      changed: false,
      known: false,
      prior_hash: null,
      current_hash: currentHash,
      current_last4: { routing: routingLast4, account: accountLast4 },
      signals: [
        {
          code: "bank_info_observed",
          severity: "INFO",
          evidence: { first_observation: true, current_hash: currentHash },
        },
      ],
    };
  }

  // Known match — bump observation counters
  const match = rows.find((r) => r.account_hash_sha256 === currentHash);
  if (match) {
    await supabase
      .from("vendor_bank_history")
      .update({
        last_observed_at: new Date().toISOString(),
        observation_count: (match.observation_count ?? 1) + 1,
        last_seen_bill_id: billId,
      })
      .eq("id", match.id);

    return {
      changed: false,
      known: true,
      prior_hash: currentHash,
      current_hash: currentHash,
      current_last4: { routing: routingLast4, account: accountLast4 },
      signals: [],
    };
  }

  // Mismatch — append new row, emit HIGH signal, publish event
  const priorHash = rows[0].account_hash_sha256;

  await supabase.from("vendor_bank_history").insert({
    firm_id: firmId,
    firm_client_id: firmClientId,
    vendor_id: vendorId,
    routing_number_last4: routingLast4,
    account_number_last4: accountLast4,
    account_hash_sha256: currentHash,
    last_seen_bill_id: billId,
    actor_user_id: actorUserId,
  });

  await publishEvent({
    eventType: "vendor.bank_change_detected",
    eventCategory: "ap",
    firmId,
    firmClientId,
    aggregateType: "vendor",
    aggregateId: vendorId,
    actorType: "system",
    payload: {
      vendor_id: vendorId,
      bill_id: billId,
      prior_hash: priorHash,
      current_hash: currentHash,
      current_routing_last4: routingLast4,
      current_account_last4: accountLast4,
    },
  });

  return {
    changed: true,
    known: false,
    prior_hash: priorHash,
    current_hash: currentHash,
    current_last4: { routing: routingLast4, account: accountLast4 },
    signals: [
      {
        code: "bank_change_detected",
        severity: "HIGH",
        evidence: {
          prior_hash: priorHash,
          current_hash: currentHash,
          current_last4: { routing: routingLast4, account: accountLast4 },
        },
      },
    ],
  };
}
