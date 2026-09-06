#!/usr/bin/env node
/**
 * One-shot: write recovered production ar_tieout2 body from schema_migrations.statements[1].
 * Source: production version 20260720212538 / ar_tieout2_runs_and_variances (read-only).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/substitutions/20260720170000_ar_tieout2_runs_and_variances.sql",
);
const META = path.join(
  ROOT,
  "docs/migration-remediation/option-d-view-signature-inventory.json",
);

// Exact production statements[1] (LF), captured read-only from schema_migrations.
const STMT = `-- PBC-TIEOUT-2 adapted: DROP VIEW before recreate (column order change)
BEGIN;
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_runs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id            uuid NOT NULL REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  tie_out_kind              text NOT NULL,
  status                    text NOT NULL DEFAULT 'running'
                            CHECK (status IN ('running','completed','failed','partial')),
  policy_mode               text NOT NULL,
  auto_reconcile_max_dollar  numeric(18,2) NOT NULL,
  auto_reconcile_max_percent numeric(6,4)  NOT NULL,
  kickout_min_dollar         numeric(18,2) NOT NULL,
  kickout_min_percent        numeric(6,4)  NOT NULL,
  authoritative_comparison   text NOT NULL,
  subledger_total_cents     bigint NULL,
  gl_total_cents            bigint NULL,
  totals_variance_cents     bigint NULL,
  totals_status             text NULL
                            CHECK (totals_status IS NULL OR totals_status IN ('tie','auto_reconcile','review','kickout')),
  item_count                integer NOT NULL DEFAULT 0,
  item_auto_reconcile_count integer NOT NULL DEFAULT 0,
  item_review_count         integer NOT NULL DEFAULT 0,
  item_kickout_count        integer NOT NULL DEFAULT 0,
  subledger_source_url      text NULL,
  gl_source_url             text NULL,
  intuit_tid_subledger      text NULL,
  intuit_tid_gl             text NULL,
  period_start              date NULL,
  period_end                date NULL,
  triggered_by_user_id      uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  trigger_reason            text NOT NULL DEFAULT 'manual'
                            CHECK (trigger_reason IN ('manual','scheduled','memory_replay','api')),
  started_at                timestamptz NOT NULL DEFAULT now(),
  completed_at              timestamptz NULL,
  duration_ms               integer NULL,
  error_code                text NULL,
  error_message             text NULL
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_pbc_recent
  ON public.audit_ready_tie_out_runs(pbc_request_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_runs_engagement_recent
  ON public.audit_ready_tie_out_runs(engagement_id, started_at DESC);
ALTER TABLE public.audit_ready_tie_out_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_runs_service_role_all ON public.audit_ready_tie_out_runs;
CREATE POLICY ar_tieout_runs_service_role_all
  ON public.audit_ready_tie_out_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_tieout_runs_engagement_read ON public.audit_ready_tie_out_runs;
CREATE POLICY ar_tieout_runs_engagement_read
  ON public.audit_ready_tie_out_runs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_runs.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
CREATE TABLE IF NOT EXISTS public.audit_ready_tie_out_variances (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id                    uuid NOT NULL REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE CASCADE,
  engagement_id             uuid NOT NULL REFERENCES public.audit_ready_engagements(id) ON DELETE CASCADE,
  pbc_request_id            uuid NOT NULL REFERENCES public.audit_ready_pbc_requests(id) ON DELETE CASCADE,
  entity_kind               text NOT NULL
                            CHECK (entity_kind IN ('customer','vendor','item','account','totals','cutoff')),
  entity_qbo_id             text NULL,
  entity_display_name       text NULL,
  subledger_amount_cents    bigint NULL,
  gl_amount_cents           bigint NULL,
  variance_cents            bigint NOT NULL DEFAULT 0,
  variance_percent          numeric(9,6) NULL,
  status                    text NOT NULL
                            CHECK (status IN ('tie','auto_cleared','review','kickout')),
  classification_reason     text NULL,
  narrative                 text NULL,
  created_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_run
  ON public.audit_ready_tie_out_variances(run_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_engagement_kickout
  ON public.audit_ready_tie_out_variances(engagement_id)
  WHERE status = 'kickout';
CREATE INDEX IF NOT EXISTS idx_ar_tieout_variances_pbc
  ON public.audit_ready_tie_out_variances(pbc_request_id, status);
ALTER TABLE public.audit_ready_tie_out_variances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ar_tieout_variances_service_role_all ON public.audit_ready_tie_out_variances;
CREATE POLICY ar_tieout_variances_service_role_all
  ON public.audit_ready_tie_out_variances
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS ar_tieout_variances_engagement_read ON public.audit_ready_tie_out_variances;
CREATE POLICY ar_tieout_variances_engagement_read
  ON public.audit_ready_tie_out_variances
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.audit_ready_engagements e
      WHERE e.id = audit_ready_tie_out_variances.engagement_id
        AND (
          (e.company_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.company_users cu
            WHERE cu.company_id = e.company_id
              AND cu.user_id = (SELECT auth.uid())
              AND cu.status = 'active'
          ))
          OR
          (e.firm_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.firm_memberships fm
            WHERE fm.firm_id = e.firm_id
              AND fm.user_id = (SELECT auth.uid())
              AND fm.status = 'active'
          ))
        )
    )
  );
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_run_id uuid NULL
    REFERENCES public.audit_ready_tie_out_runs(id) ON DELETE SET NULL;
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_status text NULL
    CHECK (last_tie_out_status IS NULL OR last_tie_out_status IN ('tie','auto_reconciled','review','kickout','failed'));
ALTER TABLE public.audit_ready_pbc_requests
  ADD COLUMN IF NOT EXISTS last_tie_out_at timestamptz NULL;
CREATE INDEX IF NOT EXISTS idx_ar_pbc_last_tie_out
  ON public.audit_ready_pbc_requests(engagement_id, last_tie_out_status);
DROP VIEW IF EXISTS public.audit_ready_tie_out_summary;
CREATE VIEW public.audit_ready_tie_out_summary AS
SELECT
  r.id                        AS pbc_request_id,
  r.engagement_id,
  r.request_number,
  r.request_description,
  r.assertion_tags,
  r.tie_out_kind,
  r.tie_out_kind_confidence,
  r.tie_out_kind_classifier,
  r.tie_out_kind_classified_at,
  r.status                    AS pbc_status,
  r.last_tie_out_run_id,
  r.last_tie_out_status,
  r.last_tie_out_at,
  CASE
    WHEN p.engagement_id IS NULL           THEN 'no_tolerance_policy'
    WHEN r.tie_out_kind IS NULL            THEN 'not_yet_classified'
    WHEN r.tie_out_kind = 'unclassified'   THEN 'requires_manual_review'
    WHEN r.last_tie_out_run_id IS NULL     THEN 'ready_to_run'
    WHEN r.last_tie_out_status = 'tie'     THEN 'tied_out'
    WHEN r.last_tie_out_status = 'auto_reconciled' THEN 'auto_reconciled'
    WHEN r.last_tie_out_status = 'review'  THEN 'needs_review'
    WHEN r.last_tie_out_status = 'kickout' THEN 'kicked_out'
    WHEN r.last_tie_out_status = 'failed'  THEN 'failed'
    ELSE 'classified'
  END                         AS tie_out_state,
  p.policy_mode,
  p.auto_reconcile_max_dollar,
  p.auto_reconcile_max_percent,
  p.kickout_min_dollar,
  p.kickout_min_percent,
  p.authoritative_comparison
FROM public.audit_ready_pbc_requests r
LEFT JOIN public.audit_ready_tie_out_policies p ON p.engagement_id = r.engagement_id;
ALTER VIEW public.audit_ready_tie_out_summary SET (security_invoker = true);
COMMIT;`;

const EXPECTED = {
  version: "20260720212538",
  name: "ar_tieout2_runs_and_variances",
  statementCount: 1,
  statementsBytes: 8474,
  statementsMd5: "867ea82859717c3bc8dfe98e71be518b",
  statementsSha256:
    "1a17fa2e86d5b08e85132d8d22ca3dc83e9dd6d04938fc1b4a93df228d8c35af",
};

function main() {
  const buf = Buffer.from(STMT, "utf8");
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const md5 = crypto.createHash("md5").update(buf).digest("hex");
  if (buf.length !== EXPECTED.statementsBytes || sha256 !== EXPECTED.statementsSha256) {
    console.error(
      JSON.stringify(
        {
          ok: false,
          reason: "recovered_bytes_do_not_match_production_hashes",
          bytes: buf.length,
          expectedBytes: EXPECTED.statementsBytes,
          sha256,
          expectedSha256: EXPECTED.statementsSha256,
          md5,
          expectedMd5: EXPECTED.statementsMd5,
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }
  if (/drop\s+view[\s\S]{0,80}cascade/i.test(STMT)) {
    console.error("FAIL: recovered SQL contains DROP VIEW CASCADE");
    process.exit(2);
  }
  if (!/drop\s+view\s+if\s+exists\s+public\.audit_ready_tie_out_summary\s*;/i.test(STMT)) {
    console.error("FAIL: expected DROP VIEW IF EXISTS without CASCADE");
    process.exit(2);
  }
  if (!/security_invoker\s*=\s*true/i.test(STMT)) {
    console.error("FAIL: security_invoker not preserved");
    process.exit(2);
  }
  // credential / tenant row scan (fail closed on obvious secrets)
  if (/sk_live|sk_test|BEGIN RSA|password\s*=\s*'[^']+'/i.test(STMT)) {
    console.error("FAIL: credential-like content in recovered SQL");
    process.exit(2);
  }

  const header =
    `-- OPTION D SUBSTITUTION — isolated clean-replay candidate only\n` +
    `-- Replaces: supabase/migrations/20260720170000_ar_tieout2_runs_and_variances.sql\n` +
    `-- Does NOT modify active supabase/migrations/ or production schema_migrations.\n` +
    `--\n` +
    `-- Authoritative source: production schema_migrations.statements[1]\n` +
    `--   version=${EXPECTED.version} name=${EXPECTED.name}\n` +
    `--   statement_count=${EXPECTED.statementCount}\n` +
    `--   statements_bytes=${EXPECTED.statementsBytes}\n` +
    `--   statements_md5=${EXPECTED.statementsMd5}\n` +
    `--   statements_sha256=${EXPECTED.statementsSha256}\n` +
    `-- Justification: git body uses CREATE OR REPLACE VIEW that inserts columns before\n` +
    `-- tie_out_state (SQLSTATE 42P16). Production adapted to DROP VIEW IF EXISTS\n` +
    `-- (no CASCADE) + CREATE VIEW + security_invoker=true. Body below is the exact\n` +
    `-- production statement (hashes must match). No tenant/application rows.\n` +
    `--\n`;

  // Substitution file = header + exact production statement.
  // Note: header is Option D wrapper; assembled content for hash auth of recovery
  // is the production STMT alone when comparing to production hashes.
  const assembledBody = STMT; // exact production bytes for the substituted migration content
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  // Write EXACT production statement as substitution body (no header in applied SQL)
  // so replay matches production DDL. Provenance header lives in inventory JSON.
  fs.writeFileSync(OUT, assembledBody);

  const gitPath = path.join(
    ROOT,
    "supabase/migrations/20260720170000_ar_tieout2_runs_and_variances.sql",
  );
  const gitBuf = fs.readFileSync(gitPath);

  const inventory = {
    generatedAt: new Date().toISOString(),
    mechanism: "option_d_view_signature_inventory",
    testedFailure: {
      pr313EvidenceHead: "bf2092b0ccdfb49daff329775972fd0a4ae1fde9",
      evidenceCommit: "70096c27344864b47b4eaa4d8694a2abbd3cc93e",
      failedAt: "20260720170000_ar_tieout2_runs_and_variances.sql",
      order: 89,
      sqlState: "42P16",
      error:
        'cannot change name of view column "tie_out_state" to "last_tie_out_run_id"',
    },
    view: "public.audit_ready_tie_out_summary",
    classification:
      "historically_invalid_create_or_replace_view_column_insertion_plus_git_production_divergence",
    rootCause:
      "Git migration uses CREATE OR REPLACE VIEW inserting last_tie_out_* columns before tie_out_state. PostgreSQL CREATE OR REPLACE VIEW is append-only for existing columns. Production schema_migrations already adapted to DROP VIEW IF EXISTS (no CASCADE) + CREATE VIEW.",
    creators: [
      {
        orderRole: "prior",
        filename: "20260720160000_ar_tieout1_policy_and_kind.sql",
        mode: "create_or_replace_view",
        columns: [
          "pbc_request_id",
          "engagement_id",
          "request_number",
          "request_description",
          "assertion_tags",
          "tie_out_kind",
          "tie_out_kind_confidence",
          "tie_out_kind_classifier",
          "tie_out_kind_classified_at",
          "pbc_status",
          "tie_out_state",
          "policy_mode",
          "auto_reconcile_max_dollar",
          "auto_reconcile_max_percent",
          "kickout_min_dollar",
          "kickout_min_percent",
          "authoritative_comparison",
        ],
        securityInvoker: true,
      },
      {
        orderRole: "failing_git",
        filename: "20260720170000_ar_tieout2_runs_and_variances.sql",
        mode: "create_or_replace_view",
        insertsBefore: "tie_out_state",
        insertedColumns: [
          "last_tie_out_run_id",
          "last_tie_out_status",
          "last_tie_out_at",
        ],
        incompatibleWithPrior: true,
      },
      {
        orderRole: "authoritative_production",
        productionVersion: EXPECTED.version,
        productionName: EXPECTED.name,
        mode: "drop_view_if_exists_then_create_view",
        dropCascade: false,
        securityInvoker: true,
        statementsBytes: EXPECTED.statementsBytes,
        statementsMd5: EXPECTED.statementsMd5,
        statementsSha256: EXPECTED.statementsSha256,
        statementCount: EXPECTED.statementCount,
        containsCredentials: false,
        containsTenantRows: false,
      },
    ],
    gitOriginal: {
      path: "supabase/migrations/20260720170000_ar_tieout2_runs_and_variances.sql",
      bytes: gitBuf.length,
      sha256: crypto.createHash("sha256").update(gitBuf).digest("hex"),
      md5: crypto.createHash("md5").update(gitBuf).digest("hex"),
    },
    substitution: {
      path: path.relative(ROOT, OUT).replace(/\\/g, "/"),
      bytes: buf.length,
      sha256,
      md5,
      matchesProductionStatements: true,
    },
    policy: {
      admit: "production DROP VIEW IF EXISTS (no CASCADE) + CREATE VIEW + security_invoker",
      reject: [
        "unconditional_drop_view_cascade",
        "create_or_replace_with_column_insert_or_reorder",
        "security_invoker_weakening",
        "placeholder_view",
      ],
    },
  };
  fs.writeFileSync(META, JSON.stringify(inventory, null, 2) + "\n");
  // Keep header note for humans next to substitution (markdown provenance already in META)
  fs.writeFileSync(
    path.join(
      ROOT,
      "docs/migration-remediation/option-d-ar-tieout2-view-remediation.md",
    ),
    `# Option D audit_ready_tie_out_summary remediation (order 89)

**Tested failure HEAD:** \`bf2092b0ccdfb49daff329775972fd0a4ae1fde9\`  
**Evidence:** \`option-d-runtime-evidence-2026-09-03h.md\` (SQLSTATE 42P16)

## Root cause

**historically invalid CREATE OR REPLACE VIEW** (column insertion/reorder) **plus git↔production divergence**.

| Stage | DDL |
|-------|-----|
| Order 88 (\`ar_tieout1\`) | \`CREATE OR REPLACE VIEW\` ends \`… pbc_status, tie_out_state, policy_mode…\` |
| Order 89 git | \`CREATE OR REPLACE VIEW\` inserts \`last_tie_out_*\` **before** \`tie_out_state\` → 42P16 |
| Production \`20260720212538\` | \`DROP VIEW IF EXISTS …\` (**no CASCADE**) + \`CREATE VIEW\` + \`security_invoker=true\` |

## Remediation

Option D substitution uses the **exact** production \`schema_migrations.statements[1]\` body:

- version \`20260720212538\` / name \`ar_tieout2_runs_and_variances\`
- bytes \`${EXPECTED.statementsBytes}\` / MD5 \`${EXPECTED.statementsMd5}\` / SHA-256 \`${EXPECTED.statementsSha256}\`
- No credentials or tenant rows
- Active \`supabase/migrations/\` unchanged

Consumers select by column name (\`select('*')\` / \`tie_out_state\`); recreation preserves names, types, and \`security_invoker\`.
`,
  );
  console.log(
    JSON.stringify(
      {
        ok: true,
        out: path.relative(ROOT, OUT).replace(/\\/g, "/"),
        bytes: buf.length,
        sha256,
        md5,
      },
      null,
      2,
    ),
  );
}

main();
