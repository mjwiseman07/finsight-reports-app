/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = process.cwd();

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

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return [fullPath];
  });
}

function unique(values) {
  return [...new Set(values)];
}

function safeRead(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function normalize(text) {
  return text.toLowerCase().replace(/[`"']/g, "").replace(/[\s\-_/]+/g, " ");
}

function includesToken(text, token) {
  return text.toLowerCase().includes(token.toLowerCase());
}

function includesConcept(normalizedText, words) {
  return words.every((word) => normalizedText.includes(word.toLowerCase()));
}

const planDirectories = unique([
  path.join(root, ".cursor", "plans"),
  path.join(os.homedir(), ".cursor", "plans"),
]);

const planFiles = planDirectories.flatMap((directory) =>
  listFiles(directory).filter((file) => /phase_22[bcde].*\.plan\.md$/i.test(file)),
);

const migrationFiles = exists("supabase/migrations")
  ? listFiles(path.join(root, "supabase", "migrations")).filter(
      (file) => file.endsWith(".sql") && /company_memory|memory_record|synthetic/i.test(path.basename(file)),
    )
  : [];

const planningText = planFiles.map(safeRead).join("\n");
const migrationText = migrationFiles.map(safeRead).join("\n");
const artifactText = `${planningText}\n${migrationText}`;
const normalizedArtifactText = normalize(artifactText);

assert(planFiles.length > 0 || migrationFiles.length > 0, "Phase 22 planning or migration artifacts exist");

for (const table of [
  "company_memory_records",
  "company_memory_record_sources",
  "company_memory_record_lineage",
  "company_memory_record_audit",
  "company_memory_record_versions",
  "company_memory_record_retention_events",
]) {
  assert(includesToken(artifactText, table), `${table} coverage exists`);
}

for (const field of [
  "memory_key",
  "memory_group_id",
  "memory_id",
  "record_version",
  "record_input_id",
  "company_id",
]) {
  assert(includesToken(artifactText, field), `${field} identity/versioning field coverage exists`);
}

for (const field of [
  "memory_status",
  "persistence_status",
  "governance_status",
  "refresh_status",
  "intelligence_scope",
]) {
  assert(includesToken(artifactText, field), `${field} lifecycle/governance field coverage exists`);
}

for (const field of [
  "record_input_determinism_hash",
  "persistence_determinism_hash",
  "promotion_determinism_hash",
  "retrieval_determinism_hash",
  "lineage_hash",
  "source_set_hash",
  "event_hash",
]) {
  assert(includesToken(artifactText, field), `${field} determinism/lineage field coverage exists`);
}

for (const field of [
  "source_system",
  "tenant_id",
  "entity_scope",
  "entity_type",
  "entity_id",
  "consolidation_group_id",
]) {
  assert(includesToken(artifactText, field), `${field} multi-entity/source field coverage exists`);
}

for (const field of ["domain", "subdomain", "topic", "industry", "intelligence_record_type", "audience_level"]) {
  assert(includesToken(artifactText, field), `${field} future-domain hook coverage exists`);
}

for (const field of ["confidence_score", "confidence_reason", "evidence_strength", "data_completeness_score"]) {
  assert(includesToken(artifactText, field), `${field} confidence/evidence field coverage exists`);
}

for (const field of [
  "legal_hold",
  "retention_expires_at",
  "persistence_run_id",
  "request_id",
  "previous_memory_id",
  "new_memory_id",
  "previous_status",
  "new_status",
]) {
  assert(includesToken(artifactText, field), `${field} audit/retention field coverage exists`);
}

const requiredConcepts = [
  { words: ["unique", "company id", "memory group id", "record version"], message: "unique company_id memory_group_id record_version concept exists" },
  { words: ["unique", "company id", "record input determinism hash"], message: "unique company_id record_input_determinism_hash concept exists" },
  { words: ["unique", "company id", "persistence determinism hash"], message: "unique company_id persistence_determinism_hash concept exists" },
  { words: ["active", "memory", "lookup"], message: "active memory lookup concept exists" },
  { words: ["memory key", "lookup"], message: "memory_key lookup concept exists" },
  { words: ["entity", "lookup"], message: "entity lookup concept exists" },
  { words: ["domain", "topic", "type", "lookup"], message: "domain topic type lookup concept exists" },
  { words: ["governance", "refresh", "lookup"], message: "governance refresh lookup concept exists" },
  { words: ["retention", "legal hold", "lookup"], message: "retention legal hold lookup concept exists" },
  { words: ["rls", "enabled"], message: "RLS enabled concept exists" },
  { words: ["service role", "write"], message: "service_role write/manage policy concept exists" },
  { words: ["authenticated", "read", "company"], message: "authenticated company-scoped read policy concept exists" },
  { words: ["company users"], message: "company_users alignment concept exists" },
  { words: ["no", "cross company", "fallback"], message: "no cross-company fallback concept exists" },
  { words: ["no", "browser", "service role"], message: "no browser service-role access concept exists" },
  { words: ["immutable", "memory", "records"], message: "immutable memory records concept exists" },
  { words: ["immutable", "source", "references"], message: "immutable source references concept exists" },
  { words: ["lineage", "immutable"], message: "immutable lineage concept exists" },
  { words: ["determinism", "hashes", "immutable"], message: "determinism hashes immutable concept exists" },
  { words: ["append only", "audit"], message: "append-only audit concept exists" },
  { words: ["append only", "retention"], message: "append-only retention concept exists" },
  { words: ["legal hold", "delete", "guard"], message: "legal hold delete guard concept exists" },
  { words: ["approved", "status", "transitions"], message: "approved status transitions only concept exists" },
  { words: ["scenario", "placeholders"], message: "scenario placeholder coverage exists" },
  { words: ["external", "signal", "placeholders"], message: "external signal placeholder coverage exists" },
];

for (const { words, message } of requiredConcepts) {
  assert(includesConcept(normalizedArtifactText, words), message);
}

for (const migrationStep of [
  "Core Tables",
  "Constraints",
  "Indexes",
  "RLS",
  "Immutability Triggers",
  "Audit/Retention Trigger Support",
  "Verification Script",
]) {
  assert(includesToken(artifactText, migrationStep), `${migrationStep} migration sequence step exists`);
}

const packageJson = JSON.parse(read("package.json"));
assert(
  packageJson.scripts?.["verify:si-company-memory-persistence-plan"] ===
    "node scripts/verify-si-company-memory-persistence-plan.js",
  "package script verify:si-company-memory-persistence-plan exists",
);

const persistenceRuntimeFiles = exists("lib/intelligence/synthetic/company-memory-persistence")
  ? listFiles(path.join(root, "lib", "intelligence", "synthetic", "company-memory-persistence")).filter((file) =>
      file.endsWith(".ts"),
    )
  : [];
const runtimeText = persistenceRuntimeFiles.map(safeRead).join("\n");
const securityScanText = `${migrationText}\n${runtimeText}`;

const forbiddenPatterns = [
  { pattern: /from\s+["'][^"']*forecast|import\s+[^;]*forecast|forecastEngine|forecast_engine/i, message: "forecasting engine implementation does not exist" },
  { pattern: /from\s+["'][^"']*budget|import\s+[^;]*budget|budgetEngine|budget_engine/i, message: "budgeting engine implementation does not exist" },
  { pattern: /signal-engine|signal_engine|signalEngine/i, message: "signal engine implementation does not exist" },
  { pattern: /recommendation-engine|recommendation_engine|recommendationEngine/i, message: "recommendation engine implementation does not exist" },
  { pattern: /from\s+["']openai["']|@openai|new\s+OpenAI\b|chat\.completions/i, message: "AI/OpenAI calls do not exist" },
  { pattern: /app[\\/]dashboard|dashboardPage|DashboardPage/i, message: "dashboard wiring does not exist" },
  { pattern: /financial-package-pdf|generatePdf|pdfRenderer/i, message: "PDF wiring does not exist" },
  { pattern: /powerpoint|pptx/i, message: "PowerPoint wiring does not exist" },
  { pattern: /pulse/i, message: "Pulse wiring does not exist" },
  { pattern: /from\s+["'][^"']*(provider|quickbooks|xero|sage|netsuite|dynamics)|lib[\\/]integrations/i, message: "provider wiring does not exist" },
  { pattern: /persistCompanyMemoryRecord\s*\(|persistCompanyMemoryRecords\s*\(|supersedeCompanyMemoryRecord\s*\(|archiveCompanyMemoryRecord\s*\(/i, message: "runtime persistence service implementation does not exist" },
  { pattern: /@supabase\/supabase-js|createClient\(/i, message: "Supabase client usage does not exist" },
  { pattern: /\.(insert|upsert|update|delete|rpc)\s*\(/i, message: "database writes do not exist" },
  { pattern: /browser.*service[_ -]?role|service[_ -]?role.*browser/i, message: "browser service-role usage does not exist" },
];

for (const { pattern, message } of forbiddenPatterns) {
  assert(!pattern.test(securityScanText), message);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("\nSI company memory persistence planning verification passed.");
