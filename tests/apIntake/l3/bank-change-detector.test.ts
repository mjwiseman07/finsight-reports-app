import { describe, it, expect, vi } from "vitest";
import { detectBankChange } from "@/lib/ap-intake/l3/bank-change-detector";

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn(async () => ({
    eventId: "evt-1",
    eventSequence: 1,
    eventType: "test",
    eventCategory: "ap",
    occurredAt: new Date(),
    recordedAt: new Date(),
  })),
}));

function makeSupabase(scenario: "empty" | "match" | "mismatch") {
  const insertedHistory: unknown[] = [];
  const updatedBills: unknown[] = [];
  const updatedHistory: unknown[] = [];

  const supabase = {
    from(table: string) {
      if (table === "ap_intake_bills") {
        return {
          update(row: unknown) {
            updatedBills.push(row);
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          },
        };
      }
      if (table === "vendor_bank_history") {
        return {
          insert(row: unknown) {
            insertedHistory.push(row);
            return Promise.resolve({ data: null, error: null });
          },
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        if (scenario === "empty") return Promise.resolve({ data: [], error: null });
                        if (scenario === "match") {
                          return Promise.resolve({
                            data: [
                              {
                                id: "h1",
                                account_hash_sha256:
                                  "MATCHING_HASH_PLACEHOLDER",
                                observation_count: 3,
                                last_observed_at: new Date().toISOString(),
                              },
                            ],
                            error: null,
                          });
                        }
                        return Promise.resolve({
                          data: [
                            {
                              id: "h1",
                              account_hash_sha256: "OLD_HASH",
                              observation_count: 2,
                              last_observed_at: new Date().toISOString(),
                            },
                          ],
                          error: null,
                        });
                      },
                    };
                  },
                };
              },
            };
          },
          update(row: unknown) {
            updatedHistory.push(row);
            return { eq: () => Promise.resolve({ data: null, error: null }) };
          },
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  } as unknown as Parameters<typeof detectBankChange>[0]["supabase"];

  return { supabase, insertedHistory, updatedBills, updatedHistory };
}

const extractedFull = {
  routing_number: "021000021",
  account_number: "1234567890",
  raw_snippet: "routing 021000021 account 1234567890",
};

describe("detectBankChange", () => {
  it("no remittance → no signals, no history write", async () => {
    const { supabase, insertedHistory } = makeSupabase("empty");
    const r = await detectBankChange({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      vendorId: "v1",
      billId: "b1",
      extracted: { routing_number: null, account_number: null, raw_snippet: null },
      actorUserId: null,
    });
    expect(r.changed).toBe(false);
    expect(r.known).toBe(false);
    expect(r.signals).toEqual([]);
    expect(insertedHistory).toHaveLength(0);
  });

  it("first observation → history insert + INFO signal", async () => {
    const { supabase, insertedHistory } = makeSupabase("empty");
    const r = await detectBankChange({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      vendorId: "v1",
      billId: "b1",
      extracted: extractedFull,
      actorUserId: null,
    });
    expect(r.changed).toBe(false);
    expect(r.known).toBe(false);
    expect(r.signals).toHaveLength(1);
    expect(r.signals[0].code).toBe("bank_info_observed");
    expect(r.signals[0].severity).toBe("INFO");
    expect(insertedHistory).toHaveLength(1);
  });

  it("mismatch → new history row + HIGH signal", async () => {
    const { supabase, insertedHistory } = makeSupabase("mismatch");
    const r = await detectBankChange({
      supabase,
      firmId: "f1",
      firmClientId: "fc1",
      vendorId: "v1",
      billId: "b1",
      extracted: extractedFull,
      actorUserId: null,
    });
    expect(r.changed).toBe(true);
    expect(r.signals[0].code).toBe("bank_change_detected");
    expect(r.signals[0].severity).toBe("HIGH");
    expect(r.prior_hash).toBe("OLD_HASH");
    expect(insertedHistory).toHaveLength(1);
  });
});
