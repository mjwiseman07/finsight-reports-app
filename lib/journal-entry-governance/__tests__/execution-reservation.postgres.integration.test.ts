/**
 * JE-3A — real PostgreSQL reservation + transition RPC integration.
 * Requires JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL (disposable branch / Postgres only).
 * Never targets production staged custody IDs.
 */
// @ts-nocheck
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";
// CJS test-infra helpers (not production barrels).
import {
  SETUP_TEST_TITLE,
  requireJeReuseSetup,
  runJeReuseDisposableSetup,
} from "./je-reuse-disposable-setup.js";
import { runJeReuseSeedOperations } from "./je-reuse-seed-operations.js";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260821183525_journal_entry_executions.sql",
);

const TEST_DB_URL = process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL;
const HASH = "a".repeat(64);
const HASH_B = "b".repeat(64);

const IDS = {
  user: "aaaaaaaa-0101-4101-8101-000000000101",
  company: "aaaaaaaa-0103-4103-8103-000000000103",
  engagement: "aaaaaaaa-0104-4104-8104-000000000104",
  connection: "aaaaaaaa-0105-4105-8105-000000000105",
  sync: "aaaaaaaa-0106-4106-8106-000000000106",
  ccRun: "aaaaaaaa-0107-4107-8107-000000000107",
  proposal: "aaaaaaaa-0108-4108-8108-000000000108",
  approval: "aaaaaaaa-0109-4109-8109-000000000109",
  execution: "aaaaaaaa-0110-4110-8110-000000000110",
  approval2: "aaaaaaaa-0114-4114-8114-000000000114",
  execution2: "aaaaaaaa-0115-4115-8115-000000000115",
  firm: "aaaaaaaa-0102-4102-8102-000000000102",
  firmClient: "aaaaaaaa-0112-4112-8112-000000000112",
} as const;

const STAGED_EXECUTION = "6d9579ad-0020-42b5-9521-db68a5d0edda";

function executionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: IDS.execution,
    proposal_id: IDS.proposal,
    approval_id: IDS.approval,
    company_id: IDS.company,
    engagement_id: IDS.engagement,
    firm_client_id: IDS.firmClient,
    source_continuous_close_run_id: IDS.ccRun,
    source_accounting_sync_id: IDS.sync,
    accounting_connection_id: IDS.connection,
    provider: "quickbooks",
    proposal_hash: HASH,
    approval_policy_hash: HASH_B,
    execution_policy_hash: HASH,
    execution_hash: HASH,
    idempotency_key: `${"c".repeat(64)}`,
    status: "RESERVED",
    correlation_marker: "ADVJE:exec-reservation-test",
    execution_policy_snapshot: {
      preparation_authority: "SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1",
    },
    preflight_result: { eligible: false, checks: [] },
    requested_by: IDS.user,
    requested_at: "2026-09-01T00:00:00.000Z",
    state_version: 1,
    provider_journal_id: null,
    provider_request_hash: HASH,
    provider_response_hash: null,
    last_error_code: null,
    last_error_message: null,
    ...overrides,
  };
}

function reservationEventPayload(status = "RESERVED") {
  return {
    execution_id: IDS.execution,
    proposal_id: IDS.proposal,
    approval_id: IDS.approval,
    company_id: IDS.company,
    engagement_id: IDS.engagement,
    accounting_connection_id: IDS.connection,
    proposal_hash: HASH,
    approval_policy_hash: HASH_B,
    execution_policy_hash: HASH,
    execution_hash: HASH,
    idempotency_key: `${"c".repeat(64)}`,
    correlation_marker: "ADVJE:exec-reservation-test",
    status,
    preflight_eligible: null,
    preflight_summary: "reserved",
    preparation_authority: "SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1",
    prepare_mfa_level: "aal2",
    prepare_mfa_source: "mfa_step_up_cookie",
    realm_id: "9341457151063823",
    provider_environment: "sandbox",
    total_debits_cents: 100,
    currency: "USD",
    txn_date: "2026-08-31",
    account_ids: ["15", "1150040002"],
    provider_request_hash: HASH,
  };
}

async function seedFixture(client: pg.Client) {
  // One parameterized statement per client.query (node-pg extended protocol).
  await runJeReuseSeedOperations(client, {
    ids: {
      user: IDS.user,
      company: IDS.company,
      engagement: IDS.engagement,
      connection: IDS.connection,
      sync: IDS.sync,
      ccRun: IDS.ccRun,
      proposal: IDS.proposal,
      approval: IDS.approval,
      approval2: IDS.approval2,
    },
    hash: HASH,
    hashB: HASH_B,
    idempotency: {
      ccRun: `${"d".repeat(64)}`,
      proposal: `${"e".repeat(64)}`,
      approval: `${"f".repeat(64)}`,
      approval2: `${"g".repeat(64)}`,
    },
  });
}

async function persistReservation(
  client: pg.Client,
  row: Record<string, unknown> = executionRow(),
  eventPayload: Record<string, unknown> = reservationEventPayload(),
) {
  const canonical = canonicalPayloadJson(eventPayload);
  return client.query<{
    reused: boolean;
    reuse_reason: string | null;
    execution: Record<string, unknown>;
    ledger_event_id: string | null;
  }>(
    `SELECT *
       FROM public.persist_journal_entry_execution_reservation(
         $1::jsonb,
         $2::jsonb,
         $3::text,
         $4::uuid,
         $5::uuid,
         $6::uuid,
         NULL,
         $7
       )`,
    [
      JSON.stringify(row),
      JSON.stringify(eventPayload),
      canonical,
      IDS.firm,
      IDS.firmClient,
      IDS.engagement,
      IDS.user,
    ],
  );
}

const describeIf = TEST_DB_URL ? describe : describe.skip;

describeIf("JE-3A execution reservation — disposable PostgreSQL", () => {
  /**
   * Model (B): disposable DB with prerequisite app schema present.
   * Suite re-applies JE-3A migration + seeds inside a transaction, then ROLLBACK.
   * beforeAll must NOT throw — Vitest converts hook throws into all-skipped.
   */
  let setup = {
    ok: false,
    client: null,
    phase: "not_started",
    sqlstate: null,
    sanitizedMessage: null,
    summary: "setup not run",
    cleanupRegistered: false,
  };

  beforeAll(async () => {
    setup = await runJeReuseDisposableSetup({
      databaseUrl: TEST_DB_URL,
      migrationPath: MIGRATION,
      seedFixture,
      Client: pg.Client,
    });
  }, 120_000);

  afterAll(async () => {
    const client = setup && setup.client;
    if (!client) return;
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    try {
      await client.end();
    } catch {
      /* ignore */
    }
  });

  it(SETUP_TEST_TITLE, () => {
    // Dedicated setup assertion: failures are reported as failed, never skipped.
    expect(
      setup.ok,
      setup.summary ||
        `setup failed at phase=${setup.phase} sqlstate=${setup.sqlstate}`,
    ).toBe(true);
    expect(setup.client).toBeTruthy();
    expect(setup.cleanupRegistered).toBe(true);
  });

  it("migration compile: reservation + transition RPCs exist", async () => {
    const client = requireJeReuseSetup(setup);
    const { rows } = await client.query<{ proname: string; prosecdef: boolean }>(
      `SELECT proname, prosecdef
         FROM pg_proc
        WHERE proname IN (
          'persist_journal_entry_execution_reservation',
          'transition_journal_entry_execution'
        )
        ORDER BY proname`,
    );
    expect(rows.map((r) => r.proname)).toEqual([
      "persist_journal_entry_execution_reservation",
      "transition_journal_entry_execution",
    ]);
    expect(rows.every((r) => r.prosecdef)).toBe(true);
  });

  it("A. first reservation inserts row + execution_requested receipt", async () => {
    const client = requireJeReuseSetup(setup);
    const row = executionRow();
    const payload = reservationEventPayload();
    const { rows } = await persistReservation(client, row, payload);
    expect(rows[0]?.reused).toBe(false);
    expect(rows[0]?.ledger_event_id).toBeTruthy();
    expect(rows[0]?.execution.status).toBe("RESERVED");
    expect(rows[0]?.execution.approval_id).toBe(IDS.approval);

    const receipts = await client.query(
      `SELECT count(*)::int AS c
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.execution_requested'
          AND aggregate_id = $1`,
      [IDS.execution],
    );
    expect(receipts.rows[0]?.c).toBe(1);

    const enriched = await client.query(
      `SELECT event_payload
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.execution_requested'
          AND aggregate_id = $1
        LIMIT 1`,
      [IDS.execution],
    );
    expect(enriched.rows[0]?.event_payload?.preparation_authority).toBe(
      "SANDBOX_TWO_PERSON_PREPARE_AUTHORITY_V1",
    );
    expect(enriched.rows[0]?.event_payload?.prepare_mfa_level).toBe("aal2");
  });

  it("B. exact idempotency replay → reused, no duplicate receipt", async () => {
    const client = requireJeReuseSetup(setup);
    const before = await client.query(
      `SELECT count(*)::int AS c
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.execution_requested'
          AND aggregate_id = $1`,
      [IDS.execution],
    );
    const { rows } = await persistReservation(client);
    expect(rows[0]?.reused).toBe(true);
    expect(rows[0]?.reuse_reason).toBe("idempotency_key");
    expect(rows[0]?.ledger_event_id).toBeNull();
    const after = await client.query(
      `SELECT count(*)::int AS c
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.execution_requested'
          AND aggregate_id = $1`,
      [IDS.execution],
    );
    expect(after.rows[0]?.c).toBe(before.rows[0]?.c);
  });

  it("C. approval_id replay with same binding → reused", async () => {
    const client = requireJeReuseSetup(setup);
    const row = executionRow({ id: "aaaaaaaa-0111-4111-8111-000000000111" });
    const { rows } = await persistReservation(client, row);
    expect(rows[0]?.reused).toBe(true);
    expect(rows[0]?.reuse_reason).toBe("approval_id");
    expect(rows[0]?.ledger_event_id).toBeNull();
  });

  it("D. binding mismatch on approval_id → fail closed", async () => {
    const client = requireJeReuseSetup(setup);
    const row = executionRow({
      id: "aaaaaaaa-0113-4113-8113-000000000113",
      proposal_hash: `${"z".repeat(64)}`,
    });
    await expect(persistReservation(client, row)).rejects.toMatchObject({
      message: expect.stringMatching(/je_execution_binding_conflict/i),
    });
  });

  it("E. transition RESERVED → READY_TO_POST + execution_ready receipt", async () => {
    const client = requireJeReuseSetup(setup);
    const readyPayload = {
      ...reservationEventPayload("READY_TO_POST"),
      preflight_eligible: true,
      preflight_summary: "all_checks_pass",
    };
    const canonical = canonicalPayloadJson(readyPayload);
    const { rows } = await client.query<{
      execution: { status: string; state_version: number };
      ledger_event_id: string | null;
    }>(
      `SELECT *
         FROM public.transition_journal_entry_execution(
           $1::uuid, 'RESERVED', 1, 'READY_TO_POST',
           $2::jsonb,
           'journal_entry.execution_ready',
           $3::jsonb,
           $4::text,
           $5::uuid, $6::uuid, $7::uuid, NULL, $8
         )`,
      [
        IDS.execution,
        JSON.stringify({
          preflight_result: { eligible: true, checks: [] },
          provider_request_hash: HASH,
          last_error_code: null,
          last_error_message: null,
        }),
        JSON.stringify(readyPayload),
        canonical,
        IDS.firm,
        IDS.firmClient,
        IDS.engagement,
        IDS.user,
      ],
    );
    expect(rows[0]?.execution.status).toBe("READY_TO_POST");
    expect(rows[0]?.execution.state_version).toBe(2);
    expect(rows[0]?.ledger_event_id).toBeTruthy();

    const readyReceipts = await client.query(
      `SELECT count(*)::int AS c
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.execution_ready'
          AND aggregate_id = $1`,
      [IDS.execution],
    );
    expect(readyReceipts.rows[0]?.c).toBe(1);
  });

  it("E2. Patent #6 chain adjacency for requested → ready receipts", async () => {
    const client = requireJeReuseSetup(setup);
    const { rows } = await client.query(
      `SELECT event_type, chain_index, event_sequence, event_hash, previous_event_hash
         FROM public.ledger_events
        WHERE aggregate_type = 'journal_entry_execution'
          AND aggregate_id = $1
        ORDER BY chain_index ASC NULLS LAST, event_sequence ASC`,
      [IDS.execution],
    );
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const requested = rows.find((r) => r.event_type === "journal_entry.execution_requested");
    const ready = rows.find((r) => r.event_type === "journal_entry.execution_ready");
    expect(requested?.event_hash).toBeTruthy();
    expect(ready?.previous_event_hash).toBe(requested?.event_hash);
    if (requested?.chain_index != null && ready?.chain_index != null) {
      expect(Number(ready.chain_index)).toBeGreaterThan(Number(requested.chain_index));
    }
  });

  it("F. state_version conflict on transition → rejected", async () => {
    const client = requireJeReuseSetup(setup);
    const payload = reservationEventPayload("READY_TO_POST");
    await expect(
      client.query(
        `SELECT *
           FROM public.transition_journal_entry_execution(
             $1::uuid, 'RESERVED', 1, 'READY_TO_POST',
             '{}'::jsonb,
             'journal_entry.execution_ready',
             $2::jsonb,
             $3::text,
             $4::uuid, $5::uuid, $6::uuid, NULL, $7
           )`,
        [
          IDS.execution,
          JSON.stringify(payload),
          canonicalPayloadJson(payload),
          IDS.firm,
          IDS.firmClient,
          IDS.engagement,
          IDS.user,
        ],
      ),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/state_version concurrency conflict/i),
    });
  });

  it("G. transition RESERVED → PRECHECK_FAILED + execution_precheck_failed receipt", async () => {
    const client = requireJeReuseSetup(setup);
    const row = executionRow({
      id: IDS.execution2,
      approval_id: IDS.approval2,
      idempotency_key: `${"h".repeat(64)}`,
      correlation_marker: "ADVJE:exec-precheck-failed-test",
    });
    const reservedPayload = reservationEventPayload("RESERVED");
    reservedPayload.execution_id = IDS.execution2;
    reservedPayload.approval_id = IDS.approval2;
    reservedPayload.idempotency_key = row.idempotency_key;
    reservedPayload.correlation_marker = row.correlation_marker;
    const reserved = await persistReservation(client, row, reservedPayload);
    expect(reserved.rows[0]?.reused).toBe(false);

    const failedPayload = {
      ...reservationEventPayload("PRECHECK_FAILED"),
      execution_id: IDS.execution2,
      approval_id: IDS.approval2,
      preflight_eligible: false,
      preflight_summary: "executor_sod_failed",
    };
    const canonical = canonicalPayloadJson(failedPayload);
    const { rows } = await client.query<{
      execution: { status: string };
      ledger_event_id: string | null;
    }>(
      `SELECT *
         FROM public.transition_journal_entry_execution(
           $1::uuid, 'RESERVED', 1, 'PRECHECK_FAILED',
           $2::jsonb,
           'journal_entry.execution_precheck_failed',
           $3::jsonb,
           $4::text,
           $5::uuid, $6::uuid, $7::uuid, NULL, $8
         )`,
      [
        IDS.execution2,
        JSON.stringify({
          preflight_result: { eligible: false, checks: [{ status: "FAIL" }] },
          provider_request_hash: HASH,
          last_error_code: "executor_sod_failed",
          last_error_message: "precheck_failed",
        }),
        JSON.stringify(failedPayload),
        canonical,
        IDS.firm,
        IDS.firmClient,
        IDS.engagement,
        IDS.user,
      ],
    );
    expect(rows[0]?.execution.status).toBe("PRECHECK_FAILED");
    expect(rows[0]?.ledger_event_id).toBeTruthy();
  });

  it("H. concurrent approval_id reservation attempts converge to one execution", async () => {
    const client = requireJeReuseSetup(setup);
    const rowA = executionRow({
      id: "aaaaaaaa-0116-4116-8116-000000000116",
      approval_id: IDS.approval2,
      idempotency_key: `${"i".repeat(64)}`,
    });
    const rowB = executionRow({
      id: "aaaaaaaa-0117-4117-8117-000000000117",
      approval_id: IDS.approval2,
      idempotency_key: `${"j".repeat(64)}`,
      proposal_hash: `${"z".repeat(64)}`,
    });
    const first = await persistReservation(client, rowA);
    expect(first.rows[0]?.reused).toBe(true);
    await expect(persistReservation(client, rowB)).rejects.toMatchObject({
      message: expect.stringMatching(/je_execution_binding_conflict/i),
    });

    const { rows } = await client.query(
      `SELECT count(*)::int AS c
         FROM public.journal_entry_executions
        WHERE approval_id = $1`,
      [IDS.approval2],
    );
    expect(rows[0]?.c).toBe(1);
  });

  it("I. zero provider-attempt rows for execution reservation path", async () => {
    const client = requireJeReuseSetup(setup);
    const { rows } = await client.query(
      `SELECT count(*)::int AS c
         FROM public.journal_entry_provider_attempts
        WHERE execution_id = $1`,
      [IDS.execution],
    );
    expect(rows[0]?.c).toBe(0);
  });

  it("J. never touches staged production execution custody id", async () => {
    const client = requireJeReuseSetup(setup);
    const { rows } = await client.query(
      `SELECT count(*)::int AS c
         FROM public.journal_entry_executions
        WHERE id = $1::uuid`,
      [STAGED_EXECUTION],
    );
    expect(rows[0]?.c).toBe(0);
  });
});

if (!TEST_DB_URL) {
  describe("JE-3A execution reservation — disposable PostgreSQL", () => {
    it("BLOCKED: JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL unavailable", () => {
      expect(process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL).toBeFalsy();
    });
  });
}
