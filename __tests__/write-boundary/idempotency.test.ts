import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findPriorWriteByExternalRef } from "@/lib/accounting/write-boundary/idempotency";

function fakeQuery(returnData: unknown, error: unknown = null) {
  return {
    from: () => ({
      select: () => ({
        in: () => ({
          filter: () => ({
            filter: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: () => Promise.resolve({ data: returnData, error }),
                }),
              }),
            }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}

describe("findPriorWriteByExternalRef", () => {
  test("returns null when nothing found", async () => {
    const result = await findPriorWriteByExternalRef(fakeQuery(null), "c1", "ext-x");
    expect(result).toBeNull();
  });

  test("returns hit when prior write exists", async () => {
    const result = await findPriorWriteByExternalRef(
      fakeQuery({ id: "evt-1", event_kind: "pilot.lifecycle.write-posted", chain_seq: 55, event_at: "2026-08-01T00:00:00Z" }),
      "c1",
      "ext-x",
    );
    expect(result).toEqual({
      id: "evt-1",
      event_kind: "pilot.lifecycle.write-posted",
      chain_seq: 55,
      event_at: "2026-08-01T00:00:00Z",
    });
  });

  test("returns null (does NOT throw) on transient DB error", async () => {
    // Verifies the conservative-but-not-blocking design: log + return null.
    // Rule 1 concern: transient DB errors on the idempotency check should NOT
    // block writes; the validator will proceed and any true dup gets caught
    // by the trigger's chain integrity check later.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await findPriorWriteByExternalRef(fakeQuery(null, { message: "boom" }), "c1", "ext-x");
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
