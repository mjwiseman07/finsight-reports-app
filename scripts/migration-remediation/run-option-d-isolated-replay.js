#!/usr/bin/env node
/**
 * Option D isolated runtime harness (local-only).
 *
 * Distinguishes:
 *   1) isolated candidate-lineage validation (assemble + static gate)
 *   2) PR #312 RPC validation (postgres integration suite)
 *   3) production dashboard replay parity (always unresolved here)
 *
 * Missing infrastructure or skipped tests => BLOCKED (never PASS).
 * Rejects production / remote Supabase targets.
 * No credentials written to tracked files (redacted status only).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync, execFileSync } = require("child_process");
const { validateIsolatedReplayTarget, redactUrl, localDefaultDatabaseUrl } = require("./option-d-target-safety");

const ROOT = path.join(__dirname, "..", "..");
const STATUS_OUT = path.join(ROOT, "docs/migration-remediation/option-d-runtime-status.json");
const ASSEMBLE = path.join(__dirname, "assemble-option-d-replay.js");
const GATE = path.join(__dirname, "audit-option-d-replay-gate.js");
const ASSEMBLED_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);

const PR312_RPC_SUITE =
  "lib/journal-entry-governance/__tests__/execution-reservation.postgres.integration.test.ts";

function writeStatus(status) {
  const safe = { ...status, writtenAt: new Date().toISOString() };
  // Never persist raw DB URLs
  if (safe.targetRedacted === undefined && process.env.OPTION_D_DATABASE_URL) {
    safe.targetRedacted = redactUrl(process.env.OPTION_D_DATABASE_URL);
  }
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
  // Best-effort: supabase local default 54322 — presence alone is not enough to PASS
  const r = spawnSync(
    process.execPath,
    [
      "-e",
      `const net=require('net');const s=net.connect(54322,'127.0.0.1');s.on('connect',()=>{console.log('open');s.end();process.exit(0)});s.on('error',()=>process.exit(1));setTimeout(()=>process.exit(1),1500);`,
    ],
    { encoding: "utf8", timeout: 5000 },
  );
  return r.status === 0;
}

function runNode(script) {
  const r = spawnSync(process.execPath, [script], { cwd: ROOT, encoding: "utf8" });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

async function applyAssembledIfRequested(dbUrl) {
  // Explicit opt-in only — default is dry infrastructure probe
  if (process.env.OPTION_D_APPLY !== "1") {
    return { applied: false, reason: "OPTION_D_APPLY not set to 1" };
  }
  const { Client } = require("pg");
  const client = new Client({ connectionString: dbUrl });
  await client.connect();
  const files = fs.readdirSync(ASSEMBLED_DIR).filter((f) => f.endsWith(".sql")).sort();
  // Sort by numeric prefix when possible — assembled filenames already ordered by assembler order via copy names
  // Re-read manifest order if present
  const manifestPath = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const ordered = [...manifest.entries].sort((a, b) => a.order - b.order);

  for (const entry of ordered) {
    const sql = fs.readFileSync(path.join(ASSEMBLED_DIR, entry.assembledFilename), "utf8");
    try {
      await client.query(sql);
    } catch (err) {
      await client.end();
      return {
        applied: false,
        failedAt: entry.assembledFilename,
        order: entry.order,
        error: String(err.message || err).slice(0, 500),
      };
    }
  }
  await client.end();
  return { applied: true, migrationsApplied: ordered.length };
}

async function main() {
  const scopes = {
    isolatedCandidateLineage: "PENDING",
    pr312RpcValidation: "PENDING",
    productionDashboardReplayParity: "unresolved",
  };

  // 1) Assemble + static gate (always local filesystem)
  const assemble = runNode(ASSEMBLE);
  if (assemble.status !== 0) {
    scopes.isolatedCandidateLineage = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "assemble_failed",
      scopes,
      assembleStderr: (assemble.stderr || "").slice(0, 1000),
    });
    process.exit(2);
  }

  const gate = runNode(GATE);
  if (gate.status !== 0) {
    scopes.isolatedCandidateLineage = "FAIL";
    writeStatus({
      overall: "BLOCKED",
      reason: "option_d_static_gate_failed",
      scopes,
      gateStdout: (gate.stdout || "").slice(0, 1000),
    });
    process.exit(2);
  }
  scopes.isolatedCandidateLineage = "PASS_STATIC";

  // 2) Infrastructure for runtime replay
  const dockerOk = checkDocker();
  const localPg = checkLocalPostgresPort();
  const dbUrl =
    process.env.OPTION_D_DATABASE_URL ||
    process.env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL ||
    "";

  const target = validateIsolatedReplayTarget(dbUrl || localDefaultDatabaseUrl());
  // If no URL provided, treat as intending local default — still validate the default
  const intendedUrl = dbUrl || localDefaultDatabaseUrl();
  const intendedCheck = validateIsolatedReplayTarget(intendedUrl);

  if (!intendedCheck.ok) {
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "unsafe_or_forbidden_target",
      targetSafety: intendedCheck,
      scopes,
      infrastructure: { dockerOk, localPostgres54322: localPg },
    });
    process.exit(2);
  }

  if (!dockerOk && !localPg && !dbUrl) {
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "missing_local_postgres_infrastructure",
      note:
        "Option D runtime requires local Docker/Supabase Postgres or an allowlisted localhost URL. Missing infra is BLOCKED, not PASS.",
      scopes,
      infrastructure: { dockerOk, localPostgres54322: localPg },
      targetRedacted: intendedCheck.redacted,
      requiredToRun: [
        "Docker Desktop (or equivalent) with local Supabase DB on 127.0.0.1:54322",
        "OR OPTION_D_DATABASE_URL pointing at allowlisted localhost host only",
        "OPTION_D_APPLY=1 to apply assembled SQL",
        "Then re-run this harness; PR #312 suite: npm run test:je-execution-reservation-postgres",
      ],
    });
    process.exit(2);
  }

  // Apply only with explicit opt-in
  let applyResult = { applied: false, reason: "not_requested" };
  if (process.env.OPTION_D_APPLY === "1") {
    if (!dbUrl) {
      scopes.pr312RpcValidation = "BLOCKED";
      writeStatus({
        overall: "BLOCKED",
        reason: "OPTION_D_APPLY_requires_OPTION_D_DATABASE_URL",
        scopes,
        infrastructure: { dockerOk, localPostgres54322: localPg },
        targetRedacted: intendedCheck.redacted,
      });
      process.exit(2);
    }
    applyResult = await applyAssembledIfRequested(dbUrl);
    if (!applyResult.applied) {
      scopes.pr312RpcValidation = "BLOCKED";
      writeStatus({
        overall: "BLOCKED",
        reason: "apply_failed_or_skipped",
        applyResult,
        scopes,
        targetRedacted: redactUrl(dbUrl),
      });
      process.exit(2);
    }
  } else {
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "runtime_apply_not_requested",
      note:
        "Static Option D lineage gate passed. Runtime clean replay + PR #312 RPC suite not executed. " +
        "Missing runtime step is BLOCKED, not PASS. Set OPTION_D_DATABASE_URL + OPTION_D_APPLY=1 after independent review.",
      scopes,
      infrastructure: { dockerOk, localPostgres54322: localPg },
      targetRedacted: intendedCheck.redacted,
      applyResult,
      definedRuntimeTests: [
        "clean_replay_apply_assembled_sql",
        "final_schema_rls_inventory",
        "view_security_invoker_assertions",
        "si_memory_immutability_assertions",
        "pr312_execution_reservation_postgres_suite",
      ],
      pr312SuitePath: PR312_RPC_SUITE,
      pr312SuitePresentInThisBranch: fs.existsSync(path.join(ROOT, PR312_RPC_SUITE)),
      productionDashboardReplayParity: "unresolved",
    });
    process.exit(2);
  }

  // If we applied, attempt PR #312 suite when present
  const suitePath = path.join(ROOT, PR312_RPC_SUITE);
  if (!fs.existsSync(suitePath)) {
    scopes.pr312RpcValidation = "BLOCKED";
    writeStatus({
      overall: "BLOCKED",
      reason: "pr312_rpc_suite_missing_on_this_branch",
      note: "Suite lives on PR #312; Option D branch validates lineage only until suites are run against local DB with PR #312 tests available.",
      scopes,
      applyResult,
      targetRedacted: redactUrl(dbUrl),
    });
    process.exit(2);
  }

  try {
    execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["vitest", "run", PR312_RPC_SUITE],
      {
        cwd: ROOT,
        env: {
          ...process.env,
          JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL: dbUrl,
        },
        stdio: "pipe",
      },
    );
    scopes.pr312RpcValidation = "PASS";
  } catch (err) {
    scopes.pr312RpcValidation = "FAIL";
    writeStatus({
      overall: "BLOCKED",
      reason: "pr312_rpc_suite_failed",
      scopes,
      applyResult,
      targetRedacted: redactUrl(dbUrl),
      error: String(err.message || err).slice(0, 1000),
    });
    process.exit(1);
  }

  writeStatus({
    overall: "PASS_RUNTIME",
    note: "Isolated candidate applied and PR #312 RPC suite passed. Production dashboard replay parity still unresolved. Not a merge approval.",
    scopes,
    applyResult,
    targetRedacted: redactUrl(dbUrl),
  });
  process.exit(0);
}

main().catch((err) => {
  writeStatus({
    overall: "BLOCKED",
    reason: "harness_exception",
    error: String(err.message || err).slice(0, 1000),
    scopes: {
      isolatedCandidateLineage: "UNKNOWN",
      pr312RpcValidation: "BLOCKED",
      productionDashboardReplayParity: "unresolved",
    },
  });
  process.exit(2);
});
