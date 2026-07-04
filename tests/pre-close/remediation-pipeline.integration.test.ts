import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeMockDb } from "./_mock-db";

const validateJEPayloadMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/erp/quickbooks/je-validator", () => ({
  validateJEPayload: validateJEPayloadMock,
}));
vi.mock("@/lib/erp/quickbooks/token-resolver", () => ({
  resolveQBOTokenForFirmClient: vi.fn().mockResolvedValue({ realmId: "r1", accessToken: "tok" }),
}));

const mock = makeMockDb();
vi.mock("@/lib/supabase/service", () => ({ createServiceClient: () => mock }));

import { runRemediationPipeline } from "@/lib/pre-close/remediation-pipeline";
import type { JEDraft } from "@/lib/pre-close/types";

function balancedDraft(): JEDraft {
  return {
    narration: "n",
    transactionDate: "2026-07-15",
    lines: [
      { lineIndex: 0, accountId: "6000", accountName: "Rent", drAmountCents: 10000, crAmountCents: 0, memo: "" },
      { lineIndex: 1, accountId: "2100", accountName: "Accrued", drAmountCents: 0, crAmountCents: 10000, memo: "" },
    ],
  };
}

beforeEach(() => {
  mock.__reset();
  validateJEPayloadMock.mockReset();
  validateJEPayloadMock.mockResolvedValue({ valid: true });
});

describe("remediation-pipeline integration", () => {
  it("locked close_period shifts date and succeeds", async () => {
    mock.__seed("close_periods", [
      {
        id: "cp1",
        firm_client_id: "fc1",
        status: "locked",
        period_start: "2026-07-15",
        period_end: "2026-07-15",
      },
    ]);
    const r = await runRemediationPipeline(balancedDraft(), {
      firmClientId: "fc1",
      engagementId: "eng1",
      reviewItemId: "ri-1",
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.remediationsApplied).toContain("date_shifted");
  });

  it("ai_action_log gets posting_remediation row per remediation", async () => {
    mock.__seed("close_periods", [
      {
        id: "cp1",
        firm_client_id: "fc1",
        status: "locked",
        period_start: "2026-07-15",
        period_end: "2026-07-15",
      },
    ]);
    await runRemediationPipeline(balancedDraft(), {
      firmClientId: "fc1",
      engagementId: "eng1",
      reviewItemId: "ri-2",
    });
    const remediationLogs = mock.__state.ai_action_log.filter(
      (r) => r.action_category === "posting_remediation",
    );
    expect(remediationLogs.length).toBeGreaterThanOrEqual(1);
  });
});
