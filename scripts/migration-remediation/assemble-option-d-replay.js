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
const { withAssembleLock } = require("./option-d-assemble-lock");
const {
  evaluateRuleSeedOrdering,
  loadOrderedEntriesFromReplayManifest,
} = require("./audit-option-d-rule-seed-deps");
const { evaluateViewSignatureOrdering } = require("./audit-option-d-view-signatures");
const { evaluateAppRelationOrdering } = require("./audit-option-d-app-relation-deps");
const { evaluateDerivedBaseline } = require("./audit-option-d-public-users-derived-baseline");
const { spawnSync } = require("child_process");
const os = require("os");
const {
  readGitBlobAtCommit,
  sha256Buffer,
  normalizeRepoPath,
} = require("./option-d-git-blob-authority");

const ROOT = path.join(__dirname, "..", "..");
const MIGRATIONS_DIR = path.join(ROOT, "supabase", "migrations");
const BASELINE_REPO =
  "supabase/migrations-draft/20260701043599_foundations_baseline.sql";
const PUBLIC_USERS_DERIVED_REPO =
  "supabase/migrations-draft/option-d-isolated-replay/derived-baseline/20260701043598_public_users_derived_baseline.sql";
const PHASE1_REPO_DIR = "supabase/migrations-draft/recovered-production-history";
const SUBST_REPO_DIR =
  "supabase/migrations-draft/option-d-isolated-replay/substitutions";
const ASSEMBLED_REPO_DIR =
  "supabase/migrations-draft/option-d-isolated-replay/assembled";
const BASELINE = path.join(ROOT, BASELINE_REPO);
const PUBLIC_USERS_DERIVED = path.join(ROOT, PUBLIC_USERS_DERIVED_REPO);
const PHASE1_DIR = path.join(ROOT, PHASE1_REPO_DIR);
const SUBST_DIR = path.join(ROOT, SUBST_REPO_DIR);
const ASSEMBLED_DIR = path.join(ROOT, ASSEMBLED_REPO_DIR);
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
  "20260702041259_add_received_at_to_stripe_webhook_events.sql",
  "20260704024059_d_entitlements_legacy_stripe_rename.sql",
  "20260804213003_pilot_lifecycle_events.sql",
  "20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql",
  "20260804213934_pilot_lifecycle_events_hash_digest_bytea_fix.sql",
  "20260804214151_pilot_lifecycle_events_hash_extensions_search_path.sql",
  "20260804220220_pilot_lifecycle_events_chain_seq_hardening.sql",
  "20260804234230_lifecycle_issues.sql",
  "20260805005320_pilot_lifecycle_anchors.sql",
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
  "20260720170000_ar_tieout2_runs_and_variances.sql": {
    action: "substitute_production_statements",
    justification:
      "Git CREATE OR REPLACE VIEW inserts columns before tie_out_state (42P16). Exact production schema_migrations 20260720212538 statements[1] uses DROP VIEW IF EXISTS (no CASCADE) + CREATE VIEW + security_invoker=true.",
  },
};

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function resolveAssembleCommit() {
  if (process.env.OPTION_D_ASSEMBLE_COMMIT) {
    return String(process.env.OPTION_D_ASSEMBLE_COMMIT).trim().toLowerCase();
  }
  const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" });
  if (r.status !== 0) {
    throw new Error(`Unable to resolve assemble commit: ${r.stderr || r.stdout}`);
  }
  return String(r.stdout || "").trim().toLowerCase();
}

function committerIsoDate(commit) {
  const r = spawnSync("git", ["show", "-s", "--format=%cI", commit], {
    cwd: ROOT,
    encoding: "utf8",
  });
  if (r.status !== 0) return new Date().toISOString();
  return String(r.stdout || "").trim() || new Date().toISOString();
}

function readRepoBlobOrThrow(commit, repoPath) {
  const normalized = normalizeRepoPath(repoPath);
  const blob = readGitBlobAtCommit(commit, normalized, { cwd: ROOT });
  if (!blob.ok) {
    const detail = blob.failures.map((f) => f.rule).join(",");
    throw new Error(`Missing git blob ${commit}:${normalized} (${detail})`);
  }
  return blob;
}

function gitBlobExists(commit, repoPath) {
  const blob = readGitBlobAtCommit(commit, normalizeRepoPath(repoPath), { cwd: ROOT });
  return blob.ok === true;
}

function listGitSqlBasenames(commit, repoDir) {
  const r = spawnSync(
    "git",
    ["ls-tree", "-r", "--name-only", commit, "--", repoDir.replace(/\\/g, "/")],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  if (r.status !== 0) {
    throw new Error(`git ls-tree failed for ${repoDir}: ${r.stderr || r.stdout}`);
  }
  const prefix = repoDir.replace(/\\/g, "/").replace(/\/?$/, "/");
  return String(r.stdout || "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\\/g, "/"))
    .filter((l) => l.startsWith(prefix) && l.endsWith(".sql"))
    // Only direct children of repoDir (exclude rollback/ and other nested companions).
    .filter((l) => !l.slice(prefix.length).includes("/"))
    .filter((l) => !l.endsWith(".down.sql"))
    .map((l) => path.posix.basename(l))
    .sort();
}

function stageRepoBlob(commit, repoPath, stageRoot) {
  const blob = readRepoBlobOrThrow(commit, repoPath);
  const rel = normalizeRepoPath(repoPath);
  const dest = path.join(stageRoot, ...rel.split("/"));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, blob.bytes);
  return {
    absPath: dest,
    repoPath: rel,
    bytes: blob.bytes,
    sha256: blob.sha256,
    gitBlobId: blob.gitBlobId,
    byteLength: blob.byteLength,
  };
}

function ensureCleanAssembledDir() {
  fs.mkdirSync(path.dirname(ASSEMBLED_DIR), { recursive: true });
  if (fs.existsSync(ASSEMBLED_DIR)) {
    for (const f of fs.readdirSync(ASSEMBLED_DIR)) {
      if (f === "README.md" || f === ".gitignore" || f === ".gitattributes") continue;
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
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  const outPath = path.join(ASSEMBLED_DIR, filename);
  fs.writeFileSync(outPath, buf);
  const assembledSha256 = sha256Buffer(buf);
  return {
    order: meta.order,
    assembledFilename: filename,
    role: meta.role,
    action: meta.action,
    originalSource: meta.originalSource || null,
    originalSha256: meta.originalSha256 || null,
    originalGitBlobId: meta.originalGitBlobId || null,
    replacementSource: meta.replacementSource || null,
    replacementSha256: meta.replacementSha256 || null,
    replacementGitBlobId: meta.replacementGitBlobId || null,
    assembledSha256,
    assembledRepoPath: `${ASSEMBLED_REPO_DIR}/${filename}`,
    sourceCommit: meta.sourceCommit || null,
    justification: meta.justification || null,
  };
}

function main() {
  const assembleCommit = resolveAssembleCommit();
  const analysisStage = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-assemble-analyze-"));
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

  // 0a) Derived public.users baseline (schema/security only — not recovered original)
  {
    const staged = stageRepoBlob(assembleCommit, PUBLIC_USERS_DERIVED_REPO, analysisStage);
    order += 1;
    entries.push(
      writeAssembled("20260701043598_public_users_derived_baseline.sql", staged.bytes, {
        order,
        role: "derived_baseline_public_users",
        action: "include",
        originalSource: PUBLIC_USERS_DERIVED_REPO,
        originalSha256: staged.sha256,
        originalGitBlobId: staged.gitBlobId,
        sourceCommit: assembleCommit,
        justification:
          "Schema/security-only derived baseline for public.users; original CREATE unavailable in git/statements[].",
      }),
    );
  }

  // 0b) Foundations baseline
  {
    const staged = stageRepoBlob(assembleCommit, BASELINE_REPO, analysisStage);
    order += 1;
    entries.push(
      writeAssembled("20260701043599_foundations_baseline.sql", staged.bytes, {
        order,
        role: "foundations_baseline",
        action: "include",
        originalSource: BASELINE_REPO,
        originalSha256: staged.sha256,
        originalGitBlobId: staged.gitBlobId,
        sourceCommit: assembleCommit,
        justification: "Reviewed hardened baseline covering pre-phase1 foundation DDL.",
      }),
    );
  }

  // 1–4) Phase1 recovered production history
  for (const file of PHASE1_FILES) {
    const repoPath = `${PHASE1_REPO_DIR}/${file}`;
    const staged = stageRepoBlob(assembleCommit, repoPath, analysisStage);
    order += 1;
    entries.push(
      writeAssembled(file, staged.bytes, {
        order,
        role: "phase1_recovered",
        action: "include",
        originalSource: repoPath,
        originalSha256: staged.sha256,
        originalGitBlobId: staged.gitBlobId,
        sourceCommit: assembleCommit,
        justification: "Recovered production phase1 SQL (subscriptions + RLS).",
      }),
    );
  }

  // Post-baseline local migrations: dependency order (NOT filename-only sort)
  const localFilesLex = listGitSqlBasenames(assembleCommit, "supabase/migrations");

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

    const originalRepo = `supabase/migrations/${file}`;
    const substMeta = SUBSTITUTIONS[file];
    const substRepo = substMeta ? `${SUBST_REPO_DIR}/${file}` : null;
    if (substMeta && !gitBlobExists(assembleCommit, substRepo)) {
      console.error(`Missing substitution git blob: ${assembleCommit}:${substRepo}`);
      process.exit(1);
    }
    const applyRepo = substMeta ? substRepo : originalRepo;
    const stagedApply = stageRepoBlob(assembleCommit, applyRepo, analysisStage);
    const stagedOriginal = substMeta
      ? stageRepoBlob(assembleCommit, originalRepo, analysisStage)
      : stagedApply;
    postCandidates.push({
      filename: file,
      absPath: stagedApply.absPath,
      originalPath: stagedOriginal.absPath,
      originalRepo,
      originalSha256: stagedOriginal.sha256,
      originalGitBlobId: stagedOriginal.gitBlobId,
      substMeta,
      substPath: substMeta ? stagedApply.absPath : null,
      substRepo,
      replacementBytes: substMeta ? stagedApply.bytes : null,
      replacementSha256: substMeta ? stagedApply.sha256 : null,
      replacementGitBlobId: substMeta ? stagedApply.gitBlobId : null,
      applyBytes: stagedApply.bytes,
      role: "post_phase1_local",
    });
  }

  for (const file of RECOVERED_REQUIRED_ORIGINALS) {
    if (postCandidates.some((c) => c.filename === file)) {
      console.error(`FAIL: recovered original collides with local candidate filename: ${file}`);
      process.exit(1);
    }
    const repoPath = `${PHASE1_REPO_DIR}/${file}`;
    if (!gitBlobExists(assembleCommit, repoPath)) {
      console.error(`Missing recovered original git blob: ${assembleCommit}:${repoPath}`);
      process.exit(1);
    }
    const staged = stageRepoBlob(assembleCommit, repoPath, analysisStage);
    postCandidates.push({
      filename: file,
      absPath: staged.absPath,
      originalPath: staged.absPath,
      originalRepo: repoPath,
      originalSha256: staged.sha256,
      originalGitBlobId: staged.gitBlobId,
      substMeta: null,
      substPath: null,
      substRepo: null,
      replacementBytes: null,
      replacementSha256: null,
      replacementGitBlobId: null,
      applyBytes: staged.bytes,
      role: "recovered_production_original",
    });
  }

  const depOverrides = fs.existsSync(DEP_OVERRIDES)
    ? JSON.parse(fs.readFileSync(DEP_OVERRIDES, "utf8"))
    : {};

  // Objects created by fixed prefix are provided before post-phase1 replay.
  const knownProvidedTables = new Set();
  const knownProvidedFunctions = new Set();
  const knownProvidedColumns = new Set();
  for (const repoPath of [
    PUBLIC_USERS_DERIVED_REPO,
    BASELINE_REPO,
    ...PHASE1_FILES.map((f) => `${PHASE1_REPO_DIR}/${f}`),
  ]) {
    const staged = stageRepoBlob(assembleCommit, repoPath, analysisStage);
    const a = analyzeMigrationFile(staged.absPath);
    for (const t of a.creates.tables || []) knownProvidedTables.add(t);
    for (const id of a.creates.functionIdentities || []) knownProvidedFunctions.add(id);
    for (const id of a.creates.columnIdentities || []) knownProvidedColumns.add(id);
  }

  const depResult = computeOptionDDependencyOrder(postCandidates, depOverrides, {
    knownProvidedTables,
    knownProvidedFunctions,
    knownProvidedColumns,
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
  depResult.changelog.ruleSeedRegression = {
    failedAt: "20260707120000_d_assertions_part_1_schema_and_backfill.sql",
    failedOrder: 36,
    sqlState: "23503",
    missingKey: "gen.accrual_reversal_check",
    prerequisite: "20260703_1200_d6_0_vertical_rule_foundation.sql",
    d0: "20260708_00_d0_identity_and_memory_activation.sql",
    dependencyOrderIndex: {
      d0: fullPos.get("20260708_00_d0_identity_and_memory_activation.sql") || null,
      d6_0: fullPos.get("20260703_1200_d6_0_vertical_rule_foundation.sql") || null,
      part1: fullPos.get("20260707120000_d_assertions_part_1_schema_and_backfill.sql") || null,
    },
    dependencyOrderSatisfied:
      (fullPos.get("20260708_00_d0_identity_and_memory_activation.sql") || 0) > 0 &&
      (fullPos.get("20260703_1200_d6_0_vertical_rule_foundation.sql") || 0) > 0 &&
      (fullPos.get("20260707120000_d_assertions_part_1_schema_and_backfill.sql") || 0) > 0 &&
      (fullPos.get("20260708_00_d0_identity_and_memory_activation.sql") || 0) <
        (fullPos.get("20260703_1200_d6_0_vertical_rule_foundation.sql") || 0) &&
      (fullPos.get("20260703_1200_d6_0_vertical_rule_foundation.sql") || 0) <
        (fullPos.get("20260707120000_d_assertions_part_1_schema_and_backfill.sql") || 0),
  };

  const classification = classifyUnresolvedOccurrences({
    unresolved: depResult.unresolved,
    candidates: postCandidates,
    graph: depResult.graph,
    knownProvidedTables,
    knownProvidedFunctions,
    knownProvidedColumns,
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
    order += 1;
    if (c.substMeta) {
      entries.push(
        writeAssembled(file, c.replacementBytes, {
          order,
          role: "post_phase1_local",
          action: c.substMeta.action,
          originalSource: c.originalRepo,
          originalSha256: c.originalSha256,
          originalGitBlobId: c.originalGitBlobId,
          replacementSource: c.substRepo,
          replacementSha256: c.replacementSha256,
          replacementGitBlobId: c.replacementGitBlobId,
          sourceCommit: assembleCommit,
          justification: c.substMeta.justification,
        }),
      );
    } else {
      entries.push(
        writeAssembled(file, c.applyBytes, {
          order,
          role: c.role || "post_phase1_local",
          action: "include",
          originalSource: c.originalRepo,
          originalSha256: c.originalSha256,
          originalGitBlobId: c.originalGitBlobId,
          sourceCommit: assembleCommit,
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
      .filter((c) => c.justifiedExclusion && c.kind !== "function")
      .map((c) => c.table)
      .filter(Boolean),
  ];
  const simOptionalFunctions = classification.classifications
    .filter((c) => c.justifiedExclusion && c.kind === "function")
    .map((c) => c.identity)
    .filter(Boolean);
  const replaySim = simulateCandidateOrder(simCandidates, {
    ...depOverrides,
    optionalExternalTables: simOptional,
    optionalFunctions: simOptionalFunctions,
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
    generatedAt: committerIsoDate(assembleCommit),
    assembleAuthority: {
      kind: "git_cat_file_blob",
      sourceCommit: assembleCommit,
      note: "Per-entry hashes and assembled SQL bytes are derived exclusively from git cat-file blob at sourceCommit; working-tree smudge is not authority.",
    },
    mechanism: "option_d_isolated_git_replay",
    status: "CANDIDATE_LINEAGE_ASSEMBLED",
    notMergeApproval: true,
    productionHistoryUnchanged: true,
    activeMigrationsUnchanged: true,
    productionDashboardReplayParity: "unresolved",
    pr312HeadRequiredUnchanged: "f65730b3d38e9cb3b192e54f62c798c74a07a1c2",
    assembledDir: ASSEMBLED_REPO_DIR,
    ordering: {
      policy: depResult.changelog.policy,
      fixedPrefix: prefixFiles,
      dependencyOrder: fullDependencyOrder,
      lexicographicOrderWouldHaveBeen: fullLexOrder,
      movedCount: depResult.changelog.movedCount,
      recurringFiresRegression: depResult.changelog.recurringFiresRegression,
      ruleSeedRegression: depResult.changelog.ruleSeedRegression,
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
      derivedPublicUsersBaseline: 1,
      phase1: PHASE1_FILES.length,
      recoveredRequiredOriginals: RECOVERED_REQUIRED_ORIGINALS.length,
      postPhase1: entries.length - 2 - PHASE1_FILES.length,
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
  if (!depResult.changelog.ruleSeedRegression.dependencyOrderSatisfied) {
    console.error(
      "FAIL: curated rule-seed creators (D0 / d6_0) must precede D-Assertions Part 1 coverage backfill",
      depResult.changelog.ruleSeedRegression.dependencyOrderIndex,
    );
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
  const hashChainFile = "20260804213819_pilot_lifecycle_events_hash_chain_trigger.sql";
  const anchorsFile = "20260805005320_pilot_lifecycle_anchors.sql";
  const major1File = "20260805041500_major_1_rpc_lockdown.sql";
  if (
    (fullPos.get(hashChainFile) || 0) === 0 ||
    (fullPos.get(anchorsFile) || 0) === 0 ||
    (fullPos.get(major1File) || 0) === 0 ||
    fullPos.get(hashChainFile) >= fullPos.get(major1File) ||
    fullPos.get(anchorsFile) >= fullPos.get(major1File)
  ) {
    console.error("FAIL: recovered function creators must precede major_1_rpc_lockdown");
    process.exit(1);
  }
  const missingRecovered = RECOVERED_REQUIRED_ORIGINALS.filter((f) => !assembledNames.has(f));
  if (missingRecovered.length) {
    console.error("FAIL: recovered originals missing from assembled set", missingRecovered);
    process.exit(1);
  }

  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2) + "\n");

  // Row-level rule-seed completeness gate (every coverage FK rule_id has ordered reference seed)
  const seedEval = evaluateRuleSeedOrdering(loadOrderedEntriesFromReplayManifest());
  if (!seedEval.ok) {
    console.error("FAIL: rule-seed dependency completeness", seedEval.failures.slice(0, 10));
    process.exit(1);
  }
  const viewEval = evaluateViewSignatureOrdering(loadOrderedEntriesFromReplayManifest());
  if (!viewEval.ok) {
    console.error("FAIL: view-signature compatibility", viewEval.failures.slice(0, 10));
    process.exit(1);
  }
  const derivedUsersEval = evaluateDerivedBaseline();
  if (!derivedUsersEval.ok) {
    console.error("FAIL: public.users derived baseline", derivedUsersEval.failures.slice(0, 10));
    process.exit(1);
  }
  // App-relation gate records missing creators but does not abort
  // assemble artifact generation — candidateReplayStaticReady is enforced by
  // audit-option-d-replay-gate.js / audit-option-d-app-relation-deps.js.
  const appRelEval = evaluateAppRelationOrdering(loadOrderedEntriesFromReplayManifest());
  const inventoryRun = spawnSync(
    process.execPath,
    [path.join(__dirname, "audit-option-d-rule-seed-deps.js")],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (inventoryRun.status !== 0) {
    console.error(inventoryRun.stdout || "");
    console.error(inventoryRun.stderr || "");
    console.error("FAIL: audit-option-d-rule-seed-deps.js");
    process.exit(inventoryRun.status || 1);
  }
  const viewGateRun = spawnSync(
    process.execPath,
    [path.join(__dirname, "audit-option-d-view-signatures.js")],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (viewGateRun.status !== 0) {
    console.error(viewGateRun.stdout || "");
    console.error(viewGateRun.stderr || "");
    console.error("FAIL: audit-option-d-view-signatures.js");
    process.exit(viewGateRun.status || 1);
  }
  const derivedUsersGateRun = spawnSync(
    process.execPath,
    [path.join(__dirname, "audit-option-d-public-users-derived-baseline.js")],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (derivedUsersGateRun.status !== 0) {
    console.error(derivedUsersGateRun.stdout || "");
    console.error(derivedUsersGateRun.stderr || "");
    console.error("FAIL: audit-option-d-public-users-derived-baseline.js");
    process.exit(derivedUsersGateRun.status || 1);
  }
  spawnSync(process.execPath, [path.join(__dirname, "audit-option-d-app-relation-deps.js")], {
    cwd: ROOT,
    encoding: "utf8",
  });

  console.log(
    JSON.stringify(
      {
        ok: classification.requiredDependenciesResolved && appRelEval.ok && derivedUsersEval.ok,
        totalAssembled: entries.length,
        substitutions: substitutionEntries.length,
        movedCount: depResult.changelog.movedCount,
        unresolvedDependencies: depResult.unresolved.length,
        requiredUnresolved: classification.requiredCount,
        requiredDependenciesResolved: classification.requiredDependenciesResolved,
        objectAvailabilitySimulationOk: replaySim.ok,
        recurringFiresOrderOk: depResult.changelog.recurringFiresRegression.dependencyOrderSatisfied,
        ruleSeedOrderOk: depResult.changelog.ruleSeedRegression.dependencyOrderSatisfied,
        ruleSeedCompletenessOk: seedEval.ok,
        viewSignatureOk: viewEval.ok,
        publicUsersDerivedBaselineOk: derivedUsersEval.ok,
        appRelationDepsOk: appRelEval.ok,
        publicUsersMissingCreator: appRelEval.publicUsersMissingCreator,
        requiredRuleIds: seedEval.requiredRuleIds.length,
        assembleCommit,
        manifest: path.relative(ROOT, MANIFEST_OUT).replace(/\\/g, "/"),
        assembledDir: path.relative(ROOT, ASSEMBLED_DIR).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );

  try {
    fs.rmSync(analysisStage, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
}

withAssembleLock(main);
