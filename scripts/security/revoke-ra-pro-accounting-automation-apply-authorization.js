#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Explicit production-apply authorization revocation/retirement transition.
 * AUTHORIZED -> append immutable retirement -> UNPUBLISHED.
 * Not a silent reseal reset. Does not contact production.
 *
 * Usage:
 *   node scripts/security/revoke-ra-pro-accounting-automation-apply-authorization.js \
 *     --attempt-id <id> --publication <40hex> --executable <40hex> \
 *     --blob-oid <40hex> --blob-sha256 <64hex> --blob-bytes <int> \
 *     --terminal-reason <code> --retired-at-utc <ISO>
 */
const fs = require("node:fs");
const path = require("node:path");
const {
  revokeProductionApplyAuthorization,
} = require("./ra-pro-accounting-automation-apply-authorization");

const ROOT = path.resolve(__dirname, "../..");
const AUTH_PATH = path.join(
  ROOT,
  "docs/security/ra-pro-accounting-automation-apply/TOOLING_AUTHORIZATION.json",
);

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) throw new Error(`missing ${name}`);
  return argv[i + 1];
}

function main() {
  const argv = process.argv.slice(2);
  const retirement = {
    attempt_id: argValue(argv, "--attempt-id"),
    authorization_publication_commit: argValue(argv, "--publication"),
    authorized_executable_commit: argValue(argv, "--executable"),
    authorization_blob_oid: argValue(argv, "--blob-oid"),
    authorization_blob_sha256: argValue(argv, "--blob-sha256"),
    authorization_blob_bytes: Number(argValue(argv, "--blob-bytes")),
    terminal_reason: argValue(argv, "--terminal-reason"),
    retired_at_utc: argValue(argv, "--retired-at-utc"),
    prompt_opened: false,
    marker_created: false,
    node_db_client: 0,
    db_sql: 0,
    production_contact: false,
    note:
      "Consumed without marker at SYNTHETIC_URL_NOT_ALLOWED. Permanently non-reusable; absence of a marker does not restore the attempt.",
  };
  const auth = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
  const result = revokeProductionApplyAuthorization(auth, retirement);
  const note =
    "Consumed apply attempt apply-99e5f830789e-1dd9960c6f98a849c37da3ffe550f3e7 is permanently retired (SYNTHETIC_URL_NOT_ALLOWED; no marker; no production contact). Do not reuse.";
  if (!Array.isArray(result.auth.notes)) result.auth.notes = [];
  if (!result.auth.notes.includes(note)) result.auth.notes.push(note);
  const unpublishedNote =
    "Production apply authorization was revoked to UNPUBLISHED by an explicit retirement transition after the consumed attempt. Reseal did not silently clear AUTHORIZED.";
  if (!result.auth.notes.includes(unpublishedNote)) result.auth.notes.push(unpublishedNote);
  const text = `${JSON.stringify(result.auth, null, 2)}\n`;
  if (text.includes("\r")) throw new Error("CRLF forbidden");
  fs.writeFileSync(AUTH_PATH, text, "utf8");
  process.stdout.write(
    `${JSON.stringify({
      verdict: "APPLY_AUTHORIZATION_REVOKED",
      attempt_id: result.retirement.attempt_id,
      terminal_reason: result.retirement.terminal_reason,
      status: result.auth.production_apply_authorization.status,
      apply_authorized: result.auth.production_apply_authorization.apply_authorized,
      retirement_count: result.auth.production_apply_attempt_retirements.length,
      productionContact: false,
    })}\n`,
  );
}

main();
