import { describe, it, expect } from "vitest";
import { normalizeSupportTicket } from "../../lib/support-center";

describe("normalizeSupportTicket enrichment", () => {
  it("surfaces qboRealmId, lastIntuitTid, correlationId from snake_case", () => {
    const row = {
      id: "t1",
      ticket_number: 42,
      subject: "test",
      qbo_realm_id: "1234567890",
      last_intuit_tid: "tid-abc",
      correlation_id: "corr-xyz",
    };
    const out = normalizeSupportTicket(row);
    expect(out.qboRealmId).toBe("1234567890");
    expect(out.lastIntuitTid).toBe("tid-abc");
    expect(out.correlationId).toBe("corr-xyz");
  });

  it("returns null for missing enrichment fields (backwards compat)", () => {
    const row = { id: "t1", ticket_number: 1, subject: "x" };
    const out = normalizeSupportTicket(row);
    expect(out.qboRealmId).toBeNull();
    expect(out.lastIntuitTid).toBeNull();
    expect(out.correlationId).toBeNull();
  });
});
