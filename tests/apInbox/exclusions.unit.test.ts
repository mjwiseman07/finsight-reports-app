import { describe, it, expect } from "vitest";
import {
  PERMANENT_EXCLUSION_INTENTS,
  isPermanentExclusionIntent,
  PermanentExclusionError,
} from "@/lib/ap-intake/inbox/exclusions";
import { validateAutonomyConfigWrite, resolveAutonomyDecision } from "@/lib/ap-intake/inbox/autonomy";

describe("permanent exclusion enforcement", () => {
  it("recognizes all 4 permanent intents", () => {
    for (const i of PERMANENT_EXCLUSION_INTENTS) expect(isPermanentExclusionIntent(i)).toBe(true);
    expect(isPermanentExclusionIntent("invoice_submission")).toBe(false);
    expect(isPermanentExclusionIntent(null)).toBe(false);
    expect(isPermanentExclusionIntent(undefined)).toBe(false);
  });

  it("config layer rejects allowlist containing any permanent intent (3 intents × 1 layer = 3 cells)", () => {
    for (const i of PERMANENT_EXCLUSION_INTENTS) {
      const check = validateAutonomyConfigWrite({ mode: "allowlist_auto_send", allowlist_intents: [i] });
      expect(check.ok).toBe(false);
      if (!check.ok) expect(check.offending).toContain(i);
    }
  });

  it("autonomy layer forces permanent_exclusion_hold regardless of mode (4 intents × 3 modes = 12 cells)", () => {
    const modes = ["approve_all", "allowlist_auto_send", "auto_send_default"] as const;
    for (const intent of PERMANENT_EXCLUSION_INTENTS) {
      for (const mode of modes) {
        const decision = resolveAutonomyDecision(intent, {
          firm_id: "00000000-0000-0000-0000-000000000000",
          mode,
          allowlist_intents: [intent],
          escalation_role_slug: "firm_admin",
        });
        expect(decision.decision).toBe("permanent_exclusion_hold");
      }
    }
  });

  it("PermanentExclusionError carries intent + enforcement path", () => {
    const err = new PermanentExclusionError("bank_change_request", "send_time_reject");
    expect(err.intent).toBe("bank_change_request");
    expect(err.enforcementPath).toBe("send_time_reject");
  });
});
