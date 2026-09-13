#!/usr/bin/env node
/**
 * Disposable local rehearsal for Stage-1 credential browser containment.
 * SQL authority: git cat-file blob ONLY (never worktree filesystem bytes).
 * Uses a temporary Postgres Docker container. No production contact.
 */
"use strict";

const { spawnSync, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const {
  ARTIFACT_COMMIT,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  ROLLBACK_PATH,
  CONTRACT_PATH,
  FIXTURE_PATH,
} = require("./credential-browser-containment-constants");
const {
  ROOT,
  loadAndVerifyGitBlob,
  assertNoDropCascade,
} = require("./git-blob-authority");

const DOC = path.join(ROOT, "docs/security/connection-credential-browser-containment");
const EVIDENCE = path.join(DOC, "LOCAL_REHEARSAL_EVIDENCE.json");

const CONTAINER = `cred-contain-rehearse-${crypto.randomBytes(4).toString("hex")}`;
const PG_PORT = String(55432 + Math.floor(Math.random() * 200));
const PG_URL = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`;

function resolveHeadCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
}

function resolveArtifactCommit(seals) {
  const fromEnv = process.env.CONTAINMENT_ARTIFACT_COMMIT;
  if (fromEnv) return fromEnv;
  if (seals?.commit1_sha) return seals.commit1_sha;
  return ARTIFACT_COMMIT;
}

function docker(args, opts = {}) {
  const r = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: opts.timeoutMs ?? 120000,
    windowsHide: true,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    throw new Error(`docker ${args.join(" ")} failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

async function withClient(fn) {
  const client = new Client({ connectionString: PG_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function waitReady(attempts = 40) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      await withClient(async (c) => {
        await c.query("select 1");
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error("Postgres container did not become ready");
}

async function probePrivileges(client) {
  const { rows } = await client.query(`
    select
      has_column_privilege('anon','public.accounting_connections','access_token','SELECT') as anon_ac_tok,
      has_column_privilege('authenticated','public.accounting_connections','access_token','SELECT') as auth_ac_tok,
      has_column_privilege('anon','public.quickbooks_connections','access_token','SELECT') as anon_qb_tok,
      has_column_privilege('authenticated','public.quickbooks_connections','access_token','SELECT') as auth_qb_tok,
      has_table_privilege('anon','public.accounting_connections','UPDATE') as anon_ac_upd,
      has_table_privilege('authenticated','public.accounting_connections','UPDATE') as auth_ac_upd,
      has_table_privilege('anon','public.qbo_connections_unified','SELECT') as anon_view,
      has_table_privilege('authenticated','public.qbo_connections_unified','SELECT') as auth_view,
      has_table_privilege('service_role','public.accounting_connections','SELECT') as svc_ac_sel,
      has_table_privilege('service_role','public.accounting_connections','UPDATE') as svc_ac_upd,
      has_table_privilege('service_role','public.quickbooks_connections','SELECT') as svc_qb_sel,
      has_table_privilege('service_role','public.qbo_connections_unified','SELECT') as svc_view,
      (select reloptions::text from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='qbo_connections_unified') as view_opts,
      pg_get_viewdef('public.qbo_connections_unified'::regclass, true) as view_def,
      exists(
        select 1 from pg_policy p
        join pg_class cl on cl.oid=p.polrelid
        join pg_namespace n on n.oid=cl.relnamespace
        where n.nspname='public' and cl.relname='accounting_connections'
          and p.polname='users can read their accounting connection metadata'
      ) as residual_select
  `);
  return rows[0];
}

function loadPinnedArtifacts() {
  // SEALS.json is published at PR HEAD (Commit-2); sealed SQL lives at commit1.
  const head = resolveHeadCommit();
  const sealsLoaded = loadAndVerifyGitBlob({
    commit: head,
    path: "docs/security/connection-credential-browser-containment/SEALS.json",
  });
  const seals = JSON.parse(sealsLoaded.buffer.toString("utf8"));
  if (seals.seal_status !== "COMMITTED_BLOB_SEALED") {
    throw new Error(`SEALS not COMMITTED_BLOB_SEALED (got ${seals.seal_status})`);
  }

  const artifactCommit = resolveArtifactCommit(seals);

  const migration = loadAndVerifyGitBlob({
    commit: artifactCommit,
    path: MIGRATION_PATH,
    expectedOid: seals.git_blob_oids.forward_migration || MIGRATION_BLOB_OID,
    expectedSha256: seals.seals_sha256.forward_migration || MIGRATION_SHA256,
    expectedBytes: seals.byte_lengths.forward_migration || MIGRATION_BYTES,
  });

  const rollback = loadAndVerifyGitBlob({
    commit: artifactCommit,
    path: ROLLBACK_PATH,
    expectedOid: seals.git_blob_oids.rollback,
    expectedSha256: seals.seals_sha256.rollback,
    expectedBytes: seals.byte_lengths.rollback,
  });

  const contract = loadAndVerifyGitBlob({
    commit: artifactCommit,
    path: CONTRACT_PATH,
    expectedOid: seals.git_blob_oids.pre_change_contract,
    expectedSha256: seals.seals_sha256.pre_change_contract,
    expectedBytes: seals.byte_lengths.pre_change_contract,
  });

  const fixture = loadAndVerifyGitBlob({
    commit: artifactCommit,
    path: FIXTURE_PATH,
  });

  return {
    seals,
    head,
    artifactCommit,
    migration,
    rollback,
    contract,
    fixture,
  };
}

async function main() {
  const evidence = {
    started_at: new Date().toISOString(),
    container: CONTAINER,
    pg_port: PG_PORT,
    source_authority: "git_blob",
    sqlApplicationAttempts: 0,
    steps: {},
  };

  let pinned;
  try {
    pinned = loadPinnedArtifacts();
  } catch (err) {
    evidence.verdict = "LOCAL_REHEARSAL_BLOCKED_PIN_MISMATCH";
    evidence.error = err.message;
    evidence.sqlApplicationAttempts = 0;
    fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
    console.error(JSON.stringify({ verdict: evidence.verdict, error: err.message, sqlApplicationAttempts: 0 }, null, 2));
    process.exit(2);
    return;
  }

  evidence.artifact_commit = pinned.artifactCommit;
  evidence.pr_head = pinned.head;
  evidence.seals = {
    pre_change_contract_sha256: pinned.contract.sha256,
    forward_migration_sha256: pinned.migration.sha256,
    rollback_sha256: pinned.rollback.sha256,
    fixture_sha256: pinned.fixture.sha256,
    forward_migration_oid: pinned.migration.oid,
    rollback_oid: pinned.rollback.oid,
    contract_oid: pinned.contract.oid,
  };
  evidence.source = {
    kind: "git_blob",
    seals_commit: pinned.head,
    artifact_commit: pinned.artifactCommit,
  };

  const migrationSql = pinned.migration.buffer.toString("utf8");
  const rollbackSql = pinned.rollback.buffer.toString("utf8");
  const fixtureSql = pinned.fixture.buffer.toString("utf8");
  assertNoDropCascade(migrationSql);
  assertNoDropCascade(rollbackSql);

  let dockerStarted = false;
  try {
    docker(["version"], { timeoutMs: 15000 });
  } catch (err) {
    evidence.verdict = "LOCAL_REHEARSAL_BLOCKED";
    evidence.reason = `Docker unavailable: ${err.message}`;
    evidence.sqlApplicationAttempts = 0;
    fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
    console.error(JSON.stringify({ verdict: evidence.verdict, reason: evidence.reason }, null, 2));
    process.exit(2);
    return;
  }

  try {
    docker([
      "run",
      "-d",
      "--rm",
      "--name",
      CONTAINER,
      "-e",
      "POSTGRES_PASSWORD=postgres",
      "-p",
      `${PG_PORT}:5432`,
      "postgres:15-alpine",
    ]);
    dockerStarted = true;
    await waitReady();
    evidence.steps.container_ready = true;

    await withClient(async (client) => {
      await client.query(fixtureSql);
      evidence.steps.fixture_applied = true;

      const before = await probePrivileges(client);
      if (!before.auth_ac_tok || !before.auth_qb_tok) {
        throw new Error("Fixture did not establish browser token SELECT exposure");
      }
      evidence.steps.prechange_contract_verified = {
        browser_token_select: true,
        view_has_tokens: /access_token|refresh_token/i.test(before.view_def),
        residual_select: before.residual_select === true,
      };

      evidence.sqlApplicationAttempts += 1;
      await client.query(migrationSql);
      evidence.steps.forward_applied = true;

      const after = await probePrivileges(client);
      const denials = {
        anon_ac_tok: after.anon_ac_tok === false,
        auth_ac_tok: after.auth_ac_tok === false,
        anon_qb_tok: after.anon_qb_tok === false,
        auth_qb_tok: after.auth_qb_tok === false,
        anon_ac_upd: after.anon_ac_upd === false,
        auth_ac_upd: after.auth_ac_upd === false,
        anon_view: after.anon_view === false,
        auth_view: after.auth_view === false,
        residual_select_gone: after.residual_select === false,
      };
      const serviceOk = {
        svc_ac_sel: after.svc_ac_sel === true,
        svc_ac_upd: after.svc_ac_upd === true,
        svc_qb_sel: after.svc_qb_sel === true,
        svc_view: after.svc_view === true,
        security_invoker: String(after.view_opts || "").includes("security_invoker=true"),
        view_no_tokens: !/access_token|refresh_token/i.test(after.view_def),
      };
      if (Object.values(denials).some((v) => !v) || Object.values(serviceOk).some((v) => !v)) {
        throw new Error(`Forward assertions failed: ${JSON.stringify({ denials, serviceOk })}`);
      }
      evidence.steps.forward_assertions = { denials, serviceOk };

      await client.query("SET ROLE service_role");
      const { rows: svcRows } = await client.query(`
        select
          (access_token is not null) as has_access,
          (refresh_token is not null) as has_refresh
        from public.accounting_connections
        where id = '11111111-1111-1111-1111-111111111111'
      `);
      const { rows: viewRows } = await client.query(`
        select connection_id, user_id, realm_id, status, token_expiry is not null as has_expiry
        from public.qbo_connections_unified
        limit 1
      `);
      await client.query(`
        update public.accounting_connections
        set updated_at = now()
        where id = '11111111-1111-1111-1111-111111111111'
      `);
      await client.query("RESET ROLE");
      evidence.steps.service_role_ops = {
        row_token_presence_booleans: svcRows[0],
        view_consumer_shape: viewRows[0],
        update_ok: true,
      };

      await client.query("SET ROLE authenticated");
      let denied = false;
      try {
        await client.query("select access_token from public.accounting_connections limit 1");
      } catch {
        denied = true;
      }
      await client.query("RESET ROLE");
      if (!denied) throw new Error("authenticated SELECT access_token was not denied");
      evidence.steps.authenticated_negative_probe = { token_select_denied: true };

      evidence.sqlApplicationAttempts += 1;
      await client.query(rollbackSql);
      evidence.steps.rollback_applied = true;
      const rolled = await probePrivileges(client);
      if (!rolled.auth_ac_tok || !/access_token/i.test(rolled.view_def) || !rolled.residual_select) {
        throw new Error("Rollback did not restore sealed exposure contract");
      }
      evidence.steps.rollback_restored_contract = true;

      evidence.sqlApplicationAttempts += 1;
      await client.query(migrationSql);
      const reapplied = await probePrivileges(client);
      if (reapplied.auth_ac_tok || /access_token/i.test(reapplied.view_def) || reapplied.residual_select) {
        throw new Error("Reapply forward migration did not re-contain");
      }
      evidence.steps.reapply_ok = true;
    });

    evidence.verdict = "LOCAL_REHEARSAL_PASS_FROM_COMMIT_GIT_BLOBS";
    evidence.finished_at = new Date().toISOString();
    fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
    console.log(
      JSON.stringify(
        {
          verdict: evidence.verdict,
          source_authority: evidence.source_authority,
          seals: evidence.seals,
          sqlApplicationAttempts: evidence.sqlApplicationAttempts,
        },
        null,
        2,
      ),
    );
  } catch (err) {
    evidence.verdict = evidence.verdict || "LOCAL_REHEARSAL_FAIL";
    evidence.error = err.message;
    evidence.finished_at = new Date().toISOString();
    fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
    console.error(JSON.stringify({ verdict: evidence.verdict, error: err.message }, null, 2));
    process.exitCode = 1;
  } finally {
    if (dockerStarted) {
      try {
        execFileSync("docker", ["rm", "-f", CONTAINER], {
          encoding: "utf8",
          timeout: 30000,
          windowsHide: true,
          stdio: "ignore",
        });
        evidence.steps.cleanup = true;
        fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
      } catch {
        // ignore
      }
    }
  }
}

main();
