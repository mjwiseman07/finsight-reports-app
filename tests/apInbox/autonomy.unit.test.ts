import { describe, it, expect } from "vitest";
import { resolveAutonomyDecision } from "@/lib/ap-intake/inbox/autonomy";

describe("autonomy resolver — non-excluded intents", () => {
  const base = {
    firm_id: "00000000-0000-0000-0000-000000000000",
    escalation_role_slug: "firm_admin",
    allowlist_intents: [] as string[],
  };

  it("approve_all → needs_approval for every non-excluded intent", () => {
    const d = resolveAutonomyDecision("invoice_submission", { ...base, mode: "approve_all" });
    expect(d.decision).toBe("needs_approval");
  });

  it("allowlist_auto_send → auto_send_pending only when allowlisted", () => {
    const on = resolveAutonomyDecision("statement_request", {
      ...base,
      mode: "allowlist_auto_send",
      allowlist_intents: ["statement_request"],
    });
    expect(on.decision).toBe("auto_send_pending");
    const off = resolveAutonomyDecision("statement_request", {
      ...base,
      mode: "allowlist_auto_send",
      allowlist_intents: [],
    });
    expect(off.decision).toBe("needs_approval");
  });

  it("auto_send_default → auto_send_pending for every non-excluded intent", () => {
    const d = resolveAutonomyDecision("payment_status", { ...base, mode: "auto_send_default" });
    expect(d.decision).toBe("auto_send_pending");
  });
});
