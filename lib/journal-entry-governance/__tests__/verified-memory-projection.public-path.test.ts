/**
 * Test-runner module mocks only. Does not mutate checked-in production policy
 * objects and does not import any production-exported projection harness.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalEntryExecutionRow } from "../execution-types";

const {
  loadExactExecutionMock,
  recordMemoryMock,
  getSupabaseAdminMock,
  ledgerById,
  ledgerByHash,
} = vi.hoisted(() => {
  const ledgerById = vi.fn();
  const ledgerByHash = vi.fn();
  return {
    loadExactExecutionMock: vi.fn(),
    recordMemoryMock: vi.fn(),
    getSupabaseAdminMock: vi.fn(() => ({
      from: (table: string) => {
        if (table !== "ledger_events") {
          throw new Error(`unexpected table ${table}`);
        }
        return {
          select: () => ({
            eq: (column: string, value: string) => ({
              maybeSingle: async () => {
                if (column === "event_id") return ledgerById(value);
                if (column === "event_hash") return ledgerByHash(value);
                throw new Error(`unexpected eq ${column}`);
              },
            }),
          }),
        };
      },
    })),
    ledgerById,
    ledgerByHash,
  };
});

vi.mock("../production-activation-policy", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../production-activation-policy")>();
  const enabled = Object.freeze({
    ...actual.PRODUCTION_JE_ACTIVATION_POLICY,
    capabilities: Object.freeze({
      ...actual.PRODUCTION_JE_ACTIVATION_POLICY.capabilities,
    }),
    memoryProjectionAllowed: true,
    pilotIdentity: null,
  });
  return {
    ...actual,
    PRODUCTION_JE_ACTIVATION_POLICY: enabled,
  };
});

vi.mock("../provider-attempt-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../provider-attempt-service")>();
  return {
    ...actual,
    loadExactExecution: loadExactExecutionMock,
  };
});

vi.mock("@/lib/memory/client-memory-service", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/memory/client-memory-service")>();
  return {
    ...actual,
    recordMemory: recordMemoryMock,
  };
});

vi.mock("@/lib/supabase-admin.js", () => ({
  getSupabaseAdmin: getSupabaseAdminMock,
}));

import { projectVerifiedJournalEntryToMemory } from "../verified-memory-projection";

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

const receiptRow = {
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
};

describe("public verified JE Memory projection (mocked enabled policy)", () => {
  beforeEach(() => {
    loadExactExecutionMock.mockReset();
    recordMemoryMock.mockReset();
    ledgerById.mockReset();
    ledgerByHash.mockReset();
    recordMemoryMock.mockResolvedValue({
      memory_id: "m-1",
      persistence_status: "persisted",
    });
  });

  it("loads exact execution and Patent #6 receipt then writes non-authoritative Memory", async () => {
    loadExactExecutionMock.mockResolvedValue(verifiedExecution());
    ledgerById.mockResolvedValue({ data: receiptRow, error: null });
    ledgerByHash.mockResolvedValue({
      data: { event_id: "prior-1", event_hash: "prior-hash-1" },
      error: null,
    });

    await projectVerifiedJournalEntryToMemory({ executionId: "exec-1" });

    expect(loadExactExecutionMock).toHaveBeenCalledWith("exec-1");
    expect(ledgerById).toHaveBeenCalledWith("receipt-1");
    expect(ledgerByHash).toHaveBeenCalledWith("prior-hash-1");
    expect(recordMemoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        memoryKey: "verified_je_exec-1",
        sourceSystem: "patent_6_verified_projection",
        payload: expect.objectContaining({
          authority: "NON_AUTHORITATIVE_MEMORY_PROJECTION",
          provider_success_authority: false,
          rebuild_source: "PATENT_6_CHAIN_RECEIPT",
          verification_ledger_event_id: "receipt-1",
          provider_journal_id: "223",
          provider_readback_hash: "readback-hash",
          total_debits_cents: 100,
          total_credits_cents: 100,
          transaction_date: "2026-08-30",
          currency: "USD",
        }),
      }),
    );
  });

  it("does not write Memory when loaded receipt custody mismatches", async () => {
    loadExactExecutionMock.mockResolvedValue(verifiedExecution());
    ledgerById.mockResolvedValue({
      data: {
        ...receiptRow,
        event_payload: {
          ...receiptRow.event_payload,
          provider_journal_id: "999",
        },
      },
      error: null,
    });
    ledgerByHash.mockResolvedValue({
      data: { event_id: "prior-1", event_hash: "prior-hash-1" },
      error: null,
    });

    await expect(
      projectVerifiedJournalEntryToMemory({ executionId: "exec-1" }),
    ).rejects.toMatchObject({
      code: "memory_projection_receipt_provider_id_mismatch",
    });
    expect(recordMemoryMock).not.toHaveBeenCalled();
  });
});
