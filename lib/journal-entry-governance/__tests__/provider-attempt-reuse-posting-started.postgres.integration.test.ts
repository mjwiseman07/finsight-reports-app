/**
 * JE-3D — real PostgreSQL compile + semantic gate for reuse posting_started migration.
 * Requires JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL (disposable branch / Postgres only).
 * Never targets production staged custody IDs.
 */
// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATION = join(
  process.cwd(),
  "supabase/migrations/20260826043000_journal_entry_provider_attempt_reuse_posting_started.sql",
);

const TEST_DB_URL = process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL;
const HASH = "a".repeat(64);

const IDS = {
  user: "aaaaaaaa-0001-4001-8001-000000000001",
  company: "aaaaaaaa-0003-4003-8003-000000000003",
  engagement: "aaaaaaaa-0004-4004-8004-000000000004",
  connection: "aaaaaaaa-0005-4005-8005-000000000005",
  sync: "aaaaaaaa-0006-4006-8006-000000000006",
  ccRun: "aaaaaaaa-0007-4007-8007-000000000007",
  proposal: "aaaaaaaa-0008-4008-8008-000000000008",
  approval: "aaaaaaaa-0009-4009-8009-000000000009",
  execution: "aaaaaaaa-0010-4010-8010-000000000010",
  attempt: "aaaaaaaa-0011-4011-8011-000000000011",
  firm: "aaaaaaaa-0002-4002-8002-000000000002",
  firmClient: "aaaaaaaa-0012-4012-8012-000000000012",
} as const;

const STAGED_EXECUTION = "6d9579ad-0020-42b5-9521-db68a5d0edda";
const STAGED_ATTEMPT = "2ffffef6-746a-4c85-ad7b-2596be0c0eaf";

function buildConnectionString(value: string) {
  try {
    const parsed = new URL(value);
    parsed.searchParams.delete("sslmode");
    return parsed.toString();
  } catch {
    return value;
  }
}

async function seedFixture(client: pg.Client) {
  await client.query(
    `
    INSERT INTO auth.users (id, email, is_sso_user, is_anonymous)
    VALUES ($1, 'je3d-reuse-posting-test@example.invalid', false, false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.companies (id, name, primary_persona, package_level, billing_status, onboarding_status, is_demo, account_type, industry_type)
    VALUES ($2, 'JE3D Reuse Posting Test Co', 'business-owner', 'essential', 'trial', 'not_started', true, 'my-own-company', 'Other')
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

    INSERT INTO public.journal_entry_executions (
      id, proposal_id, approval_id, company_id, engagement_id, firm_client_id,
      source_continuous_close_run_id, source_accounting_sync_id, accounting_connection_id,
      provider, proposal_hash, approval_policy_hash, execution_policy_hash, execution_hash,
      idempotency_key, status, correlation_marker, execution_policy_snapshot, preflight_result,
      requested_by, requested_at, state_version, provider_request_hash
    ) VALUES (
      $13, $9, $11, $2, $3, NULL, $6, $5, $4, 'quickbooks', $7, $7, $7, $7,
      $14, 'READY_TO_POST', 'ADVJE:reuse-posting-test', '{}'::jsonb, '{}'::jsonb,
      $1, now(), 2, $7
    ) ON CONFLICT (id) DO NOTHING;

    SELECT set_config('advisacor.je_provider_attempt_mutation', '1', true);
    INSERT INTO public.journal_entry_provider_attempts (
      id, execution_id, accounting_connection_id, provider, provider_request_hash,
      correlation_marker, status, commit_certainty, discovery_summary
    ) VALUES (
      $15, $13, $4, 'quickbooks', $7, 'ADVJE:reuse-posting-test', 'RESERVED', 'NOT_SENT', '{}'::jsonb
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
      `${"b".repeat(64)}`,
      IDS.proposal,
      `${"c".repeat(64)}`,
      IDS.approval,
      `${"d".repeat(64)}`,
      IDS.execution,
      `${"e".repeat(64)}`,
      IDS.attempt,
    ],
  );
}

function persistRow() {
  return {
    id: IDS.attempt,
    execution_id: IDS.execution,
    accounting_connection_id: IDS.connection,
    provider: "quickbooks",
    provider_request_hash: HASH,
    correlation_marker: "ADVJE:reuse-posting-test",
  };
}

function postingPayload(status: "POSTING" | "READY_TO_POST" = "POSTING") {
  return {
    execution_id: IDS.execution,
    proposal_id: IDS.proposal,
    approval_id: IDS.approval,
    accounting_connection_id: IDS.connection,
    execution_hash: HASH,
    provider_request_hash: HASH,
    correlation_marker: "ADVJE:reuse-posting-test",
    status,
    commit_certainty: "NOT_SENT",
  };
}

const describeIf = TEST_DB_URL ? describe : describe.skip;

describeIf("JE-3D reuse posting_started — disposable PostgreSQL", () => {
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

  it("migration compile: helper + persist RPC exist", async () => {
    const { rows } = await client.query<{ proname: string; prosecdef: boolean }>(
      `SELECT proname, prosecdef
         FROM pg_proc
        WHERE proname IN (
          'je_publish_posting_started_from_ready',
          'persist_journal_entry_provider_attempt'
        )
        ORDER BY proname`,
    );
    expect(rows.map((r) => r.proname)).toEqual([
      "je_publish_posting_started_from_ready",
      "persist_journal_entry_provider_attempt",
    ]);
    expect(rows.every((r) => r.prosecdef)).toBe(true);
  });

  it("privileges: helper not granted; persist service_role-only", async () => {
    const helper = await client.query(
      `SELECT grantee, privilege_type
         FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'je_publish_posting_started_from_ready'`,
    );
    expect(helper.rows.some((r) => r.grantee === "PUBLIC")).toBe(false);
    expect(helper.rows.some((r) => r.grantee === "anon")).toBe(false);
    expect(helper.rows.some((r) => r.grantee === "authenticated")).toBe(false);
    expect(helper.rows.some((r) => r.grantee === "service_role")).toBe(false);

    const persist = await client.query(
      `SELECT grantee
         FROM information_schema.routine_privileges
        WHERE routine_schema = 'public'
          AND routine_name = 'persist_journal_entry_provider_attempt'
          AND privilege_type = 'EXECUTE'`,
    );
    const grantees = persist.rows.map((r) => r.grantee);
    expect(grantees).toContain("service_role");
    expect(grantees).not.toContain("PUBLIC");
    expect(grantees).not.toContain("anon");
    expect(grantees).not.toContain("authenticated");
  });

  it("A. READY_TO_POST reuse → POSTING + one posting_started receipt", async () => {
    const payload = postingPayload();
    const { rows } = await client.query<{
      reused: boolean;
      attempt: { status: string; commit_certainty: string };
      execution: { status: string; state_version: number };
      ledger_event_id: string | null;
    }>(
      `SELECT *
         FROM public.persist_journal_entry_provider_attempt(
           $1::jsonb,
           $2::jsonb,
           $3::text,
           $4::uuid,
           $5::uuid,
           $6::uuid,
           NULL,
           'test-actor',
           true
         )`,
      [
        JSON.stringify(persistRow()),
        JSON.stringify(payload),
        JSON.stringify(payload),
        IDS.firm,
        IDS.firmClient,
        IDS.engagement,
      ],
    );
    expect(rows[0]?.reused).toBe(true);
    expect(rows[0]?.execution.status).toBe("POSTING");
    expect(rows[0]?.execution.state_version).toBe(3);
    expect(rows[0]?.attempt.status).toBe("RESERVED");
    expect(rows[0]?.attempt.commit_certainty).toBe("NOT_SENT");
    expect(rows[0]?.ledger_event_id).toBeTruthy();

    const receipts = await client.query(
      `SELECT count(*)::int AS c
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.posting_started'
          AND aggregate_id = $1`,
      [IDS.execution],
    );
    expect(receipts.rows[0]?.c).toBe(1);
  });

  it("B. POSTING replay → reused, no duplicate receipt", async () => {
    const payload = postingPayload();
    const before = await client.query(
      `SELECT count(*)::int AS c
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.posting_started'
          AND aggregate_id = $1`,
      [IDS.execution],
    );
    const { rows } = await client.query<{
      reused: boolean;
      ledger_event_id: string | null;
      execution: { status: string };
    }>(
      `SELECT *
         FROM public.persist_journal_entry_provider_attempt(
           $1::jsonb, $2::jsonb, $3::text,
           $4::uuid, $5::uuid, $6::uuid, NULL, 'test-actor', true
         )`,
      [
        JSON.stringify(persistRow()),
        JSON.stringify(payload),
        JSON.stringify(payload),
        IDS.firm,
        IDS.firmClient,
        IDS.engagement,
      ],
    );
    expect(rows[0]?.reused).toBe(true);
    expect(rows[0]?.execution.status).toBe("POSTING");
    expect(rows[0]?.ledger_event_id).toBeNull();
    const after = await client.query(
      `SELECT count(*)::int AS c
         FROM public.ledger_events
        WHERE event_type = 'journal_entry.posting_started'
          AND aggregate_id = $1`,
      [IDS.execution],
    );
    expect(after.rows[0]?.c).toBe(before.rows[0]?.c);
  });

  it("C. publishPostingStarted=false → no transition, no receipt", async () => {
    await client.query(`SELECT set_config('advisacor.je_execution_transition', '1', true)`);
    await client.query(
      `UPDATE public.journal_entry_executions
          SET status = 'READY_TO_POST', state_version = 2, updated_at = now()
        WHERE id = $1`,
      [IDS.execution],
    );
    // re-seed attempt custody for fresh READY_TO_POST case in same txn
    await client.query(`DELETE FROM public.journal_entry_provider_attempts WHERE execution_id = $1`, [
      IDS.execution,
    ]);
    await client.query(`SELECT set_config('advisacor.je_provider_attempt_mutation', '1', true)`);
    await client.query(
      `INSERT INTO public.journal_entry_provider_attempts (
         id, execution_id, accounting_connection_id, provider, provider_request_hash,
         correlation_marker, status, commit_certainty, discovery_summary
       ) VALUES ($1, $2, $3, 'quickbooks', $4, 'ADVJE:reuse-posting-test', 'RESERVED', 'NOT_SENT', '{}'::jsonb)`,
      [IDS.attempt, IDS.execution, IDS.connection, HASH],
    );

    const payload = postingPayload("READY_TO_POST");
    const { rows } = await client.query<{
      reused: boolean;
      execution: { status: string };
      ledger_event_id: string | null;
    }>(
      `SELECT *
         FROM public.persist_journal_entry_provider_attempt(
           $1::jsonb, $2::jsonb, $3::text,
           $4::uuid, $5::uuid, $6::uuid, NULL, 'test-actor', false
         )`,
      [
        JSON.stringify(persistRow()),
        JSON.stringify(payload),
        JSON.stringify(payload),
        IDS.firm,
        IDS.firmClient,
        IDS.engagement,
      ],
    );
    expect(rows[0]?.reused).toBe(true);
    expect(rows[0]?.execution.status).toBe("READY_TO_POST");
    expect(rows[0]?.ledger_event_id).toBeNull();
  });

  it("D. non-RESERVED attempt → rejected", async () => {
    await client.query(`SELECT set_config('advisacor.je_execution_transition', '1', true)`);
    await client.query(
      `UPDATE public.journal_entry_executions
          SET status = 'READY_TO_POST', state_version = 2, updated_at = now()
        WHERE id = $1`,
      [IDS.execution],
    );
    await client.query(`SELECT set_config('advisacor.je_provider_attempt_mutation', '1', true)`);
    await client.query(
      `UPDATE public.journal_entry_provider_attempts
          SET status = 'REQUEST_STARTED', updated_at = now()
        WHERE id = $1`,
      [IDS.attempt],
    );
    const payload = postingPayload();
    await expect(
      client.query(
        `SELECT *
           FROM public.persist_journal_entry_provider_attempt(
             $1::jsonb, $2::jsonb, $3::text,
             $4::uuid, $5::uuid, $6::uuid, NULL, 'test-actor', true
           )`,
        [
          JSON.stringify(persistRow()),
          JSON.stringify(payload),
          JSON.stringify(payload),
          IDS.firm,
          IDS.firmClient,
          IDS.engagement,
        ],
      ),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/reuse_posting_started_forbidden/i),
    });
  });

  it("E. state_version race → rejected", async () => {
    await client.query(`SELECT set_config('advisacor.je_execution_transition', '1', true)`);
    await client.query(
      `UPDATE public.journal_entry_executions
          SET status = 'READY_TO_POST', state_version = 99, updated_at = now()
        WHERE id = $1`,
      [IDS.execution],
    );
    await client.query(`SELECT set_config('advisacor.je_provider_attempt_mutation', '1', true)`);
    await client.query(
      `UPDATE public.journal_entry_provider_attempts
          SET status = 'RESERVED', commit_certainty = 'NOT_SENT', updated_at = now()
        WHERE id = $1`,
      [IDS.attempt],
    );
    const payload = postingPayload();
    await expect(
      client.query(
        `SELECT *
           FROM public.persist_journal_entry_provider_attempt(
             $1::jsonb, $2::jsonb, $3::text,
             $4::uuid, $5::uuid, $6::uuid, NULL, 'test-actor', true
           )`,
        [
          JSON.stringify(persistRow()),
          JSON.stringify(payload),
          JSON.stringify(payload),
          IDS.firm,
          IDS.firmClient,
          IDS.engagement,
        ],
      ),
    ).rejects.toMatchObject({
      message: expect.stringMatching(/state_version concurrency conflict/i),
    });
  });

  it("does not touch staged production custody IDs", async () => {
    const staged = await client.query(
      `SELECT id::text FROM public.journal_entry_executions WHERE id = $1
       UNION ALL
       SELECT id::text FROM public.journal_entry_provider_attempts WHERE id = $2`,
      [STAGED_EXECUTION, STAGED_ATTEMPT],
    );
    expect(staged.rows).toHaveLength(0);
  });
});

describe("JE-3D reuse posting_started migration — static composite INTO fix", () => {
  const src = readFileSync(MIGRATION, "utf8");

  it("uses single RECORD fetch for helper results", () => {
    expect(src).toContain("v_posting_result record;");
    expect(src).toContain("je_provider_attempt_posting_started_helper_returned_no_row");
    expect(src).not.toMatch(/INTO v_execution, v_event_id/);
    expect(src).not.toMatch(/\) AS ps;/);
    expect((src.match(/INTO v_posting_result/g) ?? []).length).toBe(3);
  });
});
