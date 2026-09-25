"use strict";

/**
 * Load gitignored `.env.local` into process.env without overriding existing keys.
 * Never logs values. Safe to call multiple times.
 */

const fs = require("fs");
const path = require("path");
const { getRepoRoot } = require("./lib");

function loadEnvLocal({
  root = getRepoRoot(),
  env = process.env,
  filename = ".env.local",
} = {}) {
  const envPath = path.join(root, filename);
  if (!fs.existsSync(envPath)) {
    return { loaded: false, path: envPath, keys: [] };
  }
  const keys = [];
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    const key = m[1];
    if (env[key] == null || env[key] === "") {
      env[key] = v;
      keys.push(key);
    }
  }
  return { loaded: true, path: envPath, keys };
}

module.exports = { loadEnvLocal };
