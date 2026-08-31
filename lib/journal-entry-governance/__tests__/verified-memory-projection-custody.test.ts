import { describe, expect, it } from "vitest";
import type { JournalEntryExecutionRow } from "../execution-types";
import {
  assertVerifiedJeMemoryProjectionCustody,
  VerifiedJeProjectionError,
  type VerificationLedgerEventCustody,
} from "../verified-memory-projection-custody";

function verifiedExecution(
  overrides: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  return {
    id: "exec-1",
    proposal_id: "prop-1",
    approval_id: "appr-1",
    company_id: "company-1",
    engagement_id: "eng-1",
    firm_client_id: "fc-1",
    source_continuous_close_run_id: "cc-1",
    source_accounting_sync_id: "sync-1",
    accounting_connection_id: "connection-1",
    provider: "quickbooks",
    proposal_hash: "a".repeat(64),
    approval_policy_hash: "b".repeat(64),
    execution_policy_hash: "c".repeat(64),
    execution_hash: "d".repeat(64),
    idempotency_key: "e".repeat(64),
    status: "VERIFIED",
    correlation_marker: "ADVJE:exec-1",
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: "user-1",
    requested_at: "2026-08-30T00:00:00.000Z",
    state_version: 3,
    provider_journal_id: "223",
    provider_request_hash: "f".repeat(64),
    provider_response_hash: "g".repeat(64),
    provider_readback_hash: "readback-hash",
    verification_snapshot: {
      txnDate: "2026-08-30",
      currency: "USD",
      totalDebitsCents: 100,
      totalCreditsCents: 100,
      providerJournalId: "223",
    },
    verification_ledger_event_id: "receipt-1",
    verified_at: "2026-08-30T12:00:00.000Z",
    last_error_code: null,
    last_error_message: null,
    ...overrides,
  };
}

function matchingReceipt(
  overrides: Partial<VerificationLedgerEventCustody> = {},
): VerificationLedgerEventCustody {
  return {
    event_id: "receipt-1",
    event_type: "journal_entry.verified",
    event_hash: "event-hash-1",
    previous_event_hash: "prior-hash-1",
    chain_index: 2,
    firm_client_id: "fc-1",
    engagement_id: "eng-1",
    aggregate_type: "journal_entry_execution",
    aggregate_id: "exec-1",
    event_payload: {
      execution_id: "exec-1",
      accounting_connection_id: "connection-1",
      company_id: "company-1",
      firm_client_id: "fc-1",
      engagement_id: "eng-1",
      provider: "quickbooks",
      provider_journal_id: "223",
      provider_readback_hash: "readback-hash",
      status: "VERIFIED",
    },
    ...overrides,
  };
}

const prior = { event_id: "prior-1", event_hash: "prior-hash-1" };

describe("verified JE Memory projection custody binding", () => {
  it("accepts exact VERIFIED execution bound to Patent #6 receipt and chain", () => {
    const custody = assertVerifiedJeMemoryProjectionCustody({
      execution: verifiedExecution(),
      receipt: matchingReceipt(),
      priorEventByPreviousHash: prior,
    });
    expect(custody).toMatchObject({
      firmClientId: "fc-1",
      providerJournalId: "223",
      providerReadbackHash: "readback-hash",
      verificationLedgerEventId: "receipt-1",
      verificationEventHash: "event-hash-1",
      transactionDate: "2026-08-30",
      currency: "USD",
      totalDebitsCents: 100,
      totalCreditsCents: 100,
    });
  });

  it("blocks missing or mismatched custody before any Memory authority", () => {
    const cases: Array<{
      name: string;
      execution?: JournalEntryExecutionRow;
      receipt?: VerificationLedgerEventCustody;
      priorEventByPreviousHash?: { event_id: string; event_hash: string } | null;
      code: string;
    }> = [
      {
        name: "not verified",
        execution: verifiedExecution({ status: "POSTED_UNVERIFIED" }),
        code: "memory_projection_requires_verified",
      },
      {
        name: "missing lineage",
        execution: verifiedExecution({ provider_readback_hash: null }),
        code: "memory_projection_lineage_incomplete",
      },
      {
        name: "receipt id mismatch",
        receipt: matchingReceipt({ event_id: "other-receipt" }),
        code: "memory_projection_receipt_id_mismatch",
      },
      {
        name: "wrong event type",
        receipt: matchingReceipt({ event_type: "journal_entry.posted" }),
        code: "memory_projection_receipt_type_invalid",
      },
      {
        name: "connection mismatch",
        receipt: matchingReceipt({
          event_payload: {
            ...matchingReceipt().event_payload,
            accounting_connection_id: "other-connection",
          },
        }),
        code: "memory_projection_receipt_connection_mismatch",
      },
      {
        name: "provider id mismatch",
        receipt: matchingReceipt({
          event_payload: {
            ...matchingReceipt().event_payload,
            provider_journal_id: "999",
          },
        }),
        code: "memory_projection_receipt_provider_id_mismatch",
      },
      {
        name: "readback mismatch",
        receipt: matchingReceipt({
          event_payload: {
            ...matchingReceipt().event_payload,
            provider_readback_hash: "other-hash",
          },
        }),
        code: "memory_projection_receipt_readback_mismatch",
      },
      {
        name: "broken chain link",
        priorEventByPreviousHash: null,
        code: "memory_projection_chain_link_invalid",
      },
      {
        name: "company mismatch",
        receipt: matchingReceipt({
          event_payload: {
            ...matchingReceipt().event_payload,
            company_id: "other-company",
          },
        }),
        code: "memory_projection_receipt_company_mismatch",
      },
      {
        name: "engagement mismatch",
        receipt: matchingReceipt({
          event_payload: {
            ...matchingReceipt().event_payload,
            engagement_id: "other-eng",
          },
        }),
        code: "memory_projection_receipt_engagement_mismatch",
      },
      {
        name: "aggregate mismatch",
        receipt: matchingReceipt({ aggregate_id: "other-exec" }),
        code: "memory_projection_receipt_aggregate_mismatch",
      },
      {
        name: "missing chain hash",
        receipt: matchingReceipt({ event_hash: null }),
        code: "memory_projection_chain_hash_missing",
      },
      {
        name: "unbalanced snapshot",
        execution: verifiedExecution({
          verification_snapshot: {
            txnDate: "2026-08-30",
            currency: "USD",
            totalDebitsCents: 100,
            totalCreditsCents: 50,
          },
        }),
        code: "memory_projection_economics_invalid",
      },
    ];

    for (const testCase of cases) {
      expect(
        () =>
          assertVerifiedJeMemoryProjectionCustody({
            execution: testCase.execution ?? verifiedExecution(),
            receipt: testCase.receipt ?? matchingReceipt(),
            priorEventByPreviousHash:
              testCase.priorEventByPreviousHash === undefined
                ? prior
                : testCase.priorEventByPreviousHash,
          }),
        testCase.name,
      ).toThrow(VerifiedJeProjectionError);
      try {
        assertVerifiedJeMemoryProjectionCustody({
          execution: testCase.execution ?? verifiedExecution(),
          receipt: testCase.receipt ?? matchingReceipt(),
          priorEventByPreviousHash:
            testCase.priorEventByPreviousHash === undefined
              ? prior
              : testCase.priorEventByPreviousHash,
        });
      } catch (error) {
        expect(error, testCase.name).toMatchObject({ code: testCase.code });
      }
    }
  });
});
