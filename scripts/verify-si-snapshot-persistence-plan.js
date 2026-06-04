/* eslint-disable @typescript-eslint/no-require-imports */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const migrationRoot = path.join(root, "supabase", "migrations");

const migrationRequirements = {
  create_si_historical_snapshots: "si_historical_snapshots",
  create_si_snapshot_payloads: "si_snapshot_payloads",
  create_si_snapshot_audit: "si_snapshot_audit",
  create_si_snapshot_backfill_runs: "si_snapshot_backfill_runs",
  create_si_snapshot_retrieval_log: "si_snapshot_retrieval_log",
  create_si_snapshot_retention_events: "si_snapshot_retention_events",
  add_si_snapshot_rls_policies: "rls_policies",
  harden_si_snapshot_immutability: "immutability",
};

const requiredTables = [
  "si_historical_snapshots",
  "si_snapshot_payloads",
  "si_snapshot_audit",
  "si_snapshot_backfill_runs",
  "si_snapshot_retrieval_log",
  "si_snapshot_retention_events",
];

const writeSources = ["sync", "backfill", "repair", "migration", "manual_import"];
const retentionEvents = [
  "retained",
  "archived",
  "restored",
  "deleted",
  "legal_hold_applied",
  "legal_hold_released",
  "retention_extended",
  "retention_expired",
];

const protectedChangePatterns = [
  /^app[\\/](dashboard|api|onboarding|pulse)[\\/]/i,
  /financial-package-pdf/i,
  /powerpoint/i,
  /pulse/i,
  /package-ui/i,
  /^lib[\\/]integrations[\\/]/i,
  /report-preflight|validation/i,
  /forecast/i,
  /budget/i,
];

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

function readMigration(fragment) {
  const fileName = fs.readdirSync(migrationRoot).find((entry) => entry.includes(fragment) && entry.endsWith(".sql"));
  if (!fileName) return null;
  const fullPath = path.join(migrationRoot, fileName);
  return {
    fileName,
    fullPath,
    text: fs.readFileSync(fullPath, "utf8"),
  };
}

const migrations = Object.fromEntries(
  Object.keys(migrationRequirements).map((fragment) => [fragment, readMigration(fragment)]),
);

for (const fragment of Object.keys(migrationRequirements)) {
  assert(Boolean(migrations[fragment]), `Migration file exists for ${fragment}`);
}

const allSql = Object.values(migrations)
  .filter(Boolean)
  .map((migration) => migration.text)
  .join("\n");

for (const table of requiredTables) {
  assert(new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}`, "i").test(allSql), `${table} table is created`);
  assert(new RegExp(`alter\\s+table\\s+public\\.${table}\\s+enable\\s+row\\s+level\\s+security`, "i").test(allSql), `${table} has RLS enabled`);
  assert(new RegExp(`create\\s+policy[\\s\\S]*on\\s+public\\.${table}\\s+for\\s+all\\s+to\\s+service_role`, "i").test(allSql), `${table} has service_role manage policy`);
  assert(new RegExp(`create\\s+policy[\\s\\S]*on\\s+public\\.${table}\\s+for\\s+select\\s+to\\s+authenticated[\\s\\S]*company_users[\\s\\S]*company_id[\\s\\S]*auth\\.uid\\(\\)[\\s\\S]*status\\s+=\\s+'active'`, "i").test(allSql), `${table} has company-scoped authenticated read policy`);
}

for (const field of ["snapshot_storage_schema_version", "snapshot_persistence_version", "snapshot_write_source", "legal_hold"]) {
  assert(allSql.includes(field), `${field} is present`);
}

const historicalSql = migrations.create_si_historical_snapshots?.text || "";
for (const source of writeSources) {
  assert(historicalSql.includes(`'${source}'`), `snapshot_write_source allows ${source}`);
}

const retentionSql = migrations.create_si_snapshot_retention_events?.text || "";
for (const eventType of retentionEvents) {
  assert(retentionSql.includes(`'${eventType}'`), `retention event type allows ${eventType}`);
}

assert(/si_historical_snapshots_latest_finalized_idx/i.test(historicalSql), "Latest-finalized index exists");
assert(/where\s+snapshot_status\s+=\s+'finalized'/i.test(historicalSql), "Latest-finalized index filters finalized snapshots");
assert(/unique\s+\(company_id,\s*source_system,\s*tenant_id,\s*period_key,\s*snapshot_version\)/i.test(historicalSql), "Snapshot version uniqueness exists");

const immutabilitySql = migrations.harden_si_snapshot_immutability?.text || "";
assert(immutabilitySql.includes("prevent_si_snapshot_metadata_mutation"), "Metadata immutability function exists");
assert(immutabilitySql.includes("prevent_si_snapshot_child_mutation_when_parent_locked"), "Payload/audit immutability function exists");
assert(immutabilitySql.includes("Persistence Service"), "Persistence-flow ownership names Persistence Service");
assert(immutabilitySql.includes("si_historical_snapshots metadata"), "Persistence-flow ownership names metadata step");
assert(immutabilitySql.includes("si_snapshot_payloads payload"), "Persistence-flow ownership names payload step");
assert(immutabilitySql.includes("si_snapshot_audit audit"), "Persistence-flow ownership names audit step");

const changedFiles = execSync("git status --short", { encoding: "utf8" })
  .split(/\r?\n/)
  .map((line) => line.trim().replace(/^[AMDRCU?! ]+\s+/, ""))
  .filter(Boolean);

for (const changedFile of changedFiles) {
  const isAllowed =
    changedFile === "package.json" ||
    changedFile === path.join("scripts", "verify-si-snapshot-persistence-plan.js").replace(/\\/g, "/") ||
    changedFile.startsWith("supabase/migrations/") ||
    changedFile.startsWith("supabase\\migrations\\");

  assert(isAllowed, `Changed file is within Phase 17D scope: ${changedFile}`);
  assert(!protectedChangePatterns.some((pattern) => pattern.test(changedFile)), `Protected file not modified: ${changedFile}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI snapshot persistence plan verification passed.");
