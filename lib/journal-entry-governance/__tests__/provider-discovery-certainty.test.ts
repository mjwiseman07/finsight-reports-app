/**
 * JE-3B1 — Discovery / read-certainty: failure ≠ NONE / NOT_FOUND.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findJournalEntryByCorrelationMarker,
  mayRecordDiscoveredNotFound,
  readJournalEntryById,
} from "../provider-qbo-read";
import { recoverUnknownJournalEntryExecution } from "../provider-attempt-service";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProviderAttemptRow } from "../provider-attempt-types";
import type { JournalEntryProposalRow } from "../types";
import { hashProviderRequestPreview } from "../execution-hash";
import { mapGovernedProposalToQboPayload } from "../execution-payload";

const USER = "user-writer";
const HASH_PLACEHOLDER = "a".repeat(64);

vi.mock("@/lib/qbo/api-fetch.js", () => ({
  qboApiFetch: vi.fn(),
}));

import { qboApiFetch } from "@/lib/qbo/api-fetch.js";

const mockedFetch = vi.mocked(qboApiFetch);

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
        Description: "Dr",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: "acct-dr" },
        },
      },
      {
        DetailType: "JournalEntryLineDetail",
        Amount: amount,
        Description: "Cr",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: "acct-cr" },
        },
      },
    ],
  };
}

describe("readJournalEntryById certainty", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("1. HTTP 200 + valid JE → FOUND", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: { JournalEntry: qboJe({ id: "99", note: marker }) },
      text: "",
      intuit_tid: "tid-1",
      url: "",
      elapsed_ms: 1,
    } as never);
    const r = await readJournalEntryById({
      auth: { realmId: "r", accessToken: "t" },
      qboJeId: "99",
    });
    expect(r.outcome).toBe("FOUND");
    expect(r.found).toBe(true);
    expect(r.normalized?.providerJournalId).toBe("99");
  });

  it("2. HTTP 404 → NOT_FOUND", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: {},
      text: "",
      intuit_tid: "tid-404",
      url: "",
      elapsed_ms: 1,
    } as never);
    const r = await readJournalEntryById({
      auth: { realmId: "r", accessToken: "t" },
      qboJeId: "missing",
    });
    expect(r.outcome).toBe("NOT_FOUND");
    expect(r.found).toBe(false);
  });

  it("3. HTTP 401 → READ_FAILED", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: {},
      text: "",
      intuit_tid: null,
      url: "",
      elapsed_ms: 1,
    } as never);
    const r = await readJournalEntryById({
      auth: { realmId: "r", accessToken: "t" },
      qboJeId: "1",
    });
    expect(r.outcome).toBe("READ_FAILED");
    expect(r.errorClass).toBe("AUTH_REJECTED");
  });

  it("4. HTTP 429 → READ_FAILED", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: {},
      text: "",
      intuit_tid: null,
      url: "",
      elapsed_ms: 1,
    } as never);
    const r = await readJournalEntryById({
      auth: { realmId: "r", accessToken: "t" },
      qboJeId: "1",
    });
    expect(r.outcome).toBe("READ_FAILED");
    expect(r.errorClass).toBe("RATE_LIMITED");
  });

  it("5. HTTP 500 → READ_FAILED", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: {},
      text: "",
      intuit_tid: null,
      url: "",
      elapsed_ms: 1,
    } as never);
    const r = await readJournalEntryById({
      auth: { realmId: "r", accessToken: "t" },
      qboJeId: "1",
    });
    expect(r.outcome).toBe("READ_FAILED");
    expect(r.errorClass).toBe("SERVER_ERROR");
  });

  it("6. network exception → READ_FAILED", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("socket hang up"));
    const r = await readJournalEntryById({
      auth: { realmId: "r", accessToken: "t" },
      qboJeId: "1",
    });
    expect(r.outcome).toBe("READ_FAILED");
    expect(r.errorClass).toBe("NETWORK_UNCERTAIN");
  });

  it("7. malformed 2xx without JournalEntry → READ_FAILED", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: { QueryResponse: {} },
      text: "",
      intuit_tid: "tid-m",
      url: "",
      elapsed_ms: 1,
    } as never);
    const r = await readJournalEntryById({
      auth: { realmId: "r", accessToken: "t" },
      qboJeId: "1",
    });
    expect(r.outcome).toBe("READ_FAILED");
    expect(r.errorClass).toBe("MALFORMED_SUCCESS");
  });
});

describe("correlation discovery certainty", () => {
  it("8. successful query + zero rows → NONE", async () => {
    const r = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => ({
        ok: true,
        rows: [],
        httpStatus: 200,
        intuitTid: null,
      }),
    });
    expect(r.kind).toBe("NONE");
    expect(r.reason).toBe("successful_empty_query");
  });

  it("9. successful query + rows but no marker → NONE", async () => {
    const r = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => ({
        ok: true,
        rows: [qboJe({ id: "1", note: "no marker here" })],
        httpStatus: 200,
        intuitTid: null,
      }),
    });
    expect(r.kind).toBe("NONE");
    expect(r.reason).toBe("no_marker_match");
  });

  it("10. marker + economic mismatch → NONE", async () => {
    const r = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => ({
        ok: true,
        rows: [qboJe({ id: "1", note: `x | ${marker}`, amount: 50 })],
        httpStatus: 200,
        intuitTid: null,
      }),
    });
    expect(r.kind).toBe("NONE");
    expect(r.reason).toBe("marker_present_but_economic_mismatch");
  });

  it("11-12. EXACT_ONE / MULTIPLE", async () => {
    const one = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => ({
        ok: true,
        rows: [qboJe({ id: "10", note: `m | ${marker}` })],
        httpStatus: 200,
        intuitTid: null,
      }),
    });
    expect(one.kind).toBe("EXACT_ONE");

    const multi = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => ({
        ok: true,
        rows: [
          qboJe({ id: "10", note: `a | ${marker}` }),
          qboJe({ id: "11", note: `b | ${marker}` }),
        ],
        httpStatus: 200,
        intuitTid: null,
      }),
    });
    expect(multi.kind).toBe("MULTIPLE");
  });

  it("13-15. 401/429/5xx query → INDETERMINATE (not NONE)", async () => {
    for (const [status, errorClass] of [
      [401, "AUTH_REJECTED"],
      [429, "RATE_LIMITED"],
      [500, "SERVER_ERROR"],
    ] as const) {
      const r = await findJournalEntryByCorrelationMarker({
        auth: { realmId: "r", accessToken: "t" },
        correlationMarker: marker,
        txnDate: "2026-08-15",
        expected,
        queryCandidates: async () => ({
          ok: false,
          rows: [],
          httpStatus: status,
          errorClass,
          intuitTid: null,
          reason: `http_${status}`,
        }),
      });
      expect(r.kind).toBe("INDETERMINATE");
      expect(r.errorClass).toBe(errorClass);
    }
  });

  it("16. network/query exception → INDETERMINATE", async () => {
    const r = await findJournalEntryByCorrelationMarker({
      auth: { realmId: "r", accessToken: "t" },
      correlationMarker: marker,
      txnDate: "2026-08-15",
      expected,
      queryCandidates: async () => {
        throw new Error("timeout");
      },
    });
    expect(r.kind).toBe("INDETERMINATE");
    expect(r.errorClass).toBe("NETWORK_UNCERTAIN");
  });
});

describe("recovery safety with read certainty", () => {
  function baseProposal(): JournalEntryProposalRow {
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
      memo: "memo",
      currency: "USD",
      txn_date: "2026-08-15",
      lines: [
        { sequence: 1, accountId: "acct-dr", debitCents: 10050, creditCents: 0 },
        { sequence: 2, accountId: "acct-cr", debitCents: 0, creditCents: 10050 },
      ],
      total_debits_cents: 10050,
      total_credits_cents: 10050,
      expected_effects: [{ type: "CC_EXCEPTION_CLEAR", exceptionCode: "X" }],
      policy_snapshot: {},
      policy_hash: HASH_PLACEHOLDER,
      proposal_hash: HASH_PLACEHOLDER,
      status: "SUBMITTED",
      proposed_by: "p",
      proposed_at: "2026-08-15T00:00:00.000Z",
      idempotency_key: HASH_PLACEHOLDER,
    };
  }

  async function alignedHash(proposal: JournalEntryProposalRow) {
    return hashProviderRequestPreview(
      mapGovernedProposalToQboPayload({
        proposal,
        correlationMarker: marker,
      }) as unknown as Record<string, unknown>,
    );
  }

  function execution(
    over: Partial<JournalEntryExecutionRow>,
    providerRequestHash: string,
  ): JournalEntryExecutionRow {
    return {
      id: "exec-1",
      proposal_id: "prop-1",
      approval_id: "appr-1",
      company_id: "co-1",
      engagement_id: "eng-1",
      firm_client_id: "fc-1",
      source_continuous_close_run_id: "cc-1",
      source_accounting_sync_id: "sync-1",
      accounting_connection_id: "conn-1",
      provider: "quickbooks",
      proposal_hash: HASH_PLACEHOLDER,
      approval_policy_hash: HASH_PLACEHOLDER,
      execution_policy_hash: HASH_PLACEHOLDER,
      execution_hash: HASH_PLACEHOLDER,
      idempotency_key: HASH_PLACEHOLDER,
      status: "UNKNOWN_COMMIT",
      correlation_marker: marker,
      execution_policy_snapshot: {},
      preflight_result: { eligible: true, checks: [] },
      requested_by: USER,
      requested_at: "2026-08-15T00:00:00.000Z",
      state_version: 3,
      provider_journal_id: null,
      provider_request_hash: providerRequestHash,
      provider_response_hash: null,
      last_error_code: null,
      last_error_message: null,
      ...over,
    };
  }

  function attempt(
    over: Partial<JournalEntryProviderAttemptRow> = {},
  ): JournalEntryProviderAttemptRow {
    return {
      id: "att-1",
      execution_id: "exec-1",
      accounting_connection_id: "conn-1",
      provider: "quickbooks",
      provider_request_hash: HASH_PLACEHOLDER,
      correlation_marker: marker,
      status: "UNKNOWN_RESULT",
      commit_certainty: "POSSIBLY_COMMITTED",
      request_started_at: null,
      request_completed_at: null,
      qbo_je_id: null,
      intuit_tid: null,
      provider_response_hash: null,
      provider_error_code: null,
      provider_error_message: null,
      discovery_summary: {},
      created_at: "2026-08-15T00:00:00.000Z",
      updated_at: "2026-08-15T00:00:00.000Z",
      ...over,
    };
  }

  async function runRecovery(args: {
    execStatus: "UNKNOWN_COMMIT" | "POSTING";
    commitCertainty: JournalEntryProviderAttemptRow["commit_certainty"];
    discoveryKind: "INDETERMINATE" | "NONE" | "EXACT_ONE" | "MULTIPLE";
  }) {
    const proposal = baseProposal();
    const providerRequestHash = await alignedHash(proposal);
    const initialAttempt = attempt({
      commit_certainty: args.commitCertainty,
      provider_request_hash: providerRequestHash,
      status:
        args.commitCertainty === "NOT_SENT" ? "RESERVED" : "UNKNOWN_RESULT",
    });
    let storedAttempt = { ...initialAttempt };
    const ledgerBox: {
      event: { type: string; payload: Record<string, unknown> } | null;
    } = { event: null };
    const patchAttempt = vi.fn(async (input: { patch: Record<string, unknown> }) => {
      // Simulate narrowed patch: refuse conclusion fields
      if (
        Object.prototype.hasOwnProperty.call(input.patch, "commit_certainty") ||
        input.patch.qbo_je_id ||
        input.patch.status === "DISCOVERED_COMMITTED" ||
        input.patch.status === "DISCOVERED_NOT_FOUND"
      ) {
        throw new Error("je_provider_attempt_patch_forbidden");
      }
      storedAttempt = {
        ...storedAttempt,
        discovery_summary:
          (input.patch.discovery_summary as Record<string, unknown>) ||
          storedAttempt.discovery_summary,
      };
      return storedAttempt;
    });

    const applyCommitDiscovered = vi.fn(async (input: {
      qboJeId: string;
      eventPayload: Record<string, unknown>;
      discoverySummary: Record<string, unknown>;
      providerResponseHash: string | null;
    }) => {
      storedAttempt = {
        ...storedAttempt,
        status: "DISCOVERED_COMMITTED",
        commit_certainty: "COMMITTED",
        qbo_je_id: input.qboJeId,
        provider_response_hash: input.providerResponseHash,
        discovery_summary: input.discoverySummary,
      };
      ledgerBox.event = {
        type: "journal_entry.provider_commit_discovered",
        payload: input.eventPayload,
      };
      return {
        attempt: storedAttempt,
        execution: execution(
          { status: args.execStatus },
          providerRequestHash,
        ),
        ledgerEventId: "evt-commit-discovered",
      };
    });

    const applyNotFoundConfirmed = vi.fn(async (input: {
      eventPayload: Record<string, unknown>;
      discoverySummary: Record<string, unknown>;
    }) => {
      storedAttempt = {
        ...storedAttempt,
        status: "DISCOVERED_NOT_FOUND",
        discovery_summary: input.discoverySummary,
      };
      ledgerBox.event = {
        type: "journal_entry.provider_not_found_confirmed",
        payload: input.eventPayload,
      };
      return {
        attempt: storedAttempt,
        execution: execution(
          { status: args.execStatus },
          providerRequestHash,
        ),
        ledgerEventId: "evt-not-found",
      };
    });

    const findByMarker = vi.fn(async () => {
      if (args.discoveryKind === "INDETERMINATE") {
        return {
          kind: "INDETERMINATE" as const,
          matches: [],
          candidateCount: 0,
          reason: "http_500",
          httpStatus: 500,
          errorClass: "SERVER_ERROR" as const,
        };
      }
      if (args.discoveryKind === "NONE") {
        return {
          kind: "NONE" as const,
          matches: [],
          candidateCount: 0,
          reason: "successful_empty_query",
        };
      }
      if (args.discoveryKind === "EXACT_ONE") {
        return {
          kind: "EXACT_ONE" as const,
          matches: [
            {
              providerJournalId: "qbo-42",
              txnDate: "2026-08-15",
              currency: "USD",
              privateNote: marker,
              docNumber: null,
              lines: [],
              totalDebitsCents: 10050,
              totalCreditsCents: 10050,
            },
          ],
          candidateCount: 1,
          reason: "exact_marker_and_economics",
        };
      }
      return {
        kind: "MULTIPLE" as const,
        matches: [
          {
            providerJournalId: "a",
            txnDate: "2026-08-15",
            currency: "USD",
            privateNote: marker,
            docNumber: null,
            lines: [],
            totalDebitsCents: 10050,
            totalCreditsCents: 10050,
          },
          {
            providerJournalId: "b",
            txnDate: "2026-08-15",
            currency: "USD",
            privateNote: marker,
            docNumber: null,
            lines: [],
            totalDebitsCents: 10050,
            totalCreditsCents: 10050,
          },
        ],
        candidateCount: 2,
        reason: "multiple_marker_and_economic_matches",
      };
    });

    const result = await recoverUnknownJournalEntryExecution(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      {
        deps: {
          resolveActor: vi.fn(async () => ({
            userId: USER,
            canRead: true,
            canWrite: true,
            scope: "company" as const,
          })),
          loadExecution: vi.fn(async () =>
            execution(
              { status: args.execStatus },
              providerRequestHash,
            ),
          ),
          loadProposal: vi.fn(async () => proposal),
          revalidateConnection: vi.fn(async () => ({ ok: true as const })),
          resolveToken: vi.fn(async () => ({
            accessToken: "tok",
            refreshToken: "ref",
            realmId: "realm",
            tokenSource: "accounting_connections" as const,
            grantedScopes: [],
            connectionId: "conn-1",
            ownerUserId: USER,
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          })),
          findByMarker,
          patchAttempt,
          applyCommitDiscovered,
          applyNotFoundConfirmed,
          loadFirmId: vi.fn(async () => "firm-1"),
          loadAttempt: vi.fn(async () => storedAttempt),
        },
      },
    );
    return {
      result,
      storedAttempt,
      patchAttempt,
      applyCommitDiscovered,
      applyNotFoundConfirmed,
      lastLedgerEvent: ledgerBox.event,
    };
  }

  it("17-20. UNKNOWN_COMMIT + INDETERMINATE → unchanged, no bind, no POST", async () => {
    const { result, storedAttempt, patchAttempt, applyCommitDiscovered } =
      await runRecovery({
        execStatus: "UNKNOWN_COMMIT",
        commitCertainty: "POSSIBLY_COMMITTED",
        discoveryKind: "INDETERMINATE",
      });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.execution.status).toBe("UNKNOWN_COMMIT");
      expect(result.boundProviderJournalId).toBeNull();
      expect(result.providerPostRetryIssued).toBe(false);
      expect(result.retryClass).toBe("DISCOVERY_REQUIRED");
      expect(result.discovery.kind).toBe("INDETERMINATE");
      expect(result.ledgerEventId).toBeNull();
    }
    expect(storedAttempt.commit_certainty).toBe("POSSIBLY_COMMITTED");
    expect(storedAttempt.qbo_je_id).toBeNull();
    expect(storedAttempt.status).toBe("UNKNOWN_RESULT");
    expect(patchAttempt).toHaveBeenCalled();
    expect(applyCommitDiscovered).not.toHaveBeenCalled();
    const patch = patchAttempt.mock.calls[0][0].patch;
    expect(patch.status).toBeUndefined();
    expect(patch.commit_certainty).toBeUndefined();
    expect(patch.qbo_je_id).toBeUndefined();
    expect((patch.discovery_summary as { observation: string }).observation).toBe(
      "read_failed",
    );
  });

  it("21. POSTING + NOT_SENT + indeterminate → NOT DISCOVERED_NOT_FOUND", async () => {
    const { result, storedAttempt, applyNotFoundConfirmed } = await runRecovery({
      execStatus: "POSTING",
      commitCertainty: "NOT_SENT",
      discoveryKind: "INDETERMINATE",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.execution.status).toBe("POSTING");
    expect(storedAttempt.status).toBe("RESERVED");
    expect(storedAttempt.status).not.toBe("DISCOVERED_NOT_FOUND");
    expect(applyNotFoundConfirmed).not.toHaveBeenCalled();
  });

  it("22. POSTING + NOT_SENT + successful NONE → DISCOVERED_NOT_FOUND + receipt", async () => {
    expect(
      mayRecordDiscoveredNotFound({
        discoveryKind: "NONE",
        commitCertainty: "NOT_SENT",
      }),
    ).toBe(true);
    const { storedAttempt, applyNotFoundConfirmed, lastLedgerEvent, result } =
      await runRecovery({
        execStatus: "POSTING",
        commitCertainty: "NOT_SENT",
        discoveryKind: "NONE",
      });
    expect(storedAttempt.status).toBe("DISCOVERED_NOT_FOUND");
    expect(applyNotFoundConfirmed).toHaveBeenCalled();
    expect(lastLedgerEvent?.type).toBe(
      "journal_entry.provider_not_found_confirmed",
    );
    expect(result.ok && result.ledgerEventId).toBe("evt-not-found");
  });

  it("23. POSSIBLY_COMMITTED + successful NONE → remains unresolved / no not-found receipt", async () => {
    expect(
      mayRecordDiscoveredNotFound({
        discoveryKind: "NONE",
        commitCertainty: "POSSIBLY_COMMITTED",
      }),
    ).toBe(false);
    const { storedAttempt, applyNotFoundConfirmed } = await runRecovery({
      execStatus: "UNKNOWN_COMMIT",
      commitCertainty: "POSSIBLY_COMMITTED",
      discoveryKind: "NONE",
    });
    expect(storedAttempt.status).toBe("UNKNOWN_RESULT");
    expect(storedAttempt.commit_certainty).toBe("POSSIBLY_COMMITTED");
    expect(storedAttempt.qbo_je_id).toBeNull();
    expect(applyNotFoundConfirmed).not.toHaveBeenCalled();
  });

  it("24. POSSIBLY_COMMITTED + EXACT_ONE → bind + provider_commit_discovered", async () => {
    const {
      result,
      storedAttempt,
      applyCommitDiscovered,
      lastLedgerEvent,
    } = await runRecovery({
      execStatus: "UNKNOWN_COMMIT",
      commitCertainty: "POSSIBLY_COMMITTED",
      discoveryKind: "EXACT_ONE",
    });
    expect(result.ok && result.boundProviderJournalId).toBe("qbo-42");
    expect(result.ok && result.ledgerEventId).toBe("evt-commit-discovered");
    expect(storedAttempt.qbo_je_id).toBe("qbo-42");
    expect(storedAttempt.status).toBe("DISCOVERED_COMMITTED");
    expect(storedAttempt.commit_certainty).toBe("COMMITTED");
    expect(applyCommitDiscovered).toHaveBeenCalled();
    expect(lastLedgerEvent?.type).toBe(
      "journal_entry.provider_commit_discovered",
    );
    expect(lastLedgerEvent?.payload.qbo_je_id).toBe("qbo-42");
    expect(lastLedgerEvent?.payload.commit_certainty).toBe("COMMITTED");
    expect(lastLedgerEvent?.payload.provider_attempt_id).toBe("att-1");
    expect(lastLedgerEvent?.payload.execution_id).toBe("exec-1");
  });

  it("25. MULTIPLE → no provider id / no commit receipt", async () => {
    const { result, storedAttempt, applyCommitDiscovered } = await runRecovery({
      execStatus: "UNKNOWN_COMMIT",
      commitCertainty: "POSSIBLY_COMMITTED",
      discoveryKind: "MULTIPLE",
    });
    expect(result.ok && result.boundProviderJournalId).toBeNull();
    expect(storedAttempt.qbo_je_id).toBeNull();
    expect(storedAttempt.status).toBe("UNKNOWN_RESULT");
    expect(applyCommitDiscovered).not.toHaveBeenCalled();
  });
});
