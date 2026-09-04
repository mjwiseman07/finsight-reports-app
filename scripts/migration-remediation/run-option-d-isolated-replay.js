#!/usr/bin/env node
/**
 * Option D isolated runtime harness (local-only) — fail-closed.
 *
 * Separate statuses:
 *   - candidateReplay
 *   - securityImmutabilityChecks
 *   - pr312RpcValidation
 *   - productionDashboardReplayParity (unresolved; not applicable to Option D PASS)
 *
 * Overall PASS_RUNTIME requires every applicable runtime gate to PASS.
 * Missing infra / skipped tests / absent security checks => BLOCKED or FAIL (never silent PASS).
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const {
  validateIsolatedReplayTarget,
  redactUrl,
  localDefaultDatabaseUrl,
} = require("./option-d-target-safety");
const {
  evaluateFreshDisposableDatabase,
  databaseNameFromUrl,
  collectDatabaseInventory,
} = require("./option-d-fresh-db-guard");
const {
  evaluateSecurityBundle,
  collectSecurityEvidence,
} = require("./option-d-security-assertions");
const {
  evaluateVitestRunGate,
  resolvePr312SuiteProvenance,
  PR312_SUITE_PATH,
  PR312_COMMIT,
} = require("./option-d-vitest-result-gate");
const {
  evaluateManifestAuthorization,
  readExpectedManifestSha256FromEnv,
} = require("./option-d-manifest-authorization");

const ROOT = path.join(__dirname, "..", "..");
const STATUS_OUT = path.join(ROOT, "docs/migration-remediation/option-d-runtime-status.json");
const ASSEMBLE = path.join(__dirname, "assemble-option-d-replay.js");
const GATE = path.join(__dirname, "audit-option-d-replay-gate.js");
const ASSEMBLED_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");

/** Mutable counter for tests — proves mismatch yields zero SQL application attempts. */
const applyMetrics = {
  sqlApplicationAttempts: 0,
  lastAuthorization: null,
};

function resetApplyMetrics() {
  applyMetrics.sqlApplicationAttempts = 0;
  applyMetrics.lastAuthorization = null;
}

function emptyScopes() {
  return {
    candidateReplay: "PENDING",
    securityImmutabilityChecks: "PENDING",
    pr312RpcValidation: "PENDING",
    productionDashboardReplayParity: "unresolved",
  };
}

/**
 * Overall PASS only when applicable gates pass.
 * productionDashboardReplayParity is reported but not an Option D applicable gate.
 */
function evaluateOverallRuntimePass(scopes) {
  const applicable = {
    candidateReplay: scopes.candidateReplay,
    securityImmutabilityChecks: scopes.securityImmutabilityChecks,
    pr312RpcValidation: scopes.pr312RpcValidation,
  };
  const allPass = Object.values(applicable).every((s) => s === "PASS");
  return {
    ok: allPass,
    overall: allPass ? "PASS_RUNTIME" : "BLOCKED",
    applicable,
    productionDashboardReplayParity: scopes.productionDashboardReplayParity,
  };
}

function writeStatus(status) {
  const safe = { ...status, writtenAt: new Date().toISOString() };
  delete safe.databaseUrl;
  delete safe.OPTION_D_DATABASE_URL;
  fs.writeFileSync(STATUS_OUT, JSON.stringify(safe, null, 2) + "\n");
  console.log(JSON.stringify(safe, null, 2));
}

function checkDocker() {
  const r = spawnSync("docker", ["info"], { encoding: "utf8", timeout: 15000 });
  return r.status === 0;
}

function checkLocalPostgresPort() {
  const r = spawnSync(
    process.execPath,
    [
      "-e",
      `const net=require('net');const s=net.connect(54322,'127.0.0.1');s.on('connect',()=>{s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),1500);`,
    ],
    { encoding: "utf8", timeout: 5000 },
  );
  return r.status === 0;
}

function runNode(script) {
  const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

async function withClient(dbUrl, fn) {
  const { Client } = require("pg");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function verifyFreshBeforeWrite(dbUrl, expectedDisposableName) {
  return withClient(dbUrl, async (client) => {
    const inventory = await collectDatabaseInventory(client);
    const evaluation = evaluateFreshDisposableDatabase({
      ...inventory,
      expectedDisposableName,
    });
    return { inventory, evaluation };
  });
}

async function applyAssembled(dbUrl) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const ordered = [...manifest.entries].sort((a, b) => a.order - b.order);
  return withClient(dbUrl, async (client) => {
    for (const entry of ordered) {
      const sql = fs.readFileSync(path.join(ASSEMBLED_DIR, entry.assembledFilename), "utf8");
      applyMetrics.sqlApplicationAttempts += 1;
      try {
        await client.query(sql);
      } catch (err) {
        return {
          applied: false,
          failedAt: entry.assembledFilename,
          order: entry.order,
          completedCount: entry.order - 1,
          sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
          error: String(err.message || err).slice(0, 500),
          sqlState: err.code || null,
          detail: err.detail ? String(err.detail).slice(0, 500) : null,
          hint: err.hint ? String(err.hint).slice(0, 300) : null,
          schema: err.schema || null,
          table: err.table || null,
          column: err.column || null,
          constraint: err.constraint || null,
          dataType: err.dataType || null,
          routine: err.routine || null,
          position: err.position || null,
          internalPosition: err.internalPosition || null,
          where: err.where ? String(err.where).slice(0, 500) : null,
        };
      }
    }
    return {
      applied: true,
      migrationsApplied: ordered.length,
      sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
    };
  });
}

/**
 * Authorization gate used before assemble/apply. Pure + side-effect free aside from metrics.
 * On failure, sqlApplicationAttempts remains unchanged (tests assert zero).
 */
function authorizeManifestOrBlock(env = process.env) {
  const expected = readExpectedManifestSha256FromEnv(env);
  const result = evaluateManifestAuthorization({
    expectedSha256: expected,
    manifestPath: MANIFEST,
  });
  applyMetrics.lastAuthorization = result;
  return result;
}

async function runSecurityChecks(dbUrl) {
  return withClient(dbUrl, async (client) => {
    const evidence = await collectSecurityEvidence(client);
    return evaluateSecurityBundle(evidence);
  });
}

function runPr312Vitest(dbUrl) {
  const outFile = path.join(os.tmpdir(), `option-d-vitest-${Date.now()}.json`);
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const r = spawnSync(
    npx,
    ["vitest", "run", PR312_SUITE_PATH, "--reporter=json", `--outputFile=${outFile}`],
    {
      cwd: ROOT,
      encoding: "utf8",
      env: {
        ...process.env,
        JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL: dbUrl,
      },
      timeout: 600_000,
    },
  );

  let report = null;
  if (fs.existsSync(outFile)) {
    try {
      report = JSON.parse(fs.readFileSync(outFile, "utf8"));
    } catch {
      report = null;
    }
    try {
      fs.unlinkSync(outFile);
    } catch {
      /* ignore */
    }
  }

  const gate = evaluateVitestRunGate({
    processExitCode: r.status,
    error: r.error || null,
    signal: r.signal || null,
    timedOut: r.signal === "SIGTERM" && r.status === null,
    report,
  });

  return {
    processExitCode: r.status,
    signal: r.signal || null,
    error: r.error ? String(r.error.message || r.error).slice(0, 300) : null,
    gate,
    structured: gate.structured,
    stderr: (r.stderr || "").slice(0, 1000),
  };
}

async function main() {
  const scopes = emptyScopes();
  resetApplyMetrics();
  const pr312Provenance = resolvePr312SuiteProvenance(ROOT);
  const applyRequested = process.env.OPTION_D_APPLY === "1";

  // Authorization integrity — required before assemble/apply when runtime apply is requested.
  // Compares OPTION_D_EXPECTED_MANIFEST_SHA256 to exact on-disk committed manifest bytes.
  // Must run BEFORE assemble (assemble rewrites generatedAt and would invalidate the pin).
  if (applyRequested || process.env.OPTION_D_EXPECTED_MANIFEST_SHA256) {
    const authz = authorizeManifestOrBlock(process.env);
    if (!authz.ok) {
      scopes.candidateReplay = "FAIL";
      scopes.securityImmutabilityChecks = "BLOCKED";
      scopes.pr312RpcValidation = "BLOCKED";
      writeStatus({
        overall: "BLOCKED",
        reason: "manifest_authorization_failed",
        note:
          "Authorized Manifest SHA-256 mismatch or missing. Aborting before assemble/SQL. Entry hashes / Git blob OID / re-assemble hashes are not substitutes.",
        manifestAuthorization: authz,
        sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
        scopes,
        overallGate: evaluateOverallRuntimePass(scopes),
      });
      process.exit(2);
    }
  }

  // 1) Static candidate lineage
  const skipAssemble = process.env.OPTION_D_SKIP_ASSEMBLE === "1";
  if (!skipAssemble) {
    const assemble = runNode(ASSEMBLE);
    if (assemble.status !== 0) {
      scopes.candidateReplay = "BLOCKED";
      scopes.securityImmutabilityChecks = "BLOCKED";
      scopes.pr312RpcValidation = "BLOCKED";
      writeStatus({
        overall: "BLOCKED",
        reason: "assemble_failed",
        scopes,
        overallGate: evaluateOverallRuntimePass(scopes),
      });
      process.exit(2);
    }
  }

  const gate = runNode(GATE);
  if (gate.status !== 0) {
    scopes.candidateReplay = "FAIL";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "option_d_static_gate_failed",
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
    });
    process.exit(2);
  }
  // Static assembly alone is not runtime candidate PASS — runtime apply required
  scopes.candidateReplay = "PASS_STATIC";

  const dockerOk = checkDocker();
  const localPg = checkLocalPostgresPort();
  const dbUrl =
    process.env.OPTION_D_DATABASE_URL ||
    process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL ||
    "";
  const intendedUrl = dbUrl || localDefaultDatabaseUrl();
  const intendedCheck = validateIsolatedReplayTarget(intendedUrl);

  if (!intendedCheck.ok) {
    scopes.candidateReplay = "BLOCKED";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "unsafe_or_forbidden_target",
      targetSafety: intendedCheck,
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      infrastructure: { dockerOk, localPostgres54322: localPg },
    });
    process.exit(2);
  }

  if (process.env.OPTION_D_APPLY !== "1") {
    scopes.candidateReplay = "BLOCKED";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "runtime_apply_not_requested",
      note:
        "Static Option D lineage gate passed. Runtime gates not executed. Missing runtime is BLOCKED, not PASS.",
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      infrastructure: { dockerOk, localPostgres54322: localPg },
      targetRedacted: intendedCheck.redacted,
      pr312Provenance,
      requiredExecutableChecks: [
        "fresh_disposable_db_precheck",
        "clean_replay_apply_assembled_sql",
        "final_schema_rls",
        "view_security_invoker",
        "si_memory_immutability",
        "pr312_structured_vitest",
      ],
    });
    process.exit(2);
  }

  if (!dbUrl) {
    scopes.candidateReplay = "BLOCKED";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "OPTION_D_APPLY_requires_OPTION_D_DATABASE_URL",
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
    });
    process.exit(2);
  }

  const hostCheck = validateIsolatedReplayTarget(dbUrl);
  if (!hostCheck.ok) {
    scopes.candidateReplay = "BLOCKED";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "unsafe_or_forbidden_target",
      targetSafety: hostCheck,
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
    });
    process.exit(2);
  }

  const expectedDisposableName = process.env.OPTION_D_DISPOSABLE_DB_NAME || "";
  // Pre-write freshness — never auto-reset
  let fresh;
  try {
    fresh = await verifyFreshBeforeWrite(dbUrl, expectedDisposableName);
  } catch (err) {
    scopes.candidateReplay = "BLOCKED";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "fresh_db_precheck_connection_failed",
      error: String(err.message || err).slice(0, 500),
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      targetRedacted: redactUrl(dbUrl),
    });
    process.exit(2);
  }

  if (!fresh.evaluation.ok) {
    scopes.candidateReplay = "FAIL";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "target_not_fresh_disposable_db",
      note:
        "Refusing to apply onto existing/partial application schema. Create a new empty option_d_* database. Harness does not reset or delete.",
      freshDb: fresh.evaluation,
      inventorySummary: {
        databaseName: fresh.inventory.databaseName,
        publicRelationCount: fresh.inventory.publicRelations.length,
        publicFunctionCount: fresh.inventory.publicFunctions.length,
        publicTypeCount: fresh.inventory.publicTypes.length,
        publicSequenceCount: fresh.inventory.publicSequences.length,
        publicTriggerCount: fresh.inventory.publicTriggers.length,
        schemaCount: fresh.inventory.schemas.length,
        schemaMigrationVersionCount: fresh.inventory.schemaMigrationVersions.length,
        objectsOutsideAllowedSchemas: fresh.inventory.objectsOutsideAllowedSchemas.length,
      },
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      targetRedacted: redactUrl(dbUrl),
      urlDatabaseName: databaseNameFromUrl(dbUrl),
    });
    process.exit(2);
  }

  // Apply migrations
  const applyResult = await applyAssembled(dbUrl);
  if (!applyResult.applied) {
    scopes.candidateReplay = "FAIL";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "apply_failed",
      applyResult,
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      targetRedacted: redactUrl(dbUrl),
    });
    process.exit(2);
  }
  scopes.candidateReplay = "PASS";

  // Security / RLS / view / immutability — must execute
  const security = await runSecurityChecks(dbUrl);
  scopes.securityImmutabilityChecks = security.ok ? "PASS" : "FAIL";
  if (!security.ok) {
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "security_immutability_checks_failed",
      security,
      applyResult,
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      targetRedacted: redactUrl(dbUrl),
      pr312Provenance,
    });
    process.exit(1);
  }

  // PR #312 suite with structured results
  if (!pr312Provenance.present) {
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "pr312_rpc_suite_missing_on_this_branch",
      note: `Pin source commit ${PR312_COMMIT}; suite path ${PR312_SUITE_PATH}`,
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      applyResult,
      security,
      pr312Provenance,
      targetRedacted: redactUrl(dbUrl),
    });
    process.exit(2);
  }

  if (!pr312Provenance.matchesPinnedCommitContent) {
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "pr312_suite_content_does_not_match_pinned_commit",
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
      pr312Provenance,
      targetRedacted: redactUrl(dbUrl),
    });
    process.exit(2);
  }

  const vitestRun = runPr312Vitest(dbUrl);
  scopes.pr312RpcValidation = vitestRun.gate.ok ? "PASS" : "FAIL";

  const overallGate = evaluateOverallRuntimePass(scopes);
  if (!overallGate.ok) {
    writeStatus({
      overall: "BLOCKED",
      reason: vitestRun.gate.reason || "pr312_vitest_run_gate_failed",
      scopes,
      overallGate,
      applyResult,
      security,
      vitest: {
        processExitCode: vitestRun.processExitCode,
        signal: vitestRun.signal,
        error: vitestRun.error,
        gate: vitestRun.gate,
      },
      pr312Provenance,
      targetRedacted: redactUrl(dbUrl),
    });
    process.exit(1);
  }

  writeStatus({
    overall: "PASS_RUNTIME",
    note:
      "Candidate replay, security/immutability (including behavioral probes), and PR #312 Vitest (process+structured) all PASS. Production dashboard replay parity remains unresolved. Not a merge approval.",
    scopes,
    overallGate,
    applyResult,
    security,
    vitest: {
      processExitCode: vitestRun.processExitCode,
      signal: vitestRun.signal,
      error: vitestRun.error,
      gate: vitestRun.gate,
    },
    pr312Provenance,
    targetRedacted: redactUrl(dbUrl),
  });
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    const scopes = emptyScopes();
    scopes.candidateReplay = "BLOCKED";
    scopes.securityImmutabilityChecks = "BLOCKED";
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "harness_exception",
      error: String(err.message || err).slice(0, 1000),
      scopes,
      overallGate: evaluateOverallRuntimePass(scopes),
    });
    process.exit(2);
  });
}

module.exports = {
  evaluateOverallRuntimePass,
  emptyScopes,
  applyMetrics,
  resetApplyMetrics,
  authorizeManifestOrBlock,
  applyAssembled,
};
