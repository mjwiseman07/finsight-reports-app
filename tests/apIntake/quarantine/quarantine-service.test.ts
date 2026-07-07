import { describe, it, expect, vi } from "vitest";
import { quarantineBill } from "@/lib/ap-intake/quarantine/quarantine-service";

vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn(async () => ({
    eventId: "evt-1",
    eventSequence: 1,
    eventType: "bill.quarantined",
    eventCategory: "ap",
    occurredAt: new Date(),
    recordedAt: new Date(),
  })),
}));

interface Row { id: string }

function makeSupabase(existing: Row | null) {
  const inserts: unknown[] = [];
  const billUpdates: unknown[] = [];
  return {
    inserts,
    billUpdates,
    client: {
      from(table: string) {
        if (table === "ap_intake_quarantine") {
          return {
            select() {
              return {
                eq() {
                  return { maybeSingle: async () => ({ data: existing }) };
                },
              };
            },
            insert(row: unknown) {
              inserts.push(row);
              return {
                select() {
                  return {
                    single: async () => ({ data: { id: "q-new" }, error: null }),
                  };
                },
              };
            },
          };
        }
        if (table === "ap_intake_bills") {
          return {
            update(row: unknown) {
              billUpdates.push(row);
              return { eq: () => Promise.resolve({ data: null, error: null }) };
            },
          };
        }
        throw new Error(`unexpected table ${table}`);
      },
    } as unknown as Parameters<typeof quarantineBill>[0]["supabase"],
  };
}

describe("quarantineBill", () => {
  it("inserts a new quarantine row when none exists", async () => {
    const { client, inserts, billUpdates } = makeSupabase(null);
    const r = await quarantineBill({
      supabase: client,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      intakeMessageId: "m1",
      reason: "no_match",
      originatingSignals: [{ code: "no_match_route_to_quarantine", severity: "HIGH", evidence: {} }],
      originatingSeverity: "HIGH",
    });
    expect(r.quarantineId).toBe("q-new");
    expect(inserts).toHaveLength(1);
    expect(billUpdates).toHaveLength(1);
  });

  it("is idempotent — returns existing id when a row already exists", async () => {
    const { client, inserts } = makeSupabase({ id: "q-existing" });
    const r = await quarantineBill({
      supabase: client,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      intakeMessageId: "m1",
      reason: "no_match",
      originatingSignals: [],
      originatingSeverity: "HIGH",
    });
    expect(r.quarantineId).toBe("q-existing");
    expect(inserts).toHaveLength(0);
  });
});
