/**
 * Test-infrastructure only: ordered, one-statement-per-query seed operations
 * for JE-3A disposable Postgres setup.
 *
 * NOT a production/runtime API.
 * Never interpolate values into SQL. Never split SQL on semicolons for execution.
 */
"use strict";

/**
 * Authoritative DB check from migration 20260821042800_journal_entry_approvals.sql
 * (and matching JE proposal/CC/execution idempotency checks):
 *   CHECK (idempotency_key ~ '^[a-f0-9]{64}$')
 * Production writers (hashJeApprovalIdempotencyKey / sha256Hex) emit the same grammar.
 */
const JE_REUSE_IDEMPOTENCY_KEY_RE = /^[a-f0-9]{64}$/;

/**
 * Deterministic fixture keys (lowercase hex × 64). Distinct across seed rows.
 * Secondary approval must NOT use non-hex letters (e.g. "g") — violates 23514.
 */
const JE_REUSE_SEED_IDEMPOTENCY_KEYS = Object.freeze({
  ccRun: "d".repeat(64),
  proposal: "e".repeat(64),
  approval: "f".repeat(64),
  /** Distinct from primary "f"…; valid hex (not "g"…). */
  approval2: "9".repeat(64),
});

/**
 * @param {unknown} key
 */
function assertJeReuseIdempotencyKey(key) {
  const s = String(key || "");
  if (!JE_REUSE_IDEMPOTENCY_KEY_RE.test(s)) {
    return {
      ok: false,
      reason: "idempotency_key_fails_af09_64_check",
      observedLength: s.length,
    };
  }
  return { ok: true, reason: null, observedLength: s.length };
}

/**
 * Count executable top-level statements for static tests only.
 * Not used for execution. Rejects multi-statement SQL.
 * @param {string} sql
 */
function countExecutableSqlStatements(sql) {
  const noLineComments = String(sql || "")
    .split(/\r?\n/)
    .map((line) => {
      const idx = line.indexOf("--");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n")
    .trim();
  if (!noLineComments) return 0;
  const body = noLineComments.replace(/;\s*$/, "").trim();
  if (!body) return 0;
  if (body.includes(";")) return 2;
  const starters = body.match(/\b(INSERT|UPDATE|DELETE|SELECT|WITH|CREATE|ALTER|DROP)\b/gi);
  return starters ? starters.length : 0;
}

/**
 * Count distinct $N placeholders in a SQL string.
 * @param {string} sql
 */
function countSqlPlaceholders(sql) {
  const found = new Set();
  const re = /\$(\d+)\b/g;
  let m;
  while ((m = re.exec(String(sql || ""))) !== null) {
    found.add(Number(m[1]));
  }
  return found.size;
}

/**
 * @typedef {{
 *   name: string,
 *   sql: string,
 *   params: (ctx: {
 *     ids: Record<string, string>,
 *     hash: string,
 *     hashB: string,
 *     idempotency: Record<string, string>,
 *   }) => unknown[],
 * }} JeReuseSeedOperation
 */

/** @type {readonly JeReuseSeedOperation[]} */
const JE_REUSE_SEED_OPERATIONS = Object.freeze([
  Object.freeze({
    name: "seed_auth_users",
    sql: `
INSERT INTO auth.users (id, email, is_sso_user, is_anonymous)
VALUES ($1, 'je3a-exec-reservation-test@example.invalid', false, false)
ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [ctx.ids.user],
  }),
  Object.freeze({
    name: "seed_companies",
    sql: `
INSERT INTO public.companies (id, name, primary_persona, package_level, billing_status, onboarding_status, is_demo, account_type, industry_type)
VALUES ($1, 'JE3A Exec Reservation Test Co', 'business-owner', 'essential', 'trial', 'not_started', true, 'my-own-company', 'Other')
ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [ctx.ids.company],
  }),
  Object.freeze({
    name: "seed_audit_ready_engagements",
    sql: `
INSERT INTO public.audit_ready_engagements (
  id, company_id, audit_ready_tier, billing_mode, status, entity_count,
  pbc_request_count, auditor_user_count, opened_at, hard_timeout_at
) VALUES (
  $1, $2, 'small', 'monthly', 'open', 1, 0, 0, now(), now() + interval '30 days'
) ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [ctx.ids.engagement, ctx.ids.company],
  }),
  Object.freeze({
    name: "seed_accounting_connections",
    sql: `
INSERT INTO public.accounting_connections (
  id, user_id, provider, provider_family, provider_product, scopes, status, metadata_json, provider_environment
) VALUES (
  $1, $2, 'quickbooks', 'intuit', 'qbo', '{}', 'connected', '{}'::jsonb, 'sandbox'
) ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [ctx.ids.connection, ctx.ids.user],
  }),
  Object.freeze({
    name: "seed_accounting_syncs",
    sql: `
INSERT INTO public.accounting_syncs (
  id, company_id, connection_id, source_system, report_period_start, report_period_end,
  normalized_payload, validation_status, last_synced_at
) VALUES (
  $1, $2, $3, 'quickbooks', '2026-08-01', '2026-08-31', '{}'::jsonb, 'SUCCESS', now()
) ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [ctx.ids.sync, ctx.ids.company, ctx.ids.connection],
  }),
  Object.freeze({
    name: "seed_continuous_close_runs",
    sql: `
INSERT INTO public.continuous_close_runs (
  id, company_id, engagement_id, accounting_sync_id, period_end, mode, readiness, status,
  policy_hash, input_hash, policy_snapshot, observation_summary, result, created_by,
  started_at, completed_at, idempotency_key
) VALUES (
  $1, $2, $3, $4, '2026-08-31', 'OBSERVE', 'READY', 'completed',
  $5, $5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, $6,
  now(), now(), $7
) ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [
      ctx.ids.ccRun,
      ctx.ids.company,
      ctx.ids.engagement,
      ctx.ids.sync,
      ctx.hash,
      ctx.ids.user,
      ctx.idempotency.ccRun,
    ],
  }),
  Object.freeze({
    name: "seed_journal_entry_proposals",
    sql: `
INSERT INTO public.journal_entry_proposals (
  id, company_id, engagement_id, period_end, source_continuous_close_run_id,
  source_accounting_sync_id, source_recon_run_ids, origin_type, reason_code, currency,
  txn_date, lines, total_debits_cents, total_credits_cents, expected_effects,
  policy_snapshot, policy_hash, proposal_hash, status, proposed_by, proposed_at, idempotency_key
) VALUES (
  $1, $2, $3, '2026-08-31', $4, $5, '[]'::jsonb, 'ACCRUAL', 'TEST', 'USD',
  '2026-08-31', '[]'::jsonb, 100, 100, '{}'::jsonb,
  '{}'::jsonb, $6, $6, 'SUBMITTED', $7, now(), $8
) ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [
      ctx.ids.proposal,
      ctx.ids.company,
      ctx.ids.engagement,
      ctx.ids.ccRun,
      ctx.ids.sync,
      ctx.hash,
      ctx.ids.user,
      ctx.idempotency.proposal,
    ],
  }),
  Object.freeze({
    name: "seed_journal_entry_approval_primary",
    sql: `
INSERT INTO public.journal_entry_approvals (
  id, proposal_id, company_id, engagement_id, proposal_hash, policy_hash, decision,
  approval_mode, reviewer_user_id, policy_snapshot, approved_at, idempotency_key
) VALUES (
  $1, $2, $3, $4, $5, $6, 'APPROVED', 'REVIEW_REQUIRED', $7, '{}'::jsonb, now(), $8
) ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [
      ctx.ids.approval,
      ctx.ids.proposal,
      ctx.ids.company,
      ctx.ids.engagement,
      ctx.hash,
      ctx.hash,
      ctx.ids.user,
      ctx.idempotency.approval,
    ],
  }),
  Object.freeze({
    name: "seed_journal_entry_approval_secondary",
    sql: `
INSERT INTO public.journal_entry_approvals (
  id, proposal_id, company_id, engagement_id, proposal_hash, policy_hash, decision,
  approval_mode, reviewer_user_id, policy_snapshot, approved_at, idempotency_key
) VALUES (
  $1, $2, $3, $4, $5, $6, 'APPROVED', 'REVIEW_REQUIRED', $7, '{}'::jsonb, now(), $8
) ON CONFLICT (id) DO NOTHING
`.trim(),
    params: (ctx) => [
      ctx.ids.approval2,
      ctx.ids.proposal,
      ctx.ids.company,
      ctx.ids.engagement,
      ctx.hash,
      ctx.hashB,
      ctx.ids.user,
      ctx.idempotency.approval2,
    ],
  }),
]);

const JE_REUSE_SEED_PHASE_NAMES = Object.freeze(
  JE_REUSE_SEED_OPERATIONS.map((op) => op.name),
);

/**
 * Execute seed operations sequentially (one statement per client.query).
 * Fail-fast: on error, attach jeReuseSeedPhase and rethrow (caller rolls back).
 *
 * @param {import('pg').Client} client
 * @param {{
 *   ids: Record<string, string>,
 *   hash: string,
 *   hashB: string,
 *   idempotency: Record<string, string>,
 * }} ctx
 * @param {{ query?: (sql: string, params?: unknown[]) => Promise<unknown> }} [hooks] test-only
 */
async function runJeReuseSeedOperations(client, ctx, hooks) {
  const query =
    hooks && typeof hooks.query === "function"
      ? hooks.query
      : (sql, params) => client.query(sql, params);

  const idem = (ctx && ctx.idempotency) || {};
  for (const [label, key] of Object.entries(idem)) {
    const check = assertJeReuseIdempotencyKey(key);
    if (!check.ok) {
      const err = new Error(
        `seed idempotency.${label} fails ^[a-f0-9]{64}$ grammar`,
      );
      /** @type {{ code?: string, jeReuseSeedPhase?: string }} */ (err).code =
        "23514";
      /** @type {{ jeReuseSeedPhase?: string }} */ (err).jeReuseSeedPhase =
        `seed_idempotency_precheck_${label}`;
      throw err;
    }
  }

  for (const op of JE_REUSE_SEED_OPERATIONS) {
    const values = op.params(ctx);
    try {
      await query(op.sql, values);
    } catch (err) {
      if (err && typeof err === "object") {
        /** @type {{ jeReuseSeedPhase?: string }} */ (err).jeReuseSeedPhase =
          op.name;
      }
      throw err;
    }
  }
}

module.exports = {
  JE_REUSE_SEED_OPERATIONS,
  JE_REUSE_SEED_PHASE_NAMES,
  JE_REUSE_IDEMPOTENCY_KEY_RE,
  JE_REUSE_SEED_IDEMPOTENCY_KEYS,
  assertJeReuseIdempotencyKey,
  countExecutableSqlStatements,
  countSqlPlaceholders,
  runJeReuseSeedOperations,
};
