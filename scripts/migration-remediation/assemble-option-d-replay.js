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

const PHASE1_FILES = [
  "20260701043602_phase1_subscriptions_core.sql",
  "20260701043707_phase1_subscription_seats_and_entitlements.sql",
  "20260701043911_phase1_backward_compat_view.sql",
  "20260701043931_phase1_entitlement_rls_policies.sql",
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

function ensureCleanAssembledDir() {
  fs.mkdirSync(path.dirname(ASSEMBLED_DIR), { recursive: true });
  if (fs.existsSync(ASSEMBLED_DIR)) {
    for (const f of fs.readdirSync(ASSEMBLED_DIR)) {
      if (f === "README.md" || f === ".gitignore") continue;
      fs.unlinkSync(path.join(ASSEMBLED_DIR, f));
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

  // Post-baseline local migrations (filename order), with in-place substitutions
  const localFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const skippedCoveredByBaseline = [];
  for (const file of localFiles) {
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
    const originalSha = sha256File(originalPath);
    const substMeta = SUBSTITUTIONS[file];

    order += 1;
    if (substMeta) {
      const substPath = path.join(SUBST_DIR, file);
      if (!fs.existsSync(substPath)) {
        console.error(`Missing substitution file: ${substPath}`);
        process.exit(1);
      }
      const replacement = fs.readFileSync(substPath);
      entries.push(
        writeAssembled(file, replacement, {
          order,
          role: "post_phase1_local",
          action: substMeta.action,
          originalSource: path.relative(ROOT, originalPath).replace(/\\/g, "/"),
          originalSha256: originalSha,
          replacementSource: path.relative(ROOT, substPath).replace(/\\/g, "/"),
          replacementSha256: sha256Text(replacement.toString("utf8")),
          justification: substMeta.justification,
        }),
      );
    } else {
      const content = fs.readFileSync(originalPath);
      entries.push(
        writeAssembled(file, content, {
          order,
          role: "post_phase1_local",
          action: "include",
          originalSource: path.relative(ROOT, originalPath).replace(/\\/g, "/"),
          originalSha256: originalSha,
          justification: null,
        }),
      );
    }
  }

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
    counts: {
      totalAssembled: entries.length,
      baseline: 1,
      phase1: PHASE1_FILES.length,
      postPhase1: entries.length - 1 - PHASE1_FILES.length,
      substitutions: substitutionEntries.length,
      skippedCoveredByBaseline: skippedCoveredByBaseline.length,
    },
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

  fs.writeFileSync(MANIFEST_OUT, JSON.stringify(manifest, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: true,
        totalAssembled: entries.length,
        substitutions: substitutionEntries.length,
        manifest: path.relative(ROOT, MANIFEST_OUT).replace(/\\/g, "/"),
        assembledDir: path.relative(ROOT, ASSEMBLED_DIR).replace(/\\/g, "/"),
      },
      null,
      2,
    ),
  );
}

main();
