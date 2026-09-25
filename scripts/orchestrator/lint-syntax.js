/**
 * Syntax-check all scripts/orchestrator/*.js via node --check.
 * Usage: node scripts/orchestrator/lint-syntax.js
 * Fail-closed. No network. No secrets.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const dir = __dirname;
const files = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith(".js"))
  .sort();

if (files.length === 0) {
  console.error("[orchestrator] ERROR: no .js files found in scripts/orchestrator");
  process.exit(1);
}

let failed = 0;
for (const name of files) {
  const filePath = path.join(dir, name);
  try {
    execFileSync(process.execPath, ["--check", filePath], { stdio: "pipe" });
    console.log(`OK  ${name}`);
  } catch (err) {
    failed += 1;
    const detail = err.stderr ? String(err.stderr) : err.message;
    console.error(`FAIL ${name}`);
    console.error(detail);
  }
}

if (failed > 0) {
  console.error(`[orchestrator] ERROR: syntax check failed for ${failed} file(s)`);
  process.exit(1);
}

console.log(`[orchestrator] OK: syntax check passed for ${files.length} file(s)`);
