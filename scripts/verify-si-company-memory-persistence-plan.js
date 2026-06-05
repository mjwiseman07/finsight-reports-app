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

function assertIncludes(text, token, message) {
  assert(includesToken(text, token), message);
}

function assertMatches(text, pattern, message) {
  assert(pattern.test(text), message);
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

const phase23MigrationPaths = {
  core: "supabase/migrations/20260605_create_company_memory_persistence_core_tables.sql",
  constraints: "supabase/migrations/20260605_add_company_memory_persistence_constraints.sql",
  indexes: "supabase/migrations/20260605_add_company_memory_persistence_indexes.sql",
  rls: "supabase/migrations/20260605_add_company_memory_persistence_rls_policies.sql",
  immutability: "supabase/migrations/20260605_harden_company_memory_persistence_immutability.sql",
};

for (const [phase, relativePath] of Object.entries(phase23MigrationPaths)) {
  assert(exists(relativePath), `Phase 23 ${phase} migration artifact exists`);
}

const coreMigrationText = exists(phase23MigrationPaths.core) ? read(phase23MigrationPaths.core) : "";
const constraintsMigrationText = exists(phase23MigrationPaths.constraints) ? read(phase23MigrationPaths.constraints) : "";
const indexesMigrationText = exists(phase23MigrationPaths.indexes) ? read(phase23MigrationPaths.indexes) : "";
const rlsMigrationText = exists(phase23MigrationPaths.rls) ? read(phase23MigrationPaths.rls) : "";
const immutabilityMigrationText = exists(phase23MigrationPaths.immutability)
  ? read(phase23MigrationPaths.immutability)
  : "";

for (const table of [
  "company_memory_records",
  "company_memory_record_sources",
  "company_memory_record_lineage",
  "company_memory_record_audit",
  "company_memory_record_versions",
  "company_memory_record_retention_events",
]) {
  assertMatches(
    coreMigrationText,
    new RegExp(`create\\s+table\\s+if\\s+not\\s+exists\\s+public\\.${table}\\b`, "i"),
    `${table} create table statement exists in Phase 23A migration`,
  );
}

for (const field of [
  "memory_key",
  "memory_group_id",
  "memory_id",
  "record_version",
  "record_input_id",
  "company_id",
  "memory_status",
  "persistence_status",
  "governance_status",
  "refresh_status",
  "intelligence_scope",
  "record_input_determinism_hash",
  "persistence_determinism_hash",
  "promotion_determinism_hash",
  "retrieval_determinism_hash",
  "lineage_hash",
  "source_set_hash",
  "event_hash",
  "source_system",
  "tenant_id",
  "entity_scope",
  "entity_type",
  "entity_id",
  "consolidation_group_id",
  "domain",
  "subdomain",
  "topic",
  "industry",
  "intelligence_record_type",
  "audience_level",
  "confidence_score",
  "confidence_reason",
  "evidence_strength",
  "data_completeness_score",
  "legal_hold",
  "retention_expires_at",
  "persistence_run_id",
  "request_id",
  "previous_memory_id",
  "new_memory_id",
  "previous_status",
  "new_status",
]) {
  assertIncludes(coreMigrationText, field, `${field} exists in Phase 23A core migration`);
}

for (const jsonbField of [
  "payload jsonb",
  "scenario_metadata jsonb",
  "external_signal_metadata jsonb",
  "governance_metadata jsonb",
  "evidence_metadata jsonb",
  "source_metadata jsonb",
  "lineage_metadata jsonb",
  "audit_payload jsonb",
  "retention_payload jsonb",
]) {
  assertIncludes(coreMigrationText, jsonbField, `${jsonbField} exists in Phase 23A core migration`);
}

for (const constraintName of [
  "company_memory_record_sources_memory_id_fkey",
  "company_memory_record_lineage_memory_id_fkey",
  "company_memory_record_audit_memory_id_fkey",
  "company_memory_record_versions_memory_id_fkey",
  "company_memory_record_versions_superseded_by_memory_id_fkey",
  "company_memory_record_retention_events_memory_id_fkey",
  "company_memory_records_company_group_version_unique",
  "company_memory_records_record_input_hash_unique",
  "company_memory_records_persistence_hash_unique",
  "company_memory_record_lineage_company_memory_lineage_hash_unique",
  "company_memory_record_audit_company_event_hash_unique",
  "company_memory_record_retention_events_company_event_hash_unique",
  "company_memory_record_versions_company_group_version_unique",
  "company_memory_records_record_version_check",
  "company_memory_records_confidence_score_check",
  "company_memory_records_data_completeness_score_check",
  "company_memory_records_entity_scope_check",
  "company_memory_records_persistence_status_check",
  "company_memory_records_intelligence_scope_check",
  "company_memory_record_versions_record_version_check",
  "company_memory_record_versions_version_status_check",
  "company_memory_record_audit_event_type_check",
  "company_memory_record_retention_events_event_type_check",
]) {
  assertIncludes(constraintsMigrationText, constraintName, `${constraintName} exists in Phase 23B constraints migration`);
}

assertIncludes(constraintsMigrationText, "on delete restrict", "Phase 23B foreign keys use restrict/no cascade behavior");
assert(!/on\s+delete\s+cascade/i.test(constraintsMigrationText), "Phase 23B constraints do not use cascade delete");

for (const indexName of [
  "cmr_company_group_version_idx",
  "cmr_record_input_hash_idx",
  "cmr_persistence_hash_idx",
  "cmr_memory_key_status_idx",
  "cmr_memory_key_group_idx",
  "cmr_entity_scope_id_idx",
  "cmr_entity_type_id_idx",
  "cmr_consolidation_group_idx",
  "cmr_source_system_tenant_idx",
  "cmr_domain_subdomain_status_idx",
  "cmr_topic_status_idx",
  "cmr_record_type_status_idx",
  "cmr_industry_domain_status_idx",
  "cmr_governance_status_idx",
  "cmr_refresh_status_idx",
  "cmr_legal_hold_retention_idx",
  "cmr_active_records_idx",
  "cmr_legal_hold_true_idx",
  "cmr_needs_review_idx",
  "cmr_needs_reprocessing_idx",
  "cmr_history_status_idx",
  "cmrs_company_memory_idx",
  "cmrs_source_record_idx",
  "cmrs_snapshot_idx",
  "cmrs_source_set_hash_idx",
  "cmrs_source_type_source_id_idx",
  "cmrs_source_tenant_period_idx",
  "cmrl_company_memory_idx",
  "cmrl_company_group_idx",
  "cmrl_candidate_idx",
  "cmrl_promotion_idx",
  "cmrl_retrieval_lineage_idx",
  "cmrl_lineage_hash_idx",
  "cmra_memory_created_idx",
  "cmra_group_created_idx",
  "cmra_event_created_idx",
  "cmra_persistence_run_idx",
  "cmra_request_idx",
  "cmra_event_hash_idx",
  "cmrv_group_version_idx",
  "cmrv_memory_key_idx",
  "cmrv_status_created_idx",
  "cmrv_active_group_idx",
  "cmre_memory_created_idx",
  "cmre_event_created_idx",
  "cmre_legal_hold_after_idx",
  "cmre_retention_expires_after_idx",
  "cmre_legal_hold_true_idx",
]) {
  assertIncludes(indexesMigrationText, indexName, `${indexName} exists in Phase 23C indexes migration`);
}

assertMatches(indexesMigrationText, /create\s+index\s+if\s+not\s+exists/gi, "Phase 23C uses create index if not exists");
assertIncludes(indexesMigrationText, "where memory_status = 'active'", "Phase 23C active records partial index exists");
assertIncludes(indexesMigrationText, "where legal_hold = true", "Phase 23C legal hold partial index exists");
assertIncludes(indexesMigrationText, "where refresh_status = 'needs_review'", "Phase 23C needs_review partial index exists");
assertIncludes(indexesMigrationText, "where refresh_status = 'needs_reprocessing'", "Phase 23C needs_reprocessing partial index exists");
assertIncludes(indexesMigrationText, "where version_status = 'active'", "Phase 23C active version partial index exists");

for (const table of [
  "company_memory_records",
  "company_memory_record_sources",
  "company_memory_record_lineage",
  "company_memory_record_audit",
  "company_memory_record_versions",
  "company_memory_record_retention_events",
]) {
  assertIncludes(
    rlsMigrationText,
    `alter table if exists public.${table} enable row level security`,
    `${table} RLS enablement exists in Phase 23D migration`,
  );
  assertMatches(
    rlsMigrationText,
    new RegExp(`create\\s+policy\\s+"service role can manage[^"]*"\\s+on\\s+public\\.${table}[\\s\\S]*?to\\s+service_role[\\s\\S]*?using\\s+\\(true\\)[\\s\\S]*?with\\s+check\\s+\\(true\\)`, "i"),
    `${table} service_role manage policy exists in Phase 23D migration`,
  );
  assertMatches(
    rlsMigrationText,
    new RegExp(`create\\s+policy\\s+"company members can read[^"]*"\\s+on\\s+public\\.${table}[\\s\\S]*?for\\s+select[\\s\\S]*?to\\s+authenticated[\\s\\S]*?public\\.company_users[\\s\\S]*?cu\\.company_id\\s*=\\s*${table}\\.company_id[\\s\\S]*?cu\\.user_id\\s*=\\s*auth\\.uid\\(\\)[\\s\\S]*?cu\\.status\\s*=\\s*'active'`, "i"),
    `${table} authenticated active company_users read policy exists in Phase 23D migration`,
  );
}

assert(!/to\s+anon\b/i.test(rlsMigrationText), "Phase 23D RLS migration has no anon policy");
assert(!/to\s+public\b/i.test(rlsMigrationText), "Phase 23D RLS migration has no public policy");
assert(!/source_system\s*=\s*[^;\n]+auth\.uid|tenant_id\s*=\s*[^;\n]+auth\.uid/i.test(rlsMigrationText), "Phase 23D has no source_system-only or tenant_id-only read fallback");

for (const token of [
  "prevent_company_memory_record_unsafe_mutation",
  "prevent_company_memory_append_only_mutation",
  "prevent_company_memory_version_unsafe_mutation",
  "prevent_company_memory_record_sources_mutation",
  "prevent_company_memory_record_lineage_mutation",
  "prevent_company_memory_record_audit_mutation",
  "prevent_company_memory_retention_events_mutation",
  "prevent_company_memory_version_unsafe_mutation",
]) {
  assertIncludes(immutabilityMigrationText, token, `${token} exists in Phase 23E immutability migration`);
}

for (const immutableField of [
  "old.memory_id is distinct from new.memory_id",
  "old.memory_group_id is distinct from new.memory_group_id",
  "old.memory_key is distinct from new.memory_key",
  "old.record_version is distinct from new.record_version",
  "old.company_id is distinct from new.company_id",
  "old.record_input_determinism_hash is distinct from new.record_input_determinism_hash",
  "old.persistence_determinism_hash is distinct from new.persistence_determinism_hash",
  "old.payload is distinct from new.payload",
]) {
  assertIncludes(immutabilityMigrationText, immutableField, `${immutableField} immutability guard exists`);
}

assertIncludes(immutabilityMigrationText, "old.legal_hold = true", "Phase 23E legal-hold delete guard exists");
assertIncludes(immutabilityMigrationText, "rows are append-only", "Phase 23E append-only audit/source/lineage/retention guard exists");
assertIncludes(immutabilityMigrationText, "pending', 'persisted', 'blocked", "Phase 23E pending status transition guard exists");
assertIncludes(immutabilityMigrationText, "persisted', 'superseded', 'archived", "Phase 23E persisted status transition guard exists");
assertIncludes(immutabilityMigrationText, "superseded', 'archived", "Phase 23E superseded status transition guard exists");
assertIncludes(immutabilityMigrationText, "must remain blocked", "Phase 23E blocked status transition guard exists");

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
