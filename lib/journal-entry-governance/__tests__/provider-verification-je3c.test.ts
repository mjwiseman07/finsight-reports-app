/**
 * JE-3C — Exact QBO JournalEntry read-back verification tests.
 * Hard-disabled gate, binding checks, ClassRef/multiset economics,
 * inconclusive reads, mismatch/verified conclusions, no POST/Memory.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { EngagementActor } from "@/lib/audit-ready/server-auth";
import {
  JE_3C_FEATURE_GATE,
  assertJe3cVerificationEnabled,
  assertJe3cMemoryWriteNotEnabled,
} from "../je3c-feature-gate";
import {
  JE_MEMORY_PROJECTION_CONTRACT,
  buildVerifiedJeMemoryProjectionDraft,
} from "../memory-projection-contract";
import { verifyGovernedJournalEntry } from "../provider-verification-service";
import {
  compareProviderJeEconomics,
  hashNormalizedProviderJe,
  normalizeQboJournalEntry,
  privateNoteContainsExactCorrelationMarker,
  providerJeMatchesExpectedEconomics,
} from "../provider-je-normalize";
import { mapGovernedProposalToQboPayload } from "../execution-payload";
import { hashProviderRequestPreview } from "../execution-hash";
import { JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY } from "../execution-types";
import type { JournalEntryExecutionRow } from "../execution-types";
import type { JournalEntryProposalRow } from "../types";
import type { JournalEntryProviderAttemptRow } from "../provider-attempt-types";
import { patchJournalEntryProviderAttempt } from "../provider-attempt-repository";
import {
  isJe3b1DbTransitionAuthorized,
  isJe3cDbTransitionAuthorized,
  JE_3C_DB_TRANSITION_EVENT_MATRIX,
} from "../execution-state";
import type { GovernedJeVerificationDeps } from "../provider-verification-orchestration";
import { runJe3cVerificationForTests } from "./helpers/je3c-verification-test-runner";
import * as packageIndex from "../index";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260822050000_journal_entry_verified_readback.sql",
);

const HASH = "a".repeat(64);
const USER = "user-1";
const MARKER = "ADVJE:exec-1";

function writeActor(): EngagementActor {
  return {
    userId: USER,
    canRead: true,
    canWrite: true,
    scope: "company",
  };
}

function proposal(over: Partial<JournalEntryProposalRow> = {}): JournalEntryProposalRow {
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
        classId: "class-1",
      },
      {
        sequence: 2,
        accountId: "acct-cr",
        debitCents: 0,
        creditCents: 10050,
        description: "Accrued rent",
        classId: "class-1",
      },
    ],
    total_debits_cents: 10050,
    total_credits_cents: 10050,
    expected_effects: [],
    policy_snapshot: {},
    policy_hash: HASH,
    proposal_hash: HASH,
    status: "SUBMITTED",
    proposed_by: USER,
    proposed_at: "2026-08-15T00:00:00.000Z",
    idempotency_key: HASH,
    ...over,
  };
}

function alignedHash(p: JournalEntryProposalRow, marker = MARKER) {
  return hashProviderRequestPreview(
    mapGovernedProposalToQboPayload({
      proposal: p,
      correlationMarker: marker,
    }) as unknown as Record<string, unknown>,
  );
}

function execution(
  over: Partial<JournalEntryExecutionRow> = {},
): JournalEntryExecutionRow {
  const p = proposal();
  const provider_request_hash = alignedHash(p);
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
    proposal_hash: HASH,
    approval_policy_hash: HASH,
    execution_policy_hash: HASH,
    execution_hash: HASH,
    idempotency_key: HASH,
    status: "POSTED_UNVERIFIED",
    correlation_marker: MARKER,
    execution_policy_snapshot: {},
    preflight_result: { eligible: true, checks: [] },
    requested_by: USER,
    requested_at: "2026-08-15T00:00:00.000Z",
    state_version: 4,
    provider_journal_id: "99",
    provider_request_hash,
    provider_response_hash: "b".repeat(64),
    provider_readback_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...over,
  };
}

function attempt(
  over: Partial<JournalEntryProviderAttemptRow> = {},
): JournalEntryProviderAttemptRow {
  const exec = execution();
  return {
    id: "att-1",
    execution_id: "exec-1",
    accounting_connection_id: "conn-1",
    provider: "quickbooks",
    provider_request_hash: String(exec.provider_request_hash),
    correlation_marker: MARKER,
    status: "RESPONSE_RECEIVED",
    commit_certainty: "COMMITTED",
    request_started_at: "2026-08-15T00:01:00.000Z",
    request_completed_at: "2026-08-15T00:01:01.000Z",
    qbo_je_id: "99",
    intuit_tid: "tid-post",
    provider_response_hash: "b".repeat(64),
    provider_error_code: null,
    provider_error_message: null,
    discovery_summary: {},
    created_at: "2026-08-15T00:00:00.000Z",
    updated_at: "2026-08-15T00:01:01.000Z",
    ...over,
  };
}

function matchingQboRaw(over: Record<string, unknown> = {}) {
  return {
    Id: "99",
    TxnDate: "2026-08-15",
    PrivateNote: `Accrue rent | ${MARKER}`,
    CurrencyRef: { value: "USD" },
    Line: [
      {
        DetailType: "JournalEntryLineDetail",
        Amount: 100.5,
        Description: "Rent expense",
        JournalEntryLineDetail: {
          PostingType: "Debit",
          AccountRef: { value: "acct-dr" },
          ClassRef: { value: "class-1" },
        },
      },
      {
        DetailType: "JournalEntryLineDetail",
        Amount: 100.5,
        Description: "Accrued rent",
        JournalEntryLineDetail: {
          PostingType: "Credit",
          AccountRef: { value: "acct-cr" },
          ClassRef: { value: "class-1" },
        },
      },
    ],
    SyncToken: "7",
    MetaData: { CreateTime: "2026-08-15T00:00:00Z" },
    ...over,
  };
}

function baseDeps(
  over: Partial<GovernedJeVerificationDeps> = {},
): GovernedJeVerificationDeps {
  return {
    resolveActor: vi.fn(async () => writeActor()),
    loadExecution: vi.fn(async () => execution()),
    loadProposal: vi.fn(async () => proposal()),
    loadAttempt: vi.fn(async () => attempt()),
    loadFirmId: vi.fn(async () => "firm-1"),
    revalidateConnection: vi.fn(async () => ({ ok: true as const })),
    resolveToken: vi.fn(async () => ({
      accessToken: "tok",
      realmId: "realm-1",
      connectionId: "conn-1",
    })),
    confirmRealmBelongsToConnection: vi.fn(async () => ({ ok: true as const })),
    readById: vi.fn(async () => {
      throw new Error("readById must be overridden");
    }),
    applyVerified: vi.fn(async () => ({
      attempt: attempt({ status: "VERIFIED_PROVIDER_ID" }),
      execution: execution({
        status: "VERIFIED",
        provider_readback_hash: "c".repeat(64),
      }),
      ledgerEventId: "evt-verified",
    })),
    applyMismatch: vi.fn(async () => ({
      attempt: attempt(),
      execution: execution({ status: "VERIFICATION_MISMATCH" }),
      ledgerEventId: "evt-mismatch",
    })),
    ...over,
  };
}

describe("JE-3C migration contracts", () => {
  const src = readFileSync(MIGRATION, "utf8");

  it("adds verified + mismatch RPCs and status vocabulary", () => {
    expect(src).toContain("apply_journal_entry_verified");
    expect(src).toContain("apply_journal_entry_verification_mismatch");
    expect(src).toContain("journal_entry.verified");
    expect(src).toContain("journal_entry.verification_mismatch");
    expect(src).toContain("VERIFICATION_MISMATCH");
    expect(src).toContain("provider_readback_hash");
    expect(src).toContain("VERIFIED_PROVIDER_ID");
  });

  it("locks RPCs to service_role only", () => {
    const normalized = src.replace(/\r\n/g, "\n");
    for (const name of [
      "apply_journal_entry_verified",
      "apply_journal_entry_verification_mismatch",
    ]) {
      expect(normalized).toContain(
        `REVOKE ALL ON FUNCTION public.${name}(\n  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text\n) FROM PUBLIC`,
      );
      expect(normalized).toContain(
        `GRANT EXECUTE ON FUNCTION public.${name}(\n  uuid, text, integer, uuid, text, text, jsonb, jsonb, jsonb, text, uuid, uuid, uuid, text, text\n) TO service_role`,
      );
    }
  });

  it("does not enable Memory / live GET / create / GOVERNED_AUTO", () => {
    expect(src).toMatch(/Does NOT enable production verification/i);
    expect(src).toMatch(/Memory/i);
    expect(src).not.toContain("qboJournalEntryPoster");
  });

  it("binds Patent #6 engagement/firm_client scope to locked execution custody", () => {
    expect(src).toContain(
      "je_provider_verified engagement_id scope mismatch",
    );
    expect(src).toContain(
      "je_provider_verified firm_client_id scope mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch engagement_id scope mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch firm_client_id scope mismatch",
    );
    expect(src).toContain(
      "je_provider_verified payload engagement_id mismatch",
    );
    expect(src).toContain(
      "je_provider_verified payload firm_client_id mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch payload engagement_id mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch payload firm_client_id mismatch",
    );
    // Publish uses locked execution scope, not unchecked caller params.
    expect(src).toMatch(
      /publish_ledger_event\(\s*'journal_entry\.verified'[\s\S]*?v_execution\.firm_client_id,\s*v_execution\.engagement_id/,
    );
    expect(src).toMatch(
      /publish_ledger_event\(\s*'journal_entry\.verification_mismatch'[\s\S]*?v_execution\.firm_client_id,\s*v_execution\.engagement_id/,
    );
  });

  it("mismatch requires governed readback hash + provider_journal_id + attempt↔execution bindings", () => {
    expect(src).toContain(
      "je_provider_verification_mismatch_readback_hash_required",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch payload provider_readback_hash mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch payload provider_journal_id mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch attempt/execution accounting_connection_id mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch attempt/execution provider_request_hash mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch attempt/execution correlation_marker mismatch",
    );
    expect(src).toContain(
      "je_provider_verification_mismatch attempt/execution provider_journal_id mismatch",
    );
    // Strong v1: mismatch hash must be valid lowercase SHA-256 before lock.
    const mismatchFn = src.slice(
      src.indexOf(
        "CREATE OR REPLACE FUNCTION public.apply_journal_entry_verification_mismatch",
      ),
      src.indexOf(
        "COMMENT ON FUNCTION public.apply_journal_entry_verification_mismatch",
      ),
    );
    expect(mismatchFn).toContain("v_hash !~ '^[a-f0-9]{64}$'");
    expect(
      mismatchFn.indexOf(
        "je_provider_verification_mismatch_readback_hash_required",
      ),
    ).toBeLessThan(mismatchFn.indexOf("FOR UPDATE"));
  });
});

describe("JE-3C hard-disable gate + public surface", () => {
  it("feature gate constants are all false", () => {
    expect(JE_3C_FEATURE_GATE.verificationEnabled).toBe(false);
    expect(JE_3C_FEATURE_GATE.allowLiveQboGet).toBe(false);
    expect(JE_3C_FEATURE_GATE.allowMemoryWrite).toBe(false);
    expect(JE_3C_FEATURE_GATE.allowWorker).toBe(false);
    expect(JE_3C_FEATURE_GATE.allowGovernedAuto).toBe(false);
    expect(JE_GOVERNED_EXECUTION_FEATURE_BOUNDARY.je3cVerificationEnabled).toBe(
      false,
    );
  });

  it("public entry throws hard-disabled", async () => {
    await expect(
      verifyGovernedJournalEntry(
        { executionId: "exec-1" },
        { principal: { type: "user", userId: USER } },
      ),
    ).rejects.toMatchObject({ code: "je_3c_verification_disabled" });
    expect(() => assertJe3cVerificationEnabled()).toThrow(/hard-disabled/i);
    expect(() => assertJe3cMemoryWriteNotEnabled()).toThrow(/Memory/i);
  });

  it("package index exports verify entry but not RPCs/orchestration", () => {
    const exported = Object.keys(packageIndex);
    expect(exported).toContain("verifyGovernedJournalEntry");
    expect(exported).toContain("JE_3C_FEATURE_GATE");
    expect(exported).not.toContain("runGovernedJournalEntryVerification");
    expect(exported).not.toContain("applyJournalEntryVerified");
    expect(exported).not.toContain("applyJournalEntryVerificationMismatch");
  });

  it("JE-3C matrix authorizes verified/mismatch; JE-3B1 does not", () => {
    expect(isJe3cDbTransitionAuthorized("POSTED_UNVERIFIED", "VERIFIED")).toBe(
      true,
    );
    expect(
      isJe3cDbTransitionAuthorized("POSTED_UNVERIFIED", "VERIFICATION_MISMATCH"),
    ).toBe(true);
    expect(isJe3b1DbTransitionAuthorized("POSTED_UNVERIFIED", "VERIFIED")).toBe(
      false,
    );
    expect(JE_3C_DB_TRANSITION_EVENT_MATRIX).toHaveLength(2);
  });
});

describe("JE-3C economic equality + ClassRef + order independence", () => {
  it("matches with ClassRef and ignores line order", () => {
    const raw = matchingQboRaw({
      Line: [
        matchingQboRaw().Line[1],
        matchingQboRaw().Line[0],
      ],
    });
    const candidate = normalizeQboJournalEntry(raw as Record<string, unknown>);
    expect(candidate.lines[0]?.classId).toBe("class-1");
    const preview = mapGovernedProposalToQboPayload({
      proposal: proposal(),
      correlationMarker: MARKER,
    });
    const expected = {
      txnDate: preview.TxnDate,
      currency: preview.currency,
      lines: preview.Line.map((line) => ({
        accountId: line.AccountRef.value,
        debitCents:
          line.posting_type === "Debit"
            ? Math.round(Number(line.Amount.toFixed(2)) * 100)
            : 0,
        creditCents:
          line.posting_type === "Credit"
            ? Math.round(Number(line.Amount.toFixed(2)) * 100)
            : 0,
        classId: line.ClassRef?.value ?? null,
      })),
      totalDebitsCents: preview.domain_total_debits_cents,
      totalCreditsCents: preview.domain_total_credits_cents,
    };
    expect(compareProviderJeEconomics({ candidate, expected }).ok).toBe(true);
    expect(providerJeMatchesExpectedEconomics({ candidate, expected })).toBe(
      true,
    );
  });

  it("detects class and duplicate multiplicity mismatches", () => {
    const candidate = normalizeQboJournalEntry(
      matchingQboRaw({
        Line: [
          {
            DetailType: "JournalEntryLineDetail",
            Amount: 50.25,
            JournalEntryLineDetail: {
              PostingType: "Debit",
              AccountRef: { value: "acct-dr" },
              ClassRef: { value: "class-WRONG" },
            },
          },
          {
            DetailType: "JournalEntryLineDetail",
            Amount: 50.25,
            JournalEntryLineDetail: {
              PostingType: "Debit",
              AccountRef: { value: "acct-dr" },
              ClassRef: { value: "class-1" },
            },
          },
          {
            DetailType: "JournalEntryLineDetail",
            Amount: 100.5,
            JournalEntryLineDetail: {
              PostingType: "Credit",
              AccountRef: { value: "acct-cr" },
              ClassRef: { value: "class-1" },
            },
          },
        ],
      }) as Record<string, unknown>,
    );
    const result = compareProviderJeEconomics({
      candidate,
      expected: {
        txnDate: "2026-08-15",
        currency: "USD",
        lines: [
          {
            accountId: "acct-dr",
            debitCents: 10050,
            creditCents: 0,
            classId: "class-1",
          },
          {
            accountId: "acct-cr",
            debitCents: 0,
            creditCents: 10050,
            classId: "class-1",
          },
        ],
        totalDebitsCents: 10050,
        totalCreditsCents: 10050,
      },
    });
    expect(result.ok).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
  });

  it("boundary-safe marker matching rejects substring collisions", () => {
    expect(
      privateNoteContainsExactCorrelationMarker(
        `memo | ${MARKER}`,
        MARKER,
      ),
    ).toBe(true);
    expect(
      privateNoteContainsExactCorrelationMarker(
        `memo | ${MARKER}EXTRA`,
        MARKER,
      ),
    ).toBe(false);
  });

  it("normalized hash excludes SyncToken / MetaData authority", () => {
    const a = normalizeQboJournalEntry(
      matchingQboRaw({ SyncToken: "1" }) as Record<string, unknown>,
    );
    const b = normalizeQboJournalEntry(
      matchingQboRaw({ SyncToken: "99", MetaData: { CreateTime: "x" } }) as Record<
        string,
        unknown
      >,
    );
    expect(hashNormalizedProviderJe(a)).toBe(hashNormalizedProviderJe(b));
  });
});

describe("JE-3C verification orchestration", () => {
  it("success path: exact GET → VERIFIED; memoryWritten=false; discovery unused", async () => {
    const normalized = normalizeQboJournalEntry(
      matchingQboRaw() as Record<string, unknown>,
    );
    const readById = vi.fn(async () => ({
      outcome: "FOUND" as const,
      found: true,
      normalized,
      providerResponseHash: hashNormalizedProviderJe(normalized),
      intuitTid: "tid-get",
      httpStatus: 200,
    }));
    const applyVerified = vi.fn(async (input) => ({
      attempt: attempt({ status: "VERIFIED_PROVIDER_ID" }),
      execution: execution({
        status: "VERIFIED",
        provider_readback_hash: input.providerReadbackHash,
        verification_ledger_event_id: "evt-verified",
      }),
      ledgerEventId: "evt-verified",
    }));

    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({ readById, applyVerified }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.conclusion !== "VERIFIED") return;
    expect(readById).toHaveBeenCalledTimes(1);
    expect(readById).toHaveBeenCalledWith(
      expect.objectContaining({ qboJeId: "99" }),
    );
    expect(applyVerified).toHaveBeenCalledTimes(1);
    expect(r.memoryWritten).toBe(false);
    expect(r.discoveryUsed).toBe(false);
    expect(r.getIssued).toBe(true);
    expect(applyVerified).toHaveBeenCalledWith(
      expect.objectContaining({
        eventPayload: expect.objectContaining({
          provider_readback_hash: hashNormalizedProviderJe(normalized),
          engagement_id: "eng-1",
          firm_client_id: "fc-1",
          provider_journal_id: "99",
        }),
        providerReadbackHash: hashNormalizedProviderJe(normalized),
        engagementId: "eng-1",
        firmClientId: "fc-1",
      }),
    );
    expect(hashNormalizedProviderJe(normalized)).not.toBe("b".repeat(64));
  });

  it("class mismatch → VERIFICATION_MISMATCH; no POST", async () => {
    const bad = normalizeQboJournalEntry(
      matchingQboRaw({
        Line: [
          {
            DetailType: "JournalEntryLineDetail",
            Amount: 100.5,
            JournalEntryLineDetail: {
              PostingType: "Debit",
              AccountRef: { value: "acct-dr" },
              ClassRef: { value: "class-OTHER" },
            },
          },
          matchingQboRaw().Line[1],
        ],
      }) as Record<string, unknown>,
    );
    const applyMismatch = vi.fn(async () => ({
      attempt: attempt(),
      execution: execution({ status: "VERIFICATION_MISMATCH" }),
      ledgerEventId: "evt-mismatch",
    }));
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        readById: vi.fn(async () => ({
          outcome: "FOUND" as const,
          found: true,
          normalized: bad,
          providerResponseHash: hashNormalizedProviderJe(bad),
          intuitTid: null,
          httpStatus: 200,
        })),
        applyMismatch,
        applyVerified: vi.fn(async () => {
          throw new Error("must not verify");
        }),
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.conclusion !== "VERIFICATION_MISMATCH") return;
    expect(applyMismatch).toHaveBeenCalledTimes(1);
    expect(r.mismatches).toContain("class");
  });

  it.each([
    ["NOT_FOUND", 404],
    ["READ_FAILED", 401],
    ["READ_FAILED", 429],
    ["READ_FAILED", 500],
  ] as const)(
    "%s HTTP %s stays inconclusive (POSTED_UNVERIFIED)",
    async (outcome, httpStatus) => {
      const applyVerified = vi.fn();
      const applyMismatch = vi.fn();
      const r = await runJe3cVerificationForTests(
        { executionId: "exec-1" },
        { principal: { type: "user", userId: USER } },
        baseDeps({
          readById: vi.fn(async () => ({
            outcome,
            found: false,
            normalized: null,
            providerResponseHash: null,
            intuitTid: null,
            httpStatus,
            errorClass: "SERVER_ERROR" as const,
          })),
          applyVerified,
          applyMismatch,
        }),
      );
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.conclusion).toBe("INCONCLUSIVE");
      expect(r.getIssued).toBe(true);
      expect(applyVerified).not.toHaveBeenCalled();
      expect(applyMismatch).not.toHaveBeenCalled();
    },
  );

  it("network/malformed GET → inconclusive; custody unchanged", async () => {
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        readById: vi.fn(async () => ({
          outcome: "READ_FAILED" as const,
          found: false,
          normalized: null,
          providerResponseHash: null,
          intuitTid: null,
          httpStatus: 0,
          errorClass: "NETWORK_UNCERTAIN" as const,
          reason: "network",
        })),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("INCONCLUSIVE");
  });

  it("token failure before GET → inconclusive; getIssued=false", async () => {
    const readById = vi.fn();
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        resolveToken: vi.fn(async () => null),
        readById,
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("INCONCLUSIVE");
    expect(r.getIssued).toBe(false);
    expect(readById).not.toHaveBeenCalled();
  });

  it("crash after GET (applyVerified fails) → inconclusive; safe retry", async () => {
    const normalized = normalizeQboJournalEntry(
      matchingQboRaw() as Record<string, unknown>,
    );
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        readById: vi.fn(async () => ({
          outcome: "FOUND" as const,
          found: true,
          normalized,
          providerResponseHash: hashNormalizedProviderJe(normalized),
          intuitTid: "tid",
          httpStatus: 200,
        })),
        applyVerified: vi.fn(async () => {
          throw new Error("publish_ledger_event failed");
        }),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("INCONCLUSIVE");
    expect(r.getIssued).toBe(true);
    expect(r.message).toMatch(/POSTED_UNVERIFIED/i);
  });

  it("concurrent/stale version reject without conclusion", async () => {
    const normalized = normalizeQboJournalEntry(
      matchingQboRaw() as Record<string, unknown>,
    );
    const { JeProviderAttemptPersistError } = await import(
      "../provider-attempt-repository"
    );
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        readById: vi.fn(async () => ({
          outcome: "FOUND" as const,
          found: true,
          normalized,
          providerResponseHash: hashNormalizedProviderJe(normalized),
          intuitTid: null,
          httpStatus: 200,
        })),
        applyVerified: vi.fn(async () => {
          throw new JeProviderAttemptPersistError(
            "je_execution_concurrency_conflict",
            "journal_entry_execution state_version concurrency conflict during verified",
          );
        }),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("INCONCLUSIVE");
  });

  it("duplicate identical verification after VERIFIED returns existing result", async () => {
    const readById = vi.fn();
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        loadExecution: vi.fn(async () =>
          execution({
            status: "VERIFIED",
            provider_readback_hash: "c".repeat(64),
            verification_ledger_event_id: "evt-verified",
          }),
        ),
        loadAttempt: vi.fn(async () =>
          attempt({ status: "VERIFIED_PROVIDER_ID" }),
        ),
        readById,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok || r.conclusion !== "ALREADY_VERIFIED") return;
    expect(readById).not.toHaveBeenCalled();
    expect(r.ledgerEventId).toBe("evt-verified");
    expect(r.providerReadbackHash).toBe("c".repeat(64));
  });

  it("ALREADY_VERIFIED fails closed when readback hash missing", async () => {
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        loadExecution: vi.fn(async () =>
          execution({
            status: "VERIFIED",
            provider_readback_hash: null,
            verification_ledger_event_id: "evt-verified",
          }),
        ),
        loadAttempt: vi.fn(async () =>
          attempt({ status: "VERIFIED_PROVIDER_ID" }),
        ),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("REJECTED");
    expect(r.code).toBe("je_verification_already_verified_readback_hash_invalid");
  });

  it("ALREADY_VERIFIED fails closed when readback hash malformed", async () => {
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        loadExecution: vi.fn(async () =>
          execution({
            status: "VERIFIED",
            provider_readback_hash: "not-a-sha256",
            verification_ledger_event_id: "evt-verified",
          }),
        ),
        loadAttempt: vi.fn(async () =>
          attempt({ status: "VERIFIED_PROVIDER_ID" }),
        ),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("REJECTED");
    expect(r.code).toBe("je_verification_already_verified_readback_hash_invalid");
  });

  it("ALREADY_VERIFIED fails closed when verification receipt ID missing", async () => {
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        loadExecution: vi.fn(async () =>
          execution({
            status: "VERIFIED",
            provider_readback_hash: "c".repeat(64),
            verification_ledger_event_id: null,
          }),
        ),
        loadAttempt: vi.fn(async () =>
          attempt({ status: "VERIFIED_PROVIDER_ID" }),
        ),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("REJECTED");
    expect(r.code).toBe("je_verification_already_verified_receipt_missing");
  });

  it("mismatch path includes exact scope + provider_journal_id in receipt payload", async () => {
    const bad = normalizeQboJournalEntry(
      matchingQboRaw({
        Line: [
          {
            DetailType: "JournalEntryLineDetail",
            Amount: 100.5,
            JournalEntryLineDetail: {
              PostingType: "Debit",
              AccountRef: { value: "acct-dr" },
              ClassRef: { value: "class-OTHER" },
            },
          },
          matchingQboRaw().Line[1],
        ],
      }) as Record<string, unknown>,
    );
    const applyMismatch = vi.fn(async () => ({
      attempt: attempt(),
      execution: execution({ status: "VERIFICATION_MISMATCH" }),
      ledgerEventId: "evt-mismatch",
    }));
    await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        readById: vi.fn(async () => ({
          outcome: "FOUND" as const,
          found: true,
          normalized: bad,
          providerResponseHash: hashNormalizedProviderJe(bad),
          intuitTid: null,
          httpStatus: 200,
        })),
        applyMismatch,
      }),
    );
    expect(applyMismatch).toHaveBeenCalledWith(
      expect.objectContaining({
        engagementId: "eng-1",
        firmClientId: "fc-1",
        providerReadbackHash: hashNormalizedProviderJe(bad),
        eventPayload: expect.objectContaining({
          engagement_id: "eng-1",
          firm_client_id: "fc-1",
          provider_journal_id: "99",
          provider_readback_hash: hashNormalizedProviderJe(bad),
          status: "VERIFICATION_MISMATCH",
        }),
        verificationMetadata: expect.objectContaining({
          observed_provider_id: "99",
        }),
      }),
    );
  });

  it("conflicting bindings on already VERIFIED fail closed", async () => {
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        loadExecution: vi.fn(async () =>
          execution({ status: "VERIFIED", provider_journal_id: "99" }),
        ),
        loadAttempt: vi.fn(async () =>
          attempt({ status: "VERIFIED_PROVIDER_ID", qbo_je_id: "OTHER" }),
        ),
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("REJECTED");
  });

  it("binding mismatch before GET refuses", async () => {
    const readById = vi.fn();
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        loadAttempt: vi.fn(async () =>
          attempt({ accounting_connection_id: "conn-OTHER" }),
        ),
        readById,
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("REJECTED");
    expect(readById).not.toHaveBeenCalled();
  });

  it("realm confirmation failure is inconclusive", async () => {
    const readById = vi.fn();
    const r = await runJe3cVerificationForTests(
      { executionId: "exec-1" },
      { principal: { type: "user", userId: USER } },
      baseDeps({
        confirmRealmBelongsToConnection: vi.fn(async () => ({
          ok: false as const,
          code: "je_provider_attempt_connection_unusable",
          message: "realm mismatch",
        })),
        readById,
      }),
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.conclusion).toBe("INCONCLUSIVE");
    expect(readById).not.toHaveBeenCalled();
  });
});

describe("JE-3C generic mutation blocks + Memory contract", () => {
  it("blocks VERIFIED_PROVIDER_ID and verification hash fields via generic patch", async () => {
    await expect(
      patchJournalEntryProviderAttempt({
        attemptId: "att-1",
        expectedStatus: "RESPONSE_RECEIVED",
        patch: { status: "VERIFIED_PROVIDER_ID" },
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/dedicated receipted RPC/i),
    });
    await expect(
      patchJournalEntryProviderAttempt({
        attemptId: "att-1",
        expectedStatus: "RESPONSE_RECEIVED",
        patch: { provider_readback_hash: "c".repeat(64) },
      }),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/verification fields/i),
    });
  });

  it("documents VERIFIED-only Memory; JE-3C writes false; uses readback hash", () => {
    expect(JE_MEMORY_PROJECTION_CONTRACT.je3cWritesMemory).toBe(false);
    expect(JE_MEMORY_PROJECTION_CONTRACT.requiredExecutionStatus).toBe(
      "VERIFIED",
    );
    expect(JE_MEMORY_PROJECTION_CONTRACT.requiredReferences).toContain(
      "provider_readback_hash",
    );
    const draft = buildVerifiedJeMemoryProjectionDraft({
      executionId: "exec-1",
      providerJournalId: "99",
      providerReadbackHash: HASH,
      ledgerReceiptId: "evt-1",
      firmClientId: "fc-1",
    });
    expect(draft.payload.provider_readback_hash).toBe(HASH);
    expect(draft.payload).not.toHaveProperty("provider_response_hash");
  });
});

describe("JE-3C source gates", () => {
  it("verification modules never POST, poster, Memory, worker, GOVERNED_AUTO", () => {
    const files = [
      "lib/journal-entry-governance/provider-verification-service.ts",
      "lib/journal-entry-governance/provider-verification-orchestration.ts",
      "lib/journal-entry-governance/provider-verification-repository.ts",
      "lib/journal-entry-governance/je3c-feature-gate.ts",
    ];
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), "utf8");
      expect(src).not.toMatch(/qboJournalEntryPoster/);
      expect(src).not.toMatch(/recordMemory/);
      expect(src).not.toMatch(/method:\s*["']POST["']/);
      expect(src).not.toMatch(/GOVERNED_AUTO/);
      expect(src).not.toMatch(/bypassGateForTests/);
      expect(src).not.toMatch(/findJournalEntryByCorrelationMarker/);
    }
  });
});
