import { describe, it, expect } from "vitest";
import { reasonCodeForWriteEvent } from "@/lib/accounting/write-boundary/event-emitter";

describe("reasonCodeForWriteEvent — WBP W1c.4a", () => {
  it("maps 6 write kinds to accounting.write.* reasons (back-compat)", () => {
    expect(reasonCodeForWriteEvent("pilot.lifecycle.write-validated")).toBe(
      "accounting.write.validated",
    );
    expect(reasonCodeForWriteEvent("pilot.lifecycle.write-rejected")).toBe(
      "accounting.write.rejected",
    );
    expect(reasonCodeForWriteEvent("pilot.lifecycle.write-posted")).toBe("accounting.write.posted");
    expect(reasonCodeForWriteEvent("pilot.lifecycle.write-drifted")).toBe(
      "accounting.write.drifted",
    );
    expect(reasonCodeForWriteEvent("pilot.lifecycle.write-void-succeeded")).toBe(
      "accounting.write.void_succeeded",
    );
    expect(reasonCodeForWriteEvent("pilot.lifecycle.write-failed")).toBe("accounting.write.failed");
  });

  it("maps cache-refreshed to accounting.cache.refreshed", () => {
    expect(reasonCodeForWriteEvent("pilot.lifecycle.cache-refreshed")).toBe(
      "accounting.cache.refreshed",
    );
  });
});
