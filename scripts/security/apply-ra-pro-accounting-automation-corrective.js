#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Operator CLI for RA Pro accounting-automation CORRECTIVE sealed applicator.
 * Default mode: dry-run. Apply requires explicit --apply and authorization token env.
 * Refuses when TOOLING_AUTHORIZATION production_apply_authorization is UNPUBLISHED.
 */
const {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
} = require("./ra-pro-accounting-automation-corrective-apply-constants");
const { runApplicator } = require("./ra-pro-accounting-automation-corrective-apply-core");

function readFlags(raw) {
  const flags = {
    apply: false,
    dryRun: false,
    unknown: false,
  };
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else flags.unknown = true;
  }
  return flags;
}

function writeBlocked(reason) {
  process.stdout.write(
    `${JSON.stringify({ blocked: reason, apply_authorized: false, verdict: "BLOCKED", reason })}\n`,
  );
  process.exitCode = 1;
}

async function main() {
  const flags = readFlags(process.argv.slice(2));
  if (flags.unknown) {
    writeBlocked("UNKNOWN_ARGV");
    return;
  }
  const apply = flags.apply;
  const dryRun = flags.dryRun || !apply;
  const result = await runApplicator({
    mode: apply && !dryRun ? "apply" : "dry-run",
    authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_CORRECTIVE_APPLY_TOKEN,
    env: process.env,
    argv: process.argv,
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
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
