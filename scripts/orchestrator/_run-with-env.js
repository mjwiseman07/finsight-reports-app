"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
const { loadEnvLocal } = require("./load-env-local");

loadEnvLocal();

const script = process.argv[2];
const args = process.argv.slice(3);
if (!script) {
  console.error("Usage: node _run-with-env.js <script> [args...]");
  process.exit(1);
}
const root = path.resolve(__dirname, "..", "..");
const abs = path.isAbsolute(script) ? script : path.join(root, script);
const result = spawnSync(process.execPath, [abs, ...args], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});
process.exit(result.status == null ? 1 : result.status);
