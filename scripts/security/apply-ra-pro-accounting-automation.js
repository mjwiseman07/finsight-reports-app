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
const {
  preflightApplyAuthorization,
  recheckApplyAuthorizationPin,
} = require("./ra-pro-accounting-automation-apply-authorization");

function readFlags(raw) {
  const flags = {
    apply: false,
    dryRun: false,
    preflight: false,
    probe: false,
    recheck: false,
    applyMarker: "",
    publicationCommit: "",
    expectCommit: "",
    expectBlobOid: "",
    expectExecutable: "",
    expectBundleOid: "",
    authorizationPin: "",
    unknown: false,
  };
  for (let i = 0; i < raw.length; i += 1) {
    const arg = raw[i];
    const value = () => {
      const next = raw[i + 1] || "";
      i += 1;
      return next;
    };
    if (arg === "--apply") flags.apply = true;
    else if (arg === "--dry-run") flags.dryRun = true;
    else if (arg === "--preflight") flags.preflight = true;
    else if (arg === "--credential-free-probe") flags.probe = true;
    else if (arg === "--recheck") flags.recheck = true;
    else if (arg === "--apply-marker") flags.applyMarker = value();
    else if (arg === "--publication-commit") flags.publicationCommit = value();
    else if (arg === "--expect-commit") flags.expectCommit = value();
    else if (arg === "--expect-blob-oid") flags.expectBlobOid = value();
    else if (arg === "--expect-executable") flags.expectExecutable = value();
    else if (arg === "--expect-bundle-oid") flags.expectBundleOid = value();
    else if (arg === "--authorization-pin") flags.authorizationPin = value();
    else flags.unknown = true;
  }
  return flags;
}

function writeBlocked(reason) {
  process.stdout.write(`${JSON.stringify({ blocked: reason, apply_authorized: false, verdict: "BLOCKED", reason })}\n`);
  process.exitCode = 1;
}

async function main() {
  const flags = readFlags(process.argv.slice(2));
  if (flags.unknown) {
    writeBlocked("UNKNOWN_ARGV");
    return;
  }
  if (flags.preflight || flags.probe || flags.recheck || flags.publicationCommit) {
    if (flags.apply || flags.applyMarker || flags.authorizationPin) {
      writeBlocked("APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN");
      return;
    }
    const synthetic = process.env.RA_PRO_ACCOUNTING_AUTOMATION_CEREMONY_ALLOW_SYNTHETIC_URL === "1";
    if ((flags.probe || flags.publicationCommit) && !synthetic) {
      writeBlocked("APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN");
      return;
    }
    if (flags.publicationCommit && !flags.probe) {
      writeBlocked("APPLY_AUTHORIZATION_REF_OVERRIDE_FORBIDDEN");
      return;
    }
    let decision;
    try {
      if (flags.recheck) {
        decision = recheckApplyAuthorizationPin({
          cwd: process.cwd(),
          expectCommit: flags.expectCommit,
          expectBlobOid: flags.expectBlobOid,
          expectExecutable: flags.expectExecutable,
          expectBundleOid: flags.expectBundleOid,
        });
      } else {
        decision = preflightApplyAuthorization({
          cwd: process.cwd(),
          ...(flags.publicationCommit
            ? {
                allowDisposablePublicationCommit: true,
                publicationCommit: flags.publicationCommit,
              }
            : {}),
        });
      }
    } catch (err) {
      decision = {
        blocked: err.code || "APPLY_AUTHORIZATION_PREFLIGHT_FAILED",
        apply_authorized: false,
        publication_commit: flags.expectCommit || flags.publicationCommit || null,
        authorization_blob_oid: flags.expectBlobOid || null,
      };
    }
    process.stdout.write(`${JSON.stringify(decision)}\n`);
    if (decision.blocked) process.exitCode = 1;
    return;
  }
  const apply = flags.apply;
  const dryRun = flags.dryRun || !apply;
  if (flags.applyMarker && !apply) {
    writeBlocked("APPLY_MARKER_REQUIRES_APPLY");
    return;
  }
  if (apply && !/^[0-9a-f]{40}(?::[0-9a-f]{40}){3}$/.test(flags.authorizationPin)) {
    writeBlocked("APPLY_AUTHORIZATION_PIN_MISMATCH");
    return;
  }
  const result = await runApplicator({
    mode: apply && !dryRun ? "apply" : "dry-run",
    authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_APPLY_TOKEN,
    existingMarkerPath: flags.applyMarker || undefined,
    authorizationPin: flags.authorizationPin || undefined,
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
