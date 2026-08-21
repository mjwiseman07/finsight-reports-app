import { describe, expect, it } from "vitest";
import {
  assertCorrelationMarkerSafeForPrivateNote,
  buildJeCorrelationMarker,
  composeJePrivateNote,
  parseJeCorrelationMarker,
  QBO_PRIVATE_NOTE_MAX_CHARS,
} from "../execution-correlation";
import { mapGovernedProposalToQboPayload } from "../execution-payload";
import type { JournalEntryProposalRow } from "../types";

const EXEC_ID = "550e8400-e29b-41d4-a716-446655440000";

function proposal(over: Partial<JournalEntryProposalRow> = {}): JournalEntryProposalRow {
  return {
    id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    period_end: "2026-03-31",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    source_recon_run_ids: ["recon-1"],
    origin_type: "ACCRUAL",
    reason_code: "ACCRUAL_EXPENSE",
    memo: "Month-end accrual",
    currency: "USD",
    txn_date: "2026-03-31",
    lines: [
      {
        sequence: 1,
        accountId: "10",
        debitCents: 10050,
        creditCents: 0,
        description: "Dr",
      },
      {
        sequence: 2,
        accountId: "20",
        debitCents: 0,
        creditCents: 10050,
        description: "Cr",
      },
    ],
    total_debits_cents: 10050,
    total_credits_cents: 10050,
    expected_effects: [],
    policy_snapshot: {},
    policy_hash: "p".repeat(64),
    proposal_hash: "h".repeat(64),
    status: "SUBMITTED",
    proposed_by: "user-proposer",
    proposed_at: "2026-03-31T12:00:00.000Z",
    idempotency_key: "i".repeat(64),
    ...over,
  };
}

describe("JE-3A correlation marker + payload preview", () => {
  it("50. marker deterministic", () => {
    expect(buildJeCorrelationMarker(EXEC_ID)).toBe(
      buildJeCorrelationMarker(EXEC_ID),
    );
  });

  it("51. marker contains execution identity", () => {
    const m = buildJeCorrelationMarker(EXEC_ID);
    expect(m).toBe(`ADVJE:${EXEC_ID}`);
    expect(parseJeCorrelationMarker(m)?.executionId).toBe(EXEC_ID);
  });

  it("52. marker safe for PrivateNote", () => {
    const m = buildJeCorrelationMarker(EXEC_ID);
    expect(() => assertCorrelationMarkerSafeForPrivateNote(m)).not.toThrow();
    expect(m.length).toBeLessThanOrEqual(QBO_PRIVATE_NOTE_MAX_CHARS);
  });

  it("53. payload preview includes marker and cents→dollars", () => {
    const marker = buildJeCorrelationMarker(EXEC_ID);
    const preview = mapGovernedProposalToQboPayload({
      proposal: proposal(),
      correlationMarker: marker,
    });
    expect(preview.correlation_marker).toBe(marker);
    expect(preview.PrivateNote).toContain(marker);
    expect(preview.PrivateNote).toContain("Month-end accrual");
    expect(preview.Line[0].Amount).toBe(100.5);
    expect(preview.domain_total_debits_cents).toBe(10050);
  });

  it("54. marker changes for different execution id", () => {
    expect(buildJeCorrelationMarker(EXEC_ID)).not.toBe(
      buildJeCorrelationMarker("11111111-1111-1111-1111-111111111111"),
    );
  });

  it("PrivateNote truncation preserves marker", () => {
    const marker = buildJeCorrelationMarker(EXEC_ID);
    const longMemo = "x".repeat(QBO_PRIVATE_NOTE_MAX_CHARS);
    const note = composeJePrivateNote({ userMemo: longMemo, correlationMarker: marker });
    expect(note.endsWith(marker)).toBe(true);
    expect(note.length).toBeLessThanOrEqual(QBO_PRIVATE_NOTE_MAX_CHARS);
  });
});
