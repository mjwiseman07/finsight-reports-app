import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));
import { hasPilotFeature, assertPilotFeature, PilotFeatureDenied } from "./pilot-features";
import { createServiceClient } from "@/lib/supabase/service";
function mockSupabase(row: { id: string; revoked_at: string | null } | null, error: unknown = null) {
  const chain: any = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: () => Promise.resolve({ data: row, error }),
  };
  (createServiceClient as any).mockReturnValue({
    from: () => chain,
  });
}
describe("hasPilotFeature", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns allowed=true when row exists and not revoked", async () => {
    mockSupabase({ id: "abc", revoked_at: null });
    const r = await hasPilotFeature("ap_requisitions", "firm-1");
    expect(r.allowed).toBe(true);
    expect(r.reason).toBe("active");
  });
  it("returns not_allowed when no row", async () => {
    mockSupabase(null);
    const r = await hasPilotFeature("ap_requisitions", "firm-1");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("not_allowed");
  });
  it("returns revoked when revoked_at set", async () => {
    mockSupabase({ id: "abc", revoked_at: "2026-07-01T00:00:00Z" });
    const r = await hasPilotFeature("ap_requisitions", "firm-1");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("revoked");
  });
  it("returns db_error on error", async () => {
    mockSupabase(null, { message: "boom" });
    const r = await hasPilotFeature("ap_requisitions", "firm-1");
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe("db_error");
  });
});
describe("assertPilotFeature", () => {
  beforeEach(() => vi.clearAllMocks());
  it("throws PilotFeatureDenied when not allowed", async () => {
    mockSupabase(null);
    await expect(assertPilotFeature("ap_requisitions", "firm-1")).rejects.toBeInstanceOf(PilotFeatureDenied);
  });
  it("resolves silently when allowed", async () => {
    mockSupabase({ id: "abc", revoked_at: null });
    await expect(assertPilotFeature("ap_requisitions", "firm-1")).resolves.toBeUndefined();
  });
});
