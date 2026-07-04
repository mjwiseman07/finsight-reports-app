import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST_BLOCK_REASONS } from "@/lib/pre-close/post-block-reasons";
import type { JEDraft } from "@/lib/pre-close/types";

const validateJEPayloadMock = vi.hoisted(() => vi.fn());
const resolveTokenMock = vi.hoisted(() => vi.fn());
const lookupAccountIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/erp/quickbooks/je-validator", () => ({
  validateJEPayload: validateJEPayloadMock,
}));
vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({
  resolveQBOTokenForFirmClient: resolveTokenMock,
}));
vi.mock("@/lib/memory/client-memory-service", () => ({
  lookupAccountId: lookupAccountIdMock,
}));

import { makeMockDb } from "./_mock-db";
const mock = makeMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));

import { runRemediationPipeline } from "@/lib/pre-close/remediation-pipeline";

const ctx = { firmClientId: "fc1", engagementId: "eng1", reviewItemId: "ri-1" };

function balancedDraft(over: Partial<JEDraft> = {}): JEDraft {
  return {
    narration: "n",
    transactionDate: "2026-07-06",
    lines: [
      { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "2100", accountName: "Accrued", drAmountCents: 0, crAmountCents: 10000, memo: "" },
    ],
    ...over,
  };
}

beforeEach(() => {
  mock.__reset();
  validateJEPayloadMock.mockReset();
  resolveTokenMock.mockReset();
  lookupAccountIdMock.mockReset();
  resolveTokenMock.mockResolvedValue({ realmId: "r1", accessToken: "tok" });
  validateJEPayloadMock.mockResolvedValue({ valid: true });
});

describe("remediation-pipeline unit", () => {
  it("happy path: valid draft with QBO ids -> ok true, empty remediations", async () => {
    const r = await runRemediationPipeline(balancedDraft(), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remediationsApplied).toEqual([]);
  });

  it("stage 1 fail (unbalanced) -> DRAFT_INVALID_UNBALANCED", async () => {
    const bad = balancedDraft();
    bad.lines[1].crAmountCents = 9999;
    const r = await runRemediationPipeline(bad, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(POST_BLOCK_REASONS.DRAFT_INVALID_UNBALANCED);
  });

  it("account remap: non-numeric id + memory returns numeric -> account_id_remap", async () => {
    lookupAccountIdMock.mockResolvedValue("9999");
    const draft = balancedDraft();
    draft.lines[0].accountId = "Rent-GL";
    const r = await runRemediationPipeline(draft, ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remediationsApplied).toContain("account_id_remap");
  });

  it("account remap: memory returns null -> ACCOUNT_MAPPING_UNRESOLVED", async () => {
    lookupAccountIdMock.mockResolvedValue(null);
    const draft = balancedDraft();
    draft.lines[0].accountId = "Rent-GL";
    const r = await runRemediationPipeline(draft, ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(POST_BLOCK_REASONS.ACCOUNT_MAPPING_UNRESOLVED);
  });

  it("narration truncation: 5000 chars -> narration_truncated", async () => {
    const r = await runRemediationPipeline(
      balancedDraft({ narration: "x".repeat(5000) }),
      ctx,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remediationsApplied).toContain("narration_truncated");
  });

  it("date shift: original locked, next business day unlocked -> date_shifted", async () => {
    mock.__seed("close_periods", [
      {
        id: "cp1",
        firm_client_id: "fc1",
        status: "locked",
        period_start: "2026-07-15",
        period_end: "2026-07-15",
      },
    ]);
    const r = await runRemediationPipeline(
      balancedDraft({ transactionDate: "2026-07-15" }),
      ctx,
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remediationsApplied).toContain("date_shifted");
  });

  it("date shift: all candidates locked -> PERIOD_LOCKED_NO_FALLBACK", async () => {
    mock.__seed("close_periods", [
      {
        id: "cp-wide",
        firm_client_id: "fc1",
        status: "locked",
        period_start: "2026-01-01",
        period_end: "2027-12-31",
      },
    ]);
    const r = await runRemediationPipeline(
      balancedDraft({ transactionDate: "2026-07-15" }),
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(POST_BLOCK_REASONS.PERIOD_LOCKED_NO_FALLBACK);
  });

  it("stage 3 QBO invalid_account_id -> QBO_INVALID_ACCOUNT_ID", async () => {
    validateJEPayloadMock.mockResolvedValue({ valid: false, reason: "invalid_account_id" });
    const r = await runRemediationPipeline(balancedDraft(), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(POST_BLOCK_REASONS.QBO_INVALID_ACCOUNT_ID);
  });

  it("stage 3 QBO period_locked -> QBO_PERIOD_LOCKED", async () => {
    validateJEPayloadMock.mockResolvedValue({ valid: false, reason: "period_locked" });
    const r = await runRemediationPipeline(balancedDraft(), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe(POST_BLOCK_REASONS.QBO_PERIOD_LOCKED);
  });

  it("token resolver failure -> UNKNOWN_ERROR token_resolve", async () => {
    resolveTokenMock.mockResolvedValue(null);
    const r = await runRemediationPipeline(balancedDraft(), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toBe(POST_BLOCK_REASONS.UNKNOWN_ERROR);
      expect((r.details as { stage?: string }).stage).toBe("token_resolve");
    }
  });
});
