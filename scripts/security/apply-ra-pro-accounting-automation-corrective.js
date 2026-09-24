#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Operator CLI for RA Pro accounting-automation CORRECTIVE sealed applicator.
 * Default mode: dry-run. Apply requires explicit --apply and authorization token env.
 * Dry-run stdout: exactly one sealed evidence frame (no plain JSON).
 *
 * Authority: never reads TOOLING_AUTHORIZATION.json from the worktree.
 * Requires --executable-commit <40-hex>. Evidence pins load only from the baked
 * evidence pin authority commit (f550842c…) via git cat-file.
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

function readFlags(raw) {
  const flags = {
    apply: false,
    dryRun: false,
    unknown: false,
    executableCommit: null,
    evidenceAuthorityCommit: null,
  };
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--executable-commit") {
      flags.executableCommit = raw[i + 1] || null;
      i += 1;
    } else if (arg === "--evidence-authority-commit") {
      flags.evidenceAuthorityCommit = raw[i + 1] || null;
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
  const result = await runApplicator({
    mode,
    authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_TOKEN,
    env: process.env,
    argv: process.argv,
    executableCommit: flags.executableCommit,
    evidenceAuthorityCommit: flags.evidenceAuthorityCommit || undefined,
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
      });
      writeEvidenceFrameToStdout(sealed);
    } else {
      // Fail-closed: emit blocked JSON only — never seal a frame without ready authority.
      process.stdout.write(`${JSON.stringify(result)}\n`);
    }
  } else {
    // Apply path keeps plain JSON until a separate apply-evidence frame is authorized.
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
