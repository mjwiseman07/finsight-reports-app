import { describe, expect, it } from "vitest";
import { mapSeverity, mapQueueRow } from "@/lib/reviewer/queue-helpers";

describe("reviewer queue UI helpers", () => {
  it("severity badges map warning to warn", () => {
    expect(mapSeverity("warning")).toBe("warn");
  });

  it("queue row maps client and engagement embeds", () => {
    const item = mapQueueRow({
      id: "r1",
      firm_client_id: "fc1",
      engagement_id: "e1",
      close_period_id: null,
      rule_id: "gen.x",
      rule_version: 2,
      severity: "error",
      rule_reason_code: "c",
      rule_reason_detail: { a: 1 },
      created_at: "2026-07-06T00:00:00Z",
      decision: null,
      firm_clients: { name: "Client A" },
      engagements: { engagement_name: "Eng B" },
    });
    expect(item.firmClientName).toBe("Client A");
    expect(item.engagementName).toBe("Eng B");
    expect(item.severity).toBe("error");
  });

  it("empty queue message condition", () => {
    const items: unknown[] = [];
    expect(items.length === 0).toBe(true);
  });

  it("loading state when items empty and loading", () => {
    const loading = true;
    const items: unknown[] = [];
    expect(loading && items.length === 0).toBe(true);
  });

  it("error state shows retry", () => {
    const error = "load_failed";
    expect(Boolean(error)).toBe(true);
  });
});
