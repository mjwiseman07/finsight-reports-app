/**
 * Load repository-local env files for orchestrator CLIs.
 * Never logs values. Does not override existing process.env entries.
 */

"use strict";

const fs = require("fs");
const path = require("path");

function getRepoRoot() {
  return path.resolve(__dirname, "..", "..");
}

function parseEnvFile(text) {
  const out = {};
  for (const raw of String(text || "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Load `.env.local` then `.env` from repo root into process.env (fill-only).
 */
function loadOrchestratorEnv({ root = getRepoRoot() } = {}) {
  const files = [".env.local", ".env"];
  for (const name of files) {
    const filePath = path.join(root, name);
    if (!fs.existsSync(filePath)) continue;
    let text;
    try {
      text = fs.readFileSync(filePath, "utf8");
    } catch {
      continue;
    }
    const parsed = parseEnvFile(text);
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] == null || process.env[key] === "") {
        process.env[key] = value;
      }
    }
  }
}

module.exports = {
  parseEnvFile,
  loadOrchestratorEnv,
};
