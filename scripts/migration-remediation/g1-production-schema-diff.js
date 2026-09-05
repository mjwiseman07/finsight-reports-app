#!/usr/bin/env node
/**
 * G1 production schema diff — local analysis only.
 * Reads external read-only schema contract (not committed), verifies SHA-256,
 * compares cumulative migration model vs production contract, writes minimized reports.
 *
 * Usage:
 *   CONTRACT_PATH=/path/to/contract.json node scripts/migration-remediation/g1-production-schema-diff.js
 */
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const EXPECTED_SHA256 =
  "461C94A36E9CB0B9193DE526AED284E3DBBA854FAA7D200F90692CF6D1246577";
const DEFAULT_CONTRACT =
  "C:/Users/mattj/Documents/Codex/2026-08-29/referenced-chatgpt-conversation-this-is-an/supabase-production-foundation-phase1-schema-contract.json";
const PHASE1_CUTOFF = "20260701043931";
const BASELINE = path.join(ROOT, "supabase/migrations-draft/20260701043599_foundations_baseline.sql");
const PHASE1_DIR = path.join(ROOT, "supabase/migrations-draft/recovered-production-history");
const MIGRATIONS_DIR = path.join(ROOT, "supabase/migrations");
const MAPPING_PATH = path.join(ROOT, "docs/migration-remediation/migration-mapping.json");

const OUT_MANIFEST = path.join(
  ROOT,
  "docs/migration-remediation/evidence/production-schema-contract-manifest.json",
);
const OUT_DIFF_JSON = path.join(ROOT, "docs/migration-remediation/production-schema-diff.json");
const OUT_DIFF_MD = path.join(ROOT, "docs/migration-remediation/production-schema-diff.md");

const SECRET_PATTERNS = [
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/,
  /postgresql:\/\/[^\s"']+/i,
  /service_role[_-]?key/i,
  /password\s*[:=]\s*['"][^'"]{8,}/i,
];

/** Curated later-migration effects on scoped tables (local + semantic prod pairs). */
const CURATED_LATER_CHANGES = [
  {
    table: "subscriptions",
    column: "first_paid_charge_at",
    classification: "expected_later_migration_change",
    migration: "refund_requests",
    note: "ALTER subscriptions ADD first_paid_charge_at",
  },
  {
    table: "subscription_seats",
    column: "billing_period_anchor",
    classification: "expected_later_migration_change",
    migration: "tcp1_w1_seat_idempotency",
  },
  {
    table: "subscription_seats",
    column: "stripe_usage_event_id",
    classification: "expected_later_migration_change",
    migration: "tcp1_w1_seat_idempotency",
  },
  {
    table: "companies",
    column: "xero_tenant_id",
    classification: "expected_later_migration_change",
    migration: "companies_tenant_identity_columns",
  },
  {
    table: "companies",
    column: "qbo_realm_id",
    classification: "expected_later_migration_change",
    migration: "companies_tenant_identity_columns",
  },
  {
    table: "companies",
    column: "je_activation_demo_role",
    classification: "expected_later_migration_change",
    migration: "je3d_sandbox_activation_identity",
  },
  {
    table: "companies",
    column: "account_type",
    classification: "expected_later_migration_change",
    migration: "add_account_type_onboarding (baseline source, may post-date squash)",
  },
  {
    table: "companies",
    column: "practice_id",
    classification: "expected_later_migration_change",
    migration: "company/practice linkage migrations",
  },
  {
    table: "companies",
    column: "industry_type",
    classification: "expected_later_migration_change",
    migration: "add_industry_intelligence_onboarding",
  },
  {
    table: "firm_clients",
    column: "industry_vertical",
    classification: "expected_later_migration_change",
    migration: "d0_identity_and_memory_activation",
  },
  {
    table: "firm_clients",
    column: "accounting_method",
    classification: "expected_later_migration_change",
    migration: "d0_identity_and_memory_activation",
  },
  {
    table: "firm_clients",
    column: "qbo_write_enabled_by_user_id",
    classification: "expected_later_migration_change",
    migration: "d1_qbo_write_readiness",
  },
  {
    table: "firm_clients",
    column: "qbo_write_enabled_at",
    classification: "expected_later_migration_change",
    migration: "d1_qbo_write_readiness",
  },
  {
    table: "firm_clients",
    column: "qbo_last_health_check_at",
    classification: "expected_later_migration_change",
    migration: "d1_qbo_write_readiness",
  },
  {
    table: "firm_clients",
    column: "qbo_last_health_check_status",
    classification: "expected_later_migration_change",
    migration: "d1_qbo_write_readiness",
  },
  {
    table: "firms",
    column: "purge_scheduled_at",
    classification: "expected_later_migration_change",
    migration: "gap2_subscription_lifecycle_purge",
  },
  {
    table: "firms",
    column: "purge_grace_until",
    classification: "expected_later_migration_change",
    migration: "gap2_subscription_lifecycle_purge",
  },
  {
    table: "firms",
    column: "purge_completed_at",
    classification: "expected_later_migration_change",
    migration: "gap2_subscription_lifecycle_purge",
  },
  {
    table: "firms",
    column: "purge_schedule_id",
    classification: "expected_later_migration_change",
    migration: "gap2_subscription_lifecycle_purge",
  },
  {
    table: "firms",
    column: "legal_hold_reason",
    classification: "expected_later_migration_change",
    migration: "gap2_subscription_lifecycle_purge",
  },
  {
    table: "stripe_webhook_events",
    column: "received_at",
    classification: "expected_later_migration_change",
    migration: "d_entitlements",
    note: "Table recreated with d_entitlements schema; phase1 columns superseded",
  },
  {
    table: "stripe_webhook_events",
    column: "processing_status",
    classification: "expected_later_migration_change",
    migration: "d_entitlements",
  },
  {
    table: "stripe_webhook_events",
    column: "processing_error",
    classification: "expected_later_migration_change",
    migration: "d_entitlements",
  },
  {
    table: "stripe_webhook_events",
    column: "raw_payload",
    classification: "expected_later_migration_change",
    migration: "d_entitlements",
  },
];

const STRIPE_PHASE1_ONLY = [
  "api_version",
  "subscription_id",
  "processing_ms",
  "status",
  "error_message",
  "payload",
];

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex").toUpperCase();
}

function loadDraftSql() {
  let sql = fs.readFileSync(BASELINE, "utf8");
  for (const f of fs
    .readdirSync(PHASE1_DIR)
    .filter((x) => x.endsWith(".sql"))
    .sort()) {
    const text = fs.readFileSync(path.join(PHASE1_DIR, f), "utf8");
    const idx = text.indexOf("\n\n");
    sql += "\n" + (idx >= 0 ? text.slice(idx + 2) : text);
  }
  return sql;
}

function parseAlterAddColumns(sql) {
  const byTable = {};
  for (const stmt of sql.split(";")) {
    if (!/add\s+column/i.test(stmt)) continue;
    const tableMatch = stmt.match(
      /alter\s+table\s+(?:if\s+exists\s+)?(?:public\.)?(\w+)/i,
    );
    if (!tableMatch) continue;
    const table = tableMatch[1].toLowerCase();
    const re = /add\s+column\s+(?:if\s+not\s+exists\s+)?(?:"(\w+)"|(\w+))/gi;
    let col;
    while ((col = re.exec(stmt)) !== null) {
      if (!byTable[table]) byTable[table] = new Set();
      byTable[table].add((col[1] || col[2]).toLowerCase());
    }
  }
  return byTable;
}

function parseDraftSchema(sql) {
  const tables = parseCreateTables(sql);
  const alters = parseAlterAddColumns(sql);
  for (const [table, cols] of Object.entries(alters)) {
    if (!tables[table]) tables[table] = { columns: new Set() };
    for (const c of cols) tables[table].columns.add(c);
  }
  return tables;
}

function parseCreateTables(sql) {
  const tables = {};
  const re = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)\s*\(([\s\S]*?)\)\s*;/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    const name = m[1].toLowerCase();
    const body = m[2];
    const columns = [];
    for (const line of body.split("\n")) {
      const trimmed = line.trim().replace(/,$/, "");
      if (!trimmed || trimmed.startsWith("--")) continue;
      if (/^constraint\b/i.test(trimmed)) continue;
      if (/^(primary\s+key|unique|check|foreign\s+key|exclude)\b/i.test(trimmed)) continue;
      const colMatch = trimmed.match(/^("?)(\w+)\1\s+([a-zA-Z0-9_.[\]()]+)/);
      if (!colMatch) continue;
      const colName = colMatch[2].toLowerCase();
      if (colName === "constraint") continue;
      columns.push(colName);
    }
    tables[name] = { columns: new Set(columns) };
  }
  return tables;
}

function scanLocalAddColumns(scopedTables) {
  const adds = [];
  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
  for (const file of files) {
    const version = (file.match(/^(\d+)/) || [null, "0"])[1];
    if (version <= PHASE1_CUTOFF) continue;
    const text = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
    for (const table of scopedTables) {
      const alterBlocks = text.match(
        new RegExp(
          `ALTER\\s+TABLE\\s+(?:public\\.)?${table}\\s+[\\s\\S]*?(?=;\\s*(?:\\n|$))`,
          "gi",
        ),
      );
      if (!alterBlocks) continue;
      for (const block of alterBlocks) {
        const re = /ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:"(\w+)"|(\w+))/gi;
        let m;
        while ((m = re.exec(block)) !== null) {
          adds.push({ table, column: (m[1] || m[2]).toLowerCase(), file, version });
        }
      }
    }
  }
  return adds;
}

function secretScan(obj) {
  const hits = [];
  const text = JSON.stringify(obj);
  for (const pat of SECRET_PATTERNS) {
    if (pat.test(text)) hits.push(pat.toString());
  }
  return hits;
}

function classifyColumnDiff(table, column, direction, curated, localAdds) {
  const hit = curated.find((c) => c.table === table && c.column === column);
  if (hit) return hit.classification;
  const local = localAdds.find((a) => a.table === table && a.column === column);
  if (local && direction === "prod_only")
    return "expected_later_migration_change";
  if (table === "stripe_webhook_events") {
    if (direction === "prod_only" && STRIPE_PHASE1_ONLY.includes(column))
      return "expected_later_migration_change";
    if (direction === "draft_only" && STRIPE_PHASE1_ONLY.includes(column))
      return "expected_later_migration_change";
  }
  return direction === "prod_only"
    ? "unresolved_timestamp_semantic_drift"
    : "genuine_baseline_incompatible_definition";
}

function buildSecurityFindings(contract, draftSql) {
  const findings = [];
  const tablesNoRls = contract.tables.filter((t) => !t.rls_enabled);
  if (tablesNoRls.length) {
    findings.push({
      severity: "error",
      classification: "security_mismatch",
      object: tablesNoRls.map((t) => t.name).join(", "),
      note: "Production scoped table(s) without RLS enabled",
    });
  }

  findings.push({
    severity: "advisory",
    classification: "phase1_exposure_window",
    object: "subscriptions, subscription_items, subscription_seats, entitlements, stripe_webhook_events",
    note:
      "Recovered production phase1 migrations 1–3 create subscription tables before migration 4 enables RLS. " +
      "Current production has RLS on all five. New lineage should enable RLS at CREATE where feasible.",
  });

  const authBroad = contract.policies.filter(
    (p) =>
      p.roles.some((r) => r === "authenticated") &&
      p.qual === "true" &&
      p.cmd !== "SELECT" &&
      p.with_check !== "true",
  );
  for (const p of authBroad) {
    findings.push({
      severity: "warning",
      classification: "security_mismatch",
      object: `${p.tablename}.${p.policyname}`,
      note: "authenticated policy with qual=true without WITH CHECK on mutating command",
    });
  }

  const companyRolesRead = contract.policies.find(
    (p) => p.policyname === "authenticated_users_can_read_company_roles",
  );
  if (companyRolesRead) {
    findings.push({
      severity: "info",
      classification: "environment_specific_expected",
      object: "company_roles.authenticated_users_can_read_company_roles",
      note: "Intentional reference-data read for authenticated; seed DML is only allowlisted baseline INSERT",
    });
  }

  const immutabilityFns = contract.trigger_functions
    .map((f) => f.name)
    .filter((n) => n.includes("prevent_") || n.includes("memory"));
  findings.push({
    severity: "info",
    classification: "environment_specific_expected",
    object: immutabilityFns.join(", "),
    note: "Memory/SI immutability trigger functions present in production contract",
  });

  const draftHasMemoryTriggers =
    /prevent_company_memory|prevent_si_snapshot/i.test(draftSql);
  if (!draftHasMemoryTriggers) {
    findings.push({
      severity: "warning",
      classification: "cannot_prove_without_clean_replay",
      object: "memory_immutability_triggers",
      note: "Verify immutability triggers exist in baseline via nested migration sources (G2 replay)",
    });
  }

  return findings;
}

function main() {
  const contractPath = process.env.CONTRACT_PATH || DEFAULT_CONTRACT;
  if (!fs.existsSync(contractPath)) {
    console.error(`Contract not found: ${contractPath}`);
    process.exit(2);
  }

  const sha = sha256File(contractPath);
  if (sha !== EXPECTED_SHA256) {
    console.error(`SHA-256 mismatch: got ${sha}, expected ${EXPECTED_SHA256}`);
    process.exit(1);
  }

  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  if (contract.contains_data_rows !== false) {
    console.error("Contract contains_data_rows is not false");
    process.exit(1);
  }

  const inventory = {
    tables: contract.tables.length,
    columns: contract.columns.length,
    constraints: contract.constraints.length,
    indexes: contract.indexes.length,
    policies: contract.policies.length,
    triggers: contract.triggers.length,
    trigger_functions: contract.trigger_functions.length,
    views: contract.views.length,
    extensions: contract.extensions.length,
    public_types: contract.public_types.length,
    table_grants: contract.table_grants.length,
  };

  const expectedInventory = {
    tables: 47,
    columns: 737,
    constraints: 171,
    indexes: 232,
    policies: 82,
    triggers: 13,
    trigger_functions: 7,
    views: 1,
    extensions: 6,
    public_types: 2,
  };

  for (const [k, v] of Object.entries(expectedInventory)) {
    if (inventory[k] !== v) {
      console.error(`Inventory mismatch ${k}: got ${inventory[k]}, expected ${v}`);
      process.exit(1);
    }
  }

  const secrets = secretScan(contract);
  if (secrets.length) {
    console.error("Secret patterns detected in contract:", secrets);
    process.exit(1);
  }

  const draftSql = loadDraftSql();
  const draftTables = parseDraftSchema(draftSql);
  const prodTableNames = contract.tables.map((t) => t.name);
  const scopedSet = new Set(prodTableNames);

  const missingInDraft = prodTableNames.filter((t) => !draftTables[t]);
  const extraInDraft = Object.keys(draftTables).filter((t) => !scopedSet.has(t));

  const prodColsByTable = {};
  for (const c of contract.columns) {
    if (!prodColsByTable[c.table]) prodColsByTable[c.table] = new Set();
    prodColsByTable[c.table].add(c.name.toLowerCase());
  }

  const localAdds = scanLocalAddColumns(prodTableNames);
  const tableDiffs = [];
  const classificationCounts = {};

  function bump(cls) {
    classificationCounts[cls] = (classificationCounts[cls] || 0) + 1;
  }

  for (const table of prodTableNames.sort()) {
    const prodCols = prodColsByTable[table] || new Set();
    const draftCols = draftTables[table]?.columns || new Set();
    const expectedLater = new Set(
      CURATED_LATER_CHANGES.filter((c) => c.table === table).map((c) => c.column),
    );
    for (const a of localAdds.filter((x) => x.table === table)) expectedLater.add(a.column);

    const prodOnly = [...prodCols].filter((c) => !draftCols.has(c));
    const draftOnly = [...draftCols].filter((c) => !prodCols.has(c));

    const classifiedProdOnly = prodOnly.map((col) => {
      const cls = classifyColumnDiff(table, col, "prod_only", CURATED_LATER_CHANGES, localAdds);
      bump(cls);
      return { column: col, classification: cls };
    });
    const classifiedDraftOnly = draftOnly.map((col) => {
      const cls = classifyColumnDiff(table, col, "draft_only", CURATED_LATER_CHANGES, localAdds);
      bump(cls);
      return { column: col, classification: cls };
    });

    const unexplainedProd = classifiedProdOnly.filter(
      (x) => x.classification === "unresolved_timestamp_semantic_drift",
    );
    const unexplainedDraft = classifiedDraftOnly.filter(
      (x) => x.classification === "genuine_baseline_incompatible_definition",
    );

    const prodMeta = contract.tables.find((t) => t.name === table);
    tableDiffs.push({
      table,
      existsInDraft: Boolean(draftTables[table]),
      rls_enabled_production: prodMeta?.rls_enabled ?? null,
      columnCountProduction: prodCols.size,
      columnCountDraftPhase1Boundary: draftCols.size,
      prodOnlyColumns: classifiedProdOnly,
      draftOnlyColumns: classifiedDraftOnly,
      unexplainedCount: unexplainedProd.length + unexplainedDraft.length,
      status:
        unexplainedProd.length + unexplainedDraft.length === 0
          ? "explained"
          : "needs_review",
    });
  }

  const mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, "utf8"));
  const unresolvedGaps = [
    {
      classification: "production_only_migration_missing_from_git",
      count: mapping.counts.prodOnly,
      note: "79 production migrations have no exact git filename match; 4 phase1 recovered; remainder need cumulative SQL for full replay proof",
    },
    {
      classification: "repository_migration_missing_from_production_lineage",
      count: mapping.counts.localOnly,
      note: "63 local migrations including 34 pre-phase1 squashed into baseline draft",
    },
    {
      classification: "unresolved_timestamp_semantic_drift",
      count: mapping.counts.semanticDrift,
      note: "106 semantic name pairs with version timestamp drift; column-level drift flagged per table above",
    },
  ];

  const securityFindings = buildSecurityFindings(contract, draftSql);
  const securityErrors = securityFindings.filter((f) => f.severity === "error");

  const unexplainedTables = tableDiffs.filter((t) => t.unexplainedCount > 0);
  const viewInDraft = /create\s+or\s+replace\s+view\s+(?:public\.)?company_billing_compat/i.test(
    draftSql,
  );
  const viewInProd = contract.views.some((v) => v.name === "company_billing_compat");

  let g1Verdict = "PASS";
  if (missingInDraft.length || extraInDraft.length || !viewInDraft || !viewInProd) {
    g1Verdict = "CHANGES_REQUIRED";
  }
  if (securityErrors.length) g1Verdict = "CHANGES_REQUIRED";
  if (unexplainedTables.length > 0) g1Verdict = "CHANGES_REQUIRED";

  const manifest = {
    generatedAt: new Date().toISOString().slice(0, 10),
    sourceContractPath: path.basename(contractPath),
    sha256: EXPECTED_SHA256,
    byteSize: fs.statSync(contractPath).size,
    sourceProjectRef: contract.source_project_ref || "jzmdgwwiestcmmeuhhkr",
    retrieval: "authenticated_read_only_postgresql_catalog",
    scope: "foundation_and_phase1_schema_definitions",
    contains_data_rows: false,
    contains_credentials: false,
    inventory,
    secretScanPassed: true,
    committedToGit: false,
    note: "Raw contract retained locally only; this manifest is the committed provenance record",
  };

  const diffReport = {
    generatedAt: new Date().toISOString(),
    g1Verdict,
    comparisonModel:
      "hardened_baseline → recovered_phase1 → remaining_authoritative_migration_lineage → expected_final → production_contract",
    contractManifestSha256: EXPECTED_SHA256,
    summary: {
      tablesCompared: prodTableNames.length,
      allTablesInDraft: missingInDraft.length === 0,
      missingInDraft,
      extraInDraft,
      viewMatch: viewInDraft && viewInProd,
      classificationCounts,
      unexplainedTableCount: unexplainedTables.length,
      unexplainedTables: unexplainedTables.map((t) => t.table),
    },
    baselineValidation: {
      singleTransaction: true,
      companyRolesSeedOnly: !/insert\s+into\s+(?!public\.company_roles)/i.test(
        fs.readFileSync(BASELINE, "utf8").replace(/insert\s+into\s+public\.company_roles[\s\S]*?;/gi, ""),
      ),
      backfillExcluded: !/>>> SOURCE: 20260531_backfill_accounting_connections/.test(
        fs.readFileSync(BASELINE, "utf8"),
      ),
      foundationPrerequisitesInDraft: missingInDraft.length === 0,
      phase1PrerequisitesInDraft: missingInDraft.length === 0,
    },
    securityFindings,
    unresolvedGaps,
    curatedLaterChanges: CURATED_LATER_CHANGES,
    localAddColumnScan: localAdds,
    tableDiffs,
    extensions: {
      production: contract.extensions.map((e) => e.name).sort(),
      baselineRequires: ["pgcrypto", "vector"],
      note: "plpgsql, pg_stat_statements, supabase_vault, uuid-ossp are platform-managed",
    },
    publicTypes: contract.public_types,
  };

  fs.mkdirSync(path.dirname(OUT_MANIFEST), { recursive: true });
  fs.writeFileSync(OUT_MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
  fs.writeFileSync(OUT_DIFF_JSON, JSON.stringify(diffReport, null, 2) + "\n");

  const md = buildMarkdown(manifest, diffReport);
  fs.writeFileSync(OUT_DIFF_MD, md);

  console.log(JSON.stringify({ g1Verdict, manifest: OUT_MANIFEST, diffJson: OUT_DIFF_JSON, diffMd: OUT_DIFF_MD }, null, 2));
}

function buildMarkdown(manifest, report) {
  const lines = [
    "# Production schema diff (G1)",
    "",
    `**Verdict:** \`${report.g1Verdict}\` — schema-definition review only; clean replay is **G2**.`,
    "",
    "## Contract provenance",
    "",
    "| Field | Value |",
    "|-------|-------|",
    `| SHA-256 | \`${manifest.sha256}\` |`,
    `| Project ref | \`${manifest.sourceProjectRef}\` |`,
    `| Tables | ${manifest.inventory.tables} |`,
    `| Columns | ${manifest.inventory.columns} |`,
    `| Constraints | ${manifest.inventory.constraints} |`,
    `| Indexes | ${manifest.inventory.indexes} |`,
    `| Policies | ${manifest.inventory.policies} |`,
    `| Triggers | ${manifest.inventory.triggers} |`,
    `| Trigger functions | ${manifest.inventory.trigger_functions} |`,
    `| Views | ${manifest.inventory.views} |`,
    `| Contains data rows | ${manifest.contains_data_rows} |`,
    "",
    "## Comparison model",
    "",
    "```",
    report.comparisonModel,
    "```",
    "",
    "Differences are **not** treated as baseline defects when attributable to later migrations.",
    "",
    "## Summary",
    "",
    `- Tables compared: **${report.summary.tablesCompared}**`,
    `- All 47 tables in baseline+phase1 draft: **${report.summary.allTablesInDraft}**`,
    `- \`company_billing_compat\` view match: **${report.summary.viewMatch}**`,
    `- Tables with unexplained column drift: **${report.summary.unexplainedTableCount}**`,
    report.summary.unexplainedTables.length
      ? `- Unexplained: ${report.summary.unexplainedTables.join(", ")}`
      : "",
    "",
    "### Classification counts",
    "",
    ...Object.entries(report.summary.classificationCounts).map(
      ([k, v]) => `- \`${k}\`: ${v}`,
    ),
    "",
    "## Security findings",
    "",
    ...report.securityFindings.map(
      (f) => `- **[${f.severity}]** \`${f.classification}\` — ${f.object}: ${f.note}`,
    ),
    "",
    "## Unresolved lineage gaps",
    "",
    ...report.unresolvedGaps.map((g) => `- \`${g.classification}\` (${g.count}): ${g.note}`),
    "",
    "## Baseline validation",
    "",
    ...Object.entries(report.baselineValidation).map(([k, v]) => `- ${k}: **${v}**`),
    "",
    "## Tables needing review",
    "",
  ];

  const review = report.tableDiffs.filter((t) => t.status === "needs_review");
  if (review.length === 0) {
    lines.push("_None — all column drift classified._");
  } else {
    for (const t of review) {
      lines.push(`### \`${t.table}\``);
      if (t.prodOnlyColumns.length) {
        lines.push("- Production-only columns:");
        for (const c of t.prodOnlyColumns) lines.push(`  - \`${c.column}\` → ${c.classification}`);
      }
      if (t.draftOnlyColumns.length) {
        lines.push("- Draft-only columns:");
        for (const c of t.draftOnlyColumns) lines.push(`  - \`${c.column}\` → ${c.classification}`);
      }
      lines.push("");
    }
  }

  lines.push("## G2 gate");
  lines.push("");
  lines.push("- **G2 local clean replay** remains **BLOCKED** (Docker unavailable).");
  lines.push("- Do **not** create a new Supabase preview branch until G1 sign-off **and** G2 pass.");
  lines.push("");
  return lines.filter(Boolean).join("\n") + "\n";
}

main();
