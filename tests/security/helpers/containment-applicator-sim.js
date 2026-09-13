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
const {
  loadAndVerifyGitBlob,
} = require("../../../scripts/security/git-blob-authority.js");
const {
  computeTarget2RowFingerprint,
  computeTarget2BindingFingerprint,
} = require("../../../scripts/security/credential-browser-containment-apply-core.js");

/** Fixture identity columns (synthetic only). Digests computed; never production UUIDs. */
const FIXTURE_TARGET_ID = "11111111-1111-1111-1111-111111111111";
const FIXTURE_TARGET_USER = "22222222-2222-2222-2222-222222222222";
const FIXTURE_TARGET_TENANT = "fake-realm-local";
const FIXTURE_US_SIBLING_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const FIXTURE_US_SIBLING_USER = "22222222-2222-2222-2222-222222222222";
const FIXTURE_US_SIBLING_TENANT = "us-sandbox-realm-synthetic";

function fixtureTarget2Pins() {
  return {
    target2Fingerprint: computeTarget2RowFingerprint(FIXTURE_TARGET_ID),
    target2BindingFingerprint: computeTarget2BindingFingerprint(
      FIXTURE_TARGET_USER,
      FIXTURE_TARGET_TENANT,
    ),
    target2ExcludedFingerprint: computeTarget2RowFingerprint(FIXTURE_US_SIBLING_ID),
  };
}

/** Argv for sealed-bundle e2e against disposable fixture digests (never production IDs). */
function fixtureTarget2ForwardArgs() {
  const pins = fixtureTarget2Pins();
  return [
    "--target2-fingerprint",
    pins.target2Fingerprint,
    "--target2-binding-fingerprint",
    pins.target2BindingFingerprint,
    "--target2-excluded-fingerprint",
    pins.target2ExcludedFingerprint,
  ];
}

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

  // Ensure fully-qualified extensions.digest exists (production uses extensions schema).
  await client.query(`CREATE SCHEMA IF NOT EXISTS extensions`);
  await client.query(`
    CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)
    RETURNS bytea
    LANGUAGE sql
    IMMUTABLE
    AS $fn$ SELECT public.digest($1, $2) $fn$
  `);

  await client.query(
    `
    UPDATE public.accounting_connections
    SET
      provider_environment = $1,
      status = $2,
      provider = 'quickbooks',
      tenant_or_realm_id = $3,
      external_entity_id = $4,
      superseded_by_connection_id = NULL,
      credentials_cleared_at = NULL,
      access_token = COALESCE(access_token, 'FAKE_ACCESS_TOKEN_LOCAL_ONLY'),
      refresh_token = COALESCE(refresh_token, 'FAKE_REFRESH_TOKEN_LOCAL_ONLY')
    WHERE id = $5::uuid
    `,
    [
      TARGET2.provider_environment,
      TARGET2.status,
      FIXTURE_TARGET_TENANT,
      `qbo:${FIXTURE_TARGET_TENANT}`,
      FIXTURE_TARGET_ID,
    ],
  );

  // Excluded US sibling: different row digest; distinct binding inputs.
  await client.query(
    `
    INSERT INTO public.accounting_connections (
      id, user_id, provider, provider_environment, status,
      external_entity_id, tenant_or_realm_id, external_entity_name,
      access_token, refresh_token, token_expires_at,
      superseded_by_connection_id, credentials_cleared_at
    ) VALUES (
      $1::uuid, $2::uuid, 'quickbooks', $3, $4,
      $5, $6, 'Sandbox Company US excluded synthetic',
      'FAKE_US_ACCESS', 'FAKE_US_REFRESH', now() + interval '1 hour',
      NULL, NULL
    )
    ON CONFLICT (id) DO UPDATE SET
      provider_environment = EXCLUDED.provider_environment,
      status = EXCLUDED.status,
      tenant_or_realm_id = EXCLUDED.tenant_or_realm_id,
      external_entity_id = EXCLUDED.external_entity_id,
      access_token = EXCLUDED.access_token,
      refresh_token = EXCLUDED.refresh_token,
      superseded_by_connection_id = NULL,
      credentials_cleared_at = NULL
    `,
    [
      FIXTURE_US_SIBLING_ID,
      FIXTURE_US_SIBLING_USER,
      TARGET2.provider_environment,
      TARGET2.status,
      `qbo:${FIXTURE_US_SIBLING_TENANT}`,
      FIXTURE_US_SIBLING_TENANT,
    ],
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
  const fs = require("fs");
  const { execFileSync } = require("child_process");
  const auth = JSON.parse(
    fs.readFileSync(
      "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
      "utf8",
    ),
  );
  let freeze = auth.authorized_pr_head;
  // After rebuild and before tip-pin, worktree auth is PENDING_AFTER_COMMIT.
  // Unit tests still need a real freeze commit that contains migration blobs.
  if (!/^[0-9a-f]{40}$/i.test(String(freeze || ""))) {
    const committed = JSON.parse(
      execFileSync(
        "git",
        [
          "show",
          "HEAD:docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
        ],
        { encoding: "utf8" },
      ),
    );
    freeze = committed.authorized_pr_head;
  }
  if (!/^[0-9a-f]{40}$/i.test(String(freeze || ""))) {
    throw new Error("baseApplyInputs: no valid authorized_pr_head freeze available");
  }
  const tip = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const {
    ATTESTED_FREEZE_ENV,
  } = require("../../../scripts/security/credential-browser-containment-constants.js");

  const pins = fixtureTarget2Pins();
  const merged = {
    mode: "dry-run",
    applyAuthorizationToken: "",
    projectRef: EXPECTED_PROJECT_REF,
    prHead: freeze,
    authorizedPrHead: freeze,
    evidenceTip: tip !== freeze ? tip : undefined,
    authSealsDigest: auth.auth_seals_digest,
    artifactCommit: ARTIFACT_COMMIT,
    migrationPath: MIGRATION_PATH,
    migrationBlobOid: MIGRATION_BLOB_OID,
    migrationSha256: MIGRATION_SHA256,
    migrationBytes: MIGRATION_BYTES,
    version: MIGRATION_VERSION,
    name: MIGRATION_NAME,
    target2Fingerprint: pins.target2Fingerprint,
    target2BindingFingerprint: pins.target2BindingFingerprint,
    target2ExcludedFingerprint: pins.target2ExcludedFingerprint,
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
  fixtureTarget2Pins,
  fixtureTarget2ForwardArgs,
  FIXTURE_TARGET_ID,
  FIXTURE_TARGET_USER,
  FIXTURE_TARGET_TENANT,
  FIXTURE_US_SIBLING_ID,
  FIXTURE_US_SIBLING_USER,
  FIXTURE_US_SIBLING_TENANT,
  ADVISORY_LOCK,
  ARTIFACT_COMMIT,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  PRIOR_HISTORY_COUNT,
  DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
};
