#!/usr/bin/env node
"use strict";
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Assemble a standalone CommonJS bundle for the accounting-automation applicator.
 * Embeds core + constants + git-blob-authority. Does not publish apply pins.
 * Bundle SHA is measured after write; EXPECTED_STANDALONE_BUNDLE_SHA256 stays
 * PENDING (same contract as cutover / FRLS / containment applicators).
 */
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const {
  STANDALONE_BUNDLE_PATH,
  SELF_AUTHORITY_MODULES,
} = require("./ra-pro-accounting-automation-apply-constants");

const ROOT = path.resolve(__dirname, "../..");

const MODULES = [
  "scripts/security/git-blob-authority.js",
  "scripts/security/ra-pro-accounting-automation-apply-constants.js",
  "scripts/security/ra-pro-accounting-automation-apply-core.js",
];

function stripHeader(source) {
  return source
    .replace(/^[\s\S]*?"use strict";\s*/, "")
    .replace(/^\/\* eslint-disable[^*]*\*\/\s*/m, "");
}

function buildBody() {
  const parts = [];
  parts.push(`/** Auto-generated RA Pro accounting-automation applicator standalone bundle. */`);
  parts.push(`"use strict";`);
  parts.push(`const __bundle_fs = require("node:fs");`);
  parts.push(`const __bundle_path = require("node:path");`);
  parts.push(`const __bundle_crypto = require("node:crypto");`);
  parts.push(`const __bundle_child = require("node:child_process");`);
  parts.push(`const { Client } = require("pg");`);
  parts.push(`const module = { exports: {} };`);
  parts.push(`const exports = module.exports;`);

  let gitBlob = stripHeader(fs.readFileSync(path.join(ROOT, MODULES[0]), "utf8"));
  gitBlob = gitBlob
    .replace(/const \{ createHash \} = require\("node:crypto"\);/, "")
    .replace(/const \{ execFileSync \} = require\("node:child_process"\);/, "")
    .replace(/const path = require\("node:path"\);/, "const path = __bundle_path;")
    .replace(/createHash/g, "__bundle_crypto.createHash")
    .replace(/execFileSync/g, "__bundle_child.execFileSync");
  parts.push(`/* ---- git-blob-authority ---- */`);
  parts.push(gitBlob);
  parts.push(`const gitBlobAuthority = module.exports;`);
  parts.push(`module.exports = {};`);

  const constants = stripHeader(fs.readFileSync(path.join(ROOT, MODULES[1]), "utf8"));
  parts.push(`/* ---- constants ---- */`);
  parts.push(constants);
  parts.push(`const applyConstants = module.exports;`);
  parts.push(`module.exports = {};`);

  let core = stripHeader(fs.readFileSync(path.join(ROOT, MODULES[2]), "utf8"));
  core = core
    .replace(/const fs = require\("node:fs"\);/, "const fs = __bundle_fs;")
    .replace(/const path = require\("node:path"\);/, "const path = __bundle_path;")
    .replace(/const \{ Client \} = require\("pg"\);/, "")
    .replace(
      /const \{[\s\S]*?\} = require\("\.\/ra-pro-accounting-automation-apply-constants"\);/,
      "const {\n  ADVISORY_LOCK,\n  APPLY_AUTHORIZATION_TOKEN,\n  ARTIFACT_COMMIT,\n  DATABASE_URL_ENV,\n  EXPECTED_PROJECT_REF,\n  FEATURE_FLAG_ENV,\n  FORBIDDEN_DATABASE_URL_ENVS,\n  MIGRATIONS,\n  POST_HISTORY_COUNT,\n  PRIOR_HISTORY_COUNT,\n  TOOLING_AUTHORIZATION_PATH,\n} = applyConstants;",
    )
    .replace(
      /const \{[\s\S]*?\} = require\("\.\/git-blob-authority"\);/,
      "const {\n  loadAndVerifyGitBlob,\n  stripOuterBeginCommit,\n  assertNoDropCascade,\n  sha256Buffer,\n  ROOT,\n} = gitBlobAuthority;",
    );
  parts.push(`/* ---- apply-core ---- */`);
  parts.push(core);
  parts.push(`const applyCore = module.exports;`);
  parts.push(
    `module.exports = { ...applyConstants, ...applyCore, runApplicator: applyCore.runApplicator };`,
  );
  parts.push(`if (require.main === module) {`);
  parts.push(
    `  applyCore.runApplicator({ mode: process.argv.includes("--apply") ? "apply" : "dry-run", authorizationToken: process.env.RA_PRO_ACCOUNTING_AUTOMATION_APPLY_TOKEN, env: process.env }).then((r) => {`,
  );
  parts.push(`    process.stdout.write(JSON.stringify(r) + "\\n");`);
  parts.push(
    `    if (r.verdict !== "DRY_RUN_READY_FOR_SEPARATE_APPLY_AUTHORIZATION" && r.verdict !== "APPLY_COMMITTED") process.exitCode = 1;`,
  );
  parts.push(
    `  }).catch((err) => { process.stderr.write(JSON.stringify({ verdict: "BLOCKED", reason: String(err && err.message) }) + "\\n"); process.exitCode = 1; });`,
  );
  parts.push(`}`);
  return `${parts.join("\n")}\n`;
}

function main() {
  const outAbs = path.join(ROOT, STANDALONE_BUNDLE_PATH);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  const body = buildBody();
  fs.writeFileSync(outAbs, body);
  const buf = Buffer.from(body, "utf8");
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  const oid = execFileSync("git", ["hash-object", outAbs], {
    cwd: ROOT,
    encoding: "utf8",
  }).trim();
  const bytes = buf.length;
  process.stdout.write(
    `${JSON.stringify({
      verdict: "BUNDLE_ASSEMBLED",
      path: STANDALONE_BUNDLE_PATH,
      oid,
      sha256,
      bytes,
      modules: MODULES,
      self_authority_modules: SELF_AUTHORITY_MODULES,
      productionContact: false,
      applyAuthorized: false,
    })}\n`,
  );
}

main();
