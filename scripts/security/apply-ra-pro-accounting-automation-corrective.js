#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Operator CLI for RA Pro accounting-automation CORRECTIVE sealed applicator.
 * Production dry-run requires validated executable-authority + dry-run authorization pins.
 * --executable-commit alone is never a source of trust (recheck-only with full pin).
 */
const {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  EVIDENCE_PIN_AUTHORITY_COMMIT,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { runApplicator } = require("./ra-pro-accounting-automation-corrective-apply-core");
const {
  sealCorrectiveDryRunEvidence,
  writeEvidenceFrameToStdout,
} = require("./ra-pro-accounting-automation-corrective-evidence");
const {
  loadEvidencePinAuthority,
} = require("./ra-pro-accounting-automation-corrective-apply-authorization");
const {
  assertDryRunAuthorizedBeforeCredentials,
  recheckDryRunAuthorizationPin,
} = require("./ra-pro-accounting-automation-corrective-dry-run-authorization");
const {
  assertExecutableAuthorityBeforeCredentials,
  recheckExecutableAuthorityPin,
} = require("./ra-pro-accounting-automation-corrective-executable-authority");

function readFlags(raw) {
  const flags = {
    apply: false,
    dryRun: false,
    unknown: false,
    executableCommit: null,
    evidenceAuthorityCommit: null,
    dryRunAuthorizationPublication: null,
    expectAuthorizationBlobOid: null,
    expectExecutable: null,
    expectBundleOid: null,
    expectAttemptId: null,
    executableAuthorityPublication: null,
    expectExecutableAuthorityBlobOid: null,
    expectExecutableAuthorityBlobSha256: null,
    expectExecutableAuthorityBlobBytes: null,
  };
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--executable-commit") {
      // Legacy alias treated as recheck-only expect-executable when full pin present.
      flags.expectExecutable = raw[i + 1] || null;
      flags.executableCommit = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--evidence-authority-commit") {
      flags.evidenceAuthorityCommit = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--dry-run-authorization-publication") {
      flags.dryRunAuthorizationPublication = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-authorization-blob-oid") {
      flags.expectAuthorizationBlobOid = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-executable") {
      flags.expectExecutable = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-bundle-oid") {
      flags.expectBundleOid = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-attempt-id") {
      flags.expectAttemptId = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--executable-authority-publication") {
      flags.executableAuthorityPublication = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-executable-authority-blob-oid") {
      flags.expectExecutableAuthorityBlobOid = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-executable-authority-blob-sha256") {
      flags.expectExecutableAuthorityBlobSha256 = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--expect-executable-authority-blob-bytes") {
      flags.expectExecutableAuthorityBlobBytes = raw[i + 1] || null;
      i += 1;
    } else flags.unknown = true;
  }
  return flags;
}

async function main() {
  const flags = readFlags(process.argv.slice(2));
  if (flags.unknown) {
    process.stderr.write(`${JSON.stringify({ blocked: "UNKNOWN_ARGV", apply_authorized: false })}\n`);
    process.exitCode = 1;
    return;
  }
  const apply = flags.apply;
  const dryRun = flags.dryRun || !apply;
  const mode = apply && !dryRun ? "apply" : "dry-run";

  let dryRunMap = null;
  let executableAuthorityMap = null;
  if (mode === "dry-run") {
    const hasFullPin =
      flags.executableAuthorityPublication &&
      flags.expectExecutableAuthorityBlobOid &&
      flags.dryRunAuthorizationPublication &&
      flags.expectAuthorizationBlobOid &&
      flags.expectExecutable &&
      flags.expectBundleOid &&
      flags.expectAttemptId;
    if (!hasFullPin) {
      process.stdout.write(
        `${JSON.stringify({
          verdict: "DRY_RUN_BLOCKED",
          error_code: "DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED",
          error:
            "DRY_RUN_EXECUTABLE_AUTHORITY_REQUIRED: validated executable-authority + dry-run authorization publication pins required; --executable-commit alone is not authority",
          apply_authorized: false,
          productionContact: false,
          databaseConnectionAttempts: 0,
        })}\n`,
      );
      process.exit(1);
    }
    executableAuthorityMap = assertExecutableAuthorityBeforeCredentials({
      cwd: process.cwd(),
      publicationCommit: flags.executableAuthorityPublication,
      env: process.env,
      expectBlobOid: flags.expectExecutableAuthorityBlobOid,
      expectBlobSha256: flags.expectExecutableAuthorityBlobSha256,
      expectBlobBytes: flags.expectExecutableAuthorityBlobBytes
        ? Number(flags.expectExecutableAuthorityBlobBytes)
        : undefined,
    });
    recheckExecutableAuthorityPin({
      cwd: process.cwd(),
      expectExecutable: flags.expectExecutable,
      expectCommit: flags.executableAuthorityPublication,
      expectBlobOid: flags.expectExecutableAuthorityBlobOid,
      expectBundleOid: flags.expectBundleOid,
    });
    dryRunMap = assertDryRunAuthorizedBeforeCredentials({
      cwd: process.cwd(),
      publicationCommit: flags.dryRunAuthorizationPublication,
      env: process.env,
      executableAuthorityMap,
    });
    recheckDryRunAuthorizationPin({
      cwd: process.cwd(),
      expectExecutable: flags.expectExecutable,
      expectCommit: flags.dryRunAuthorizationPublication,
      expectBlobOid: flags.expectAuthorizationBlobOid,
      expectBundleOid: flags.expectBundleOid,
      expectAttemptId: flags.expectAttemptId,
      expectExecutableAuthorityCommit: flags.executableAuthorityPublication,
      expectExecutableAuthorityBlobOid: flags.expectExecutableAuthorityBlobOid,
      executableAuthorityMap,
    });
    if (dryRunMap.authorized_executable_commit !== String(flags.expectExecutable).toLowerCase()) {
      process.stdout.write(
        `${JSON.stringify({
          verdict: "DRY_RUN_BLOCKED",
          error_code: "DRY_RUN_AUTHORIZATION_PIN_MISMATCH",
          error: "expect-executable does not match authorization map",
          productionContact: false,
        })}\n`,
      );
      process.exitCode = 1;
      return;
    }
  }

  const result = await runApplicator({
    mode,
    authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_TOKEN,
    env: process.env,
    argv: process.argv,
    executableCommit:
      (dryRunMap && dryRunMap.authorized_executable_commit) ||
      flags.expectExecutable ||
      undefined,
    evidenceAuthorityCommit: flags.evidenceAuthorityCommit || undefined,
    dryRunAuthorizationMap: dryRunMap || undefined,
    executableAuthorityMap: executableAuthorityMap || undefined,
    publicationCommit: flags.dryRunAuthorizationPublication || undefined,
    executableAuthorityPublication: flags.executableAuthorityPublication || undefined,
    expectExecutableAuthorityBlobOid: flags.expectExecutableAuthorityBlobOid || undefined,
  });

  if (mode === "dry-run") {
    if (result.verdict === "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION") {
      let auth = {};
      try {
        const loaded = loadEvidencePinAuthority({
          cwd: process.cwd(),
          evidenceAuthorityCommit: flags.evidenceAuthorityCommit || EVIDENCE_PIN_AUTHORITY_COMMIT,
          env: process.env,
        });
        auth = loaded.auth;
      } catch (err) {
        process.stderr.write(
          `${JSON.stringify({
            phase: "auth_load",
            error: String(err && err.message ? err.message : err),
            code: err && err.code ? err.code : undefined,
          })}\n`,
        );
        process.exitCode = 1;
        return;
      }
      const sealed = sealCorrectiveDryRunEvidence(result, auth, {
        executionTip: result.bundle_authority && result.bundle_authority.commit,
        evidenceAuthorityCommit: EVIDENCE_PIN_AUTHORITY_COMMIT,
        dryRunAuthorizationPublication: flags.dryRunAuthorizationPublication,
        dryRunAuthorizationBlobOid: flags.expectAuthorizationBlobOid,
        dryRunAttemptId: flags.expectAttemptId,
        executableAuthorityPublication: flags.executableAuthorityPublication,
        executableAuthorityBlobOid: flags.expectExecutableAuthorityBlobOid,
      });
      writeEvidenceFrameToStdout(sealed);
    } else {
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  } else {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }

  if (
    result.verdict !== "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" &&
    result.verdict !== "APPLY_COMMITTED"
  ) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(
    `${JSON.stringify({
      verdict: "BLOCKED",
      reason: err.code || "CLI_FAILURE",
      error: String(err && err.message ? err.message : err),
      database_url_env: DATABASE_URL_ENV,
      token_required_for_apply: APPLY_AUTHORIZATION_TOKEN ? true : false,
    })}\n`,
  );
  process.exitCode = 1;
});
