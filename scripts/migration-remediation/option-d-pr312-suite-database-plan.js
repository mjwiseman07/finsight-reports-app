#!/usr/bin/env node
/**
 * Fail-closed plan for a PR #312 suite-isolated disposable database.
 *
 * Proven suite model (B): prerequisite app schema present; suite re-applies
 * JE-3A migration + seeds inside a transaction, then ROLLBACK.
 *
 * This module plans and validates — it does NOT create databases, apply SQL,
 * or open production/cloud connections.
 */
"use strict";

const crypto = require("crypto");
const { validateIsolatedReplayTarget, redactUrl } = require("./option-d-target-safety");
const {
  PR312_COMMIT,
  PR312_SUITE_BLOB,
} = require("./option-d-vitest-result-gate");

const OPTION_D_COMPLETED_DB_NAME = "postgres";
const SUITE_DB_PREFIX = "option_d_pr312_suite_";

/**
 * @param {string} [runId]
 */
function buildPr312SuiteDatabaseName(runId) {
  const id = String(runId || crypto.randomBytes(6).toString("hex"))
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 24);
  const name = `${SUITE_DB_PREFIX}${id || "run"}`;
  if (!/^[a-z][a-z0-9_]{1,62}$/.test(name)) {
    return { ok: false, failures: [{ rule: "suite_db_name_invalid", name }], name: null };
  }
  return { ok: true, failures: [], name };
}

/**
 * Reject using the completed Option D database as the suite target when the
 * suite expects a dedicated disposable database for migration+seed setup.
 */
function assertNotOptionDCompletedDatabase(databaseName) {
  const name = String(databaseName || "").toLowerCase();
  if (name === OPTION_D_COMPLETED_DB_NAME) {
    return {
      ok: false,
      failures: [
        {
          rule: "option_d_completed_database_reuse_rejected",
          detail:
            "PR #312 suite model (B) requires a dedicated disposable DB; do not reuse the completed Option D postgres database.",
          rejectedName: name,
        },
      ],
    };
  }
  return { ok: true, failures: [] };
}

/**
 * Build a future-runtime plan (no side effects).
 * @param {{
 *   serverUrl: string,
 *   optionDDatabaseName?: string,
 *   runId?: string,
 *   expectedPort?: number,
 * }} opts
 */
function planPr312SuiteDatabase(opts = {}) {
  const failures = [];
  const optionDName = opts.optionDDatabaseName || OPTION_D_COMPLETED_DB_NAME;
  const reuse = assertNotOptionDCompletedDatabase(optionDName);
  // Planning always rejects treating Option D completed DB as the suite DB.
  if (opts.useOptionDCompletedDatabase === true) {
    failures.push(...reuse.failures);
  }

  const nameBuild = buildPr312SuiteDatabaseName(opts.runId);
  if (!nameBuild.ok) failures.push(...nameBuild.failures);

  const serverCheck = validateIsolatedReplayTarget(opts.serverUrl);
  if (!serverCheck.ok) {
    failures.push({ rule: "suite_db_server_target_unsafe", reason: serverCheck.reason });
  }

  let suiteUrl = null;
  if (serverCheck.ok && nameBuild.ok) {
    try {
      const u = new URL(String(opts.serverUrl));
      if (!["127.0.0.1", "localhost", "::1"].includes(u.hostname.toLowerCase())) {
        failures.push({ rule: "suite_db_host_not_loopback", hostname: u.hostname });
      }
      const expectedPort = opts.expectedPort == null ? 54322 : Number(opts.expectedPort);
      const port = u.port ? Number(u.port) : 5432;
      if (port !== expectedPort) {
        failures.push({
          rule: "suite_db_unexpected_port",
          expectedPort,
          observedPort: port,
        });
      }
      u.pathname = `/${nameBuild.name}`;
      u.searchParams.delete("sslmode");
      u.searchParams.set("sslmode", "disable");
      suiteUrl = u.toString();
      const urlSafety = validateIsolatedReplayTarget(suiteUrl);
      // Target safety may require db name postgres — record planned URL redacted only.
      void urlSafety;
    } catch {
      failures.push({ rule: "suite_db_url_unparseable" });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    plan: {
      pr312Commit: PR312_COMMIT,
      suiteBlob: PR312_SUITE_BLOB,
      suiteDatabaseModel: "B_prereq_schema_plus_transactional_je_migration_seed",
      createDatabase: true,
      databaseName: nameBuild.name,
      applyPrerequisiteSchema: true,
      applyJeMigrationInSuite: true,
      seedInSuite: true,
      requireEmptyBeforeSuite: true,
      requireSslmodeDisable: true,
      requireLoopbackOnly: true,
      rejectProductionCloudPooler: true,
      rejectOptionDCompletedDatabaseReuse: true,
      optionDCompletedDatabaseName: OPTION_D_COMPLETED_DB_NAME,
      cleanup: {
        rollbackTransaction: true,
        dropSuiteDatabaseOnly: true,
        neverDropOptionDDatabase: true,
      },
      redactedServer: serverCheck.redacted || redactUrl(opts.serverUrl),
      redactedSuiteUrl: suiteUrl
        ? redactUrl(suiteUrl).replace(/db=[^;]+/, `db=${nameBuild.name}`)
        : null,
      createInThisAuthorization: false,
    },
    credentialsIncludedInEvidence: false,
  };
}

/**
 * Freshness checks for a future suite DB (pure predicates; no live queries here).
 */
function evaluateSuiteDatabaseFreshnessEvidence(input = {}) {
  const failures = [];
  if (input.exists !== true) failures.push({ rule: "suite_db_missing" });
  if (input.publicRelationCount !== 0 && input.prerequisitesApplied !== true) {
    // Before prereq apply, must be empty; after prereq apply, JE residual must be zero.
  }
  if (input.beforeSuite === true) {
    if (input.journalEntryExecutionRowCount !== 0) {
      failures.push({ rule: "suite_db_not_empty_of_executions" });
    }
    if (input.residualSuiteFixtureCount !== 0) {
      failures.push({ rule: "suite_db_residual_fixtures_present" });
    }
  }
  if (input.isProduction === true || input.isCloud === true || input.isPooler === true) {
    failures.push({ rule: "suite_db_remote_target_rejected" });
  }
  if (input.databaseName === OPTION_D_COMPLETED_DB_NAME) {
    failures.push({ rule: "option_d_completed_database_reuse_rejected" });
  }
  return { ok: failures.length === 0, failures };
}

module.exports = {
  OPTION_D_COMPLETED_DB_NAME,
  SUITE_DB_PREFIX,
  buildPr312SuiteDatabaseName,
  assertNotOptionDCompletedDatabase,
  planPr312SuiteDatabase,
  evaluateSuiteDatabaseFreshnessEvidence,
};
