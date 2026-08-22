/**
 * JE-3B1 — Provider attempt custody, state/event, classification, discovery, gates.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertJe3b1DbTransitionEventPair,
  assertJe3b1EventPayloadStatusMatches,
  assertUnknownCommitCannotBlindRetry,
  classifyJeExecutionRetry,
  isJe3b1DbTransitionAuthorized,
  JE_3B1_DB_TRANSITION_EVENT_MATRIX,
} from "../execution-state";
import { hashProviderRequestPreview } from "../execution-hash";
import { mapGovernedProposalToQboPayload } from "../execution-payload";
import { buildJeCorrelationMarker } from "../execution-correlation";
import {
  classifyJeProviderCreateOutcome,
  JE_DOCNUMBER_RECOMMENDATION,
  JE_PROVIDER_ATTEMPT_ERROR,
} from "../provider-attempt-types";
import {
  hashNormalizedProviderJe,
  normalizeQboJournalEntry,
  providerJeMatchesExpectedEconomics,
  qboAmountToCents,
} from "../provider-je-normalize";
import {
  findJournalEntryByCorrelationMarker,
  JE_CRASH_RECOVERY_CONTRACT,
} from "../provider-qbo-read";
import { assertGovernedProviderPostNotEnabled } from "../provider-attempt-service";
import { assertNoExecutionCallerOverrides } from "../execution-custody";
import type { JournalEntryProposalRow } from "../types";

function fixtureProposal(
  overrides?: Partial<JournalEntryProposalRow>,
): JournalEntryProposalRow {
  return {
    id: "prop-1",
    company_id: "co-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    period_end: "2026-08-15",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    source_recon_run_ids: [],
    origin_type: "ACCRUAL",
    reason_code: "ACCRUAL_EXPENSE",
    memo: "Accrue rent",
    currency: "USD",
    txn_date: "2026-08-15",
    lines: [
      {
        sequence: 1,
        accountId: "acct-dr",
        debitCents: 10050,
        creditCents: 0,
        description: "Rent expense",
      },
      {
        sequence: 2,
        accountId: "acct-cr",
        debitCents: 0,
        creditCents: 10050,
        description: "Accrued rent",
      },
    ],
    total_debits_cents: 10050,
    total_credits_cents: 10050,
    expected_effects: [{ type: "CC_EXCEPTION_CLEAR", exceptionCode: "X" }],
    policy_snapshot: {},
    policy_hash: "b".repeat(64),
    proposal_hash: "a".repeat(64),
    status: "SUBMITTED",
    proposed_by: "user-1",
    proposed_at: "2026-08-15T00:00:00.000Z",
    idempotency_key: "c".repeat(64),
    ...overrides,
  };
}

describe("JE-3B1 attempt custody + request hash gate", () => {
  it("1-4. payload reconstruction binds persisted marker + request hash", () => {
    const executionId = "11111111-1111-4111-8111-111111111111";
    const marker = buildJeCorrelationMarker(executionId);
    const proposal = fixtureProposal();
    const preview = mapGovernedProposalToQboPayload({
      proposal,
      correlationMarker: marker,
    });
    expect(preview.PrivateNote).toContain(marker);
    expect(preview.correlation_marker).toBe(marker);
    const hash = hashProviderRequestPreview(
      preview as unknown as Record<string, unknown>,
    );
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const again = hashProviderRequestPreview(
      mapGovernedProposalToQboPayload({
        proposal,
        correlationMarker: marker,
      }) as unknown as Record<string, unknown>,
    );
    expect(again).toBe(hash);
  });

  it("5. mismatched request hash rejected (reconstruct vs persisted)", () => {
    const marker = buildJeCorrelationMarker(
      "22222222-2222-4222-8222-222222222222",
    );
    const hash = hashProviderRequestPreview(
      mapGovernedProposalToQboPayload({
        proposal: fixtureProposal(),
        correlationMarker: marker,
      }) as unknown as Record<string, unknown>,
    );
    expect(hash).not.toBe("f".repeat(64));
  });

  it("7. caller realm/connection overrides forbidden", () => {
    expect(() =>
      assertNoExecutionCallerOverrides({ realmId: "1234567890" }),
    ).toThrow(/must not supply/);
    expect(() =>
      assertNoExecutionCallerOverrides({
        accountingConnectionId: "conn-other",
      }),
    ).toThrow(/must not supply/);
  });
});

describe("JE-3B1 state/event coupling", () => {
  it("8. READY_TO_POST → POSTING + posting_started allowed", () => {
    expect(() =>
      assertJe3b1DbTransitionEventPair({
        from: "READY_TO_POST",
        to: "POSTING",
        eventType: "journal_entry.posting_started",
      }),
    ).not.toThrow();
    expect(isJe3b1DbTransitionAuthorized("READY_TO_POST", "POSTING")).toBe(true);
  });

  it("9. wrong event for POSTING rejected", () => {
    expect(() =>
      assertJe3b1DbTransitionEventPair({
        from: "READY_TO_POST",
        to: "POSTING",
        eventType: "journal_entry.provider_posted",
      }),
    ).toThrow(/transition\/event pairing/);
  });

  it("10-12. POSTING outcomes with exact events", () => {
    expect(() =>
      assertJe3b1DbTransitionEventPair({
        from: "POSTING",
        to: "POSTED_UNVERIFIED",
        eventType: "journal_entry.provider_posted",
      }),
    ).not.toThrow();
    expect(() =>
      assertJe3b1DbTransitionEventPair({
        from: "POSTING",
        to: "UNKNOWN_COMMIT",
        eventType: "journal_entry.post_unknown",
      }),
    ).not.toThrow();
    expect(() =>
      assertJe3b1DbTransitionEventPair({
        from: "POSTING",
        to: "FAILED",
        eventType: "journal_entry.execution_failed",
      }),
    ).not.toThrow();
  });

  it("13. event payload status must match", () => {
    expect(() =>
      assertJe3b1EventPayloadStatusMatches({
        payloadStatus: "POSTING",
        newStatus: "POSTING",
      }),
    ).not.toThrow();
    expect(() =>
      assertJe3b1EventPayloadStatusMatches({
        payloadStatus: "FAILED",
        newStatus: "POSTING",
      }),
    ).toThrow(/does not match/);
  });

  it("14. UNKNOWN_COMMIT → POSTING rejected", () => {
    expect(isJe3b1DbTransitionAuthorized("UNKNOWN_COMMIT", "POSTING")).toBe(
      false,
    );
    expect(() =>
      assertJe3b1DbTransitionEventPair({
        from: "UNKNOWN_COMMIT",
        to: "POSTING",
        eventType: "journal_entry.posting_started",
      }),
    ).toThrow(/transition\/event pairing/);
    expect(() => assertUnknownCommitCannotBlindRetry("UNKNOWN_COMMIT")).toThrow(
      /UNKNOWN_COMMIT/,
    );
  });

  it("15. POSTED_UNVERIFIED → VERIFIED remains DB-disabled", () => {
    expect(
      isJe3b1DbTransitionAuthorized("POSTED_UNVERIFIED", "VERIFIED"),
    ).toBe(false);
    expect(
      (JE_3B1_DB_TRANSITION_EVENT_MATRIX as ReadonlyArray<{
        from: string;
        to: string;
      }>).some((r) => r.from === "POSTED_UNVERIFIED" && r.to === "VERIFIED"),
    ).toBe(false);
  });
});

describe("JE-3B1 correlation discovery", () => {
  const expected = {
    txnDate: "2026-08-15",
    currency: "USD",
    lines: [
      { accountId: "acct-dr", debitCents: 10050, creditCents: 0 },
      { accountId: "acct-cr", debitCents: 0, creditCents: 10050 },
    ],
    totalDebitsCents: 10050,
    totalCreditsCents: 10050,
  };
  const marker = "ADVJE:exec-1";

  function qboJe(partial: {
    id: string;
    note: string;
    amount?: number;
    accountDr?: string;
  }) {
    const amount = partial.amount ?? 100.5;
    return {
      Id: partial.id,
      TxnDate: "2026-08-15",
      PrivateNote: partial.note,
      CurrencyRef: { value: "USD" },
      Line: [
        {
          DetailType: "JournalEntryLineDetail",
          Amount: amount,
          Description: "Rent expense",
          JournalEntryLineDetail: {
            PostingType: "Debit",
            AccountRef: { value: partial.accountDr || "acct-dr" },
          },
        },
        {
          DetailType: "JournalEntryLineDetail",
          Amount: amount,
          Description: "Accrued rent",
          JournalEntryLineDetail: {
            PostingType: "Credit",
            AccountRef: { value: "acct-cr" },
          },
        },
      ],
    };
  }

  it("18-20. NONE / EXACT_ONE / MULTIPLE", async () => {
    const none = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => [
        qboJe({ id: "1", note: "unrelated memo" }),
      ],
    });
    expect(none.kind).toBe("NONE");

    const one = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => [
        qboJe({ id: "10", note: `memo | ${marker}` }),
      ],
    });
    expect(one.kind).toBe("EXACT_ONE");
    expect(one.matches[0].providerJournalId).toBe("10");

    const multi = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => [
        qboJe({ id: "10", note: `a | ${marker}` }),
        qboJe({ id: "11", note: `b | ${marker}` }),
      ],
    });
    expect(multi.kind).toBe("MULTIPLE");
  });

  it("22. marker with economic mismatch not accepted", async () => {
    const result = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => [
        qboJe({ id: "10", note: `memo | ${marker}`, amount: 99.0 }),
      ],
    });
    expect(result.kind).toBe("NONE");
    expect(result.reason).toBe("marker_present_but_economic_mismatch");
  });
});

describe("JE-3B1 read adapter + normalized hash", () => {
  it("23-28. normalize cents, sides, note, currency, totals, hash", () => {
    const normalized = normalizeQboJournalEntry({
      Id: "99",
      TxnDate: "2026-08-15",
      PrivateNote: "ADVJE:x",
      DocNumber: "JE-1",
      CurrencyRef: { value: "USD" },
      Line: [
        {
          DetailType: "JournalEntryLineDetail",
          Amount: 100.5,
          Description: "Dr",
          JournalEntryLineDetail: {
            PostingType: "Debit",
            AccountRef: { value: "a1" },
          },
        },
        {
          DetailType: "JournalEntryLineDetail",
          Amount: 100.5,
          Description: "Cr",
          JournalEntryLineDetail: {
            PostingType: "Credit",
            AccountRef: { value: "a2" },
          },
        },
      ],
    });
    expect(qboAmountToCents(100.5)).toBe(10050);
    expect(normalized.lines[0].debitCents).toBe(10050);
    expect(normalized.lines[0].creditCents).toBe(0);
    expect(normalized.lines[1].creditCents).toBe(10050);
    expect(normalized.privateNote).toBe("ADVJE:x");
    expect(normalized.currency).toBe("USD");
    expect(normalized.totalDebitsCents).toBe(10050);
    expect(normalized.totalCreditsCents).toBe(10050);
    const h1 = hashNormalizedProviderJe(normalized);
    const h2 = hashNormalizedProviderJe(normalized);
    expect(h1).toBe(h2);
    expect(
      providerJeMatchesExpectedEconomics({
        candidate: normalized,
        expected: {
          txnDate: "2026-08-15",
          currency: "USD",
          lines: [
            { accountId: "a1", debitCents: 10050, creditCents: 0 },
            { accountId: "a2", debitCents: 0, creditCents: 10050 },
          ],
          totalDebitsCents: 10050,
          totalCreditsCents: 10050,
        },
      }),
    ).toBe(true);
  });
});

describe("JE-3B1 failure classification + unknown commit", () => {
  it("29-30. network uncertain → POSSIBLY_COMMITTED + DISCOVERY_REQUIRED", () => {
    const outcome = classifyJeProviderCreateOutcome({
      requestStarted: true,
      responseReceived: false,
      networkError: true,
    });
    expect(outcome.commitCertainty).toBe("POSSIBLY_COMMITTED");
    expect(outcome.errorClass).toBe("NETWORK_UNCERTAIN");
    expect(classifyJeExecutionRetry("UNKNOWN_COMMIT")).toBe(
      "DISCOVERY_REQUIRED",
    );
  });

  it("31. no governed POST entry point", () => {
    expect(() => assertGovernedProviderPostNotEnabled()).toThrow(
      /not enabled/,
    );
    expect(JE_PROVIDER_ATTEMPT_ERROR.NO_GOVERNED_POST).toBeTruthy();
  });

  it("35-40. pre-send / rejection / timeout / malformed / 5xx / 401", () => {
    expect(
      classifyJeProviderCreateOutcome({
        requestStarted: false,
        responseReceived: false,
      }).commitCertainty,
    ).toBe("DEFINITELY_NOT_COMMITTED");

    expect(
      classifyJeProviderCreateOutcome({
        requestStarted: true,
        responseReceived: true,
        httpStatus: 400,
      }).errorClass,
    ).toBe("DEFINITE_PROVIDER_REJECTION");

    expect(
      classifyJeProviderCreateOutcome({
        requestStarted: true,
        responseReceived: false,
        networkError: true,
      }).commitCertainty,
    ).toBe("POSSIBLY_COMMITTED");

    expect(
      classifyJeProviderCreateOutcome({
        requestStarted: true,
        responseReceived: true,
        httpStatus: 200,
        providerId: null,
      }).errorClass,
    ).toBe("MALFORMED_SUCCESS");

    expect(
      classifyJeProviderCreateOutcome({
        requestStarted: true,
        responseReceived: true,
        httpStatus: 503,
      }).commitCertainty,
    ).toBe("POSSIBLY_COMMITTED");

    const auth = classifyJeProviderCreateOutcome({
      requestStarted: true,
      responseReceived: true,
      httpStatus: 401,
    });
    expect(auth.errorClass).toBe("AUTH_REJECTED");
    expect(auth.commitCertainty).toBe("DEFINITELY_NOT_COMMITTED");
    expect(auth.errorMessage).toMatch(/must not blind-retry/i);

    expect(
      classifyJeProviderCreateOutcome({
        requestStarted: true,
        responseReceived: true,
        httpStatus: 429,
      }).commitCertainty,
    ).toBe("DEFINITELY_NOT_COMMITTED");
  });
});

describe("JE-3B1 DocNumber + crash contract + no-post gates", () => {
  it("DocNumber not forced; PrivateNote required", () => {
    expect(JE_DOCNUMBER_RECOMMENDATION.forceDocNumber).toBe(false);
    expect(JE_DOCNUMBER_RECOMMENDATION.privateNoteMarkerRequired).toBe(true);
  });

  it("crash recovery contract documented", () => {
    expect(JE_CRASH_RECOVERY_CONTRACT.caseB).toMatch(/discovery/i);
    expect(JE_CRASH_RECOVERY_CONTRACT.caseD).toMatch(/never re-POST/i);
  });

  it("51-56. source gates: no poster.post, no Memory, no GOVERNED_AUTO, no worker", () => {
    const root = join(process.cwd(), "lib/journal-entry-governance");
    const files = [
      "provider-attempt-service.ts",
      "provider-attempt-repository.ts",
      "provider-qbo-read.ts",
      "execution-service.ts",
    ];
    for (const f of files) {
      const src = readFileSync(join(root, f), "utf8");
      expect(src).not.toMatch(/import\s*\{[^}]*qboJournalEntryPoster/);
      expect(src).not.toMatch(/qboJournalEntryPoster\s*\.\s*post\s*\(/);
      expect(src).not.toMatch(/recordMemory\s*\(/);
      expect(src).not.toMatch(/\bGOVERNED_AUTO\b/);
      expect(src).not.toMatch(/\.from\(\s*["']je_post_attempts["']\s*\)/);
    }
  });
});
