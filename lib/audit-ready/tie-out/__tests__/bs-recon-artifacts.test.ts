import { describe, expect, it, vi, beforeEach } from "vitest";

const maybeSingle = vi.fn();
const limit = vi.fn(() => ({ maybeSingle }));
const order = vi.fn(() => ({ limit }));
const eq2 = vi.fn(() => ({ order }));
const eq1 = vi.fn(() => ({ eq: eq2 }));
const select = vi.fn(() => ({ eq: eq1 }));
const fromMock = vi.fn(() => ({ select }));

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

import {
  parseStrictAsOfDate,
  getBsSummaryArtifactByPeriodEnd,
} from "../bs-recon-artifacts";

beforeEach(() => {
  vi.clearAllMocks();
  maybeSingle.mockResolvedValue({ data: null, error: null });
});

describe("parseStrictAsOfDate", () => {
  it("accepts valid ISO dates", () => {
    expect(parseStrictAsOfDate("2026-07-31")).toBe("2026-07-31");
    expect(parseStrictAsOfDate("2026-02-28")).toBe("2026-02-28");
  });

  it("rejects invalid shapes and calendar dates", () => {
    expect(parseStrictAsOfDate(null)).toBeNull();
    expect(parseStrictAsOfDate(undefined)).toBeNull();
    expect(parseStrictAsOfDate("")).toBeNull();
    expect(parseStrictAsOfDate("2026-7-31")).toBeNull();
    expect(parseStrictAsOfDate("07-31-2026")).toBeNull();
    expect(parseStrictAsOfDate("2026-02-31")).toBeNull();
    expect(parseStrictAsOfDate("not-a-date")).toBeNull();
  });
});

describe("getBsSummaryArtifactByPeriodEnd", () => {
  it("queries by engagement_id + period_end, latest created_at", async () => {
    const row = {
      id: "art-1",
      engagement_id: "eng-1",
      period_end: "2026-07-31",
      bs_equation_status: "tie",
      created_at: "2026-08-01T00:00:00Z",
    };
    maybeSingle.mockResolvedValue({ data: row, error: null });

    const result = await getBsSummaryArtifactByPeriodEnd({
      engagementId: "eng-1",
      periodEnd: "2026-07-31",
    });

    expect(fromMock).toHaveBeenCalledWith(
      "audit_ready_bs_recon_summary_artifacts",
    );
    expect(eq1).toHaveBeenCalledWith("engagement_id", "eng-1");
    expect(eq2).toHaveBeenCalledWith("period_end", "2026-07-31");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(limit).toHaveBeenCalledWith(1);
    expect(result).toEqual(row);
  });

  it("returns null on supabase error", async () => {
    maybeSingle.mockResolvedValue({
      data: null,
      error: { message: "boom" },
    });
    const result = await getBsSummaryArtifactByPeriodEnd({
      engagementId: "eng-1",
      periodEnd: "2026-07-31",
    });
    expect(result).toBeNull();
  });
});
