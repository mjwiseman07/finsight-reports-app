import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  mapQueueRow,
  mapSeverity,
  matchesStatusFilter,
} from "@/lib/reviewer/queue-helpers";

describe("reviewer API mapping extras", () => {
  it("maps critical severity to warn", () => {
    expect(mapSeverity("critical")).toBe("warn");
  });

  it("mapQueueRow handles array embeds", () => {
    const row = mapQueueRow({
      id: "r1",
      firm_client_id: "fc1",
      engagement_id: "e1",
      rule_id: "x",
      rule_version: 1,
      severity: "info",
      rule_reason_code: "c",
      created_at: "2026-01-01",
      firm_clients: [{ name: "Arr Client" }],
      engagements: [{ engagement_name: "Arr Eng" }],
    });
    expect(row.firmClientName).toBe("Arr Client");
    expect(row.engagementName).toBe("Arr Eng");
  });

  it("cursor invalid base64", () => {
    expect(decodeCursor("!!!")).toBeNull();
  });

  it("encodeCursor produces string", () => {
    expect(typeof encodeCursor({ lastCreatedAt: "t", lastId: "i" })).toBe("string");
  });

  it("status all matches everything", () => {
    expect(
      matchesStatusFilter({ decision: "approved", posted_je_attempt_id: "a", post_block_reason: "x" }, "all"),
    ).toBe(true);
  });

  it("mapQueueRow null decision", () => {
    const row = mapQueueRow({
      id: "r1",
      firm_client_id: "fc1",
      engagement_id: "e1",
      rule_id: "x",
      rule_version: 1,
      severity: "error",
      rule_reason_code: "c",
      created_at: "2026-01-01",
      decision: null,
    });
    expect(row.decision).toBeNull();
    expect(row.severity).toBe("error");
  });

  it("mapQueueRow with qbo embed", () => {
    const row = mapQueueRow({
      id: "r1",
      firm_client_id: "fc1",
      engagement_id: "e1",
      rule_id: "x",
      rule_version: 1,
      severity: "warning",
      rule_reason_code: "c",
      created_at: "2026-01-01",
      posted_je_attempt_id: "att1",
      je_post_attempts: { qbo_je_id: "QBO-9" },
    });
    expect(row.qboJeId).toBe("QBO-9");
    expect(row.severity).toBe("warn");
  });

  it("mapQueueRow string rule_reason_detail", () => {
    const row = mapQueueRow({
      id: "r1",
      firm_client_id: "fc1",
      engagement_id: "e1",
      rule_id: "x",
      rule_version: 1,
      severity: "info",
      rule_reason_code: "c",
      rule_reason_detail: "plain text",
      created_at: "2026-01-01",
    });
    expect(row.ruleReasonDetail).toBe("plain text");
  });

  it("decided excludes posted items in filter", () => {
    expect(
      matchesStatusFilter({ decision: "approved", posted_je_attempt_id: "a", post_block_reason: null }, "decided"),
    ).toBe(false);
  });

  it("decided excludes blocked items", () => {
    expect(
      matchesStatusFilter({ decision: "approved", posted_je_attempt_id: null, post_block_reason: "X" }, "decided"),
    ).toBe(false);
  });

  it("pending allows null decision only", () => {
    expect(matchesStatusFilter({ decision: null, posted_je_attempt_id: null, post_block_reason: null }, "pending")).toBe(
      true,
    );
  });

  it("mapQueueRow close period nullable", () => {
    const row = mapQueueRow({
      id: "r1",
      firm_client_id: "fc1",
      engagement_id: "e1",
      close_period_id: null,
      rule_id: "x",
      rule_version: 1,
      severity: "info",
      rule_reason_code: "c",
      created_at: "2026-01-01",
    });
    expect(row.closePeriodId).toBeNull();
  });

  it("mapQueueRow post block reason", () => {
    const row = mapQueueRow({
      id: "r1",
      firm_client_id: "fc1",
      engagement_id: "e1",
      rule_id: "x",
      rule_version: 1,
      severity: "info",
      rule_reason_code: "c",
      created_at: "2026-01-01",
      post_block_reason: "ENTITLEMENT_DENIED",
    });
    expect(row.postBlockReason).toBe("ENTITLEMENT_DENIED");
  });

  it("cursor round-trip preserves ids", () => {
    const c = encodeCursor({ lastCreatedAt: "2026-07-01T00:00:00.000Z", lastId: "uuid-1" });
    expect(decodeCursor(c)?.lastId).toBe("uuid-1");
  });

  it("mapSeverity error path", () => {
    expect(mapSeverity("error")).toBe("error");
  });
});
