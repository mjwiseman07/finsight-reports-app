#!/usr/bin/env node
/**
 * GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY CLI
 *
 * Default: dry-run / read-only.
 * Real apply requires --apply and all explicit pin inputs.
 *
 * NEVER prints database credentials or token values.
 * This authorization forbids production connections (including dry-run).
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
} = require("./credential-browser-containment-constants");
const { runApplicator, sanitizeError } = require("./credential-browser-containment-apply-core");

function parseArgs(argv) {
  const out = {
    mode: "dry-run",
    applyAuthorized: false,
    skipTarget2Check: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    const next = () => {
      i += 1;
      return argv[i];
    };
    switch (a) {
      case "--mode":
        out.mode = next();
        break;
      case "--apply":
      case "--i-authorize-production-apply":
        out.applyAuthorized = true;
        out.mode = "apply";
        break;
      case "--project-ref":
        out.projectRef = next();
        break;
      case "--pr-head":
        out.prHead = next();
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
      case "--database-url":
        out.databaseUrl = next();
        break;
      case "--target2-fingerprint":
        out.target2Fingerprint = next();
        break;
      case "--skip-target2-check":
        out.skipTarget2Check = true;
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${a}`);
    }
  }
  return out;
}

function printHelp() {
  const help = {
    mechanism: "GIT_BLOB_PINNED_SINGLE_VERSION_TX_APPLY",
    default_mode: "dry-run",
    advisory_lock: ADVISORY_LOCK,
    required_for_any_run: [
      "--project-ref",
      "--pr-head",
      "--artifact-commit",
      "--migration-path",
      "--migration-blob-oid",
      "--migration-sha256",
      "--migration-bytes",
      "--version",
      "--name",
      "--database-url",
    ],
    apply_extra: ["--apply"],
    expected_defaults: {
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
      "supabase db push",
      "--include-all",
      "migration repair",
      "MCP alternate versioning",
      "worktree SQL",
    ],
  };
  process.stdout.write(`${JSON.stringify(help, null, 2)}\n`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (err) {
    process.stdout.write(
      `${JSON.stringify({ verdict: "BLOCKED", sqlApplicationAttempts: 0, error: sanitizeError(err) }, null, 2)}\n`,
    );
    process.exitCode = 2;
    return;
  }

  if (args.help) {
    printHelp();
    return;
  }

  // Never echo database URL
  const evidence = await runApplicator({
    mode: args.mode,
    applyAuthorized: args.applyAuthorized,
    projectRef: args.projectRef,
    prHead: args.prHead,
    artifactCommit: args.artifactCommit,
    migrationPath: args.migrationPath,
    migrationBlobOid: args.migrationBlobOid,
    migrationSha256: args.migrationSha256,
    migrationBytes: args.migrationBytes,
    version: args.version,
    name: args.name,
    databaseUrl: args.databaseUrl,
    target2Fingerprint: args.target2Fingerprint,
    skipTarget2Check: args.skipTarget2Check,
  });

  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  if (evidence.verdict === "DRY_RUN_READY" || evidence.verdict === "APPLY_COMMITTED") {
    process.exitCode = 0;
  } else {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stdout.write(
    `${JSON.stringify({ verdict: "BLOCKED", sqlApplicationAttempts: 0, error: sanitizeError(err) }, null, 2)}\n`,
  );
  process.exitCode = 2;
});
