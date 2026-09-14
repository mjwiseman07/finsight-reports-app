#!/usr/bin/env node
/**
 * Inner applicator CLI — intended to run only from a verified materialized temp tree.
 * Database URL: FREE_REVIEW_LEAD_SESSION_APPLY_DATABASE_URL (env only).
 * stdout: exactly one FRLS_LEAD_SESSION_EVIDENCE_V1 frame. Progress goes to stderr.
 */
"use strict";

const {
  EXPECTED_PROJECT_REF,
  ARTIFACT_COMMIT,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  MIGRATION_VERSION,
  MIGRATION_NAME,
  ADVISORY_LOCK,
  DATABASE_URL_ENV,
  APPLY_AUTHORIZATION_TOKEN,
} = require("./free-review-lead-session-apply-constants");
const {
  runApplicator,
  sanitizeError,
  sanitizeValue,
} = require("./free-review-lead-session-apply-core");
const {
  writeEvidenceFrameToStdout,
  buildWrapperFallback,
} = require("./free-review-lead-session-evidence");

function parseArgs(argv) {
  const out = {
    mode: "dry-run",
    applyAuthorizationToken: "",
  };
  let sawMode = false;
  let sawApplyToken = false;

  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      i += 1;
      if (argv[i] === undefined) {
        throw new Error(`MISSING_ARG_VALUE: ${a}`);
      }
      return argv[i];
    };
    switch (a) {
      case "--mode": {
        if (sawMode) throw new Error("BLOCKED_MODE: duplicate --mode");
        sawMode = true;
        out.mode = next();
        break;
      }
      case "--i-authorize-production-apply": {
        if (sawApplyToken) {
          throw new Error("BLOCKED_MODE: duplicate --i-authorize-production-apply");
        }
        sawApplyToken = true;
        out.applyAuthorizationToken = next();
        break;
      }
      case "--apply":
        throw new Error(
          "BLOCKED_MODE: bare --apply is prohibited; use --mode apply and --i-authorize-production-apply <exact-token>",
        );
      case "--database-url":
      case "--databaseUrl":
      case "--db-url":
        throw new Error(
          `PROHIBITED_CREDENTIAL_CHANNEL: ${a} is forbidden; set ${DATABASE_URL_ENV} only`,
        );
      case "--project-ref":
        out.projectRef = next();
        break;
      case "--pr-head":
        out.prHead = next();
        break;
      case "--authorized-pr-head":
        out.authorizedPrHead = next();
        break;
      case "--evidence-tip":
        out.evidenceTip = next();
        break;
      case "--auth-seals-digest":
        out.authSealsDigest = next();
        break;
      case "--require-standalone-self-hash":
        out.requireStandaloneBundleSelfHash = true;
        break;
      case "--artifact-commit":
        out.artifactCommit = next();
        break;
      case "--migration-path":
        out.migrationPath = next();
        break;
      case "--migration-blob-oid":
        out.migrationBlobOid = next();
        break;
      case "--migration-sha256":
        out.migrationSha256 = next();
        break;
      case "--migration-bytes":
        out.migrationBytes = Number(next());
        break;
      case "--version":
        out.version = next();
        break;
      case "--name":
        out.name = next();
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${a}`);
    }
  }

  if (out.mode === "apply" && !sawApplyToken) {
    throw new Error(
      "APPLY_NOT_AUTHORIZED: --mode apply requires --i-authorize-production-apply <exact-token>",
    );
  }
  if (out.mode === "dry-run" && sawApplyToken) {
    throw new Error("BLOCKED_MODE: dry-run must not include apply authorization token");
  }
  return out;
}

function printHelp() {
  const help = {
    mechanism: "GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY",
    evidence_protocol: "FRLS_LEAD_SESSION_EVIDENCE_V1",
    default_mode: "dry-run",
    database_url_channel: DATABASE_URL_ENV,
    advisory_lock: ADVISORY_LOCK,
    apply_token_name: "--i-authorize-production-apply",
    required_pins: [
      "--project-ref",
      "--pr-head",
      "--authorized-pr-head",
      "--artifact-commit",
      "--migration-path",
      "--migration-blob-oid",
      "--migration-sha256",
      "--migration-bytes",
      "--version",
      "--name",
    ],
    expected: {
      project_ref: EXPECTED_PROJECT_REF,
      artifact_commit: ARTIFACT_COMMIT,
      migration_path: MIGRATION_PATH,
      migration_blob_oid: MIGRATION_BLOB_OID,
      migration_sha256: MIGRATION_SHA256,
      migration_bytes: MIGRATION_BYTES,
      version: MIGRATION_VERSION,
      name: MIGRATION_NAME,
    },
    forbids: [
      "--database-url",
      "DATABASE_URL",
      "CONTAINMENT_APPLY_DATABASE_URL",
      "bare --apply",
      "worktree SQL",
      "supabase db push",
    ],
  };
  process.stderr.write(`${JSON.stringify(help, null, 2)}\n`);
}

function emitBlocked(err, exitCode) {
  const message = String((err && err.message) || err || "BLOCKED");
  const fromMessage = message.split(":")[0].trim() || "BLOCKED";
  const reason = err && err.code ? String(err.code) : fromMessage;
  const fallback = buildWrapperFallback({
    result_code: "BLOCKED",
    reason_code: reason,
    phase: (err && err.phase) || "cli",
    mode: "dry-run",
    error: sanitizeError(err),
    error_code: reason,
    databaseConnectionAttempts: 0,
    sqlApplicationAttempts: 0,
    nodeProcessStarted: true,
    child_output_received: false,
    extra: {
      evidence_source: "sealed_applicator",
      error_sanitized: sanitizeValue(err),
      uri_diagnostics: err && err.uri_diagnostics,
    },
  });
  fallback.evidence_source = "sealed_applicator";
  writeEvidenceFrameToStdout(fallback);
  process.exitCode = exitCode;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    emitBlocked(err, 2);
    return;
  }

  if (args.help) {
    printHelp();
    return;
  }

  const evidence = await runApplicator({
    mode: args.mode,
    applyAuthorizationToken: args.applyAuthorizationToken || "",
    projectRef: args.projectRef,
    prHead: args.prHead,
    authorizedPrHead: args.authorizedPrHead || args.prHead,
    evidenceTip: args.evidenceTip,
    authSealsDigest: args.authSealsDigest,
    requireStandaloneBundleSelfHash: !!args.requireStandaloneBundleSelfHash,
    artifactCommit: args.artifactCommit,
    migrationPath: args.migrationPath,
    migrationBlobOid: args.migrationBlobOid,
    migrationSha256: args.migrationSha256,
    migrationBytes: args.migrationBytes,
    version: args.version,
    name: args.name,
    env: process.env,
  });

  writeEvidenceFrameToStdout(evidence);
  if (
    evidence.verdict === "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" ||
    evidence.result_code === "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" ||
    evidence.verdict === "APPLY_COMMITTED" ||
    evidence.verdict === "INDETERMINATE_OUTCOME"
  ) {
    process.exitCode = evidence.verdict === "INDETERMINATE_OUTCOME" ? 3 : 0;
  } else {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  emitBlocked(err, 2);
});

void APPLY_AUTHORIZATION_TOKEN;
