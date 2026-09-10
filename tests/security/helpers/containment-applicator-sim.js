/**
 * Local simulation harness helpers for the containment applicator.
 * Disposable Docker Postgres only — never production.
 */
"use strict";

const { spawnSync } = require("node:child_process");
const crypto = require("node:crypto");
const { Client } = require("pg");
const {
  ARTIFACT_COMMIT,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  MIGRATION_VERSION,
  MIGRATION_NAME,
  EXPECTED_PROJECT_REF,
  FIXTURE_PATH,
  PRIOR_HISTORY_COUNT,
  TARGET2,
  ADVISORY_LOCK,
  DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
} = require("../../../scripts/security/credential-browser-containment-constants.js");
const { loadAndVerifyGitBlob } = require("../../../scripts/security/git-blob-authority.js");

function docker(args, opts = {}) {
  const r = spawnSync("docker", args, {
    encoding: "utf8",
    timeout: opts.timeoutMs ?? 180000,
    windowsHide: true,
  });
  if (r.status !== 0) {
    throw new Error(r.stderr || r.stdout || `docker failed: ${args.join(" ")}`);
  }
  return r.stdout;
}

async function waitReady(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const c = new Client({ connectionString: url });
      await c.connect();
      await c.query("select 1");
      await c.end();
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 400));
    }
  }
  throw new Error("postgres not ready");
}

async function startDisposablePg() {
  const name = `cred-apply-sim-${crypto.randomBytes(3).toString("hex")}`;
  const port = String(56000 + Math.floor(Math.random() * 400));
  docker([
    "run",
    "-d",
    "--rm",
    "--name",
    name,
    "-e",
    "POSTGRES_PASSWORD=postgres",
    "-p",
    `${port}:5432`,
    "postgres:15-alpine",
  ]);
  const url = `postgres://postgres:postgres@127.0.0.1:${port}/postgres`;
  await waitReady(url);
  return {
    name,
    url,
    async stop() {
      spawnSync("docker", ["rm", "-f", name], { stdio: "ignore", windowsHide: true });
    },
  };
}

async function seedApplicatorWorld(client, opts = {}) {
  const historyCount = opts.historyCount ?? PRIOR_HISTORY_COUNT;
  const fixture = loadAndVerifyGitBlob({
    commit: ARTIFACT_COMMIT,
    path: FIXTURE_PATH,
  });
  await client.query(fixture.buffer.toString("utf8"));

  await client.query(
    `
    UPDATE public.accounting_connections
    SET
      provider_environment = $1,
      status = $2,
      external_entity_id = $3,
      provider = 'quickbooks'
    WHERE id = '11111111-1111-1111-1111-111111111111'
    `,
    [TARGET2.provider_environment, TARGET2.status, TARGET2.fingerprint],
  );

  await client.query(`CREATE SCHEMA IF NOT EXISTS supabase_migrations`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      name text,
      statements text[]
    )
  `);

  await client.query(
    `
    INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
    SELECT
      '20260101' || lpad(i::text, 6, '0'),
      'seed_' || i::text,
      ARRAY[('-- seed ' || i::text)]::text[]
    FROM generate_series(0, $1::int - 1) AS g(i)
    `,
    [historyCount],
  );
}

function baseApplyInputs(databaseUrl, overrides = {}) {
  const freeze = JSON.parse(
    require("fs").readFileSync(
      "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
      "utf8",
    ),
  ).authorized_pr_head;
  const tip = require("child_process")
    .execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" })
    .trim();
  const {
    ATTESTED_FREEZE_ENV,
  } = require("../../../scripts/security/credential-browser-containment-constants.js");

  const merged = {
    mode: "dry-run",
    applyAuthorizationToken: "",
    projectRef: EXPECTED_PROJECT_REF,
    prHead: freeze,
    authorizedPrHead: freeze,
    evidenceTip: tip !== freeze ? tip : undefined,
    artifactCommit: ARTIFACT_COMMIT,
    migrationPath: MIGRATION_PATH,
    migrationBlobOid: MIGRATION_BLOB_OID,
    migrationSha256: MIGRATION_SHA256,
    migrationBytes: MIGRATION_BYTES,
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    target2Fingerprint: TARGET2.fingerprint,
    ...overrides,
  };
  const attestedFreeze = merged.authorizedPrHead || merged.prHead || freeze;
  merged.env = {
    [DATABASE_URL_ENV]: databaseUrl,
    [ATTESTED_FREEZE_ENV]: attestedFreeze,
    ...(overrides.env || {}),
  };
  if (!overrides.env || overrides.env[ATTESTED_FREEZE_ENV] == null) {
    merged.env[ATTESTED_FREEZE_ENV] = attestedFreeze;
  }
  if (merged.evidenceTip && merged.evidenceTip === merged.authorizedPrHead) {
    delete merged.evidenceTip;
  }
  return merged;
}

module.exports = {
  startDisposablePg,
  seedApplicatorWorld,
  baseApplyInputs,
  ADVISORY_LOCK,
  ARTIFACT_COMMIT,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  PRIOR_HISTORY_COUNT,
  DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
};
