#!/usr/bin/env node
/**
 * Option D curated rule-seed dependency analysis.
 *
 * Immutable reference seeds for curated_rules_registry must precede any
 * rule_assertion_coverage INSERT that FK-references those rule_ids.
 *
 * Classification (clean-replay design):
 *   - D0 + d6_0 vertical foundation INSERT rows = immutable/reference seed (required)
 *   - d6_2a–d client_active_rules fixture activations = operational (guarded/excluded)
 *   - Placeholder / invented rows = forbidden
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..", "..");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-rule-seed-dependency-inventory.json",
);

const COVERAGE_CONSUMERS = [
  "20260707120000_d_assertions_part_1_schema_and_backfill.sql",
  "20260707130000_d_assertions_part_2_coverage_projection.sql",
  "20260707140000_d_assertions_part_3_coverage_statement.sql",
  "20260707150000_d_assertions_part_4_je_propagation.sql",
  "20260707160000_d_assertions_part_5_gap_review_items.sql",
  "20260707170000_d_assertions_part_6_manual_test_evidence.sql",
];

const KNOWN_REFERENCE_SEED_FILES = [
  "20260708_00_d0_identity_and_memory_activation.sql",
  "20260703_1200_d6_0_vertical_rule_foundation.sql",
];

const OPERATIONAL_ACTIVATION_FILES = [
  "20260703_2000_d6_2a_test_client_activation.sql",
  "20260703_2200_d6_2b_mfg_activation.sql",
  "20260703_2300_d6_2c_retail_activation.sql",
  "20260703_2400_d6_2d_ps_activation.sql",
];

function sha256Text(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function readAssembled(filename) {
  const abs = path.join(ASSEMBLED, filename);
  if (!fs.existsSync(abs)) return null;
  return fs.readFileSync(abs, "utf8");
}

/**
 * Extract rule_id values from INSERT INTO curated_rules_registry VALUES rows.
 * First quoted token of each value tuple is the rule_id.
 * Prefer ON CONFLICT as terminator so embedded ';' in description strings cannot
 * truncate the VALUES body (see gen.revenue_cutoff_check in D0).
 */
function extractRegistrySeedRuleIds(sql) {
  const ids = new Set();
  if (!sql) return ids;
  const withConflict =
    /insert\s+into\s+(?:public\.)?curated_rules_registry\b[\s\S]*?\bvalues\b([\s\S]*?)\bon\s+conflict\b/gi;
  let m;
  let matched = false;
  while ((m = withConflict.exec(sql))) {
    matched = true;
    for (const row of m[1].matchAll(/\(\s*'([a-z][a-z0-9_.]*)'/gi)) {
      ids.add(row[1]);
    }
  }
  if (matched) return ids;

  // Fallback for inserts without ON CONFLICT (tests / incomplete fixtures).
  const fallback =
    /insert\s+into\s+(?:public\.)?curated_rules_registry\b[\s\S]*?\bvalues\b([\s\S]*?);/gi;
  while ((m = fallback.exec(sql))) {
    for (const row of m[1].matchAll(/\(\s*'([a-z][a-z0-9_.]*)'/gi)) {
      ids.add(row[1]);
    }
  }
  return ids;
}

/**
 * Extract rule_id values from INSERT INTO rule_assertion_coverage VALUES rows.
 */
function extractCoverageConsumerRuleIds(sql) {
  const ids = new Set();
  if (!sql) return ids;
  const re =
    /insert\s+into\s+(?:public\.)?rule_assertion_coverage\b[\s\S]*?\bvalues\b([\s\S]*?);/gi;
  let m;
  while ((m = re.exec(sql))) {
    const body = m[1];
    for (const row of body.matchAll(/\(\s*'([a-z][a-z0-9_.]*)'\s*,/gi)) {
      ids.add(row[1]);
    }
  }
  return ids;
}

/**
 * Detect forbidden placeholder patterns (must never be admitted as seed).
 */
function detectPlaceholderSeed(sql) {
  if (!sql) return [];
  const hits = [];
  if (/placeholder\s+rule/i.test(sql)) hits.push("placeholder_rule_comment");
  if (/insert\s+into\s+(?:public\.)?curated_rules_registry[\s\S]{0,200}'gen\.accrual_reversal_check'[\s\S]{0,80}'TODO'/i.test(sql)) {
    hits.push("todo_placeholder_values");
  }
  if (/session_replication_role/i.test(sql)) hits.push("session_replication_role");
  return hits;
}

/**
 * Build creator map from candidate filenames + SQL text.
 * @param {{ filename: string, sql: string }[]} files
 */
function buildRuleSeedCreatorMap(files) {
  /** @type {Map<string, { creator: string, classification: string }>} */
  const map = new Map();
  for (const f of files) {
    const ids = extractRegistrySeedRuleIds(f.sql);
    const isKnownRef = KNOWN_REFERENCE_SEED_FILES.includes(f.filename);
    const isOperational = OPERATIONAL_ACTIVATION_FILES.includes(f.filename);
    for (const id of ids) {
      if (map.has(id)) continue;
      let classification = "unknown_seed";
      if (isKnownRef) classification = "immutable_reference_seed";
      else if (isOperational) classification = "operational_activation_not_reference_seed";
      map.set(id, { creator: f.filename, classification });
    }
  }
  return map;
}

/**
 * Evaluate ordering: every coverage-consumed rule_id must have a reference-seed
 * creator ordered strictly before the consumer.
 *
 * @param {{ filename: string, order: number, sql: string }[]} orderedEntries
 */
function evaluateRuleSeedOrdering(orderedEntries) {
  const failures = [];
  const orderIndex = new Map(orderedEntries.map((e) => [e.filename, e.order]));
  const creatorMap = buildRuleSeedCreatorMap(orderedEntries);

  const inventoryRows = [];
  const consumers = orderedEntries.filter((e) => COVERAGE_CONSUMERS.includes(e.filename));

  for (const consumer of consumers) {
    const requiredIds = [...extractCoverageConsumerRuleIds(consumer.sql)].sort();
    for (const ruleId of requiredIds) {
      const meta = creatorMap.get(ruleId);
      const row = {
        ruleId,
        consumer: consumer.filename,
        consumerOrder: consumer.order,
        creator: meta?.creator || null,
        creatorOrder: meta?.creator != null ? orderIndex.get(meta.creator) ?? null : null,
        classification: meta?.classification || "missing_creator",
        ok: false,
      };

      if (!meta) {
        failures.push({
          rule: "missing_required_rule_seed_creator",
          ruleId,
          consumer: consumer.filename,
          detail: `No curated_rules_registry INSERT for ${ruleId} in Option D set`,
        });
      } else if (meta.classification !== "immutable_reference_seed") {
        failures.push({
          rule: "non_reference_seed_for_coverage_fk",
          ruleId,
          consumer: consumer.filename,
          creator: meta.creator,
          classification: meta.classification,
          detail:
            "Coverage FK requires immutable reference seed; operational/activation SQL is not an authoritative creator",
        });
      } else if (row.creatorOrder == null || row.consumerOrder == null) {
        failures.push({
          rule: "rule_seed_order_unknown",
          ruleId,
          consumer: consumer.filename,
          creator: meta.creator,
        });
      } else if (!(row.creatorOrder < row.consumerOrder)) {
        failures.push({
          rule: "rule_seed_misordered",
          ruleId,
          consumer: consumer.filename,
          consumerOrder: row.consumerOrder,
          creator: meta.creator,
          creatorOrder: row.creatorOrder,
          detail: `Reference seed ${meta.creator} (order ${row.creatorOrder}) must precede ${consumer.filename} (order ${row.consumerOrder})`,
        });
      } else {
        row.ok = true;
      }
      inventoryRows.push(row);
    }

    const placeholders = detectPlaceholderSeed(consumer.sql);
    for (const p of placeholders) {
      failures.push({
        rule: "forbidden_placeholder_or_fk_bypass",
        consumer: consumer.filename,
        detail: p,
      });
    }
  }

  // Operational files must not be treated as the sole seed for coverage FKs
  for (const op of OPERATIONAL_ACTIVATION_FILES) {
    const entry = orderedEntries.find((e) => e.filename === op);
    if (!entry) continue;
    const seeds = extractRegistrySeedRuleIds(entry.sql);
    if (seeds.size > 0) {
      failures.push({
        rule: "operational_file_inserts_registry_rows",
        file: op,
        ruleIds: [...seeds],
        detail:
          "Operational activation files must not INSERT curated_rules_registry reference rows for clean replay",
      });
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    inventoryRows,
    creatorMap: Object.fromEntries(
      [...creatorMap.entries()].map(([k, v]) => [k, v]),
    ),
    requiredRuleIds: [...new Set(inventoryRows.map((r) => r.ruleId))].sort(),
    referenceSeedFiles: KNOWN_REFERENCE_SEED_FILES,
    operationalActivationFiles: OPERATIONAL_ACTIVATION_FILES,
  };
}

function loadOrderedEntriesFromReplayManifest() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const entries = [...manifest.entries].sort((a, b) => a.order - b.order);
  return entries.map((e) => {
    const sql = readAssembled(e.assembledFilename) || "";
    return {
      filename: e.assembledFilename,
      order: e.order,
      sql,
      assembledSha256: e.assembledSha256 || sha256Text(sql),
    };
  });
}

/**
 * Edges for dependency graph: consumer filename -> creator filename.
 */
function ruleSeedDependsOnEdges(orderedEntries) {
  const evalResult = evaluateRuleSeedOrdering(orderedEntries);
  const edges = [];
  for (const row of evalResult.inventoryRows) {
    if (row.creator && row.classification === "immutable_reference_seed") {
      edges.push({
        from: row.consumer,
        to: row.creator,
        reason: `rule_seed_fk:${row.ruleId}`,
        ruleId: row.ruleId,
      });
    }
  }
  // Dedupe
  const seen = new Set();
  return edges.filter((e) => {
    const k = `${e.from}=>${e.to}:${e.ruleId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function main() {
  const ordered = loadOrderedEntriesFromReplayManifest();
  const evaluation = evaluateRuleSeedOrdering(ordered);
  const edges = ruleSeedDependsOnEdges(ordered);
  const out = {
    generatedAt: new Date().toISOString(),
    mechanism: "option_d_rule_seed_dependency_inventory",
    testedFailure: {
      pr313EvidenceHead: "de535f63335e4e73066903bb5d77489c9f8aad99",
      failedAt: "20260707120000_d_assertions_part_1_schema_and_backfill.sql",
      order: 36,
      sqlState: "23503",
      missingKey: "gen.accrual_reversal_check",
      authoritativeCreator: "20260703_1200_d6_0_vertical_rule_foundation.sql",
      classification: "later_creator_currently_misordered",
    },
    ok: evaluation.ok,
    failures: evaluation.failures,
    requiredRuleIds: evaluation.requiredRuleIds,
    referenceSeedFiles: evaluation.referenceSeedFiles,
    operationalActivationFiles: evaluation.operationalActivationFiles,
    creators: evaluation.creatorMap,
    inventory: evaluation.inventoryRows,
    suggestedDependsOnEdges: edges,
    policy: {
      admit: "immutable_reference_seed only",
      reject: [
        "placeholder_rows",
        "tenant_operational_client_active_rules",
        "fk_disable",
        "session_replication_role",
        "silent_skip_missing_rule",
      ],
    },
  };
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: out.ok,
        requiredRuleIds: out.requiredRuleIds.length,
        failureCount: out.failures.length,
        sampleFailures: out.failures.slice(0, 5),
        inventoryPath: path.relative(ROOT, OUT).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
  if (!out.ok) process.exit(2);
}

if (require.main === module) main();

module.exports = {
  COVERAGE_CONSUMERS,
  KNOWN_REFERENCE_SEED_FILES,
  OPERATIONAL_ACTIVATION_FILES,
  extractRegistrySeedRuleIds,
  extractCoverageConsumerRuleIds,
  detectPlaceholderSeed,
  buildRuleSeedCreatorMap,
  evaluateRuleSeedOrdering,
  ruleSeedDependsOnEdges,
  loadOrderedEntriesFromReplayManifest,
};
