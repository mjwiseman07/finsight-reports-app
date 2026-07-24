import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import {
  listKickouts,
  dedupeBsKickoutLines,
  dedupePbcKickoutRuns,
  type BsKickoutLineRpcRow,
  type PbcKickoutRunRpcRow,
} from "./list-kickouts";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";

const ENG = "724546e9-6deb-4f7f-b8ad-88e5ee65353d";

function makeBsLine(
  overrides: Partial<BsKickoutLineRpcRow> & { id: string },
): BsKickoutLineRpcRow {
  return {
    engagement_id: ENG,
    qbo_account_id: "44",
    qbo_account_name: "Notes Payable",
    qbo_account_type: "Long Term Liability",
    tie_variance_cents: 5_000_000,
    gl_ending_balance_cents: 5_000_000,
    child_run_id: null,
    line_created_at: "2026-07-22T03:26:23Z",
    artifact_id: "art-old",
    period_end: "2026-12-31",
    artifact_created_at: "2026-07-22T03:26:23Z",
    ...overrides,
  };
}

function makePbcRun(
  overrides: Partial<PbcKickoutRunRpcRow> & { id: string },
): PbcKickoutRunRpcRow {
  return {
    engagement_id: ENG,
    tie_out_kind: "bs_account_recon",
    period_end: "2026-12-31",
    subledger_total_cents: 5_000_000,
    gl_total_cents: 0,
    subledger_source_url: null,
    created_at: "2026-07-22T03:26:23Z",
    ...overrides,
  };
}

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
      order: vi.fn(() => chain),
      rpc: vi.fn(async () => empty),
      then: (resolve: (v: unknown) => unknown) => resolve(empty),
    };
    Object.assign(chain, api);
    (getSupabaseAdmin as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      api,
    );

    const result = await listKickouts(["engagement-1"]);
    expect(result).toEqual([]);
    expect(api.rpc).toHaveBeenCalledWith(
      "audit_ready_latest_bs_kickout_lines",
      expect.any(Object),
    );
    expect(api.rpc).toHaveBeenCalledWith(
      "audit_ready_latest_pbc_kickout_runs",
      expect.any(Object),
    );
  });
});

describe("dedupeBsKickoutLines (Fix 1)", () => {
  it("keeps only the line from the newer artifact for same account+period", () => {
    const older = makeBsLine({
      id: "line-old",
      artifact_id: "art-old",
      artifact_created_at: "2026-07-22T03:26:23Z",
      line_created_at: "2026-07-22T03:26:23Z",
    });
    const newer = makeBsLine({
      id: "line-new",
      artifact_id: "art-new",
      artifact_created_at: "2026-07-22T03:26:28Z",
      line_created_at: "2026-07-22T03:26:28Z",
    });
    const result = dedupeBsKickoutLines([older, newer]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("line-new");
  });
});

describe("dedupePbcKickoutRuns (Fix 2 + Fix 3)", () => {
  it("keeps only the newer run per engagement+kind+period", () => {
    const older = makePbcRun({
      id: "run-old",
      created_at: "2026-07-21T05:00:00Z",
    });
    const newer = makePbcRun({
      id: "run-new",
      created_at: "2026-07-22T05:00:00Z",
      subledger_total_cents: 4_900_000, // fixture drift — still one row
    });
    const result = dedupePbcKickoutRuns([older, newer], new Set());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("run-new");
  });

  it("suppresses linked bs_account_recon but keeps orphan", () => {
    // Same (eng, kind, period) — DISTINCT ON keeps the newer (orphan), then
    // linked is already dropped. Orphan has no link → survives.
    const linked = makePbcRun({
      id: "run-linked",
      created_at: "2026-07-20T05:00:00Z",
    });
    const orphan = makePbcRun({
      id: "761cc891-218e-406d-ab98-ec927661a17a",
      created_at: "2026-07-21T05:03:34Z",
      subledger_total_cents: 353_383,
      gl_total_cents: 0,
    });
    const linkedIds = new Set(["run-linked"]);
    const result = dedupePbcKickoutRuns([linked, orphan], linkedIds);
    expect(result.map((r) => r.id)).toEqual([
      "761cc891-218e-406d-ab98-ec927661a17a",
    ]);

    // Winner of DISTINCT is linked → suppressed entirely
    const onlyLinked = dedupePbcKickoutRuns(
      [makePbcRun({ id: "run-linked", created_at: "2026-07-22T00:00:00Z" })],
      new Set(["run-linked"]),
    );
    expect(onlyLinked).toEqual([]);
  });
});
