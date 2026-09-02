#!/usr/bin/env node
/**
 * Option D candidate-lineage gate.
 * Scans the assembled isolated replay set (NOT active supabase/migrations/).
 * mergeReady=true only when zero unresolved executable blockers remain in the
 * selected Option D replay set.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const ASSEMBLED_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
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

  // Prod-only Demo Xero RAISE body must not appear in assembled candidate
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

  const mergeReady = violations.length === 0;
  const report = {
    generatedAt: new Date().toISOString(),
    replayTrack: "option_d_isolated_candidate",
    ok: mergeReady,
    mergeReady,
    violationCount: violations.length,
    blockingViolations: violations,
    assembledCount: manifest?.counts?.totalAssembled ?? null,
    substitutions: manifest?.counts?.substitutions ?? null,
    scopes: {
      isolatedCandidateLineage: mergeReady ? "PASS_STATIC" : "FAIL",
      pr312RpcValidation: "NOT_RUN_BY_THIS_GATE",
      productionDashboardReplayParity: "unresolved",
      activeSupabaseMigrationsPromotion: "still_blocked_see_data-dependent-replay-gate",
    },
    note:
      "This gate covers Option D assembled candidate only. Active supabase/migrations/ " +
      "and production dashboard replay remain separate and unresolved for promotion/parity.",
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      { ok: report.ok, mergeReady: report.mergeReady, violationCount: report.violationCount },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

main();
