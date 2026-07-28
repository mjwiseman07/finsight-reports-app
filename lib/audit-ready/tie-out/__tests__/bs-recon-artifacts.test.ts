import { describe, expect, it, vi, beforeEach } from "vitest";

const fromTables: string[] = [];
let runs: Array<{ id: string }> = [];
let artifactsByRunId: Record<string, Record<string, unknown>> = {};
let artifactsByPeriod: Record<string, Record<string, unknown>> = {};
let runLookupError: { message: string } | null = null;
let artifactByRunError: { message: string } | null = null;
let legacyError: { message: string } | null = null;

function makeChain(table: string) {
  fromTables.push(table);
  const filters: Array<[string, unknown]> = [];
  const chain: Record<string, unknown> = {
    select() {
      return chain;
    },
    eq(col: string, val: unknown) {
      filters.push([col, val]);
      return chain;
    },
    order() {
      return chain;
    },
    limit() {
      return chain;
    },
    async maybeSingle() {
      if (table === "audit_ready_tie_out_runs") {
        if (runLookupError) return { data: null, error: runLookupError };
        return { data: runs[0] ?? null, error: null };
      }
      if (table === "audit_ready_bs_recon_summary_artifacts") {
        const runId = filters.find((f) => f[0] === "run_id")?.[1];
        if (runId != null) {
          if (artifactByRunError) {
            return { data: null, error: artifactByRunError };
          }
          return {
            data: artifactsByRunId[String(runId)] ?? null,
            error: null,
          };
        }
        if (legacyError) return { data: null, error: legacyError };
        const eng = filters.find((f) => f[0] === "engagement_id")?.[1];
        const period = filters.find((f) => f[0] === "period_end")?.[1];
        const key = `${eng}|${period}`;
        return { data: artifactsByPeriod[key] ?? null, error: null };
      }
      return { data: null, error: null };
    },
  };
  return chain;
}

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: () => ({
    from: (table: string) => makeChain(table),
  }),
}));

import {
  parseStrictAsOfDate,
  getBsSummaryArtifactByPeriodEnd,
} from "../bs-recon-artifacts";

const ARTIFACT_ROW = {
  id: "art-1",
  engagement_id: "eng-1",
  run_id: "run-sum-1",
  period_start: "2026-01-01",
  period_end: "2026-07-31",
  account_count_total: 3,
  account_count_tie: 3,
  account_count_auto_reconcile: 0,
  account_count_review: 0,
  account_count_kickout: 0,
  account_count_failed: 0,
  assets_ending_cents: 100,
  liabilities_ending_cents: 40,
  equity_ending_cents: 60,
  bs_equation_variance_cents: 0,
  bs_equation_status: "tie" as const,
  format: "pdf",
  storage_bucket: "audit-ready-recons",
  storage_object_key: "k",
  sha256: "abc",
  file_size_bytes: 1,
  generated_by: "api",
  visibility: "owner_visible",
  accounting_method: null,
  created_at: "2026-08-01T00:00:00Z",
  created_by_user_id: null,
};

beforeEach(() => {
  fromTables.length = 0;
  runs = [];
  artifactsByRunId = {};
  artifactsByPeriod = {};
  runLookupError = null;
  artifactByRunError = null;
  legacyError = null;
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
  describe("canonical path", () => {
    it("resolves latest completed summary run then artifact by run_id", async () => {
      runs = [{ id: "run-sum-1" }];
      artifactsByRunId["run-sum-1"] = { ...ARTIFACT_ROW };
      // Poison legacy period lookup so canonical must win
      artifactsByPeriod["eng-1|2026-07-31"] = {
        ...ARTIFACT_ROW,
        id: "art-legacy",
      };

      const result = await getBsSummaryArtifactByPeriodEnd({
        engagementId: "eng-1",
        periodEnd: "2026-07-31",
      });

      expect(fromTables[0]).toBe("audit_ready_tie_out_runs");
      expect(fromTables).toContain("audit_ready_bs_recon_summary_artifacts");
      expect(result).toEqual(ARTIFACT_ROW);
      expect(result?.id).toBe("art-1");
    });
  });

  describe("legacy fallback", () => {
    it("falls back to period_end lookup when no completed summary run", async () => {
      runs = [];
      artifactsByPeriod["eng-1|2026-07-31"] = { ...ARTIFACT_ROW, id: "art-legacy" };

      const result = await getBsSummaryArtifactByPeriodEnd({
        engagementId: "eng-1",
        periodEnd: "2026-07-31",
      });

      expect(result?.id).toBe("art-legacy");
    });

    it("returns null on legacy supabase error", async () => {
      runs = [];
      legacyError = { message: "boom" };
      const result = await getBsSummaryArtifactByPeriodEnd({
        engagementId: "eng-1",
        periodEnd: "2026-07-31",
      });
      expect(result).toBeNull();
    });

    it("falls back when canonical run→artifact lookup returns null", async () => {
      runs = [{ id: "run-sum-1" }];
      // no artifactsByRunId entry
      artifactsByPeriod["eng-1|2026-07-31"] = { ...ARTIFACT_ROW, id: "art-legacy" };
      const result = await getBsSummaryArtifactByPeriodEnd({
        engagementId: "eng-1",
        periodEnd: "2026-07-31",
      });
      expect(result?.id).toBe("art-legacy");
    });
  });

  describe("byte-identity", () => {
    it("returns identical artifact from canonical vs fallback given identical data", async () => {
      runs = [{ id: "run-sum-1" }];
      artifactsByRunId["run-sum-1"] = { ...ARTIFACT_ROW };
      const canonical = await getBsSummaryArtifactByPeriodEnd({
        engagementId: "eng-1",
        periodEnd: "2026-07-31",
      });

      runs = [];
      artifactsByRunId = {};
      artifactsByPeriod["eng-1|2026-07-31"] = { ...ARTIFACT_ROW };
      const fallback = await getBsSummaryArtifactByPeriodEnd({
        engagementId: "eng-1",
        periodEnd: "2026-07-31",
      });

      expect(canonical).toEqual(fallback);
    });
  });
});
