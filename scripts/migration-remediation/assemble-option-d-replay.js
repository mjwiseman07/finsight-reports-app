#!/usr/bin/env node
/**
 * Assemble Option D isolated Git replay candidate set.
 *
 * - Does NOT modify supabase/migrations/ or production history
 * - Substitutes reviewed guarded variants IN PLACE (same filename slot)
 * - Writes deterministic manifest with source/replacement hashes
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const os = require("os");
const {
  loadManifest,
  orderedFilesFromPhases,
} = require("./baseline-sql-analyzer");
const {
  computeOptionDDependencyOrder,
  writeDependencyArtifacts,
  simulateCandidateOrder,
  analyzeMigrationFile,
} = require("./option-d-dependency-order");
const {
  classifyUnresolvedOccurrences,
  loadLineageHints,
} = require("./option-d-unresolved-classifier");

const ROOT = path.join(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const BASELINE = path.join(
  ROOT,
  "supabase/migrations-draft/20260701043599_foundations_baseline.sql",
);
const PHASE1_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/recovered-production-history",
);
const SUBST_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/substitutions",
);
const ASSEMBLED_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST_OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-replay-manifest.json",
);
const DEP_OVERRIDES = path.join(
  ROOT,
  "docs/migration-remediation/option-d-dependency-overrides.json",
);
const CLASS_OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-unresolved-classification.json",
);

const PHASE1_FILES = [
  "20260701043602_phase1_subscriptions_core.sql",
  "20260701043707_phase1_subscription_seats_and_entitlements.sql",
  "20260701043911_phase1_backward_compat_view.sql",
  "20260701043931_phase1_entitlement_rls_policies.sql",
];

/** Recovered production originals required by Option D (not in git migrations/). */
const RECOVERED_REQUIRED_ORIGINALS = [
  "20260704024059_d_entitlements_legacy_stripe_rename.sql",
  "20260804213003_pilot_lifecycle_events.sql",
  "20260804234230_lifecycle_issues.sql",
];

const SUBSTITUTIONS = {
  "20260703_2000_d6_2a_test_client_activation.sql": {
    action: "substitute",
    justification:
      "Unconditional client_active_rules VALUES insert fails FK on data-less branch; guarded via firm_clients SELECT.",
  },
  "20260703_2200_d6_2b_mfg_activation.sql": {
    action: "substitute",
    justification:
      "Registry UPDATE retained; client_active_rules INSERT guarded via firm_clients.",
  },
  "20260703_2300_d6_2c_retail_activation.sql": {
    action: "substitute",
    justification:
      "Registry UPDATE retained; client_active_rules INSERT guarded via firm_clients.",
  },
  "20260703_2400_d6_2d_ps_activation.sql": {
    action: "substitute",
    justification:
      "Registry UPDATE retained; client_active_rules INSERT guarded via firm_clients.",
  },
  "20260708120000_tcp1_w1_solo_bk_pilot_slots.sql": {
    action: "substitute",
    justification:
      "Schema/RLS/function retained; complimentary pilot_slots seed guarded via companies existence.",
  },
  "20260814221500_accounting_canonical_connected_grant.sql": {
    action: "substitute_schema_only",
    justification:
      "Prod Demo Xero RAISE/UPDATE body omitted for data-less replay; partial UNIQUE connected-grant index retained.",
  },
};

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256Text(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function sleepMs(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withAssembleLock(fn) {
  const lockPath = path.join(os.tmpdir(), "finsight-option-d-assemble.lock");
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    try {
      fs.writeFileSync(lockPath, `${process.pid}\n`, { flag: "wx" });
      try {
        return fn();
      } finally {
        try {
          fs.unlinkSync(lockPath);
        } catch (err) {
          if (err && err.code !== "ENOENT") throw err;
        }
      }
    } catch (err) {
      if (!err || err.code !== "EEXIST") throw err;
      sleepMs(50);
    }
  }
  throw new Error("timeout waiting for Option D assemble lock");
}

function ensureCleanAssembledDir() {
  fs.mkdirSync(path.dirname(ASSEMBLED_DIR), { recursive: true });
  if (fs.existsSync(ASSEMBLED_DIR)) {
    for (const f of fs.readdirSync(ASSEMBLED_DIR)) {
      if (f === "README.md" || f === ".gitignore") continue;
      try {
        fs.unlinkSync(path.join(ASSEMBLED_DIR, f));
      } catch (err) {
        if (err && err.code !== "ENOENT") throw err;
      }
    }
  } else {
    fs.mkdirSync(ASSEMBLED_DIR, { recursive: true });
  }
}

function writeAssembled(filename, content, meta) {
  const outPath = path.join(ASSEMBLED_DIR, filename);
  fs.writeFileSync(outPath, content);
  return {
    order: meta.order,
    assembledFilename: filename,
    role: meta.role,
    action: meta.action,
    originalSource: meta.originalSource || null,
    originalSha256: meta.originalSha256 || null,
    replacementSource: meta.replacementSource || null,
    replacementSha256: meta.replacementSha256 || null,
    assembledSha256: sha256File(outPath),
    justification: meta.justification || null,
  };
}

function main() {
  const baselineManifest = loadManifest();
  const baselineSources = new Set(orderedFilesFromPhases(baselineManifest));
  for (const ex of baselineManifest.excludeFiles || []) {
    // backfill excluded from baseline remains excluded from post set if pre-phase1
    if (ex.startsWith("202605") || ex.startsWith("202606")) {
      baselineSources.add(ex);
    }
  }

  ensureCleanAssembledDir();
  const entries = [];
  let order = 0;

  // 0) Foundations baseline
  {
    const content = fs.readFileSync(BASELINE);
    order += 1;
    entries.push(
      writeAssembled("20260701043599_foundations_baseline.sql", content, {
        order,
        role: "foundations_baseline",
        action: "include",
        originalSource: path.relative(ROOT, BASELINE).replace(/\\/g, "/"),
        originalSha256: sha256File(BASELINE),
        justification: "Reviewed hardened baseline covering pre-phase1 foundation DDL.",
      }),
    );
  }

  // 1–4) Phase1 recovered production history
  for (const file of PHASE1_FILES) {
    const src = path.join(PHASE1_DIR, file);
    const content = fs.readFileSync(src);
    order += 1;
    entries.push(
      writeAssembled(file, content, {
        order,
        role: "phase1_recovered",
        action: "include",
        originalSource: path.relative(ROOT, src).replace(/\\/g, "/"),
        originalSha256: sha256File(src),
        justification: "Recovered production phase1 SQL (subscriptions + RLS).",
      }),
    );
  }

  // Post-baseline local migrations: dependency order (NOT filename-only sort)
  const localFilesLex = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const skippedCoveredByBaseline = [];
  const postCandidates = [];
  for (const file of localFilesLex) {
    if (baselineSources.has(file)) {
      skippedCoveredByBaseline.push(file);
      continue;
    }
    // Pre-phase1 backfill excluded from baseline and not replayed (operational)
    if (file === "20260531_backfill_accounting_connections_from_quickbooks.sql") {
      skippedCoveredByBaseline.push(file);
      continue;
    }

    const originalPath = path.join(MIGRATIONS_DIR, file);
    const substMeta = SUBSTITUTIONS[file];
    const substPath = substMeta ? path.join(SUBST_DIR, file) : null;
    if (substMeta && !fs.existsSync(substPath)) {
      console.error(`Missing substitution file: ${substPath}`);
      process.exit(1);
    }
    // Analyze/assemble from the content that will actually be applied (substitution if any)
    const absPath = substMeta ? substPath : originalPath;
    postCandidates.push({ filename: file, absPath, originalPath, substMeta, substPath, role: "post_phase1_local" });
  }

  for (const file of RECOVERED_REQUIRED_ORIGINALS) {
    if (postCandidates.some((c) => c.filename === file)) {
      console.error(`FAIL: recovered original collides with local candidate filename: ${file}`);
      process.exit(1);
    }
    const src = path.join(PHASE1_DIR, file);
    if (!fs.existsSync(src)) {
      console.error(`Missing recovered original: ${src}`);
      process.exit(1);
    }
    postCandidates.push({
      filename: file,
      absPath: src,
      originalPath: src,
      substMeta: null,
      substPath: null,
      role: "recovered_production_original",
    });
  }

  const depOverrides = fs.existsSync(DEP_OVERRIDES)
    ? JSON.parse(fs.readFileSync(DEP_OVERRIDES, "utf8"))
    : {};

  // Tables created by fixed prefix are provided before post-phase1 replay.
  const knownProvidedTables = new Set();
  for (const abs of [
    BASELINE,
    ...PHASE1_FILES.map((f) => path.join(PHASE1_DIR, f)),
  ]) {
    const a = analyzeMigrationFile(abs);
    for (const t of a.creates.tables || []) knownProvidedTables.add(t);
  }

  const depResult = computeOptionDDependencyOrder(postCandidates, depOverrides, {
    knownProvidedTables,
  });
  if (depResult.cycles.length) {
    console.error("FAIL: dependency cycles in Option D post-phase1 set", depResult.cycles);
    process.exit(1);
  }
  if (depResult.integrityErrors.length) {
    console.error("FAIL: dependency order integrity", depResult.integrityErrors);
    process.exit(1);
  }

  // Full-set order = fixed prefix (baseline + phase1) + dependency-ordered post set
  const prefixFiles = entries.map((e) => e.assembledFilename);
  const fullDependencyOrder = [...prefixFiles, ...depResult.order];
  const fullLexOrder = [
    ...prefixFiles,
    ...postCandidates.map((c) => c.filename).sort(),
  ];
  depResult.order = fullDependencyOrder;
  depResult.lexOrder = fullLexOrder;
  depResult.changelog = {
    ...depResult.changelog,
    fixedPrefix: prefixFiles,
    postPhase1DependencyOrder: depResult.changelog.dependencyOrder,
    postPhase1LexicographicOrder: depResult.changelog.lexicographicOrder,
    dependencyOrder: fullDependencyOrder,
    lexicographicOrder: fullLexOrder,
  };
  // Recompute recurring regression positions on full order
  const fullPos = new Map(fullDependencyOrder.map((f, i) => [f, i + 1]));
  depResult.changelog.recurringFiresRegression = {
    ...depResult.changelog.recurringFiresRegression,
    dependencyOrderIndex: {
      d5: fullPos.get("20260714_00_d5_recurring_templates.sql") || null,
      d6_0: fullPos.get("20260703_1200_d6_0_vertical_rule_foundation.sql") || null,
    },
    dependencyOrderSatisfied:
      (fullPos.get("20260714_00_d5_recurring_templates.sql") || 0) <
      (fullPos.get("20260703_1200_d6_0_vertical_rule_foundation.sql") || 0),
  };

  const classification = classifyUnresolvedOccurrences({
    unresolved: depResult.unresolved,
    candidates: postCandidates,
    graph: depResult.graph,
    knownProvidedTables,
    lineageHints: loadLineageHints(ROOT),
  });
  fs.writeFileSync(CLASS_OUT, JSON.stringify(classification, null, 2) + "\n");

  writeDependencyArtifacts(depResult, { classification });

  const byName = new Map(postCandidates.map((c) => [c.filename, c]));
  for (const file of depResult.changelog.postPhase1DependencyOrder) {
    const c = byName.get(file);
    if (!c) {
      console.error(`FAIL: ordered file missing from candidates: ${file}`);
      process.exit(1);
    }
    const originalSha = sha256File(c.originalPath);
    order += 1;
    if (c.substMeta) {
      const replacement = fs.readFileSync(c.substPath);
      entries.push(
        writeAssembled(file, replacement, {
          order,
          role: "post_phase1_local",
          action: c.substMeta.action,
          originalSource: path.relative(ROOT, c.originalPath).replace(/\\/g, "/"),
          originalSha256: originalSha,
          replacementSource: path.relative(ROOT, c.substPath).replace(/\\/g, "/"),
          replacementSha256: sha256Text(replacement.toString("utf8")),
          justification: c.substMeta.justification,
        }),
      );
    } else {
      const content = fs.readFileSync(c.originalPath);
      entries.push(
        writeAssembled(file, content, {
          order,
          role: c.role || "post_phase1_local",
          action: "include",
          originalSource: path.relative(ROOT, c.originalPath).replace(/\\/g, "/"),
          originalSha256: originalSha,
          justification:
            c.role === "recovered_production_original"
              ? "Recovered production original (statements[] preserved). Not an active supabase/migrations/ file."
              : null,
        }),
      );
    }
  }

  // Static object-availability simulation on assembled content paths (fail soft → record)
  const simCandidates = entries.map((e) => ({
    filename: e.assembledFilename,
    absPath: path.join(ASSEMBLED_DIR, e.assembledFilename),
  }));
  const simOptional = [
    ...(depOverrides.optionalExternalTables || []),
    ...classification.classifications
      .filter((c) => c.justifiedExclusion)
      .map((c) => c.table),
  ];
  const replaySim = simulateCandidateOrder(simCandidates, {
    ...depOverrides,
    optionalExternalTables: simOptional,
  });

  const requiredPatent6 = [
    "20260821183525_journal_entry_executions.sql",
    "20260821212020_journal_entry_provider_attempts.sql",
  ];
  const assembledNames = new Set(entries.map((e) => e.assembledFilename));
  const missingRequired = requiredPatent6.filter((f) => !assembledNames.has(f));

  const substitutionEntries = entries.filter((e) =>
    String(e.action).startsWith("substitute"),
  );
  const expectedSubst = Object.keys(SUBSTITUTIONS).sort();
  const actualSubst = substitutionEntries.map((e) => e.assembledFilename).sort();

  const manifest = {
    generatedAt: new Date().toISOString(),
    mechanism: "option_d_isolated_git_replay",
    status: "CANDIDATE_LINEAGE_ASSEMBLED",
    notMergeApproval: true,
    productionHistoryUnchanged: true,
    activeMigrationsUnchanged: true,
    productionDashboardReplayParity: "unresolved",
    pr312HeadRequiredUnchanged: "f65730b3d38e9cb3b192e54f62c798c74a07a1c2",
    assembledDir: path.relative(ROOT, ASSEMBLED_DIR).replace(/\\/g, "/"),
    ordering: {
      policy: depResult.changelog.policy,
      fixedPrefix: prefixFiles,
      dependencyOrder: fullDependencyOrder,
      lexicographicOrderWouldHaveBeen: fullLexOrder,
      movedCount: depResult.changelog.movedCount,
      recurringFiresRegression: depResult.changelog.recurringFiresRegression,
      unresolvedDependencyCount: depResult.unresolved.length,
      requiredUnresolvedCount: classification.requiredCount,
      requiredDependenciesResolved: classification.requiredDependenciesResolved,
      objectAvailabilitySimulationOk: replaySim.ok,
      objectAvailabilityViolationCount: replaySim.violations.length,
      dependencyManifest: "docs/migration-remediation/option-d-dependency-manifest.json",
      orderingChangelog: "docs/migration-remediation/option-d-ordering-changelog.json",
      overrides: "docs/migration-remediation/option-d-dependency-overrides.json",
      unresolvedClassification: "docs/migration-remediation/option-d-unresolved-classification.json",
    },
    counts: {
      totalAssembled: entries.length,
      baseline: 1,
      phase1: PHASE1_FILES.length,
      recoveredRequiredOriginals: RECOVERED_REQUIRED_ORIGINALS.length,
      postPhase1: entries.length - 1 - PHASE1_FILES.length,
      substitutions: substitutionEntries.length,
      skippedCoveredByBaseline: skippedCoveredByBaseline.length,
    },
    recoveredRequiredOriginals: RECOVERED_REQUIRED_ORIGINALS.map((filename) => {
      const entry = entries.find((e) => e.assembledFilename === filename);
      return {
        filename,
        originalSource: entry?.originalSource || null,
        originalSha256: entry?.originalSha256 || null,
        order: entry?.order || null,
        substitution: null,
      };
    }),
    substitutions: expectedSubst.map((filename) => {
      const entry = entries.find((e) => e.assembledFilename === filename);
      return {
        filename,
        ...SUBSTITUTIONS[filename],
        originalSha256: entry?.originalSha256 || null,
        replacementSha256: entry?.replacementSha256 || null,
        order: entry?.order || null,
      };
    }),
    skippedCoveredByBaseline,
    missingRequiredPatent6OrJe: missingRequired,
    entries,
    validationScopes: {
      isolatedCandidateLineage: "this_manifest_and_assembled_dir",
      pr312RpcValidation: "requires_local_db_after_clean_replay; see option-d-runtime",
      productionDashboardReplayParity: "unresolved_option_a_or_b",
    },
  };

  if (missingRequired.length) {
    console.error("FAIL: required JE/Patent #6 migrations missing from assembled set", missingRequired);
    process.exit(1);
  }
  if (JSON.stringify(expectedSubst) !== JSON.stringify(actualSubst)) {
    console.error("FAIL: substitution set mismatch", { expectedSubst, actualSubst });
    process.exit(1);
  }
  // Hard fail the known recurring_fires regression if still present
  if (!depResult.changelog.recurringFiresRegression.dependencyOrderSatisfied) {
    console.error("FAIL: recurring_fires creator still after d6_0 consumer");
    process.exit(1);
  }
  const renameFile = "20260704024059_d_entitlements_legacy_stripe_rename.sql";
  const entitlementsFile = "20260706130000_d_entitlements.sql";
  if (
    (fullPos.get(renameFile) || 0) === 0 ||
    (fullPos.get(entitlementsFile) || 0) === 0 ||
    (fullPos.get(renameFile) || 0) >= (fullPos.get(entitlementsFile) || 0)
  ) {
    console.error("FAIL: stripe_webhook_events rename must precede d_entitlements CREATE");
    process.exit(1);
  }
  const missingRecovered = RECOVERED_REQUIRED_ORIGINALS.filter((f) => !assembledNames.has(f));
  if (missingRecovered.length) {
    console.error("FAIL: recovered originals missing from assembled set", missingRecovered);
    process.exit(1);
  }

  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: true,
        totalAssembled: entries.length,
        substitutions: substitutionEntries.length,
        movedCount: depResult.changelog.movedCount,
        unresolvedDependencies: depResult.unresolved.length,
        requiredUnresolved: classification.requiredCount,
        requiredDependenciesResolved: classification.requiredDependenciesResolved,
        objectAvailabilitySimulationOk: replaySim.ok,
        recurringFiresOrderOk: depResult.changelog.recurringFiresRegression.dependencyOrderSatisfied,
        manifest: path.relative(ROOT, MANIFEST_OUT).replace(/\\/g, "/"),
        assembledDir: path.relative(ROOT, ASSEMBLED_DIR).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
}

withAssembleLock(main);
