#!/usr/bin/env node
/**
 * Disposable local rehearsal for Free Review lead-session applicator.
 * Requires Docker. Exits non-zero if Docker unavailable.
 */
"use strict";

const { spawnSync } = require("node:child_process");

function requireDocker() {
  const r = spawnSync("docker", ["version"], { encoding: "utf8", windowsHide: true });
  if (r.status !== 0) {
    console.error("Docker required for FRLS rehearsal");
    process.exit(2);
  }
}

function main() {
  requireDocker();
  const r = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    [
      "vitest",
      "run",
      "tests/security/free-review-lead-session-applicator.test.ts",
      "tests/security/free-review-lead-session-blob-authority.test.ts",
      "tests/security/free-review-lead-session-bootstrap-e2e.test.ts",
    ],
    { stdio: "inherit", shell: true, cwd: process.cwd() },
  );
  process.exit(r.status ?? 1);
}

main();
