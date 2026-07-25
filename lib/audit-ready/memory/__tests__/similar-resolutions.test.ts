import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({ rpc }),
}));

import { getSimilarKickoutResolutions } from "../similar-resolutions";

beforeEach(() => {
  rpc.mockReset();
});

describe("getSimilarKickoutResolutions", () => {
  it("queries and maps a BS account match", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          investigation_id: "inv-1",
          investigated_at: "2026-07-24T00:00:00Z",
          investigated_by: "user-1",
          note: "Timing item",
          resolution_code: "timing",
          resolution_status: "resolved",
          match_key: "35",
        },
      ],
      error: null,
    });

    const result = await getSimilarKickoutResolutions("eng-1", {
      source_type: "bs_summary_line",
      qbo_account_id: "35",
    });

    expect(rpc).toHaveBeenCalledWith("get_similar_kickout_resolutions", {
      p_engagement_id: "eng-1",
      p_source_type: "bs_summary_line",
      p_source_key: { qbo_account_id: "35" },
    });
    expect(result[0]).toEqual({
      investigationId: "inv-1",
      investigatedAt: "2026-07-24T00:00:00Z",
      investigatedBy: "user-1",
      note: "Timing item",
      resolutionCode: "timing",
      resolutionStatus: "resolved",
      matchKey: "35",
    });
  });

  it("queries a PBC kind and preserves a legacy null code", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          investigation_id: "inv-legacy",
          investigated_at: "2026-07-23T00:00:00Z",
          investigated_by: "user-2",
          note: "Legacy resolution",
          resolution_code: null,
          resolution_status: "resolved",
          match_key: "ap_aging",
        },
      ],
      error: null,
    });

    const result = await getSimilarKickoutResolutions("eng-1", {
      source_type: "pbc_run",
      tie_out_kind: "ap_aging",
    });

    expect(rpc).toHaveBeenCalledWith("get_similar_kickout_resolutions", {
      p_engagement_id: "eng-1",
      p_source_type: "pbc_run",
      p_source_key: { tie_out_kind: "ap_aging" },
    });
    expect(result[0].resolutionCode).toBeNull();
  });

  it("returns an empty array when the RPC has no matches", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(
      getSimilarKickoutResolutions("eng-1", {
        source_type: "pbc_run",
        tie_out_kind: "grni",
      }),
    ).resolves.toEqual([]);
  });
});
