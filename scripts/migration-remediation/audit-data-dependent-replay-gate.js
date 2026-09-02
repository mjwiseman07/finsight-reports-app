#!/usr/bin/env node
/**
 * Static clean-replay gate: flags unconditional tenant-specific UUID DML in git
 * supabase/migrations/ that block data-less replay.
 *
 * Merge readiness: FAIL while any blocking violation remains executable in the
 * selected replay track. "Documented" classification suppresses unknown-warning
 * only — it does NOT make mergeReady true.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const CLASSIFICATION = path.join(
  ROOT,
  "docs/migration-remediation/migration-lineage-classification.json",
);

const FIXTURE_PREFIXES = ["71111111-1111-4111-8111", "00000000-0000-0000-0000-000000000001"];

function isGuarded(sql) {
  if (/where\s+exists\s*\([\s\S]*firm_clients/i.test(sql)) return true;
  if (/insert\s+into[\s\S]*select[\s\S]*from\s+public\.firm_clients/i.test(sql)) return true;
  if (/if\s+admin_user_id\s+is\s+not\s+null/i.test(sql)) return true;
  if (/on conflict/i.test(sql) && !/insert\s+into[\s\S]*values[\s\S]*71111111/i.test(sql)) return true;
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
        snippet: sql.slice(sql.indexOf(prefix) - 40, sql.indexOf(prefix) + 80).replace(/\s+/g, " "),
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
  return violations;
}

function main() {
  const replayTrack = process.env.REPLAY_TRACK || "git_migrations_executable";
  const classification = JSON.parse(fs.readFileSync(CLASSIFICATION, "utf8"));
  const allViolations = [];
  for (const file of fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"))) {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    allViolations.push(...scanFile(file, sql));
  }

  const documented = new Set(classification.documentedBlockerFiles || []);
  for (const b of classification.blockers || []) {
    if (b.localFilename) documented.add(b.localFilename);
  }
  for (const row of classification.local || []) {
    if (
      row.cleanReplayPolicy === "blocks_clean_replay_unless_guarded" ||
      row.cleanReplayPolicy === "prod_only_operational"
    ) {
      documented.add(row.filename);
    }
  }

  const undocumented = allViolations.filter((v) => !documented.has(v.filename));
  const blockingViolations = allViolations;

  // Merge readiness: zero executable blockers in git track (dashboard track needs
  // prod statements[] replacement per clean-replay-architecture.md — not covered here).
  const mergeReady = blockingViolations.length === 0;

  const report = {
    generatedAt: new Date().toISOString(),
    replayTrack,
    ok: mergeReady,
    mergeReady,
    violationCount: blockingViolations.length,
    documentedBlockerCount: blockingViolations.filter((v) => documented.has(v.filename)).length,
    undocumentedViolations: undocumented,
    blockingViolations,
    violations: blockingViolations,
    remediationReference: "docs/migration-remediation/clean-replay-architecture.md",
    note:
      "Documented blockers still fail mergeReady until guarded SQL is promoted to supabase/migrations/ " +
      "(git track) or production statements[] replaced at same version (dashboard track).",
  };

  const outPath = path.join(ROOT, "docs/migration-remediation/data-dependent-replay-gate.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      { ok: report.ok, mergeReady: report.mergeReady, violationCount: report.violationCount, outPath },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

main();
