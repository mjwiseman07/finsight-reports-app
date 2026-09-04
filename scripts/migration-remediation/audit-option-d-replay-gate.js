#!/usr/bin/env node
/**
 * Option D candidate-lineage gate.
 * Scans the assembled isolated replay set (NOT active supabase/migrations/).
 *
 * Distinct statuses:
 *   fixtureScanOk              — no unguarded fixture inserts / prod-only RAISE
 *   requiredDependenciesResolved — no REQUIRED missing table, function, OR column CREATE
 *   candidateReplayStaticReady — both of the above (this gate's "ok")
 *   runtimeReady               — never set here (harness only)
 *   prMergeReady               — always false from this gate (draft PR, runtime untested)
 *
 * `mergeReady` is candidateReplayStaticReady only (NOT overall PR merge).
 * Gate fails (exit 1) while any REQUIRED dependency remains unresolved.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const ASSEMBLED_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const CLASS_JSON = path.join(
  ROOT,
  "docs/migration-remediation/option-d-unresolved-classification.json",
);
const OUT_JSON = path.join(ROOT, "docs/migration-remediation/option-d-replay-gate.json");

const FIXTURE_PREFIXES = [
  "71111111-1111-4111-8111",
  "00000000-0000-0000-0000-000000000001",
];

function isGuarded(sql) {
  if (/where\s+exists\s*\([\s\S]*firm_clients/i.test(sql)) return true;
  if (/insert\s+into[\s\S]*select[\s\S]*from\s+public\.firm_clients/i.test(sql)) return true;
  if (/insert\s+into[\s\S]*select[\s\S]*from\s+public\.companies/i.test(sql)) return true;
  if (/if\s+admin_user_id\s+is\s+not\s+null/i.test(sql)) return true;
  return false;
}

function scanFile(filename, sql) {
  const violations = [];
  const lower = sql.toLowerCase();

  for (const prefix of FIXTURE_PREFIXES) {
    if (!sql.includes(prefix)) continue;
    if (!/insert\s+into/i.test(lower)) continue;
    if (isGuarded(sql)) continue;
    if (/insert\s+into[\s\S]*values[\s\S]*71111111-1111/i.test(sql)) {
      violations.push({
        filename,
        rule: "unconditional_fixture_firm_client_insert",
        prefix,
      });
    }
    if (/insert\s+into[\s\S]*values[\s\S]*00000000-0000-0000-0000-000000000001/i.test(sql)) {
      violations.push({
        filename,
        rule: "unconditional_fixture_company_insert",
        prefix,
      });
    }
  }

  if (
    filename.includes("accounting_canonical_connected_grant") &&
    /raise\s+exception/i.test(sql) &&
    /connected-duplicate group/i.test(sql)
  ) {
    violations.push({
      filename,
      rule: "prod_only_raise_on_missing_demo_shape",
    });
  }

  return violations;
}

function main() {
  if (!fs.existsSync(ASSEMBLED_DIR)) {
    const report = {
      generatedAt: new Date().toISOString(),
      replayTrack: "option_d_isolated_candidate",
      ok: false,
      mergeReady: false,
      candidateReplayStaticReady: false,
      fixtureScanOk: false,
      requiredDependenciesResolved: false,
      runtimeReady: false,
      prMergeReady: false,
      status: "ASSEMBLED_DIR_MISSING",
      note: "Run assemble-option-d-replay.js first",
    };
    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const violations = [];
  for (const file of fs.readdirSync(ASSEMBLED_DIR).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = fs.readFileSync(path.join(ASSEMBLED_DIR, file), "utf8");
    violations.push(...scanFile(file, sql));
  }

  const manifest = fs.existsSync(MANIFEST)
    ? JSON.parse(fs.readFileSync(MANIFEST, "utf8"))
    : null;

  if (!fs.existsSync(CLASS_JSON)) {
    const report = {
      generatedAt: new Date().toISOString(),
      replayTrack: "option_d_isolated_candidate",
      ok: false,
      mergeReady: false,
      candidateReplayStaticReady: false,
      fixtureScanOk: violations.length === 0,
      requiredDependenciesResolved: false,
      runtimeReady: false,
      prMergeReady: false,
      status: "UNRESOLVED_CLASSIFICATION_MISSING",
      note: "Fail closed: required-dependency classification artifact missing. Re-run assemble-option-d-replay.js.",
      blockingViolations: violations,
    };
    fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ ok: false, mergeReady: false, reason: report.status }, null, 2));
    process.exit(1);
  }

  const classification = JSON.parse(fs.readFileSync(CLASS_JSON, "utf8"));
  const required = (classification.classifications || []).filter(
    (c) => c.classification === "required_missing_create",
  );
  const fixtureScanOk = violations.length === 0;
  const requiredDependenciesResolved = required.length === 0;
  const candidateReplayStaticReady = fixtureScanOk && requiredDependenciesResolved;

  const report = {
    generatedAt: new Date().toISOString(),
    replayTrack: "option_d_isolated_candidate",
    ok: candidateReplayStaticReady,
    mergeReady: candidateReplayStaticReady,
    mergeReadyMeaning:
      "candidateReplayStaticReady only — not runtime PASS and not overall PR merge approval",
    candidateReplayStaticReady,
    fixtureScanOk,
    requiredDependenciesResolved,
    requiredUnresolvedCount: required.length,
    requiredUnresolved: required.map((c) => ({
      file: c.file,
      kind: c.kind || "table",
      table: c.table,
      identity: c.identity || null,
      prerequisiteSource: c.prerequisiteSource,
    })),
    runtimeReady: false,
    prMergeReady: false,
    violationCount: violations.length,
    blockingViolations: violations,
    assembledCount: manifest?.counts?.totalAssembled ?? null,
    substitutions: manifest?.counts?.substitutions ?? null,
    scopes: {
      isolatedCandidateLineage: candidateReplayStaticReady ? "PASS_STATIC" : "FAIL",
      pr312RpcValidation: "NOT_RUN_BY_THIS_GATE",
      productionDashboardReplayParity: "unresolved",
      activeSupabaseMigrationsPromotion: "still_blocked_see_data-dependent-replay-gate",
      runtime: "NOT_RUN",
      prMerge: "NOT_READY",
    },
    note:
      "Fails while any REQUIRED missing table, function, or column CREATE remains. Justified exclusions (safe_conditional / prefix) stay documented and do not pass this gate by omission. Runtime and overall PR merge stay false.",
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        mergeReady: report.mergeReady,
        fixtureScanOk: report.fixtureScanOk,
        requiredDependenciesResolved: report.requiredDependenciesResolved,
        requiredUnresolvedCount: report.requiredUnresolvedCount,
        prMergeReady: report.prMergeReady,
        runtimeReady: report.runtimeReady,
      },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

main();
