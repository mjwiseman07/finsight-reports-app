import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateBankAttestation,
  hashBankAccount,
} from "@/lib/ap-intake/payments/bank-attestation";

function mockSupabase(rows: { account_hash_sha256: string }[]) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(async () => ({ data: rows, error: null })),
        })),
      })),
    })),
  } as unknown as SupabaseClient;
}

describe("bank attestation", () => {
  const base = {
    firmClientId: "fc-1",
    vendorId: "v-1",
    routingNumber: "021000021",
    accountNumber: "1234567890",
  };

  it("first-seen returns first_seen=true and requires_attestation=false", async () => {
    const r = await evaluateBankAttestation(mockSupabase([]), base);
    expect(r.first_seen).toBe(true);
    expect(r.requires_attestation).toBe(false);
    expect(r.prior_hashes).toEqual([]);
  });

  it("known hash returns requires_attestation=false", async () => {
    const hash = hashBankAccount(base.routingNumber, base.accountNumber);
    const r = await evaluateBankAttestation(
      mockSupabase([{ account_hash_sha256: hash }]),
      base,
    );
    expect(r.first_seen).toBe(false);
    expect(r.requires_attestation).toBe(false);
  });

  it("new hash with prior history returns requires_attestation=true", async () => {
    const r = await evaluateBankAttestation(
      mockSupabase([{ account_hash_sha256: "prior-hash-abc" }]),
      base,
    );
    expect(r.first_seen).toBe(false);
    expect(r.requires_attestation).toBe(true);
    expect(r.prior_hashes).toEqual(["prior-hash-abc"]);
  });

  it("hash is deterministic and last4 strips non-digit whitespace variants", async () => {
    const h1 = hashBankAccount("021000021", "1234567890");
    const h2 = hashBankAccount("021000021", "1234567890");
    expect(h1).toBe(h2);
    const r = await evaluateBankAttestation(mockSupabase([]), {
      ...base,
      accountNumber: "1234-5678-90",
    });
    expect(r.routing_last4).toBe("0021");
    expect(r.account_last4).toBe("7890");
  });
});
