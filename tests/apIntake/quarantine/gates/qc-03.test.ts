import { describe, it, expect } from "vitest";
import { evaluateQc03 } from "@/lib/ap-intake/quarantine/gates/qc-03-second-person";

interface Scenario {
  bankActor: string | null;
  priorAttempts: Array<{ actor_user_id: string; overall_pass: boolean }>;
}

function makeSupabase(s: Scenario) {
  return {
    from(table: string) {
      if (table === "ap_intake_bills") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { resolved_vendor_id: "v1", firm_client_id: "fc1" },
                  }),
                };
              },
            };
          },
        };
      }
      if (table === "vendor_bank_history") {
        return {
          select() {
            return {
              eq() {
                return {
                  eq() {
                    return {
                      order() {
                        return {
                          limit() {
                            return {
                              maybeSingle: async () => ({
                                data: s.bankActor ? { actor_user_id: s.bankActor } : null,
                              }),
                            };
                          },
                        };
                      },
                    };
                  },
                };
              },
            };
          },
        };
      }
      if (table === "quarantine_release_attempts") {
        return {
          select() {
            return {
              eq: async () => ({ data: s.priorAttempts }),
            };
          },
        };
      }
      throw new Error(`unexpected ${table}`);
    },
  } as unknown as Parameters<typeof evaluateQc03>[0]["supabase"];
}

describe("qc-03 second-person rule", () => {
  it("passes when releaser is distinct from bank_change_actor and prior releasers", async () => {
    const r = await evaluateQc03({
      supabase: makeSupabase({ bankActor: "u-bank", priorAttempts: [] }),
      quarantineId: "q1",
      billId: "b1",
      releaseActorUserId: "u-review",
    });
    expect(r.pass).toBe(true);
  });

  it("fails when releaser is the bank_change_actor", async () => {
    const r = await evaluateQc03({
      supabase: makeSupabase({ bankActor: "u1", priorAttempts: [] }),
      quarantineId: "q1",
      billId: "b1",
      releaseActorUserId: "u1",
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("releaser_is_bank_change_actor");
  });

  it("fails when releaser previously released the same quarantine", async () => {
    const r = await evaluateQc03({
      supabase: makeSupabase({
        bankActor: null,
        priorAttempts: [{ actor_user_id: "u1", overall_pass: true }],
      }),
      quarantineId: "q1",
      billId: "b1",
      releaseActorUserId: "u1",
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("releaser_previously_released_same_quarantine");
  });
});
