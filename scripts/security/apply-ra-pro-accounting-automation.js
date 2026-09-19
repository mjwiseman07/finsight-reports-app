#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Operator CLI for RA Pro accounting-automation sealed applicator.
 * Default mode: dry-run. Apply requires explicit --apply and authorization token env.
 * Refuses when TOOLING_AUTHORIZATION pins are UNPUBLISHED.
 */
const {
  APPLY_AUTHORIZATION_TOKEN,
  DATABASE_URL_ENV,
} = require("./ra-pro-accounting-automation-apply-constants");
const { runApplicator } = require("./ra-pro-accounting-automation-apply-core");

async function main() {
  const raw = process.argv.slice(2);
  let applyMarker = "";
  const args = [];
  for (let i = 0; i < raw.length; i += 1) {
    if (raw[i] === "--apply-marker") {
      applyMarker = raw[i + 1] || "";
      i += 1;
      continue;
    }
    args.push(raw[i]);
  }
  const apply = args.includes("--apply");
  const dryRun = args.includes("--dry-run") || !apply;
  if (applyMarker && !apply) {
    process.stderr.write(
      `${JSON.stringify({ verdict: "BLOCKED", reason: "APPLY_MARKER_REQUIRES_APPLY" })}\n`,
    );
    process.exitCode = 1;
    return;
  }
  if (args.some((a) => a !== "--apply" && a !== "--dry-run")) {
    process.stderr.write(
      `${JSON.stringify({ verdict: "BLOCKED", reason: "UNKNOWN_ARGV" })}\n`,
    );
    process.exitCode = 1;
    return;
  }
  const result = await runApplicator({
    mode: apply && !dryRun ? "apply" : "dry-run",
    authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_APPLY_TOKEN,
    existingMarkerPath: applyMarker || undefined,
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
