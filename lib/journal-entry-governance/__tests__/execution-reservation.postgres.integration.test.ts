/**
 * JE-3A — real PostgreSQL reservation + transition RPC integration.
 * Requires JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL (disposable branch / Postgres only).
 * Never targets production staged custody IDs.
 */
// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { canonicalPayloadJson } from "@/lib/ledger/merkle";

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
  firm: "aaaaaaaa-0102-4102-8102-000000000102",
  firmClient: "aaaaaaaa-0112-4112-8112-000000000112",
} as const;

const STAGED_EXECUTION = "6d9579ad-0020-42b5-9521-db68a5d0edda";

function buildConnectionString(value: string) {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return value;
  }
}

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
  await client.query(
    `
    INSERT INTO auth.users (id, email, is_sso_user, is_anonymous)
    VALUES ($1, 'je3a-exec-reservation-test@example.invalid', false, false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.companies (id, name, primary_persona, package_level, billing_status, onboarding_status, is_demo, account_type, industry_type)
    VALUES ($2, 'JE3A Exec Reservation Test Co', 'business-owner', 'essential', 'trial', 'not_started', true, 'my-own-company', 'Other')
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.audit_ready_engagements (
      id, company_id, audit_ready_tier, billing_mode, status, entity_count,
      pbc_request_count, auditor_user_count, opened_at, hard_timeout_at
    ) VALUES (
      $3, $2, 'small', 'monthly', 'open', 1, 0, 0, now(), now() + interval '30 days'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.accounting_connections (
      id, user_id, provider, provider_family, provider_product, scopes, status, metadata_json, provider_environment
    ) VALUES (
      $4, $1, 'quickbooks', 'intuit', 'qbo', '{}', 'connected', '{}'::jsonb, 'sandbox'
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.accounting_syncs (
      id, company_id, connection_id, source_system, report_period_start, report_period_end,
      normalized_payload, validation_status, last_synced_at
    ) VALUES (
      $5, $2, $4, 'quickbooks', '2026-08-01', '2026-08-31', '{}'::jsonb, 'valid', now()
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.continuous_close_runs (
      id, company_id, engagement_id, accounting_sync_id, period_end, mode, readiness, status,
      policy_hash, input_hash, policy_snapshot, observation_summary, result, created_by,
      started_at, completed_at, idempotency_key
    ) VALUES (
      $6, $2, $3, $5, '2026-08-31', 'OBSERVE', 'READY', 'completed',
      $7, $7, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, $1,
      now(), now(), $8
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.journal_entry_proposals (
      id, company_id, engagement_id, period_end, source_continuous_close_run_id,
      source_accounting_sync_id, source_recon_run_ids, origin_type, reason_code, currency,
      txn_date, lines, total_debits_cents, total_credits_cents, expected_effects,
      policy_snapshot, policy_hash, proposal_hash, status, proposed_by, proposed_at, idempotency_key
    ) VALUES (
      $9, $2, $3, '2026-08-31', $6, $5, '[]'::jsonb, 'ACCRUAL', 'TEST', 'USD',
      '2026-08-31', '[]'::jsonb, 100, 100, '{}'::jsonb,
      '{}'::jsonb, $7, $7, 'SUBMITTED', $1, now(), $10
    ) ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.journal_entry_approvals (
      id, proposal_id, company_id, engagement_id, proposal_hash, policy_hash, decision,
      approval_mode, reviewer_user_id, policy_snapshot, approved_at, idempotency_key
    ) VALUES (
      $11, $9, $2, $3, $7, $7, 'APPROVED', 'REVIEW_REQUIRED', $1, '{}'::jsonb, now(), $12
    ) ON CONFLICT (id) DO NOTHING;
    `,
    [
      IDS.user,
      IDS.company,
      IDS.engagement,
      IDS.connection,
      IDS.sync,
      IDS.ccRun,
      HASH,
      `${"d".repeat(64)}`,
      IDS.proposal,
      `${"e".repeat(64)}`,
      IDS.approval,
      `${"f".repeat(64)}`,
    ],
  );
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
  const client = new pg.Client({
    connectionString: buildConnectionString(TEST_DB_URL!),
    ssl: { rejectUnauthorized: false },
  });

  beforeAll(async () => {
    await client.connect();
    await client.query("BEGIN");
    await client.query(readFileSync(MIGRATION, "utf8"));
    await seedFixture(client);
  }, 120_000);

  afterAll(async () => {
    await client.query("ROLLBACK");
    await client.end();
  });

  it("migration compile: reservation + transition RPCs exist", async () => {
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
    const row = executionRow({ id: "aaaaaaaa-0111-4111-8111-000000000111" });
    const { rows } = await persistReservation(client, row);
    expect(rows[0]?.reused).toBe(true);
    expect(rows[0]?.reuse_reason).toBe("approval_id");
    expect(rows[0]?.ledger_event_id).toBeNull();
  });

  it("D. binding mismatch on approval_id → fail closed", async () => {
    const row = executionRow({
      id: "aaaaaaaa-0113-4113-8113-000000000113",
      proposal_hash: `${"z".repeat(64)}`,
    });
    await expect(persistReservation(client, row)).rejects.toMatchObject({
      message: expect.stringMatching(/je_execution_binding_conflict/i),
    });
  });

  it("E. transition RESERVED → READY_TO_POST + execution_ready receipt", async () => {
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

  it("F. state_version conflict on transition → rejected", async () => {
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

  it("G. zero provider-attempt rows for execution reservation path", async () => {
    const { rows } = await client.query(
      `SELECT count(*)::int AS c
         FROM public.journal_entry_provider_attempts
        WHERE execution_id = $1`,
      [IDS.execution],
    );
    expect(rows[0]?.c).toBe(0);
  });

  it("H. never touches staged production execution custody id", async () => {
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
