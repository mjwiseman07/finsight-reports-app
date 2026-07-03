import { describe, it, expect, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          lte: () => ({
            gte: () => ({
              order: () => ({
                limit: () => ({ maybeSingle }),
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

import { resolveClosePeriodForDate } from "@/lib/close-periods/resolve-for-date";

describe("resolveClosePeriodForDate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the period when the date falls inside a close period", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: "cp-1", period_start: "2026-06-01", period_end: "2026-06-30" },
      error: null,
    });
    const res = await resolveClosePeriodForDate("client-1", "2026-06-15");
    expect(res?.close_period_id).toBe("cp-1");
    expect(res?.period_start).toBeInstanceOf(Date);
    expect(res?.period_end).toBeInstanceOf(Date);
  });

  it("returns null when no period covers the date", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const res = await resolveClosePeriodForDate("client-1", "2020-01-01");
    expect(res).toBeNull();
  });
});
