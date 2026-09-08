#!/usr/bin/env node
/**
 * Disposable local rehearsal for Stage-1 credential browser containment.
 * Uses a temporary Postgres Docker container. No production contact.
 */
const { spawnSync, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { Client } = require("pg");

const ROOT = path.resolve(__dirname, "../..");
const DOC = path.join(ROOT, "docs/security/connection-credential-browser-containment");
const MIGRATION = path.join(
  ROOT,
  "supabase/migrations/20260908031736_connection_credential_browser_containment.sql",
);
const FIXTURE = path.join(DOC, "LOCAL_FIXTURE_SCHEMA.sql");
const ROLLBACK = path.join(DOC, "ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql");
const CONTRACT = path.join(DOC, "PRE_CHANGE_CONTRACT.json");
const EVIDENCE = path.join(DOC, "LOCAL_REHEARSAL_EVIDENCE.json");

const CONTAINER = `cred-contain-rehearse-${crypto.randomBytes(4).toString("hex")}`;
const PG_PORT = String(55432 + Math.floor(Math.random() * 200));
const PG_URL = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`;

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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

function assertNoCascade(sql) {
  if (/\bDROP\s+(VIEW|TABLE|SCHEMA|FUNCTION|MATERIALIZED\s+VIEW)\b[\s\S]{0,200}?\bCASCADE\b/i.test(sql)) {
    throw new Error("DROP ... CASCADE detected in SQL artifact");
  }
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
      pg_get_viewdef('public.qbo_connections_unified'::regclass, true) as view_def
  `);
  return rows[0];
}

async function main() {
  const evidence = {
    started_at: new Date().toISOString(),
    container: CONTAINER,
    pg_port: PG_PORT,
    seals: {
      pre_change_contract_sha256: sha256File(CONTRACT),
      forward_migration_sha256: sha256File(MIGRATION),
      rollback_sha256: sha256File(ROLLBACK),
      fixture_sha256: sha256File(FIXTURE),
    },
    steps: {},
  };

  assertNoCascade(fs.readFileSync(MIGRATION, "utf8"));
  assertNoCascade(fs.readFileSync(ROLLBACK, "utf8"));

  let dockerStarted = false;
  try {
    docker(["version"], { timeoutMs: 15000 });
  } catch (err) {
    evidence.verdict = "LOCAL_REHEARSAL_BLOCKED";
    evidence.reason = `Docker unavailable: ${err.message}`;
    fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
    console.error(JSON.stringify({ verdict: evidence.verdict, reason: evidence.reason }, null, 2));
    process.exit(2);
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
      await client.query(fs.readFileSync(FIXTURE, "utf8"));
      evidence.steps.fixture_applied = true;

      const before = await probePrivileges(client);
      if (!before.auth_ac_tok || !before.auth_qb_tok) {
        throw new Error("Fixture did not establish browser token SELECT exposure");
      }
      evidence.steps.prechange_contract_verified = {
        browser_token_select: true,
        view_has_tokens: /access_token|refresh_token/i.test(before.view_def),
      };

      await client.query(fs.readFileSync(MIGRATION, "utf8"));
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

      // Service-role fake row ops (boolean presence only; do not log token bodies)
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

      // Negative probes as authenticated: expect privilege denial, no body logging
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

      await client.query(fs.readFileSync(ROLLBACK, "utf8"));
      evidence.steps.rollback_applied = true;
      const rolled = await probePrivileges(client);
      if (!rolled.auth_ac_tok || !/access_token/i.test(rolled.view_def)) {
        throw new Error("Rollback did not restore sealed exposure contract");
      }
      evidence.steps.rollback_restored_contract = true;

      await client.query(fs.readFileSync(MIGRATION, "utf8"));
      const reapplied = await probePrivileges(client);
      if (reapplied.auth_ac_tok || /access_token/i.test(reapplied.view_def)) {
        throw new Error("Reapply forward migration did not re-contain");
      }
      evidence.steps.reapply_ok = true;
    });

    evidence.verdict = "LOCAL_REHEARSAL_PASS";
    evidence.finished_at = new Date().toISOString();
    fs.writeFileSync(EVIDENCE, JSON.stringify(evidence, null, 2));
    console.log(JSON.stringify({ verdict: evidence.verdict, seals: evidence.seals }, null, 2));
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
        // ignore cleanup failures; container is --rm
      }
    }
  }
}

main();
