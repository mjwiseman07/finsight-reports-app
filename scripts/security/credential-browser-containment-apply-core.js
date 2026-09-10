/**
 * GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY core (testable).
 * Default path is dry-run/read-only. Never logs credentials or token values.
 */
"use strict";

const { Client } = require("pg");
const {
  ADVISORY_LOCK,
  EXPECTED_PROJECT_REF,
  PRIOR_HISTORY_COUNT,
  MIGRATION_VERSION,
  MIGRATION_NAME,
  TARGET2,
  CONTRACT_PATH,
} = require("./credential-browser-containment-constants");
const {
  loadAndVerifyGitBlob,
  stripOuterBeginCommit,
  assertNoDropCascade,
  sha256Buffer,
} = require("./git-blob-authority");

function sanitizeError(err) {
  const msg = String(err && err.message ? err.message : err);
  return msg
    .replace(/postgres(?:ql)?:\/\/[^\s)]+/gi, "postgres://***")
    .replace(/password=[^&\s]+/gi, "password=***")
    .replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer ***");
}

function redactedUrl(_url) {
  return "postgres://***redacted***";
}

function buildEvidenceBase(inputs) {
  return {
    mechanism: "GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY",
    mode: inputs.mode,
    project_ref_expected: EXPECTED_PROJECT_REF,
    project_ref_provided: inputs.projectRef,
    pr_head: inputs.prHead,
    artifact_commit: inputs.artifactCommit,
    migration_path: inputs.migrationPath,
    migration_version: inputs.version,
    migration_name: inputs.name,
    advisory_lock: {
      name: ADVISORY_LOCK.name,
      key1: ADVISORY_LOCK.key1,
      key2: ADVISORY_LOCK.key2,
    },
    source_authority: null,
    sqlApplicationAttempts: 0,
    database_url: redactedUrl(inputs.databaseUrl),
  };
}

function assertInputPins(inputs) {
  const required = [
    "mode",
    "projectRef",
    "prHead",
    "artifactCommit",
    "migrationPath",
    "migrationBlobOid",
    "migrationSha256",
    "migrationBytes",
    "version",
    "name",
    "databaseUrl",
  ];
  for (const k of required) {
    if (inputs[k] === undefined || inputs[k] === null || inputs[k] === "") {
      const e = new Error(`MISSING_INPUT: ${k}`);
      e.code = "MISSING_INPUT";
      throw e;
    }
  }
  if (inputs.projectRef !== EXPECTED_PROJECT_REF) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: project ref got ${inputs.projectRef}, expected ${EXPECTED_PROJECT_REF}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.version !== MIGRATION_VERSION) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: version got ${inputs.version}, expected ${MIGRATION_VERSION}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.name !== MIGRATION_NAME) {
    const e = new Error(
      `BLOCKED_PIN_MISMATCH: name got ${inputs.name}, expected ${MIGRATION_NAME}`,
    );
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (!/^[0-9a-f]{40}$/i.test(inputs.prHead)) {
    const e = new Error("BLOCKED_PIN_MISMATCH: prHead must be full 40-char SHA");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (!/^[0-9a-f]{40}$/i.test(inputs.artifactCommit)) {
    const e = new Error("BLOCKED_PIN_MISMATCH: artifactCommit must be full 40-char SHA");
    e.code = "BLOCKED_PIN_MISMATCH";
    throw e;
  }
  if (inputs.mode === "apply" && !inputs.applyAuthorized) {
    const e = new Error("APPLY_NOT_AUTHORIZED: pass apply opt-in flag for real apply");
    e.code = "APPLY_NOT_AUTHORIZED";
    throw e;
  }
}

async function withClient(databaseUrl, fn) {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function captureHistoryManifest(client) {
  const { rows } = await client.query(`
    SELECT version, name, statements
    FROM supabase_migrations.schema_migrations
    ORDER BY version ASC
  `);
  return rows.map((r) => {
    const statements = r.statements || [];
    const joined = statements.join("\n");
    return {
      version: r.version,
      name: r.name,
      statement_count: statements.length,
      statements_digest: sha256Buffer(Buffer.from(joined, "utf8")),
    };
  });
}

async function assertVersionAbsent(client, version) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations WHERE version = $1`,
    [version],
  );
  if (rows[0].c !== 0) {
    throw new Error(`VERSION_ALREADY_PRESENT: ${version}`);
  }
}

async function assertHistoryCount(client, expected) {
  const { rows } = await client.query(
    `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations`,
  );
  if (rows[0].c !== expected) {
    throw new Error(`HISTORY_COUNT_MISMATCH: got ${rows[0].c}, expected ${expected}`);
  }
}

/**
 * Catalog probes matching sealed pre-change exposure (metadata only).
 */
async function probePreChangeContract(client) {
  const { rows } = await client.query(`
    SELECT
      has_column_privilege('authenticated','public.accounting_connections','access_token','SELECT') AS auth_ac_tok,
      has_column_privilege('authenticated','public.quickbooks_connections','access_token','SELECT') AS auth_qb_tok,
      has_table_privilege('authenticated','public.accounting_connections','SELECT') AS auth_ac_sel,
      has_table_privilege('anon','public.accounting_connections','SELECT') AS anon_ac_sel,
      EXISTS (
        SELECT 1 FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'accounting_connections'
          AND p.polname = 'users can read their accounting connection metadata'
      ) AS residual_select_policy,
      EXISTS (
        SELECT 1 FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'quickbooks_connections'
          AND p.polname = 'Users can access own QB connection'
      ) AS qb_browser_policy,
      (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public' AND c.relname='accounting_connections') AS ac_rls,
      (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public' AND c.relname='quickbooks_connections') AS qb_rls,
      (SELECT c.relowner::regrole::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public' AND c.relname='qbo_connections_unified') AS view_owner,
      (SELECT c.reloptions FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public' AND c.relname='qbo_connections_unified') AS view_opts,
      position('access_token' IN pg_get_viewdef('public.qbo_connections_unified'::regclass, true)) > 0 AS view_has_access_token,
      position('refresh_token' IN pg_get_viewdef('public.qbo_connections_unified'::regclass, true)) > 0 AS view_has_refresh_token,
      (
        SELECT count(*) FROM pg_depend d
        JOIN pg_rewrite r ON r.oid = d.objid
        JOIN pg_class c ON c.oid = r.ev_class
        WHERE d.refobjid = 'public.qbo_connections_unified'::regclass
          AND c.oid <> 'public.qbo_connections_unified'::regclass
          AND d.deptype <> 'i'
      )::int AS view_dependents
  `);
  return rows[0];
}

function assertPreChangeMatch(probe) {
  if (
    !probe.auth_ac_tok ||
    !probe.auth_qb_tok ||
    !probe.auth_ac_sel ||
    !probe.anon_ac_sel ||
    !probe.residual_select_policy ||
    !probe.qb_browser_policy ||
    !probe.ac_rls ||
    !probe.qb_rls ||
    !probe.view_has_access_token ||
    !probe.view_has_refresh_token ||
    Number(probe.view_dependents) !== 0
  ) {
    throw new Error(
      `PRE_CHANGE_CONTRACT_MISMATCH: ${JSON.stringify({
        auth_ac_tok: probe.auth_ac_tok,
        auth_qb_tok: probe.auth_qb_tok,
        residual_select_policy: probe.residual_select_policy,
        view_has_access_token: probe.view_has_access_token,
        view_dependents: probe.view_dependents,
      })}`,
    );
  }
  const opts = probe.view_opts || [];
  if (!Array.isArray(opts) || !opts.includes("security_invoker=true")) {
    throw new Error("PRE_CHANGE_CONTRACT_MISMATCH: security_invoker missing on view");
  }
}

/**
 * Target #2 check: booleans/fingerprints only — never selects token columns.
 */
async function probeTarget2(client, fingerprint = TARGET2.fingerprint) {
  const { rows } = await client.query(
    `
    SELECT
      count(*) FILTER (
        WHERE provider = $1
          AND provider_environment = $2
          AND status = $3
          AND (
            external_entity_id = $4
            OR tenant_or_realm_id = $4
            OR coalesce(metadata_json->>'fingerprint','') = $4
          )
      )::int AS matching_rows,
      count(*) FILTER (
        WHERE provider = $1
          AND provider_environment = $2
          AND status = $3
          AND (
            external_entity_id = $4
            OR tenant_or_realm_id = $4
            OR coalesce(metadata_json->>'fingerprint','') = $4
          )
          AND access_token IS NOT NULL
          AND refresh_token IS NOT NULL
      )::int AS matching_with_token_presence
    FROM public.accounting_connections
    `,
    [TARGET2.provider, TARGET2.provider_environment, TARGET2.status, fingerprint],
  );
  return {
    fingerprint,
    matching_rows: rows[0].matching_rows,
    has_token_presence_boolean: rows[0].matching_with_token_presence > 0,
    // never emit token values
  };
}

function assertTarget2Ok(probe) {
  if (probe.matching_rows !== 1) {
    throw new Error(
      `TARGET2_BINDING_MISMATCH: expected exactly 1 sandbox/connected fingerprint row, got ${probe.matching_rows}`,
    );
  }
}

async function assertContainedPrivileges(client) {
  const { rows } = await client.query(`
    SELECT
      has_table_privilege('authenticated','public.accounting_connections','SELECT') AS auth_sel,
      has_column_privilege('authenticated','public.accounting_connections','access_token','SELECT') AS auth_tok,
      has_table_privilege('authenticated','public.qbo_connections_unified','SELECT') AS auth_view,
      has_table_privilege('service_role','public.accounting_connections','UPDATE') AS svc_upd,
      has_table_privilege('service_role','public.qbo_connections_unified','SELECT') AS svc_view,
      EXISTS (
        SELECT 1 FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public' AND c.relname='accounting_connections'
          AND p.polname='users can read their accounting connection metadata'
      ) AS residual_select,
      (
        SELECT count(*) FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname='public'
          AND c.relname IN ('accounting_connections','quickbooks_connections')
          AND p.polname NOT IN (
            'service_role_all_accounting_connections',
            'service_role_all_quickbooks_connections'
          )
      )::int AS non_service_policies,
      position('access_token' IN pg_get_viewdef('public.qbo_connections_unified'::regclass, true)) > 0 AS view_tok
  `);
  const r = rows[0];
  if (
    r.auth_sel ||
    r.auth_tok ||
    r.auth_view ||
    !r.svc_upd ||
    !r.svc_view ||
    r.residual_select ||
    Number(r.non_service_policies) !== 0 ||
    r.view_tok
  ) {
    throw new Error(`POST_APPLY_ASSERT_FAIL: ${JSON.stringify(r)}`);
  }
}

function manifestsEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (
      a[i].version !== b[i].version ||
      a[i].name !== b[i].name ||
      a[i].statement_count !== b[i].statement_count ||
      a[i].statements_digest !== b[i].statements_digest
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Load migration blob and verify pins. Does not open a database.
 */
function loadSealedMigration(inputs) {
  assertInputPins(inputs);
  const loaded = loadAndVerifyGitBlob({
    commit: inputs.artifactCommit,
    path: inputs.migrationPath,
    expectedOid: inputs.migrationBlobOid,
    expectedSha256: inputs.migrationSha256,
    expectedBytes: inputs.migrationBytes,
    cwd: inputs.cwd,
  });
  const fullSql = loaded.buffer.toString("utf8");
  assertNoDropCascade(fullSql);
  const innerSql = stripOuterBeginCommit(fullSql);
  return { loaded, fullSql, innerSql };
}

async function runDryRun(inputs) {
  const evidence = buildEvidenceBase(inputs);
  evidence.mode = "dry-run";

  let packed;
  try {
    packed = loadSealedMigration(inputs);
  } catch (err) {
    evidence.verdict = "DRY_RUN_BLOCKED";
    evidence.error = sanitizeError(err);
    evidence.error_code = err.code || "PIN_OR_LOAD_FAIL";
    evidence.sqlApplicationAttempts = 0;
    return evidence;
  }

  evidence.source_authority = {
    kind: "git_blob",
    commit: packed.loaded.commit,
    path: packed.loaded.path,
    oid: packed.loaded.oid,
    sha256: packed.loaded.sha256,
    bytes: packed.loaded.bytes,
  };

  try {
    await withClient(inputs.databaseUrl, async (client) => {
      await client.query("SET default_transaction_read_only = on");
      await assertVersionAbsent(client, inputs.version);
      await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
      const manifest = await captureHistoryManifest(client);
      evidence.prior_history_manifest = manifest;
      evidence.prior_history_count = manifest.length;

      const probe = await probePreChangeContract(client);
      assertPreChangeMatch(probe);
      evidence.pre_change_probe = {
        residual_select_policy: probe.residual_select_policy,
        qb_browser_policy: probe.qb_browser_policy,
        auth_token_select: probe.auth_ac_tok,
        view_has_tokens: probe.view_has_access_token && probe.view_has_refresh_token,
        view_dependents: Number(probe.view_dependents),
        ac_rls: probe.ac_rls,
        qb_rls: probe.qb_rls,
        view_owner: probe.view_owner,
      };

      if (!inputs.skipTarget2Check) {
        const t2 = await probeTarget2(client, inputs.target2Fingerprint || TARGET2.fingerprint);
        assertTarget2Ok(t2);
        evidence.target2 = {
          fingerprint: t2.fingerprint,
          matching_rows: t2.matching_rows,
          has_token_presence_boolean: t2.has_token_presence_boolean,
        };
      }

      // Prove no mutation in dry-run
      await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
      await assertVersionAbsent(client, inputs.version);
    });

    evidence.sqlApplicationAttempts = 0;
    evidence.verdict = "DRY_RUN_READY";
  } catch (err) {
    evidence.verdict = "DRY_RUN_BLOCKED";
    evidence.error = sanitizeError(err);
    evidence.error_code = err.code || "DRY_RUN_FAIL";
    evidence.sqlApplicationAttempts = 0;
  }
  return evidence;
}

async function runApply(inputs) {
  const evidence = buildEvidenceBase(inputs);
  evidence.mode = "apply";

  let packed;
  try {
    packed = loadSealedMigration(inputs);
  } catch (err) {
    evidence.verdict = "APPLY_BLOCKED";
    evidence.error = sanitizeError(err);
    evidence.error_code = err.code || "PIN_OR_LOAD_FAIL";
    evidence.sqlApplicationAttempts = 0;
    return evidence;
  }

  evidence.source_authority = {
    kind: "git_blob",
    commit: packed.loaded.commit,
    path: packed.loaded.path,
    oid: packed.loaded.oid,
    sha256: packed.loaded.sha256,
    bytes: packed.loaded.bytes,
  };

  let priorManifest = null;

  try {
    await withClient(inputs.databaseUrl, async (client) => {
      // Single connection for the write transaction
      await client.query("BEGIN");
      await client.query("SET LOCAL statement_timeout = '15s'");
      await client.query("SET LOCAL lock_timeout = '5s'");
      await client.query("SELECT pg_advisory_xact_lock($1::int, $2::int)", [
        ADVISORY_LOCK.key1,
        ADVISORY_LOCK.key2,
      ]);

      await assertVersionAbsent(client, inputs.version);
      await assertHistoryCount(client, PRIOR_HISTORY_COUNT);
      priorManifest = await captureHistoryManifest(client);
      evidence.prior_history_count = priorManifest.length;

      const probe = await probePreChangeContract(client);
      assertPreChangeMatch(probe);

      if (!inputs.skipTarget2Check) {
        const t2 = await probeTarget2(client, inputs.target2Fingerprint || TARGET2.fingerprint);
        assertTarget2Ok(t2);
        evidence.target2 = {
          fingerprint: t2.fingerprint,
          matching_rows: t2.matching_rows,
          has_token_presence_boolean: t2.has_token_presence_boolean,
        };
      }

      if (inputs.injectFailure === "before_sql") {
        throw new Error("INJECTED_FAILURE_BEFORE_SQL");
      }

      evidence.sqlApplicationAttempts = 1;
      await client.query(packed.innerSql);

      if (inputs.injectFailure === "before_history") {
        throw new Error("INJECTED_FAILURE_BEFORE_HISTORY");
      }

      // Parameterized insert of the COMPLETE unmodified migration file
      await client.query(
        `INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
         VALUES ($1, $2, ARRAY[$3]::text[])`,
        [inputs.version, inputs.name, packed.fullSql],
      );

      if (inputs.injectFailure === "after_history") {
        throw new Error("INJECTED_FAILURE_AFTER_HISTORY");
      }

      if (inputs.injectFailure === "mutate_prior") {
        // Detectable prior-history mutation attempt — must roll back
        const victim = priorManifest[0];
        if (victim) {
          await client.query(
            `UPDATE supabase_migrations.schema_migrations
             SET name = name || '_MUTATED'
             WHERE version = $1`,
            [victim.version],
          );
        }
      }

      const { rows: stored } = await client.query(
        `SELECT version, name, statements
         FROM supabase_migrations.schema_migrations
         WHERE version = $1`,
        [inputs.version],
      );
      if (stored.length !== 1) {
        throw new Error("HISTORY_INSERT_VERIFY_FAIL: version row count != 1");
      }
      const stmts = stored[0].statements || [];
      if (stmts.length !== 1) {
        throw new Error(`HISTORY_INSERT_VERIFY_FAIL: statement count ${stmts.length} != 1`);
      }
      if (stmts[0] !== packed.fullSql) {
        throw new Error("HISTORY_INSERT_VERIFY_FAIL: statements[1] != sealed full migration file");
      }
      if (sha256Buffer(Buffer.from(stmts[0], "utf8")) !== packed.loaded.sha256) {
        throw new Error("HISTORY_INSERT_VERIFY_FAIL: stored statement digest mismatch");
      }
      if (Buffer.byteLength(stmts[0], "utf8") !== packed.loaded.bytes) {
        throw new Error("HISTORY_INSERT_VERIFY_FAIL: stored statement byte length mismatch");
      }

      const postManifest = await captureHistoryManifest(client);
      const priorOnly = postManifest.filter((r) => r.version !== inputs.version);
      if (!manifestsEqual(priorOnly, priorManifest)) {
        throw new Error("PRIOR_HISTORY_MUTATION_DETECTED");
      }
      if (postManifest.length !== PRIOR_HISTORY_COUNT + 1) {
        throw new Error(
          `HISTORY_COUNT_AFTER_MISMATCH: got ${postManifest.length}, expected ${PRIOR_HISTORY_COUNT + 1}`,
        );
      }

      await assertContainedPrivileges(client);

      await client.query("COMMIT");
      evidence.verdict = "APPLY_COMMITTED";
      evidence.stored_statement_digest = packed.loaded.sha256;
      evidence.stored_statement_bytes = packed.loaded.bytes;
    });
  } catch (err) {
    evidence.verdict = "APPLY_ROLLED_BACK";
    evidence.error = sanitizeError(err);
    evidence.error_code = err.code || "APPLY_FAIL";
    // Post-failure read-only verification on a fresh connection
    try {
      await withClient(inputs.databaseUrl, async (client) => {
        await client.query("SET default_transaction_read_only = on");
        const { rows } = await client.query(
          `SELECT count(*)::int AS c FROM supabase_migrations.schema_migrations WHERE version = $1`,
          [inputs.version],
        );
        evidence.rollback_verify = {
          version_absent: rows[0].c === 0,
        };
        try {
          const probe = await probePreChangeContract(client);
          assertPreChangeMatch(probe);
          evidence.rollback_verify.pre_change_restored = true;
        } catch (probeErr) {
          evidence.rollback_verify.pre_change_restored = false;
          evidence.rollback_verify.pre_change_error = sanitizeError(probeErr);
        }
        if (priorManifest) {
          const now = await captureHistoryManifest(client);
          evidence.rollback_verify.prior_manifest_unchanged = manifestsEqual(now, priorManifest);
        }
      });
    } catch (verifyErr) {
      evidence.rollback_verify = {
        error: sanitizeError(verifyErr),
      };
    }
  }

  return evidence;
}

/**
 * Entry: mode dry-run (default) or apply.
 */
async function runApplicator(inputs) {
  const mode = inputs.mode || "dry-run";
  if (mode === "dry-run") {
    return runDryRun({ ...inputs, mode: "dry-run" });
  }
  if (mode === "apply") {
    return runApply({ ...inputs, mode: "apply" });
  }
  const evidence = buildEvidenceBase({ ...inputs, mode });
  evidence.verdict = "BLOCKED";
  evidence.error = `unknown mode: ${mode}`;
  evidence.sqlApplicationAttempts = 0;
  return evidence;
}

module.exports = {
  runApplicator,
  runDryRun,
  runApply,
  loadSealedMigration,
  captureHistoryManifest,
  probePreChangeContract,
  probeTarget2,
  assertContainedPrivileges,
  assertPreChangeMatch,
  sanitizeError,
  ADVISORY_LOCK,
  CONTRACT_PATH,
};
