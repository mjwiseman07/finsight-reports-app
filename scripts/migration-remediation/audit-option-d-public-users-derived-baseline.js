#!/usr/bin/env node
/**
 * Option D gate for the derived (not recovered-original) public.users baseline.
 *
 * Fail closed when:
 * - derived SQL / contract missing or hash-mismatched
 * - auth.users substituted for public.users
 * - FK to auth.users missing/incorrect
 * - RLS not enabled
 * - user-row DML present
 * - secrets / emails / JWT-like material present
 * - later consumer objects (handle_new_auth_user / on_auth_user_created) folded into baseline
 * - incomplete provenance / unresolved derivation
 * - derived creator not ordered before every public.users consumer
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  readGitBlobAtCommit,
  sha256Buffer,
} = require("./option-d-git-blob-authority");

const ROOT = path.join(__dirname, "..", "..");
const DERIVED_SQL_REPO =
  "supabase/migrations-draft/option-d-isolated-replay/derived-baseline/20260701043598_public_users_derived_baseline.sql";
const DERIVED_SQL = path.join(ROOT, DERIVED_SQL_REPO);
const CONTRACT = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option-d-public-users-derived-baseline/contract.json",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-public-users-derived-baseline-gate.json",
);

const DERIVED_FILENAME = "20260701043598_public_users_derived_baseline.sql";
const ORDER_107 = "20260727000100_users_auth_trigger_single_writer.sql";
const FULL_COMMIT_RE = /^[a-f0-9]{40}$/;

function resolveDerivedAuthorityCommit(opts = {}) {
  const fromOpt = String(opts.commit || "").trim().toLowerCase();
  if (FULL_COMMIT_RE.test(fromOpt)) return fromOpt;
  const fromEnv = String(
    process.env.OPTION_D_ASSEMBLE_COMMIT ||
      process.env.OPTION_D_AUTHORIZED_COMMIT ||
      "",
  )
    .trim()
    .toLowerCase();
  if (FULL_COMMIT_RE.test(fromEnv)) return fromEnv;
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: opts.cwd || ROOT,
    encoding: "utf8",
  });
  const h = String(head.stdout || "")
    .trim()
    .toLowerCase();
  return FULL_COMMIT_RE.test(h) ? h : null;
}

function loadDerivedSqlBytes(opts = {}) {
  // Explicit temp/override paths (unit tests) remain file-based.
  if (opts.sqlPath) {
    if (!fs.existsSync(opts.sqlPath)) {
      return { ok: false, failures: [{ rule: "derived_sql_missing", path: opts.sqlPath }] };
    }
    const bytes = fs.readFileSync(opts.sqlPath);
    return {
      ok: true,
      failures: [],
      bytes,
      sha256: sha256Buffer(bytes),
      authority: "explicit_sql_path",
      path: opts.sqlPath,
    };
  }

  const commit = resolveDerivedAuthorityCommit(opts);
  if (!commit) {
    return {
      ok: false,
      failures: [{ rule: "derived_sql_authority_commit_unresolved" }],
    };
  }
  const blob = readGitBlobAtCommit(commit, DERIVED_SQL_REPO, { cwd: opts.cwd || ROOT });
  if (!blob.ok) {
    return { ok: false, failures: blob.failures };
  }
  return {
    ok: true,
    failures: [],
    bytes: blob.bytes,
    sha256: blob.sha256,
    gitBlobId: blob.gitBlobId,
    authority: "git_cat_file_blob",
    commit,
    path: DERIVED_SQL_REPO,
  };
}

function evaluateDerivedBaseline(opts = {}) {
  const failures = [];
  const contractPath = opts.contractPath || CONTRACT;

  if (!fs.existsSync(contractPath)) {
    failures.push({ rule: "derived_contract_missing", path: contractPath });
    return { ok: false, failures };
  }

  const loaded = loadDerivedSqlBytes(opts);
  if (!loaded.ok) {
    return { ok: false, failures: loaded.failures };
  }

  const sqlBuf = loaded.bytes;
  const sql = sqlBuf.toString("utf8");
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const observedSha = loaded.sha256;

  if (contract.artifactKind !== "derived_baseline_not_recovered_original_sql") {
    failures.push({ rule: "artifact_kind_incorrect", got: contract.artifactKind });
  }
  if (contract.contains_data_rows !== false) {
    failures.push({ rule: "contains_data_rows_not_false" });
  }
  if (contract.originalCreatorSqlAvailable !== false) {
    failures.push({ rule: "must_declare_original_creator_unavailable" });
  }
  if (contract.derivationComplete !== true) {
    failures.push({ rule: "derivation_incomplete" });
  }
  if (Array.isArray(contract.unresolvedElements) && contract.unresolvedElements.length) {
    failures.push({
      rule: "unresolved_derivation_elements",
      unresolved: contract.unresolvedElements,
    });
  }
  if (contract.derivedSqlSha256 !== observedSha) {
    failures.push({
      rule: "derived_sql_hash_mismatch",
      expected: contract.derivedSqlSha256,
      observed: observedSha,
    });
  }
  if (contract.derivedSqlBytes !== sqlBuf.length) {
    failures.push({
      rule: "derived_sql_byte_length_mismatch",
      expected: contract.derivedSqlBytes,
      observed: sqlBuf.length,
    });
  }

  // Identity separation / FK
  if (!/create\s+table\s+if\s+not\s+exists\s+public\.users\b/i.test(sql)) {
    failures.push({ rule: "missing_create_public_users" });
  }
  if (/create\s+table[\s\S]{0,80}auth\.users/i.test(sql)) {
    failures.push({ rule: "substituted_or_created_auth_users" });
  }
  if (!/foreign\s+key\s*\(\s*id\s*\)\s*references\s+auth\.users\s*\(\s*id\s*\)/i.test(sql)) {
    failures.push({ rule: "missing_or_incorrect_auth_users_fkey" });
  }

  // RLS
  if (!/alter\s+table\s+public\.users\s+enable\s+row\s+level\s+security/i.test(sql)) {
    failures.push({ rule: "rls_not_enabled" });
  }
  if (/force\s+row\s+level\s+security/i.test(sql)) {
    failures.push({ rule: "unexpected_force_rls" });
  }

  // Policies — own-row only; no overbroad ALL / INSERT for authenticated
  if (!/create\s+policy\s+"Users can read own record"/i.test(sql)) {
    failures.push({ rule: "missing_select_own_policy" });
  }
  if (!/create\s+policy\s+"Users can update own record"/i.test(sql)) {
    failures.push({ rule: "missing_update_own_policy" });
  }
  if (!/using\s*\(\s*auth\.uid\(\)\s*=\s*id\s*\)/i.test(sql)) {
    failures.push({ rule: "policy_not_own_row" });
  }
  if (/for\s+all\b/i.test(sql) && /create\s+policy/i.test(sql)) {
    failures.push({ rule: "overbroad_for_all_policy" });
  }
  if (/for\s+insert\b/i.test(sql)) {
    failures.push({ rule: "unexpected_insert_policy" });
  }
  if (/raw_user_meta_data/i.test(sql)) {
    failures.push({ rule: "authorization_or_policy_uses_editable_user_metadata" });
  }

  // No later objects folded in
  if (/handle_new_auth_user/i.test(sql)) {
    failures.push({ rule: "later_function_folded_into_baseline" });
  }
  if (/on_auth_user_created/i.test(sql)) {
    failures.push({ rule: "later_trigger_folded_into_baseline" });
  }
  if (/\bsecurity\s+definer\b/i.test(sql)) {
    failures.push({ rule: "unexpected_security_definer_in_baseline" });
  }

  // No user-row DML / COPY
  if (/\binsert\s+into\b/i.test(sql) || /\bcopy\s+/i.test(sql) || /\bupdate\s+public\.users\b/i.test(sql)) {
    failures.push({ rule: "user_row_dml_present" });
  }

  // Secrets / row-like values
  if (/eyJ[A-Za-z0-9_-]{20,}\./.test(sql) || /password\s*=/i.test(sql)) {
    failures.push({ rule: "secret_like_material_present" });
  }
  if (/@[a-z0-9.-]+\.[a-z]{2,}/i.test(sql)) {
    failures.push({ rule: "email_like_material_present" });
  }
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i.test(sql)) {
    failures.push({ rule: "uuid_literal_present" });
  }

  // Required columns for order-107 insert
  for (const col of ["id", "email", "first_name", "last_name", "business_name", "created_at"]) {
    if (!new RegExp(`\\b${col}\\b`, "i").test(sql)) {
      failures.push({ rule: "missing_required_column", column: col });
    }
  }

  // Ordering vs consumers (when manifest present)
  if (fs.existsSync(MANIFEST)) {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const entries = (manifest.entries || []).slice().sort((a, b) => a.order - b.order);
    const derived = entries.find((e) => e.assembledFilename === DERIVED_FILENAME);
    const consumer = entries.find((e) => e.assembledFilename === ORDER_107);
    if (!derived) {
      failures.push({ rule: "derived_baseline_not_in_manifest" });
    } else if (consumer && derived.order >= consumer.order) {
      failures.push({
        rule: "derived_baseline_not_before_consumer",
        derivedOrder: derived.order,
        consumerOrder: consumer.order,
      });
    }
    // Assembled file must match derived SQL hash when present
    const assembledPath = path.join(ASSEMBLED, DERIVED_FILENAME);
    if (fs.existsSync(assembledPath)) {
      const aSha = sha256Buffer(fs.readFileSync(assembledPath));
      if (aSha !== observedSha) {
        failures.push({
          rule: "assembled_derived_sql_hash_mismatch",
          expected: observedSha,
          observed: aSha,
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    failureCount: failures.length,
    failures,
    derivedSqlSha256: observedSha,
    derivedSqlBytes: sqlBuf.length,
    derivationComplete: contract.derivationComplete === true,
    unresolvedCount: (contract.unresolvedElements || []).length,
    authority: loaded.authority,
    gitBlobId: loaded.gitBlobId || null,
    sourceCommit: loaded.commit || null,
  };
}

function main() {
  const result = evaluateDerivedBaseline();
  const report = {
    generatedAt: new Date().toISOString(),
    gate: "option_d_public_users_derived_baseline",
    ...result,
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        failureCount: report.failureCount,
        derivedSqlSha256: report.derivedSqlSha256,
        derivationComplete: report.derivationComplete,
      },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

module.exports = {
  evaluateDerivedBaseline,
  loadDerivedSqlBytes,
  resolveDerivedAuthorityCommit,
  DERIVED_FILENAME,
  DERIVED_SQL,
  DERIVED_SQL_REPO,
  CONTRACT,
  ORDER_107,
  OUT,
};

if (require.main === module) main();
