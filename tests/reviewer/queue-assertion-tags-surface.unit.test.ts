import { describe, expect, it } from "vitest";
import { mapReviewItemDetail } from "@/lib/reviewer/queue-helpers";
import type { JEDraft } from "@/lib/pre-close/types";

const draft: JEDraft = {
  narration: "n",
  transactionDate: "2026-07-06",
  lines: [
    { lineIndex: 0, accountId: "a", accountName: "A", drAmountCents: 100, crAmountCents: 0, memo: "" },
    { lineIndex: 1, accountId: "b", accountName: "B", drAmountCents: 0, crAmountCents: 100, memo: "" },
  ],
};

describe("queue assertionTags surface", () => {
  it("mapReviewItemDetail surfaces assertionTags from populated column", () => {
    const detail = mapReviewItemDetail(
      {
        id: "ri1",
        fire_id: "f1",
        firm_client_id: "fc1",
        engagement_id: "eng1",
        close_period_id: null,
        rule_id: "gen.rule",
        rule_version: 1,
        accounting_method: "accrual",
        je_draft: draft,
        je_draft_total_debit_cents: 100,
        je_draft_total_credit_cents: 100,
        je_draft_line_count: 2,
        rule_reason_code: "rc",
        rule_reason_detail: {},
        severity: "warning",
        evidence_refs: [],
        assertion_tags: ["completeness", "accuracy"],
        created_at: "2026-07-06T00:00:00Z",
      },
      {
        firmClientName: "Client",
        engagementName: "Eng",
        qboJeId: null,
        postingLedgerEvents: [],
        remediationLog: [],
      },
    );
    expect(detail.assertionTags).toEqual(["completeness", "accuracy"]);
  });

  it("empty assertion_tags surface as [] not null", () => {
    const detail = mapReviewItemDetail(
      {
        id: "ri2",
        fire_id: "f2",
        firm_client_id: "fc1",
        engagement_id: "eng1",
        close_period_id: null,
        rule_id: "gen.rule",
        rule_version: 1,
        accounting_method: "accrual",
        je_draft: draft,
        je_draft_total_debit_cents: 100,
        je_draft_total_credit_cents: 100,
        je_draft_line_count: 2,
        rule_reason_code: "rc",
        rule_reason_detail: {},
        severity: "warning",
        evidence_refs: [],
        assertion_tags: [],
        created_at: "2026-07-06T00:00:00Z",
      },
      {
        firmClientName: "Client",
        engagementName: "Eng",
        qboJeId: null,
        postingLedgerEvents: [],
        remediationLog: [],
      },
    );
    expect(detail.assertionTags).toEqual([]);
  });

  it("assertion_tags sort order preserved through queue projection", () => {
    const tags = ["accuracy", "classification", "cutoff"];
    const detail = mapReviewItemDetail(
      {
        id: "ri3",
        fire_id: "f3",
        firm_client_id: "fc1",
        engagement_id: "eng1",
        close_period_id: null,
        rule_id: "gen.rule",
        rule_version: 1,
        accounting_method: "accrual",
        je_draft: draft,
        je_draft_total_debit_cents: 100,
        je_draft_total_credit_cents: 100,
        je_draft_line_count: 2,
        rule_reason_code: "rc",
        rule_reason_detail: {},
        severity: "warning",
        evidence_refs: [],
        assertion_tags: tags,
        created_at: "2026-07-06T00:00:00Z",
      },
      {
        firmClientName: "Client",
        engagementName: "Eng",
        qboJeId: null,
        postingLedgerEvents: [],
        remediationLog: [],
      },
    );
    expect(detail.assertionTags).toEqual(tags);
  });
});
