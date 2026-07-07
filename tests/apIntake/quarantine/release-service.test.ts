import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/entitlements/gate", async () => {
  const actual = await vi.importActual<typeof import("@/lib/entitlements/gate")>(
    "@/lib/entitlements/gate",
  );
  return {
    ...actual,
    assertEntitlement: vi.fn(async () => undefined),
  };
});
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn(async () => ({
    eventId: "e1",
    eventSequence: 1,
    eventType: "test",
    eventCategory: "ap",
    occurredAt: new Date(),
    recordedAt: new Date(),
  })),
}));
vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: vi.fn(async () => ({ actionId: "a1", eventId: "e1" })),
}));

import {
  requestQuarantineRelease,
  NoOpenQuarantineError,
} from "@/lib/ap-intake/quarantine/release-service";

function makeSupabase(opts: {
  quarantineRow: { id: string; status: string } | null;
  gateOutcome: "pass" | "fail";
}) {
  const attemptInserts: unknown[] = [];
  const quarantineUpdates: unknown[] = [];

  return {
    attemptInserts,
    quarantineUpdates,
    client: {
      from(table: string) {
        if (table === "ap_intake_quarantine") {
          return {
            select() {
              return {
                eq() {
                  return { maybeSingle: async () => ({ data: opts.quarantineRow }) };
                },
              };
            },
            update(row: unknown) {
              quarantineUpdates.push(row);
              return { eq: () => Promise.resolve({ data: null, error: null }) };
            },
          };
        }
        if (table === "quarantine_release_attempts") {
          return {
            select: () => ({
              eq: async () => ({ data: [] }),
            }),
            insert(row: unknown) {
              attemptInserts.push(row);
              return Promise.resolve({ data: null, error: null });
            },
          };
        }
        if (table === "bookkeeper_release_allowlist") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => ({
                    is: () => ({
                      maybeSingle: async () => ({ data: { id: "a1" } }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "ap_intake_bills") {
          return {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: {
                    resolved_vendor_id: "v1",
                    firm_client_id: "fc1",
                    fraud_score_current: opts.gateOutcome === "fail" ? 0.99 : 0,
                  },
                }),
              }),
            }),
          };
        }
        if (table === "vendor_bank_history") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
          };
        }
        throw new Error(`unexpected ${table}`);
      },
    } as unknown as Parameters<typeof requestQuarantineRelease>[0]["supabase"],
  };
}

function makeSupabaseV2(opts: {
  quarantineRow: {
    id: string;
    status: string;
    originating_signals: Array<{ code: string }>;
  } | null;
  gateOutcome: "pass" | "fail";
}) {
  const base = makeSupabase({
    quarantineRow: opts.quarantineRow
      ? { id: opts.quarantineRow.id, status: opts.quarantineRow.status }
      : null,
    gateOutcome: opts.gateOutcome,
  });
  const original = base.client.from.bind(base.client);
  (base.client as { from: (t: string) => unknown }).from = (table: string) => {
    if (table === "ap_intake_quarantine") {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: opts.quarantineRow }),
              };
            },
          };
        },
        update(row: unknown) {
          base.quarantineUpdates.push(row);
          return { eq: () => Promise.resolve({ data: null, error: null }) };
        },
      };
    }
    return (original as (t: string) => unknown)(table);
  };
  return base;
}

const goodAttestation = "Verified no_match with vendor CFO via phone call at 2pm today.";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requestQuarantineRelease", () => {
  it("throws NoOpenQuarantineError when no open quarantine for bill", async () => {
    const { client } = makeSupabaseV2({ quarantineRow: null, gateOutcome: "pass" });
    await expect(
      requestQuarantineRelease({
        supabase: client,
        firmId: "f1",
        firmClientId: "fc1",
        billId: "b1",
        releaseActorUserId: "u1",
        releaseActorTier: "admin",
        attestationText: goodAttestation,
        engagementId: "e1",
      }),
    ).rejects.toBeInstanceOf(NoOpenQuarantineError);
  });

  it("all-pass path → released=true, quarantine status updated, attempt logged", async () => {
    const { client, attemptInserts, quarantineUpdates } = makeSupabaseV2({
      quarantineRow: {
        id: "q1",
        status: "open",
        originating_signals: [{ code: "no_match" }],
      },
      gateOutcome: "pass",
    });
    const r = await requestQuarantineRelease({
      supabase: client,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      releaseActorUserId: "u-releaser",
      releaseActorTier: "admin",
      attestationText: goodAttestation,
      engagementId: "e1",
    });
    expect(r.released).toBe(true);
    expect(r.blockingGates).toEqual([]);
    expect(attemptInserts.length).toBeGreaterThanOrEqual(1);
    expect(quarantineUpdates.length).toBeGreaterThanOrEqual(1);
  });

  it("any-fail path → released=false, attempt logged, quarantine unchanged", async () => {
    const { client, attemptInserts, quarantineUpdates } = makeSupabaseV2({
      quarantineRow: {
        id: "q1",
        status: "open",
        originating_signals: [{ code: "bank_change_detected" }],
      },
      gateOutcome: "fail",
    });
    const r = await requestQuarantineRelease({
      supabase: client,
      firmId: "f1",
      firmClientId: "fc1",
      billId: "b1",
      releaseActorUserId: "u-releaser",
      releaseActorTier: "admin",
      attestationText: goodAttestation,
      engagementId: "e1",
    });
    expect(r.released).toBe(false);
    expect(r.blockingGates.length).toBeGreaterThanOrEqual(1);
    expect(attemptInserts.length).toBeGreaterThanOrEqual(1);
    expect(quarantineUpdates.length).toBe(0);
  });
});
