import { describe, it, expect, vi } from "vitest";
import { runS1ContentHash } from "@/lib/ap-intake/duplicate/strategies/s1-content-hash";

describe("S1 exact content hash", () => {
  it("returns empty when content hash missing", async () => {
    const supabase = { from: vi.fn() } as unknown as import("@supabase/supabase-js").SupabaseClient;
    const hits = await runS1ContentHash({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
      billId: "b-new",
      contentHash: null,
    });
    expect(hits).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("maps matching rows to HIGH confidence hits", async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      gte: () =>
        Promise.resolve({
          data: [{ id: "b-old", created_at: "2026-01-01T00:00:00Z" }],
          error: null,
        }),
    };
    const supabase = {
      from: () => chain,
    } as unknown as import("@supabase/supabase-js").SupabaseClient;

    const hits = await runS1ContentHash({
      supabase,
      firmClientId: "fc1",
      vendorId: "v1",
      billId: "b-new",
      contentHash: "abc123",
    });
    expect(hits).toHaveLength(1);
    expect(hits[0].strategy_id).toBe("S1_exact_content_hash");
    expect(hits[0].severity).toBe("HIGH");
    expect(hits[0].confidence).toBe(1);
  });
});
