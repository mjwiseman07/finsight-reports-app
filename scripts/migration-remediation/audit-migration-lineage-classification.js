#!/usr/bin/env node
/**
 * Classify local + production migration lineage for clean-replay planning.
 * Read-only — does not modify migrations or connect to remote databases.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const PROD_JSON = path.join(ROOT, "docs/migration-remediation/evidence/production-migrations.json");
const MAPPING_JSON = path.join(ROOT, "docs/migration-remediation/migration-mapping.json");
const OUT_JSON = path.join(ROOT, "docs/migration-remediation/migration-lineage-classification.json");

const TENANT_UUID_PATTERNS = [
  /71111111-1111-4111-8111-[0-9a-f]{12}/gi,
  /72222222-2222-4222-8222-[0-9a-f]{12}/gi,
  /73333333-3333-4333-8333-[0-9a-f]{12}/gi,
  /74444444-4444-4444-8444-[0-9a-f]{12}/gi,
  /02edb6c6-a4f1-4bae-825d-2680136dad24/gi,
  /aaaaaaaa-2222-4222-8222-222222222222/gi,
  /00000000-0000-0000-0000-000000000001/gi,
  /774e6be2-ad1b-41fa-859d-163b0805c3ca/gi,
  /95da07be-8e2c-4b84-9dcc-8a98fa841273/gi,
];

const REFERENCE_SEED_TABLES = new Set([
  "company_roles",
  "curated_rules_registry",
  "assertions_catalog",
  "assertion_relevance_matrix",
  "rule_assertion_coverage",
  "lifecycle_issue_kinds_registry",
  "event_projections",
  "ap_intake_assertion_registry",
  "ap_intake_ledger_event_types",
  "close_checklist_templates",
  "close_checklist_template_items",
  "preset_pack_registry",
]);

const MANUAL_OVERRIDES = {
  "20260703_2000_d6_2a_test_client_activation.sql": {
    classification: "operational_data_activation",
    cleanReplayPolicy: "blocks_clean_replay_unless_guarded",
    g2Blocker: true,
    notes: "Unconditional INSERT into client_active_rules for fixture firm_client_id; FK fails on data-less branch",
  },
  "20260703_2200_d6_2b_mfg_activation.sql": {
    classification: "mixed",
    cleanReplayPolicy: "blocks_clean_replay_unless_guarded",
    notes: "Registry UPDATE is reference; client_active_rules INSERT is operational fixture activation",
  },
  "20260703_2300_d6_2c_retail_activation.sql": {
    classification: "mixed",
    cleanReplayPolicy: "blocks_clean_replay_unless_guarded",
  },
  "20260703_2400_d6_2d_ps_activation.sql": {
    classification: "mixed",
    cleanReplayPolicy: "blocks_clean_replay_unless_guarded",
  },
  "20260708_02_d1_1_owner_user_id_backfill.sql": {
    classification: "backfill",
    cleanReplayPolicy: "skip_on_empty_guarded",
    notes: "DO block no-ops when auth.users row absent",
  },
  "20260809083000_companies_tenant_identity_columns.sql": {
    classification: "mixed",
    cleanReplayPolicy: "prod_tenant_backfill_noop_on_empty",
    notes: "UPDATE ... WHERE id = prod UUID; 0 rows affected on data-less branch",
  },
  "20260708120000_tcp1_w1_solo_bk_pilot_slots.sql": {
    classification: "mixed",
    cleanReplayPolicy: "blocks_clean_replay_unless_guarded",
    notes: "Schema + pilot_slots INSERT referencing company_id 00000000-... FK",
  },
  "20260814221500_accounting_canonical_connected_grant.sql": {
    classification: "mixed",
    cleanReplayPolicy: "prod_only_operational",
    notes: "Production canonical tenant rewiring; RAISE EXCEPTION if prod rows missing",
  },
  "20260531_backfill_accounting_connections_from_quickbooks.sql": {
    classification: "backfill",
    cleanReplayPolicy: "excluded_from_baseline",
  },
  "20260530_create_company_accounts.sql": {
    classification: "reference_seed",
    cleanReplayPolicy: "required",
    notes: "company_roles catalog seed only",
  },
};

function parseLocalFilename(filename) {
  const m = filename.match(/^(\d{8,14})_(.+)\.sql$/);
  if (!m) return { version: filename.replace(/\.sql$/, ""), name: filename.replace(/\.sql$/, ""), filename };
  let name = m[2];
  // Strip intra-day numeric sub-prefixes (e.g. 20260703_2000_d6_2a_* → d6_2a_*)
  if (/^\d{4,14}_/.test(name)) name = name.replace(/^\d{4,14}_/, "");
  return { version: m[1], name, filename };
}

function extractTenantUuids(sql) {
  const hits = new Set();
  for (const pat of TENANT_UUID_PATTERNS) {
    pat.lastIndex = 0;
    for (const m of sql.matchAll(pat)) hits.add(m[0].toLowerCase());
  }
  return [...hits];
}

function hasUnconditionalTenantInsert(sql, uuids) {
  if (!uuids.length) return false;
  const lower = sql.toLowerCase();
  if (!/insert\s+into/.test(lower)) return false;
  // Guarded patterns that are safe on empty branches
  if (/insert\s+into[\s\S]*select[\s\S]*from\s+public\.firm_clients/i.test(sql)) return false;
  if (/where\s+exists\s*\([\s\S]*firm_clients/i.test(sql)) return false;
  if (/if\s+admin_user_id\s+is\s+not\s+null/i.test(sql)) return false;
  if (/to_regclass\s*\(/i.test(sql) && /if\s+not\s+exists/i.test(sql)) return false;
  // UPDATE by id is no-op on empty
  if (!/insert\s+into/i.test(lower) && /update\s+/i.test(sql)) return false;
  // VALUES inserts with tenant UUIDs
  if (/insert\s+into[\s\S]*values[\s\S]*71111111-1111/i.test(sql)) return true;
  if (/insert\s+into[\s\S]*values[\s\S]*00000000-0000-0000-0000-000000000001/i.test(sql)) return true;
  return /insert\s+into/i.test(lower) && uuids.some((u) => sql.toLowerCase().includes(u));
}

function classifyFile(filename, sql) {
  if (MANUAL_OVERRIDES[filename]) {
    return { ...MANUAL_OVERRIDES[filename], tenantUuids: extractTenantUuids(sql) };
  }

  const lower = sql.toLowerCase();
  const tenantUuids = extractTenantUuids(sql);
  const hasCreate = /create\s+(table|type|function|extension|policy|index|trigger)/i.test(sql);
  const hasInsert = /insert\s+into/i.test(lower);
  const hasUpdate = /update\s+(public\.)?\w+/i.test(sql);
  const hasBackfillComment = /backfill/i.test(sql);
  const insertTables = [...sql.matchAll(/insert\s+into\s+(?:public\.)?(\w+)/gi)].map((m) =>
    m[1].toLowerCase(),
  );

  let classification = "schema";
  if (hasInsert && hasCreate) classification = "mixed";
  else if (hasInsert && insertTables.every((t) => REFERENCE_SEED_TABLES.has(t))) classification = "reference_seed";
  else if (hasInsert && tenantUuids.length) classification = "operational_data_activation";
  else if (hasInsert && hasBackfillComment) classification = "mixed";
  else if (hasInsert) classification = "reference_seed";
  else if (hasUpdate && tenantUuids.length) classification = "backfill";
  else if (hasUpdate && hasBackfillComment) classification = "backfill";
  else if (hasUpdate) classification = "mixed";

  let cleanReplayPolicy = "required";
  if (classification === "reference_seed") cleanReplayPolicy = "required_reference_seed";
  else if (classification === "schema") cleanReplayPolicy = "required";
  else if (classification === "backfill" && tenantUuids.length) cleanReplayPolicy = "prod_tenant_backfill_noop_on_empty";
  else if (hasUnconditionalTenantInsert(sql, tenantUuids)) cleanReplayPolicy = "blocks_clean_replay_unless_guarded";
  else if (classification === "operational_data_activation") cleanReplayPolicy = "blocks_clean_replay_unless_guarded";
  else if (classification === "mixed" && tenantUuids.length) cleanReplayPolicy = "review_required";
  else if (classification === "mixed") cleanReplayPolicy = "required";

  return { classification, cleanReplayPolicy, tenantUuids };
}

function main() {
  const prod = JSON.parse(fs.readFileSync(PROD_JSON, "utf8"));
  const mapping = JSON.parse(fs.readFileSync(MAPPING_JSON, "utf8"));
  const localFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();

  const localEntries = localFiles.map((filename) => {
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, filename), "utf8");
    const meta = parseLocalFilename(filename);
    const cls = classifyFile(filename, sql);
    return { source: "local", filename, ...meta, ...cls };
  });

  const localByName = new Map(localEntries.map((e) => [e.name.toLowerCase(), e]));

  const productionEntries = prod.map((pm, index) => {
    const local = localByName.get(pm.name.toLowerCase());
    const filename = local?.filename || `(prod-only) ${pm.version}_${pm.name}.sql`;
    return {
      replayOrder: index + 1,
      productionVersion: pm.version,
      productionName: pm.name,
      localFilename: local?.filename || null,
      inGit: Boolean(local),
      classification: local?.classification || (pm.name.includes("seed") ? "reference_seed" : "unknown_prod_only"),
      cleanReplayPolicy: local?.cleanReplayPolicy || "unknown_requires_recovered_sql",
      tenantUuids: local?.tenantUuids || [],
      g2Blocker: local?.g2Blocker || false,
      notes: local?.notes,
    };
  });

  const blockers = productionEntries.filter(
    (e) =>
      e.cleanReplayPolicy === "blocks_clean_replay_unless_guarded" ||
      e.cleanReplayPolicy === "prod_only_operational" ||
      e.g2Blocker ||
      e.productionName?.match(/^d6_2[a-d]_/) ,
  );

  const documentedBlockerFiles = new Set(
    localEntries
      .filter(
        (e) =>
          e.cleanReplayPolicy === "blocks_clean_replay_unless_guarded" ||
          e.cleanReplayPolicy === "prod_only_operational" ||
          e.g2Blocker,
      )
      .map((e) => e.filename),
  );

  const g2SecondReplay = {
    status: "FAILED_AT_MIGRATION_25",
    migrationsRecorded: 25,
    failingProductionVersion: "20260703182655",
    failingProductionName: "d6_2a_test_client_activation",
    localFilename: "20260703_2000_d6_2a_test_client_activation.sql",
    branchId: "c5982210-4114-432e-9339-4cff1decf538",
    branchRef: "oczqpxtehgkulqxujfhx",
    branchDeleted: true,
    productionUntouched: true,
    baselineOrderingPass: true,
    phase1RlsPass: true,
    jeStackReached: false,
  };

  const summary = {
    localMigrationCount: localEntries.length,
    productionMigrationCount: prod.length,
    classificationCounts: {},
    cleanReplayPolicyCounts: {},
    blockersCount: blockers.length,
    firstCleanReplayBlocker: blockers.find((b) => b.g2Blocker || b.productionVersion === "20260703182655") || blockers[0],
  };

  for (const e of localEntries) {
    summary.classificationCounts[e.classification] = (summary.classificationCounts[e.classification] || 0) + 1;
    summary.cleanReplayPolicyCounts[e.cleanReplayPolicy] =
      (summary.cleanReplayPolicyCounts[e.cleanReplayPolicy] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    g2SecondReplay,
    summary,
    cleanReplayPolicies: {
      required: "Schema DDL; must replay on data-less branches",
      required_reference_seed: "Catalog/registry seed rows without tenant FK dependencies",
      skip_on_empty_guarded: "Operational DML guarded; no-ops on empty branch",
      prod_tenant_backfill_noop_on_empty: "UPDATE targeting prod UUIDs; 0 rows on empty branch",
      blocks_clean_replay_unless_guarded: "Unconditional tenant FK DML; blocks until guarded or split",
      prod_only_operational: "Requires specific production rows; not for data-less replay",
      excluded_from_baseline: "Omitted from foundations baseline",
      unknown_requires_recovered_sql: "Production-only migration; SQL not in git",
      review_required: "Mixed migration; manual review",
    },
    blockers,
    documentedBlockerFiles: [...documentedBlockerFiles],
    local: localEntries,
    production: productionEntries,
  };

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ ok: true, outPath: OUT_JSON, summary }, null, 2));
}

main();
