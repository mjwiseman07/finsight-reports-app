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
  PR312_SUITE_BLOB,
} = require("./option-d-vitest-result-gate");
const {
  evaluateManifestAuthorization,
  evaluateManifestUnchangedSinceAuthorization,
  buildPrewriteAuthorizationEvidence,
  writePrewriteAuthorizationEvidence,
  readExpectedManifestSha256FromEnv,
  readAuthorizedCommitFromEnv,
  resolveGitHead,
} = require("./option-d-manifest-authorization");
const {
  materializeAuthorizedSqlFromGit,
  cleanupMaterialization,
  sha256Buffer,
} = require("./option-d-git-blob-authority");
const { fingerprintPlatformWorkdir } = require("./option-d-platform-bootstrap");
const { launchLocalVitest } = require("./option-d-vitest-launcher");
const {
  preparePr312IsolatedContext,
  cleanupPr312IsolatedContext,
  diagnoseVitestSuiteDiscovery,
} = require("./option-d-pr312-isolated-context");
const {
  authorizePr312VitestLaunch,
  captureSkipDiagnosisFromStructuredCounts,
  JE_REUSE_ENV,
  PR312_SKIP_CONTRACT,
} = require("./option-d-pr312-env-handoff");

const ROOT = path.join(__dirname, "..", "..");
const STATUS_OUT = path.join(ROOT, "docs/migration-remediation/option-d-runtime-status.json");
const ASSEMBLE = path.join(__dirname, "assemble-option-d-replay.js");
const GATE = path.join(__dirname, "audit-option-d-replay-gate.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");

/** Mutable counter for tests — proves mismatch yields zero SQL application attempts. */
const applyMetrics = {
  sqlApplicationAttempts: 0,
  lastAuthorization: null,
  lastMaterialization: null,
  lastPr312Materialization: null,
};

function resetApplyMetrics() {
  if (applyMetrics.lastMaterialization?.tempDir) {
    cleanupMaterialization(applyMetrics.lastMaterialization.tempDir);
  }
  if (applyMetrics.lastPr312Materialization?.tempDir) {
    cleanupMaterialization(applyMetrics.lastPr312Materialization.tempDir);
  }
  applyMetrics.sqlApplicationAttempts = 0;
  applyMetrics.lastAuthorization = null;
  applyMetrics.lastMaterialization = null;
  applyMetrics.lastPr312Materialization = null;
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
    const platformOnlyTarget = process.env.OPTION_D_PLATFORM_ONLY_TARGET === "1";
    const workdir = process.env.OPTION_D_PLATFORM_WORKDIR || "";
    const platformWorkdirFingerprint = workdir
      ? fingerprintPlatformWorkdir(workdir, ROOT)
      : null;
    const inventory = await collectDatabaseInventory(client);
    // Attach platform-only flags onto inventory for freshness + bootstrap.
    if (inventory.platform) {
      inventory.platform.platformOnlyTarget = platformOnlyTarget;
      inventory.platform.platformWorkdirFingerprint = platformWorkdirFingerprint;
      inventory.platform.supabaseCliVersion =
        process.env.OPTION_D_SUPABASE_CLI_VERSION || inventory.platform.supabaseCliVersion || null;
      inventory.platform.schemaMigrationVersions = inventory.schemaMigrationVersions;
    }
    const evaluation = evaluateFreshDisposableDatabase({
      ...inventory,
      expectedDisposableName,
      platformOnlyTarget,
    });
    return { inventory, evaluation, platformOnlyTarget, platformWorkdirFingerprint };
  });
}

/**
 * Apply SQL exclusively from a prior Git-blob materialization ledger.
 * Never reads working-tree assembled/ files as authority.
 */
async function applyAssembled(dbUrl, materialization) {
  if (!materialization || materialization.ok !== true || !Array.isArray(materialization.artifacts)) {
    return {
      applied: false,
      failedAt: null,
      order: null,
      completedCount: 0,
      sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
      error: "Git-blob SQL materialization required before apply",
      sqlState: null,
    };
  }
  const ordered = [...materialization.artifacts].sort((a, b) => a.order - b.order);
  return withClient(dbUrl, async (client) => {
    for (const artifact of ordered) {
      const bytes = fs.readFileSync(artifact.temporaryFile);
      const liveSha = sha256Buffer(bytes);
      if (liveSha !== artifact.sha256 || liveSha !== artifact.temporaryFileSha256) {
        return {
          applied: false,
          failedAt: artifact.assembledFilename,
          order: artifact.order,
          completedCount: artifact.order - 1,
          sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
          error: "Temporary materialization bytes drifted before SQL execute",
          sqlState: null,
          detail: `expected=${artifact.sha256} live=${liveSha}`,
        };
      }
      // Pass exact committed bytes to Postgres (binary Buffer — no text re-encode).
      const sql = bytes;
      applyMetrics.sqlApplicationAttempts += 1;
      try {
        await client.query(sql.toString("utf8"));
      } catch (err) {
        return {
          applied: false,
          failedAt: artifact.assembledFilename,
          order: artifact.order,
          completedCount: artifact.order - 1,
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
          appliedArtifact: {
            path: artifact.path,
            gitBlobId: artifact.gitBlobId,
            sha256: artifact.sha256,
            byteLength: artifact.byteLength,
          },
        };
      }
    }
    return {
      applied: true,
      migrationsApplied: ordered.length,
      sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
      authority: "git_cat_file_blob",
      materializationArtifactCount: ordered.length,
    };
  });
}

/**
 * Authorization gate used before assemble/apply.
 * On failure, sqlApplicationAttempts remains unchanged (tests assert zero).
 * Manifest bytes come only from git cat-file blob at OPTION_D_AUTHORIZED_COMMIT.
 */
function authorizeManifestOrBlock(env = process.env) {
  const expected = readExpectedManifestSha256FromEnv(env);
  const authorizedCommit = readAuthorizedCommitFromEnv(env);
  const expectedByteLength = env.OPTION_D_EXPECTED_MANIFEST_BYTES
    ? Number(env.OPTION_D_EXPECTED_MANIFEST_BYTES)
    : undefined;
  const result = evaluateManifestAuthorization({
    expectedSha256: expected,
    authorizedCommit,
    currentHead: resolveGitHead(ROOT),
    requireCommitBinding: true,
    expectedByteLength,
  });
  applyMetrics.lastAuthorization = result;
  return result;
}

function writeImmutablePrewriteEvidence(authz) {
  const evidence = buildPrewriteAuthorizationEvidence({
    ...authz,
    sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
  });
  writePrewriteAuthorizationEvidence(evidence);
  return evidence;
}

async function runSecurityChecks(dbUrl) {
  return withClient(dbUrl, async (client) => {
    const evidence = await collectSecurityEvidence(client);
    return evaluateSecurityBundle(evidence);
  });
}

async function runPr312Vitest(dbUrl, runGates = {}) {
  // Prefer isolated detached worktree at the exact PR #312 pin so Vitest include
  // globs discover the canonical suite path. Outside-root temp copies yield
  // zero_tests_in_report (proven 2026-09-04f).
  const isolated = preparePr312IsolatedContext({
    commit: PR312_COMMIT,
    suitePath: PR312_SUITE_PATH,
    suiteBlob: PR312_SUITE_BLOB,
    donorRoot: ROOT,
  });
  applyMetrics.lastPr312Materialization = isolated.ok
    ? {
        ok: true,
        tempDir: isolated.tempRoot,
        tempFile: isolated.suiteAbsPath,
        gitBlobId: isolated.suiteGitBlobId,
        sha256: isolated.suiteSha256,
        authority: isolated.authority,
      }
    : isolated;

  if (!isolated.ok) {
    return {
      processExitCode: null,
      signal: null,
      error: "pr312_isolated_context_failed",
      gate: {
        ok: false,
        reason: "pr312_isolated_context_failed",
        failures: isolated.failures,
      },
      structured: null,
      stderr: "",
      suiteMaterialization: isolated,
      launcher: null,
      envHandoff: null,
      discovery: diagnoseVitestSuiteDiscovery({
        projectRoot: ROOT,
        suitePath: path.join(os.tmpdir(), "option-d-outside-root-probe.test.ts"),
      }),
    };
  }

  const liveSha = sha256Buffer(fs.readFileSync(isolated.suiteAbsPath));
  if (liveSha !== isolated.suiteSha256 || isolated.suiteGitBlobId !== PR312_SUITE_BLOB) {
    cleanupPr312IsolatedContext(isolated);
    applyMetrics.lastPr312Materialization = null;
    return {
      processExitCode: null,
      signal: null,
      error: "pr312_suite_blob_mismatch_before_launch",
      gate: {
        ok: false,
        reason: "pr312_suite_blob_mismatch_before_launch",
        failures: [
          {
            rule: "exact_suite_blob_mismatch",
            expectedBlobId: PR312_SUITE_BLOB,
            observedBlobId: isolated.suiteGitBlobId,
            expectedSha256: isolated.suiteSha256,
            temporaryFileSha256: liveSha,
          },
        ],
      },
      structured: null,
      stderr: "",
      suiteMaterialization: isolated,
      launcher: null,
      envHandoff: null,
    };
  }

  const launchAuth = await authorizePr312VitestLaunch({
    databaseUrl: dbUrl,
    expectedPort: 54322,
    expectedDatabase: "postgres",
    candidateReplayPassed: runGates.candidateReplayPassed === true,
    securityImmutabilityPassed: runGates.securityImmutabilityPassed === true,
    isolatedContextOk: true,
    parentEnv: process.env,
  });
  if (!launchAuth.ok) {
    cleanupPr312IsolatedContext(isolated);
    applyMetrics.lastPr312Materialization = null;
    return {
      processExitCode: null,
      signal: null,
      error: "pr312_env_handoff_or_provenance_failed",
      gate: {
        ok: false,
        reason: "pr312_env_handoff_or_provenance_failed",
        failures: launchAuth.failures,
      },
      structured: null,
      stderr: "",
      suiteMaterialization: {
        ok: true,
        gitBlobId: isolated.suiteGitBlobId,
        sha256: isolated.suiteSha256,
        authority: isolated.authority,
      },
      launcher: null,
      envHandoff: {
        ok: false,
        skipContract: PR312_SKIP_CONTRACT,
        failures: launchAuth.failures,
        handoff: launchAuth.handoff,
        connectivity: launchAuth.connectivity,
        urlCheck: {
          redacted: launchAuth.urlCheck?.redacted || null,
          fingerprint: launchAuth.urlCheck?.fingerprint || null,
        },
      },
    };
  }

  const outFile = path.join(isolated.tempRoot, `option-d-vitest-${Date.now()}.json`);
  const launched = launchLocalVitest({
    suitePath: PR312_SUITE_PATH.replace(/\//g, path.sep),
    outputFile: outFile,
    cwd: isolated.worktreePath,
    vitestRoot: isolated.worktreePath,
    configPath: isolated.configPath,
    root: ROOT,
    canonicalRepoPath: PR312_SUITE_PATH,
    requireInsideProjectRoot: true,
    requireIncludeMatch: true,
    env: launchAuth.childEnv,
    timeoutMs: 600_000,
  });

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
    processExitCode: launched.processExitCode,
    error: launched.error || null,
    signal: launched.signal || null,
    timedOut: launched.timedOut === true,
    report,
  });

  const assertionTitles = report
    ? (report.testResults || []).flatMap((tr) =>
        (tr.assertionResults || []).map((a) => ({
          title: a.title,
          status: a.status,
        })),
      )
    : [];
  const skipDiagnosis = captureSkipDiagnosisFromStructuredCounts({
    counts: gate.structured?.counts || {},
    numFailedTestSuites: report?.numFailedTestSuites,
    report,
    assertionTitles,
  });
  const suiteByteLength = fs.statSync(isolated.suiteAbsPath).size;
  const cleanup = cleanupPr312IsolatedContext(isolated);
  applyMetrics.lastPr312Materialization = null;

  return {
    processExitCode: launched.processExitCode,
    signal: launched.signal || null,
    error: launched.error
      ? String(launched.error.message || launched.error).slice(0, 300)
      : launched.failures?.length
        ? launched.failures[0].rule
        : null,
    gate,
    structured: gate.structured,
    stderr: (launched.stderr || "").slice(0, 1000),
    launcher: launched.launcher,
    discovery: isolated.discovery,
    envHandoff: {
      ok: true,
      envVar: JE_REUSE_ENV,
      skipContract: PR312_SKIP_CONTRACT,
      handoff: launchAuth.handoff,
      connectivity: launchAuth.connectivity,
      envProbe: launchAuth.envProbe,
      skipDiagnosis,
    },
    isolatedContext: {
      commit: isolated.commit,
      worktreePath: isolated.worktreePath,
      authority: isolated.authority,
      packageLockOid: isolated.packageLockOid,
      nodeModulesLinkType: isolated.nodeModulesLink?.type || null,
      cleaned: cleanup.ok,
    },
    suiteMaterialization: {
      ok: true,
      gitBlobId: isolated.suiteGitBlobId,
      sha256: isolated.suiteSha256,
      byteLength: suiteByteLength,
      authority: isolated.authority,
      temporaryFileSha256BeforeLaunch: liveSha,
      canonicalRepoPath: PR312_SUITE_PATH,
    },
  };
}

async function main() {
  const scopes = emptyScopes();
  resetApplyMetrics();
  const pr312Provenance = resolvePr312SuiteProvenance(ROOT);
  const applyRequested = process.env.OPTION_D_APPLY === "1";

  // Authorization integrity — required before assemble/apply when runtime apply is requested.
  // Compares OPTION_D_EXPECTED_MANIFEST_SHA256 to exact on-disk committed manifest bytes,
  // bound to OPTION_D_AUTHORIZED_COMMIT === HEAD.
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
          "Authorized Manifest SHA-256 / commit binding failed. Aborting before assemble/SQL. Entry hashes / Git blob OID / re-assemble hashes are not substitutes.",
        manifestAuthorization: authz,
        sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
        scopes,
        overallGate: evaluateOverallRuntimePass(scopes),
      });
      process.exit(2);
    }

    // Immutable pre-write evidence (zero SQL attempts).
    const prewrite = writeImmutablePrewriteEvidence(authz);

    // APPLY must not regenerate the authorized manifest.
    if (applyRequested && process.env.OPTION_D_SKIP_ASSEMBLE !== "1") {
      scopes.candidateReplay = "FAIL";
      scopes.securityImmutabilityChecks = "BLOCKED";
      scopes.pr312RpcValidation = "BLOCKED";
      writeStatus({
        overall: "BLOCKED",
        reason: "apply_requires_skip_assemble_to_preserve_authorized_manifest",
        note:
          "OPTION_D_APPLY=1 requires OPTION_D_SKIP_ASSEMBLE=1. Assemble rewrites generatedAt and invalidates the authorized whole-file hash; require new authorization instead of accepting regenerated output.",
        prewriteAuthorizationEvidence: prewrite,
        sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
        scopes,
        overallGate: evaluateOverallRuntimePass(scopes),
      });
      process.exit(2);
    }

    // Materialize SQL from Git blobs before any DB inventory / SQL apply.
    if (applyRequested) {
      const materialization = materializeAuthorizedSqlFromGit({
        authorizedCommit: authz.authorizedCommit,
        manifest: authz.manifest,
      });
      applyMetrics.lastMaterialization = materialization;
      if (!materialization.ok) {
        scopes.candidateReplay = "FAIL";
        scopes.securityImmutabilityChecks = "BLOCKED";
        scopes.pr312RpcValidation = "BLOCKED";
        writeStatus({
          overall: "BLOCKED",
          reason: "git_blob_sql_materialization_failed",
          note:
            "Authorized SQL must materialize from git cat-file blob at OPTION_D_AUTHORIZED_COMMIT with exact manifest assembledSha256 match. Working-tree / CRLF smudge bytes are not authority. sqlApplicationAttempts remain 0.",
          materialization: {
            ok: false,
            failureCount: materialization.failures.length,
            failures: materialization.failures.slice(0, 30),
            tempDir: materialization.tempDir || null,
          },
          prewriteAuthorizationEvidence: prewrite,
          sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
          scopes,
          overallGate: evaluateOverallRuntimePass(scopes),
        });
        if (materialization.tempDir) cleanupMaterialization(materialization.tempDir);
        applyMetrics.lastMaterialization = null;
        process.exit(2);
      }
    }
  }

  // 1) Static candidate lineage
  const skipAssemble = process.env.OPTION_D_SKIP_ASSEMBLE === "1";
  const authorizedSnapshotSha = applyMetrics.lastAuthorization?.observedManifestSha256 || null;
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
    if (authorizedSnapshotSha) {
      const unchanged = evaluateManifestUnchangedSinceAuthorization({
        authorizedObservedSha256: authorizedSnapshotSha,
        manifestPath: MANIFEST,
      });
      if (!unchanged.ok) {
        scopes.candidateReplay = "FAIL";
        scopes.securityImmutabilityChecks = "BLOCKED";
        scopes.pr312RpcValidation = "BLOCKED";
        writeStatus({
          overall: "BLOCKED",
          reason: "manifest_regenerated_after_authorization",
          note:
            "Assemble changed authorized manifest bytes. Abort; require new authorization. Do not accept regenerated output.",
          manifestUnchangedCheck: unchanged,
          sqlApplicationAttempts: applyMetrics.sqlApplicationAttempts,
          scopes,
          overallGate: evaluateOverallRuntimePass(scopes),
        });
        process.exit(2);
      }
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

  // Apply migrations from Git-blob materialization only
  const applyResult = await applyAssembled(dbUrl, applyMetrics.lastMaterialization);
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
    if (applyMetrics.lastMaterialization?.tempDir) {
      cleanupMaterialization(applyMetrics.lastMaterialization.tempDir);
      applyMetrics.lastMaterialization = null;
    }
    process.exit(2);
  }
  scopes.candidateReplay = "PASS";
  if (applyMetrics.lastMaterialization?.tempDir) {
    cleanupMaterialization(applyMetrics.lastMaterialization.tempDir);
    applyMetrics.lastMaterialization = null;
  }

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

  const vitestRun = await runPr312Vitest(dbUrl, {
    candidateReplayPassed: scopes.candidateReplay === "PASS",
    securityImmutabilityPassed: scopes.securityImmutabilityChecks === "PASS",
  });
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
        launcher: vitestRun.launcher || null,
        suiteMaterialization: vitestRun.suiteMaterialization || null,
        envHandoff: vitestRun.envHandoff || null,
        isolatedContext: vitestRun.isolatedContext
          ? {
              commit: vitestRun.isolatedContext.commit,
              authority: vitestRun.isolatedContext.authority,
              cleaned: vitestRun.isolatedContext.cleaned,
              nodeModulesLinkType: vitestRun.isolatedContext.nodeModulesLinkType,
            }
          : null,
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
      launcher: vitestRun.launcher || null,
      suiteMaterialization: vitestRun.suiteMaterialization || null,
      envHandoff: vitestRun.envHandoff || null,
      isolatedContext: vitestRun.isolatedContext
        ? {
            commit: vitestRun.isolatedContext.commit,
            authority: vitestRun.isolatedContext.authority,
            cleaned: vitestRun.isolatedContext.cleaned,
            nodeModulesLinkType: vitestRun.isolatedContext.nodeModulesLinkType,
          }
        : null,
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
  writeImmutablePrewriteEvidence,
  applyAssembled,
};
