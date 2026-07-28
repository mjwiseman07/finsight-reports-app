import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: vi.fn(),
}));

import {
  assembleKickoutRows,
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

type LinkageFixture = {
  engagements?: Array<{
    id: string;
    engagement_name: string | null;
    closed_at: string | null;
    audit_period_end: string | null;
  }>;
  bsLines?: BsKickoutLineRpcRow[];
  /** Rows returned from audit_ready_bs_recon_summary_lines by id. */
  lineMeta?: Array<{
    id: string;
    run_id: string | null;
    summary_artifact_id: string | null;
  }>;
  /** Rows returned from audit_ready_bs_recon_summary_artifacts by id. */
  artifacts?: Array<{ id: string; run_id: string | null }>;
};

function installListKickoutsMock(fixture: LinkageFixture) {
  const fromTables: string[] = [];
  const empty = { data: [], error: null };
  const engagements = fixture.engagements ?? [
    {
      id: ENG,
      engagement_name: "Pilot",
      closed_at: null,
      audit_period_end: "2026-12-31",
    },
  ];
  const bsLines = fixture.bsLines ?? [];
  const lineMeta = fixture.lineMeta ?? [];
  const artifacts = fixture.artifacts ?? [];

  function makeFrom(table: string) {
    fromTables.push(table);
    const filters: Array<[string, unknown]> = [];
    const inFilters: Array<[string, unknown]> = [];
    const chain: Record<string, unknown> = {
      select() {
        return chain;
      },
      eq(col: string, val: unknown) {
        filters.push([col, val]);
        return chain;
      },
      in(col: string, val: unknown) {
        inFilters.push([col, val]);
        return chain;
      },
      order() {
        return chain;
      },
      then(resolve: (v: unknown) => unknown) {
        if (table === "audit_ready_engagements") {
          return Promise.resolve(
            resolve({ data: engagements, error: null }),
          );
        }
        if (table === "audit_ready_kickout_investigations") {
          return Promise.resolve(resolve(empty));
        }
        if (table === "audit_ready_bs_recon_summary_lines") {
          const ids = (inFilters.find((f) => f[0] === "id")?.[1] as
            | string[]
            | undefined) ?? [];
          const data = lineMeta.filter((r) => ids.includes(r.id));
          return Promise.resolve(resolve({ data, error: null }));
        }
        if (table === "audit_ready_bs_recon_summary_artifacts") {
          const ids = (inFilters.find((f) => f[0] === "id")?.[1] as
            | string[]
            | undefined) ?? [];
          const data = artifacts.filter((r) => ids.includes(r.id));
          return Promise.resolve(resolve({ data, error: null }));
        }
        return Promise.resolve(resolve(empty));
      },
    };
    return chain;
  }

  const api = {
    from: vi.fn((table: string) => makeFrom(table)),
    rpc: vi.fn(async (name: string) => {
      if (name === "audit_ready_latest_bs_kickout_lines") {
        return { data: bsLines, error: null };
      }
      return empty;
    }),
  };
  (getSupabaseAdmin as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    api,
  );
  return { api, fromTables };
}

describe("listKickouts", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns empty array when no engagement IDs", async () => {
    const result = await listKickouts([]);
    expect(result).toEqual([]);
    expect(getSupabaseAdmin).not.toHaveBeenCalled();
  });

  it("handles no data gracefully", async () => {
    const { api } = installListKickoutsMock({ bsLines: [] });

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
    expect(api.rpc).toHaveBeenCalledWith(
      "get_similar_kickout_resolution_counts",
      expect.any(Object),
    );
  });

  describe("canonical path", () => {
    it("returns kickouts via summary_lines.run_id direct join", async () => {
      const line = makeBsLine({
        id: "line-1",
        artifact_id: "art-1",
        qbo_account_id: "44",
      });
      const { fromTables } = installListKickoutsMock({
        bsLines: [line],
        lineMeta: [
          {
            id: "line-1",
            run_id: "run-sum-1",
            summary_artifact_id: "art-1",
          },
        ],
        artifacts: [{ id: "art-1", run_id: "run-sum-legacy" }],
      });

      const rows = await listKickouts([ENG]);
      const bs = rows.find((r) => r.source_type === "bs_summary_line");
      expect(bs?.parent_summary_run_id).toBe("run-sum-1");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_lines");
      expect(fromTables).not.toContain(
        "audit_ready_bs_recon_summary_artifacts",
      );
    });

    it("returns empty array when no kickouts on run", async () => {
      installListKickoutsMock({ bsLines: [] });
      const rows = await listKickouts([ENG]);
      expect(rows.filter((r) => r.source_type === "bs_summary_line")).toEqual(
        [],
      );
    });
  });

  describe("legacy fallback", () => {
    it("falls back to artifact join when summary_lines.run_id linkage missing", async () => {
      const line = makeBsLine({
        id: "line-1",
        artifact_id: "art-1",
      });
      const { fromTables } = installListKickoutsMock({
        bsLines: [line],
        // No usable run_id on lines → gap → artifact join
        lineMeta: [
          {
            id: "line-1",
            run_id: null,
            summary_artifact_id: "art-1",
          },
        ],
        artifacts: [{ id: "art-1", run_id: "run-sum-legacy" }],
      });

      const rows = await listKickouts([ENG]);
      const bs = rows.find((r) => r.source_type === "bs_summary_line");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_artifacts");
      expect(bs?.parent_summary_run_id).toBe("run-sum-legacy");
    });
  });

  describe("byte-identity", () => {
    it("returns identical rows from canonical vs fallback given identical data", async () => {
      const line = makeBsLine({
        id: "line-1",
        artifact_id: "art-1",
        qbo_account_id: "44",
      });

      installListKickoutsMock({
        bsLines: [line],
        lineMeta: [
          {
            id: "line-1",
            run_id: "run-sum-1",
            summary_artifact_id: "art-1",
          },
        ],
        artifacts: [],
      });
      const canonical = await listKickouts([ENG]);

      installListKickoutsMock({
        bsLines: [line],
        lineMeta: [
          {
            id: "line-1",
            run_id: null,
            summary_artifact_id: "art-1",
          },
        ],
        artifacts: [{ id: "art-1", run_id: "run-sum-1" }],
      });
      const fallback = await listKickouts([ENG]);

      expect(canonical).toEqual(fallback);
    });
  });
});

describe("assembleKickoutRows memory counts", () => {
  it("maps batched BS and PBC counts onto inbox rows", () => {
    const rows = assembleKickoutRows({
      engagements: [
        {
          id: ENG,
          engagement_name: "Pilot",
          closed_at: null,
          audit_period_end: "2026-12-31",
        },
      ],
      investigations: [],
      bsLines: [makeBsLine({ id: "line-1", qbo_account_id: "35" })],
      pbcRuns: [makePbcRun({ id: "run-1", tie_out_kind: "ap_aging" })],
      similarCounts: [
        {
          engagement_id: ENG,
          source_type: "bs_summary_line",
          match_key: "35",
          similar_count: 2,
        },
        {
          engagement_id: ENG,
          source_type: "pbc_run",
          match_key: "ap_aging",
          similar_count: "3",
        },
      ],
    });

    expect(rows.find((row) => row.source_type === "bs_summary_line")).toEqual(
      expect.objectContaining({
        qbo_account_id: "35",
        similar_count: 2,
      }),
    );
    expect(rows.find((row) => row.source_type === "pbc_run")).toEqual(
      expect.objectContaining({
        tie_out_kind: "ap_aging",
        similar_count: 3,
      }),
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
