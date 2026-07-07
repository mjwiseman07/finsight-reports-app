import { describe, it, expect } from "vitest";
import { evaluateQc01 } from "@/lib/ap-intake/quarantine/gates/qc-01-attestation";

function makeSupabase(signals: Array<{ code: string }>) {
  return {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                maybeSingle: async () => ({ data: { originating_signals: signals } }),
              };
            },
          };
        },
      };
    },
  } as unknown as Parameters<typeof evaluateQc01>[0]["supabase"];
}

describe("qc-01 attestation gate", () => {
  it("fails on too-short attestation", async () => {
    const r = await evaluateQc01({
      supabase: makeSupabase([{ code: "no_match" }]),
      quarantineId: "q1",
      attestationText: "too short",
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("attestation_too_short");
  });

  it("fails when no signal code is referenced", async () => {
    const r = await evaluateQc01({
      supabase: makeSupabase([{ code: "no_match_route_to_quarantine" }]),
      quarantineId: "q1",
      attestationText: "I have verified everything looks fine no worries",
    });
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("attestation_missing_signal_reference");
  });

  it("passes when attestation is ≥20 chars AND references a signal code", async () => {
    const r = await evaluateQc01({
      supabase: makeSupabase([{ code: "bank_change_detected" }]),
      quarantineId: "q1",
      attestationText: "Verified bank_change_detected with vendor by phone with CFO.",
    });
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("attestation_valid");
    expect((r.evidence as { referenced_signals: string[] }).referenced_signals).toContain(
      "bank_change_detected",
    );
  });
});
