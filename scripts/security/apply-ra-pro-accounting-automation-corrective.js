#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Operator CLI for RA Pro accounting-automation CORRECTIVE sealed applicator.
 * Default mode: dry-run. Apply requires explicit --apply and authorization token env.
 * Dry-run stdout: exactly one sealed evidence frame (no plain JSON).
 */
const fs = require("node:fs");
const path = require("node:path");
const {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
  TOOLING_AUTHORIZATION_PATH,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { runApplicator } = require("./ra-pro-accounting-automation-corrective-apply-core");
const {
  sealCorrectiveDryRunEvidence,
  writeEvidenceFrameToStdout,
} = require("./ra-pro-accounting-automation-corrective-evidence");

function readFlags(raw) {
  const flags = { apply: false, dryRun: false, unknown: false };
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else flags.unknown = true;
  }
  return flags;
}

function loadAuth(cwd) {
  const p = path.join(cwd, TOOLING_AUTHORIZATION_PATH);
  return JSON.parse(fs.readFileSync(p, "utf8"));
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
  });

  if (mode === "dry-run") {
    const cwd = process.cwd();
    let auth = {};
    try {
      auth = loadAuth(cwd);
    } catch (err) {
      process.stderr.write(
        `${JSON.stringify({ phase: "auth_load", error: String(err && err.message ? err.message : err) })}\n`,
      );
    }
    const sealed = sealCorrectiveDryRunEvidence(result, auth, {
      executionTip: result.bundle_authority && result.bundle_authority.commit,
    });
    writeEvidenceFrameToStdout(sealed);
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
