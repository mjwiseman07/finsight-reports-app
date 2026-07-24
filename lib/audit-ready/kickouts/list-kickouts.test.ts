import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { listKickouts } from "./list-kickouts";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

describe("listKickouts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no engagement IDs", async () => {
    const result = await listKickouts([]);
    expect(result).toEqual([]);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("handles no data gracefully", async () => {
    const empty = { data: [], error: null };
    const chain: Record<string, unknown> = {};
    const api = {
      from: vi.fn(() => chain),
      select: vi.fn(() => chain),
      in: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      neq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      then: (resolve: (v: unknown) => unknown) => resolve(empty),
    };
    Object.assign(chain, api);
    (getSupabaseAdmin as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      api,
    );

    const result = await listKickouts(["engagement-1"]);
    expect(result).toEqual([]);
  });
});
