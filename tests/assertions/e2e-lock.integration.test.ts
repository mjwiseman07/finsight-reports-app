/**
 * D-Assertions Part 7 — CI-safe E2E LOCK chain against makeMockDb().
 * Mirrors scripts/smoke/d-assertions-e2e-lock.ts without live DB / env / cleanup.
 */
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACCOUNT_CATEGORIES,
  ASSERTION_IDS,
} from "@/lib/pre-close/assertions-types";
import { makeMockDb } from "../pre-close/_mock-db";
import { makeSyntheticStatement } from "../close-packet/_fixtures/statement";

const mock = makeMockDb();

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () =>
    Object.assign(mock, {
      storage: {
        from: () => ({
          upload: vi.fn().mockResolvedValue({ data: { path: "e2e-lock/run/attachment.pdf" }, error: null }),
        }),
      },
    }),
}));
vi.mock("@/lib/supabase-admin.js", () => ({ getSupabaseAdmin: () => mock }));
vi.mock("@/lib/llm/anthropic-driver", () => ({ invokeClaude: vi.fn() }));
vi.mock("@/lib/ai/action-logger", () => ({
  logAiAction: vi.fn(),
  sha256: (v: unknown) => String(v),
  summarize: (v: unknown) => String(v),
}));
vi.mock("@/lib/events/publisher", () => ({
  publishEvent: vi.fn().mockResolvedValue({ eventId: "e1" }),
}));

import { runProjectionWorker } from "@/lib/assertions/projection-worker";
import {
  attachFileToManualTest,
  createManualTestEvidence,
} from "@/lib/assertions/manual-test-service";
import { generateAssertionCoverageStatementPdf } from "@/lib/close-packet/pdf/AssertionCoverageStatement";

const FC = "fc-e2e";
const ENG = "eng-e2e";
const CP = "cp-e2e";
const RULE_ID = "gen.subledger_tie_check";
const FIRE_ID = "fire-e2e-ar-completeness";
const ACTOR = "00000000-0000-4000-8000-0000000000e2";

function seedBase() {
  const rows = ACCOUNT_CATEGORIES.flatMap((account_category) =>
    ASSERTION_IDS.map((assertion_id) => ({
      account_category,
      assertion_id,
      relevance: "relevant",
    })),
  );
  mock.__seed("assertion_relevance_matrix", rows);
  mock.__seed("firm_clients", [
    { id: FC, industry_vertical: "general", firm_id: "firm1", name: "e2e-lock client" },
  ]);
  mock.__seed("engagements", [
    { id: ENG, firm_id: "firm1", status: "active", engagement_name: "e2e-lock engagement" },
  ]);
  mock.__seed("portcos", [
    { engagement_id: ENG, firm_client_id: FC, created_at: "2026-01-01" },
  ]);
  mock.__seed("close_periods", [
    {
      id: CP,
      firm_client_id: FC,
      period_start: "2026-06-01",
      period_end: "2026-06-30",
      status: "prep",
    },
  ]);
  mock.__seed("advisacor_flags", [
    { flag_key: "assertions_gap_reasoning_enabled", flag_value: false },
    { flag_key: "assertions_projection_worker_enabled", flag_value: true },
  ]);
  mock.__seed("rule_assertion_coverage", [
    {
      rule_id: RULE_ID,
      assertion_id: "completeness",
      coverage_strength: "primary",
      account_categories: ["accounts_receivable"],
    },
  ]);
  mock.__seed("curated_rule_fires", [
    { fire_id: FIRE_ID, rule_id: RULE_ID, outcome: "fired" },
  ]);
  mock.__seed("pre_close_review_items", [
    {
      fire_id: FIRE_ID,
      rule_id: RULE_ID,
      firm_client_id: FC,
      close_period_id: CP,
      engagement_id: ENG,
    },
  ]);
}

beforeEach(() => {
  mock.__reset();
  seedBase();
});

describe("D-Assertions E2E LOCK chain", () => {
  it("manual test covers no_rule_defined pair (cash/cutoff)", async () => {
    const result1 = await runProjectionWorker(FC, CP);
    expect(result1.rowsWritten).toBeGreaterThan(0);
    const before = mock.__state.close_assertion_coverage.find(
      (r) => r.account_category === "cash" && r.assertion_id === "cutoff",
    );
    expect(before?.coverage_status).toBe("gap");
    expect(before?.gap_root_cause_code).toBe("no_rule_defined");

    await createManualTestEvidence(mock as never, {
      firmClientId: FC,
      engagementId: ENG,
      closePeriodId: CP,
      accountCategory: "cash",
      assertionId: "cutoff",
      evidenceType: "bank_statement",
      sourceType: "e2e_lock",
      evidenceSummary: "Bank statement covers cash cutoff without a rule",
      createdByUserId: ACTOR,
    });

    await runProjectionWorker(FC, CP);
    const after = mock.__state.close_assertion_coverage.find(
      (r) => r.account_category === "cash" && r.assertion_id === "cutoff",
    );
    expect(after?.coverage_status).toBe("tested");
    expect(after?.evidence_strength).toBe("strong");
    expect((after?.covering_manual_test_ids as string[]).length).toBe(1);
  });

  it("completes full Parts 1–6 chain", async () => {
    // Part 2/3/5 — projection + gap sync
    const result1 = await runProjectionWorker(FC, CP);
    expect(result1.rowsWritten).toBeGreaterThan(0);

    const arRow = mock.__state.close_assertion_coverage.find(
      (r) =>
        r.account_category === "accounts_receivable" &&
        r.assertion_id === "completeness",
    );
    expect(arRow?.coverage_status).toBe("tested");
    expect(arRow?.evidence_strength).toBe("strong");

    const cashCutoffGap = mock.__state.close_gap_review_items.find(
      (r) => r.account_category === "cash" && r.assertion_id === "cutoff",
    );
    const gap =
      cashCutoffGap ??
      mock.__state.close_gap_review_items.find((r) => r.resolution_status === "open");
    expect(gap?.id).toBeTruthy();
    expect(gap?.resolution_status).toBe("open");

    // Part 6 — manual test + attachment (resolves gap via resolvesGapItemId)
    const evidence = await createManualTestEvidence(mock as never, {
      firmClientId: FC,
      engagementId: ENG,
      closePeriodId: CP,
      accountCategory: gap!.account_category as string,
      assertionId: gap!.assertion_id as string,
      evidenceType: "bank_statement",
      sourceType: "e2e_lock",
      evidenceSummary: "E2E LOCK integration manual bank statement",
      dataSourceReliabilityBasis: "AS 1105 .10A",
      resolvesGapItemId: gap!.id as string,
      createdByUserId: ACTOR,
    });
    expect(evidence.id).toBeTruthy();

    const bytes = new Uint8Array(16);
    bytes.set([0x25, 0x50, 0x44, 0x46]);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const attachment = await attachFileToManualTest(mock as never, {
      evidenceId: evidence.id,
      firmClientId: FC,
      engagementId: ENG,
      originalFilename: "attachment.pdf",
      mimeType: "application/pdf",
      byteSize: bytes.length,
      sha256,
      storagePath: `e2e-lock/run/attachment.pdf`,
      ingestedFrom: "e2e_lock",
      ingestedBy: ACTOR,
    });
    expect(attachment.attachmentId).toBeTruthy();
    expect(mock.__state.manual_test_attachments).toHaveLength(1);

    const resolved = mock.__state.close_gap_review_items.find((r) => r.id === gap!.id);
    expect(resolved?.resolution_status).toBe("resolved_remediated");
    expect(resolved?.resolution_type).toBe("manual_test");

    // Re-project — manual tests promote strength
    const result2 = await runProjectionWorker(FC, CP);
    expect(result2.rowsWritten).toBeGreaterThan(0);

    const after = mock.__state.close_assertion_coverage.find(
      (r) =>
        r.account_category === gap!.account_category &&
        r.assertion_id === gap!.assertion_id,
    );
    const manualIds = (after?.covering_manual_test_ids as string[]) ?? [];
    expect(manualIds.length).toBeGreaterThan(0);
    expect(manualIds).toContain(evidence.id);
    expect(["moderate", "strong"]).toContain(after?.evidence_strength);
    expect(after?.coverage_status).toBe("tested");
    expect(after?.manual_test_ref).toMatch(/manual test/);

    // Part 3 — Coverage Statement PDF in memory
    const statement = makeSyntheticStatement({
      firm_client: {
        id: FC,
        name: "e2e-lock client",
        industry_vertical: "general",
        accounting_method: "accrual",
        is_demo: true,
      },
      close_period: {
        id: CP,
        period_start: "2026-06-01",
        period_end: "2026-06-30",
        status: "prep",
      },
    });
    const { buffer } = await generateAssertionCoverageStatementPdf(statement);
    expect(buffer.length).toBeGreaterThan(2048);
    expect(buffer.subarray(0, 5).toString("utf8")).toBe("%PDF-");
  });
});
