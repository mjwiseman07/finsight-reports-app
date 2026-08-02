import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Supabase admin client. Each test wires the chain via mockRuns / mockArtifact.
const mockMaybeSingle = vi.fn();
const mockArtifactMaybeSingle = vi.fn();

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        order: () => chain,
        limit: () => chain,
        maybeSingle:
          table === "audit_ready_tie_out_runs"
            ? mockMaybeSingle
            : mockArtifactMaybeSingle,
      };
      return chain;
    },
  }),
}));

import {
  getReconRollupByPeriodEnd,
  ROLLUP_KIND_ORDER,
  ROLLUP_KIND_LABELS,
} from "../rollup";

const RUN_BASE = {
  status: "completed",
  totals_status: "tie",
  totals_variance_cents: 0,
  subledger_total_cents: 100000,
  gl_total_cents: 100000,
  completed_at: "2026-07-01T12:00:00Z",
};

describe("getReconRollupByPeriodEnd", () => {
  beforeEach(() => {
    mockMaybeSingle.mockReset();
    mockArtifactMaybeSingle.mockReset();
  });

  it("returns empty array when no runs exist for any kind", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockArtifactMaybeSingle.mockResolvedValue({ data: null, error: null });
    const rows = await getReconRollupByPeriodEnd({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
    });
    expect(rows).toEqual([]);
  });

  it("returns rows in ROLLUP_KIND_ORDER, only for kinds that have a run", async () => {
    // Return a run for bs_recon_summary, ar_aging, grni; null for the rest.
    let callCount = 0;
    const kindsWithRuns = new Set<string>([
      "bs_recon_summary",
      "ar_aging",
      "grni",
    ]);

    mockMaybeSingle.mockImplementation(() => {
      const kind = ROLLUP_KIND_ORDER[callCount++];
      if (kindsWithRuns.has(kind)) {
        return Promise.resolve({
          data: { id: `run-${kind}`, tie_out_kind: kind, ...RUN_BASE },
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    });
    mockArtifactMaybeSingle.mockResolvedValue({
      data: { id: "art-1" },
      error: null,
    });

    const rows = await getReconRollupByPeriodEnd({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
    });
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.kind)).toEqual([
      "bs_recon_summary",
      "ar_aging",
      "grni",
    ]);
  });

  it("populates artifactId only for the 3 artifact-backed kinds", async () => {
    let callCount = 0;
    mockMaybeSingle.mockImplementation(() => {
      const kind = ROLLUP_KIND_ORDER[callCount++];
      return Promise.resolve({
        data: { id: `run-${kind}`, tie_out_kind: kind, ...RUN_BASE },
        error: null,
      });
    });
    mockArtifactMaybeSingle.mockResolvedValue({
      data: { id: "art-x" },
      error: null,
    });

    const rows = await getReconRollupByPeriodEnd({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
    });
    expect(rows).toHaveLength(7);
    const withArt = rows.filter((r) => r.artifactId !== null).map((r) => r.kind);
    expect(new Set(withArt)).toEqual(
      new Set([
        "bs_recon_summary",
        "bs_account_recon",
        "fixed_asset_rollforward",
      ]),
    );
    const withoutArt = rows
      .filter((r) => r.artifactId === null)
      .map((r) => r.kind);
    expect(new Set(withoutArt)).toEqual(
      new Set(["ar_aging", "ap_aging", "inventory", "grni"]),
    );
  });

  it("swallows per-kind errors and continues to the next kind", async () => {
    let callCount = 0;
    mockMaybeSingle.mockImplementation(() => {
      const kind = ROLLUP_KIND_ORDER[callCount++];
      if (kind === "ap_aging") {
        return Promise.resolve({
          data: null,
          error: { message: "boom" },
        });
      }
      return Promise.resolve({
        data: { id: `run-${kind}`, tie_out_kind: kind, ...RUN_BASE },
        error: null,
      });
    });
    mockArtifactMaybeSingle.mockResolvedValue({ data: null, error: null });

    const consoleSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const rows = await getReconRollupByPeriodEnd({
      engagementId: "eng-1",
      periodEnd: "2026-06-30",
    });
    expect(rows.map((r) => r.kind)).not.toContain("ap_aging");
    expect(rows).toHaveLength(6);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe("rollup constants", () => {
  it("has exactly 7 kinds", () => {
    expect(ROLLUP_KIND_ORDER).toHaveLength(7);
  });

  it("has a label for every kind in the order", () => {
    for (const kind of ROLLUP_KIND_ORDER) {
      expect(ROLLUP_KIND_LABELS[kind]).toBeTruthy();
    }
  });

  it("places balance-sheet family first", () => {
    expect(ROLLUP_KIND_ORDER[0]).toBe("bs_recon_summary");
    expect(ROLLUP_KIND_ORDER[1]).toBe("bs_account_recon");
  });
});
