import { describe, it, expect } from "vitest";
import {
  evaluateQc04,
  FRAUD_SCORE_CEILING,
} from "@/lib/ap-intake/quarantine/gates/qc-04-fraud-score-ceiling";

function makeSupabase(score: number) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: { fraud_score_current: score } }),
              };
            },
          };
        },
      };
    },
  } as unknown as Parameters<typeof evaluateQc04>[0]["supabase"];
}

describe("qc-04 fraud score ceiling", () => {
  it("ceiling is 0.90", () => {
    expect(FRAUD_SCORE_CEILING).toBe(0.9);
  });

  it("passes at score 0 (Block 3 stub value)", async () => {
    const r = await evaluateQc04({ supabase: makeSupabase(0), billId: "b1" });
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("under_ceiling");
  });

  it("passes at 0.899", async () => {
    const r = await evaluateQc04({ supabase: makeSupabase(0.899), billId: "b1" });
    expect(r.pass).toBe(true);
  });

  it("fails at exactly 0.90", async () => {
    const r = await evaluateQc04({ supabase: makeSupabase(0.9), billId: "b1" });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("at_or_over_ceiling");
  });

  it("fails at 1.0", async () => {
    const r = await evaluateQc04({ supabase: makeSupabase(1.0), billId: "b1" });
    expect(r.pass).toBe(false);
  });
});
