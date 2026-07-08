/**
 * Phase D6.5 Part 2 — Block 8a — L10 Bank Change Attestation Hook.
 */
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface BankAttestationInput {
  firmClientId: string;
  vendorId: string;
  routingNumber: string;
  accountNumber: string;
}

export interface BankAttestationResult {
  account_hash_sha256: string;
  routing_last4: string;
  account_last4: string;
  requires_attestation: boolean;
  prior_hashes: string[];
  first_seen: boolean;
}

export function hashBankAccount(routing: string, account: string): string {
  return createHash("sha256").update(`${routing}:${account}`).digest("hex");
}

function last4(v: string): string {
  const digits = v.replace(/\D/g, "");
  return digits.slice(-4);
}

export async function evaluateBankAttestation(
  supabase: SupabaseClient,
  input: BankAttestationInput,
): Promise<BankAttestationResult> {
  const current_hash = hashBankAccount(input.routingNumber, input.accountNumber);
  const routing_last4 = last4(input.routingNumber);
  const account_last4 = last4(input.accountNumber);
  const { data: rows } = await supabase
    .from("vendor_bank_history")
    .select("account_hash_sha256")
    .eq("firm_client_id", input.firmClientId)
    .eq("vendor_id", input.vendorId);
  const prior = (rows ?? []).map((r) => r.account_hash_sha256 as string);
  const first_seen = prior.length === 0;
  const requires_attestation = !first_seen && !prior.includes(current_hash);
  return {
    account_hash_sha256: current_hash,
    routing_last4,
    account_last4,
    requires_attestation,
    prior_hashes: prior,
    first_seen,
  };
}
