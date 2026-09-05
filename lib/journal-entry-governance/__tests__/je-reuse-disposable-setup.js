/**
 * Test-infrastructure only: phased disposable-Postgres setup for JE-3A
 * execution-reservation integration suite.
 *
 * NOT a production/runtime API.
 */
"use strict";

const fs = require("node:fs");
const {
  resolveJeReusePgClientConfig,
  sanitizeErrorMessage,
  redactUrl,
} = require("./je-reuse-pg-client-config.js");

/** Ordered setup phases (exact labels used in diagnostics). */
const JE_REUSE_SETUP_PHASES = Object.freeze([
  "resolve_client_config",
  "connect",
  "begin_transaction",
  "apply_je_execution_migration",
  "seed_fixture_rows",
  "register_cleanup",
]);

const SETUP_TEST_TITLE = "SETUP: disposable database preparation";

/**
 * @param {unknown} err
 */
function extractPgSqlstate(err) {
  if (!err || typeof err !== "object") return null;
  const code = /** @type {{ code?: unknown }} */ (err).code;
  if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
  return null;
}

/**
 * Build a fail-closed diagnostic that never includes credentials.
 * @param {{
 *   phase: string,
 *   err?: unknown,
 *   databaseUrl?: string|null,
 *   detail?: string|null,
 * }} input
 */
function buildSetupFailureDiagnostic(input) {
  const phase = String(input.phase || "unknown");
  const sqlstate = extractPgSqlstate(input.err);
  const sanitizedMessage = sanitizeErrorMessage(
    (input.err && /** @type {{ message?: unknown }} */ (input.err).message) ||
      input.detail ||
      "setup_failed",
  );
  return {
    ok: false,
    phase,
    sqlstate,
    sanitizedMessage,
    redactedTarget: redactUrl(input.databaseUrl || ""),
    credentialsIncludedInEvidence: false,
    summary: `JE_REUSE setup failed at phase=${phase}${
      sqlstate ? ` sqlstate=${sqlstate}` : ""
    }: ${sanitizedMessage}`,
  };
}

/**
 * Run the full disposable setup sequence.
 * Never throws — returns ok:false with phase/sqlstate instead (so Vitest hooks
 * do not convert the suite into an all-skipped result).
 *
 * @param {{
 *   databaseUrl: string,
 *   migrationPath: string,
 *   seedFixture: (client: import('pg').Client) => Promise<void>,
 *   Client?: typeof import('pg').Client,
 *   resolveConfig?: typeof resolveJeReusePgClientConfig,
 *   readFileSync?: typeof fs.readFileSync,
 * }} opts
 */
async function runJeReuseDisposableSetup(opts) {
  const resolveConfig = opts.resolveConfig || resolveJeReusePgClientConfig;
  const readFile = opts.readFileSync || fs.readFileSync;
  const Client = opts.Client;
  if (typeof Client !== "function") {
    return {
      ...buildSetupFailureDiagnostic({
        phase: "resolve_client_config",
        detail: "pg.Client constructor missing",
        databaseUrl: opts.databaseUrl,
      }),
      client: null,
      cleanupRegistered: false,
    };
  }

  let client = null;
  let phase = "resolve_client_config";
  try {
    phase = "resolve_client_config";
    const resolved = await resolveConfig(opts.databaseUrl);
    if (!resolved.ok) {
      return {
        ...buildSetupFailureDiagnostic({
          phase,
          detail: `config_rejected:${resolved.reason}`,
          databaseUrl: opts.databaseUrl,
        }),
        client: null,
        cleanupRegistered: false,
        configReason: resolved.reason,
      };
    }

    phase = "connect";
    client = new Client({
      connectionString: resolved.config.connectionString,
      ssl: resolved.config.ssl,
    });
    await client.connect();

    phase = "begin_transaction";
    await client.query("BEGIN");

    phase = "apply_je_execution_migration";
    const sql = readFile(opts.migrationPath, "utf8");
    await client.query(sql);

    phase = "seed_fixture_rows";
    try {
      await opts.seedFixture(client);
    } catch (seedErr) {
      const named =
        seedErr &&
        typeof seedErr === "object" &&
        /** @type {{ jeReuseSeedPhase?: unknown }} */ (seedErr).jeReuseSeedPhase;
      if (typeof named === "string" && named.length > 0) {
        phase = named;
      }
      throw seedErr;
    }

    phase = "register_cleanup";
    // Cleanup is registered by the suite afterAll (ROLLBACK + end).
    return {
      ok: true,
      phase: null,
      sqlstate: null,
      sanitizedMessage: null,
      redactedTarget: redactUrl(opts.databaseUrl),
      credentialsIncludedInEvidence: false,
      summary: null,
      client,
      cleanupRegistered: true,
      transport: resolved.config.transport,
      sslIsFalse: resolved.config.ssl === false,
      rolledBackOnFailure: false,
    };
  } catch (err) {
    const diagnostic = buildSetupFailureDiagnostic({
      phase,
      err,
      databaseUrl: opts.databaseUrl,
    });
    let rolledBack = false;
    if (client) {
      try {
        await client.query("ROLLBACK");
        rolledBack = true;
      } catch {
        /* ignore */
      }
      try {
        await client.end();
      } catch {
        /* ignore */
      }
    }
    return {
      ...diagnostic,
      client: null,
      cleanupRegistered: false,
      rolledBackOnFailure: rolledBack,
    };
  }
}

/**
 * Require a successful setup for a governed behavior test.
 * Throws a non-skip Error so Vitest records a failure (not skipped).
 * @param {{ ok?: boolean, summary?: string|null, phase?: string|null, sqlstate?: string|null, sanitizedMessage?: string|null, client?: unknown }} setup
 */
function requireJeReuseSetup(setup) {
  if (setup && setup.ok === true && setup.client) {
    return setup.client;
  }
  const summary =
    (setup && setup.summary) ||
    `JE_REUSE SETUP prerequisite failed at phase=${
      (setup && setup.phase) || "unknown"
    }`;
  const err = new Error(summary);
  /** @type {{ code?: string|null, phase?: string|null }} */ (err).code =
    setup && setup.sqlstate ? setup.sqlstate : "SETUP_FAILED";
  /** @type {{ phase?: string|null }} */ (err).phase =
    (setup && setup.phase) || null;
  throw err;
}

module.exports = {
  JE_REUSE_SETUP_PHASES,
  SETUP_TEST_TITLE,
  extractPgSqlstate,
  buildSetupFailureDiagnostic,
  runJeReuseDisposableSetup,
  requireJeReuseSetup,
  sanitizeErrorMessage,
  redactUrl,
};
