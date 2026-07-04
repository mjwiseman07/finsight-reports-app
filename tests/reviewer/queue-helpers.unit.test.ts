import { describe, expect, it } from "vitest";
import {
  decodeCursor,
  encodeCursor,
  mapSeverity,
  matchesStatusFilter,
  severityToDb,
} from "@/lib/reviewer/queue-helpers";

describe("queue-helpers", () => {
  it("encode/decode cursor round-trip", () => {
    const c = encodeCursor({ lastCreatedAt: "2026-07-06T00:00:00Z", lastId: "abc" });
    expect(decodeCursor(c)).toEqual({ lastCreatedAt: "2026-07-06T00:00:00Z", lastId: "abc" });
  });

  it("mapSeverity warning -> warn", () => {
    expect(mapSeverity("warning")).toBe("warn");
    expect(mapSeverity("info")).toBe("info");
    expect(mapSeverity("error")).toBe("error");
  });

  it("severityToDb maps warn to warning+critical", () => {
    expect(severityToDb("warn")).toEqual(["warning", "critical"]);
  });

  it("status pending filter", () => {
    expect(matchesStatusFilter({ decision: null, posted_je_attempt_id: null, post_block_reason: null }, "pending")).toBe(true);
    expect(matchesStatusFilter({ decision: "approved", posted_je_attempt_id: null, post_block_reason: null }, "pending")).toBe(false);
  });

  it("status posted filter", () => {
    expect(matchesStatusFilter({ decision: "approved", posted_je_attempt_id: "a1", post_block_reason: null }, "posted")).toBe(true);
  });

  it("status blocked filter", () => {
    expect(matchesStatusFilter({ decision: "approved", posted_je_attempt_id: null, post_block_reason: "X" }, "blocked")).toBe(true);
  });

  it("status decided filter", () => {
    expect(
      matchesStatusFilter({ decision: "approved", posted_je_attempt_id: null, post_block_reason: null }, "decided"),
    ).toBe(true);
  });

  it("invalid cursor returns null", () => {
    expect(decodeCursor("not-valid")).toBeNull();
  });
});
