#!/usr/bin/env node
/**
 * Bootstrap launcher (worktree-safe only for verification).
 *
 * Before any DB connection:
 * 1) equality-check authorized PR HEAD
 * 2) load tooling modules from exact git blobs at that HEAD
 * 3) verify OID/SHA-256/bytes against TOOLING_AUTHORIZATION.json
 * 4) materialize LF bytes into a fresh temp directory
 * 5) spawn only the materialized applicator with a controlled env
 * 6) reject NODE_PATH / NODE_OPTIONS preload / symlink substitution
 * 7) clean temp on success/failure/interrupt
 *
 * Does NOT perform authoritative apply logic itself after verification.
 */
"use strict";

const { spawnSync, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../..");
const AUTH_PATH =
  "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json";

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function git(args, opts = {}) {
  return execFileSync("git", args, {
    cwd: opts.cwd || ROOT,
    encoding: opts.encoding,
    stdio: opts.stdio,
  });
}

function loadBlob(commit, rel) {
  return git(["cat-file", "blob", `${commit}:${rel}`], { encoding: undefined });
}

function blobOid(commit, rel) {
  return String(git(["rev-parse", `${commit}:${rel}`], { encoding: "utf8" })).trim();
}

function stop(reason, code = "SELF_AUTHORITY_BLOCKED") {
  const evidence = {
    verdict: "SELF_AUTHORITY_BLOCKED",
    error_code: code,
    error: String(reason).slice(0, 500),
    sqlApplicationAttempts: 0,
    advisory_lock_acquired: false,
    database_connected: false,
  };
  process.stdout.write(`${JSON.stringify(evidence, null, 2)}\n`);
  process.exit(2);
}

function parseLauncherArgs(argv) {
  const out = { forward: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--pr-head") {
      out.prHead = argv[++i];
      continue;
    }
    if (a === "--database-url" || a === "--databaseUrl" || a === "--db-url") {
      stop(
        `PROHIBITED_CREDENTIAL_CHANNEL: ${a} forbidden on launcher argv`,
        "PROHIBITED_CREDENTIAL_CHANNEL",
      );
    }
    out.forward.push(a);
  }
  return out;
}

function assertNoDangerousNodeEnv() {
  if (process.env.NODE_PATH) {
    stop("NODE_PATH is set; refusing module-resolution substitution", "NODE_PATH_FORBIDDEN");
  }
  const opts = process.env.NODE_OPTIONS || "";
  if (/(?:^|\s)(-r|--require|--import|--experimental-loader)\b/i.test(opts)) {
    stop("NODE_OPTIONS preload/loader flags forbidden", "NODE_OPTIONS_FORBIDDEN");
  }
}

function materializeModules(commit, modules) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "containment-apply-"));
  const written = [];
  try {
    for (const mod of modules) {
      const oid = blobOid(commit, mod.path);
      const buf = loadBlob(commit, mod.path);
      if (!(buf instanceof Buffer)) {
        throw new Error(`non-buffer blob for ${mod.path}`);
      }
      if (buf.includes(0x0d)) {
        throw new Error(`CR bytes in committed blob ${mod.path}`);
      }
      const digest = sha256(buf);
      if (oid !== mod.oid) {
        throw new Error(`OID mismatch ${mod.path}: got ${oid} expected ${mod.oid}`);
      }
      if (digest !== mod.sha256) {
        throw new Error(`SHA-256 mismatch ${mod.path}`);
      }
      if (buf.length !== mod.bytes) {
        throw new Error(`byte length mismatch ${mod.path}`);
      }
      const dest = path.join(dir, mod.path);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      // Refuse if dest somehow exists as symlink
      fs.writeFileSync(dest, buf, { flag: "wx" });
      const st = fs.lstatSync(dest);
      if (st.isSymbolicLink()) {
        throw new Error(`symlink materialized path refused: ${mod.path}`);
      }
      written.push(dest);
    }
    return dir;
  } catch (err) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      // ignore
    }
    throw err;
  }
}

function cleanup(dir) {
  if (!dir) return;
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

function main() {
  assertNoDangerousNodeEnv();

  let args;
  try {
    args = parseLauncherArgs(process.argv);
  } catch (err) {
    stop(err.message || err);
    return;
  }

  const tipHead = String(git(["rev-parse", "HEAD"], { encoding: "utf8" })).trim();
  if (!args.prHead || !/^[0-9a-f]{40}$/i.test(args.prHead)) {
    stop("MISSING_INPUT: --pr-head <full 40-char authorized freeze SHA> required", "MISSING_INPUT");
  }

  let auth;
  try {
    // Authorization metadata is read from the current tip so seal publication commits can update the pin.
    const authBuf = loadBlob(tipHead, AUTH_PATH);
    auth = JSON.parse(authBuf.toString("utf8"));
  } catch (err) {
    stop(`failed to load TOOLING_AUTHORIZATION.json from HEAD ${tipHead}: ${err.message}`);
    return;
  }

  if (auth.authorized_pr_head !== args.prHead) {
    stop(
      `BLOCKED_PIN_MISMATCH: --pr-head ${args.prHead} != authorization.authorized_pr_head ${auth.authorized_pr_head}`,
      "BLOCKED_PIN_MISMATCH",
    );
  }

  if (!Array.isArray(auth.tooling_modules) || auth.tooling_modules.length < 4) {
    stop("TOOLING_AUTHORIZATION missing tooling_modules", "AUTH_METADATA_INVALID");
  }

  // Materialize authoritative modules from the freeze commit (not mutable tip worktree).
  const freeze = auth.authorized_pr_head;

  let tempDir;
  const onSignal = () => {
    cleanup(tempDir);
    process.exit(130);
  };
  process.on("SIGINT", onSignal);
  process.on("SIGTERM", onSignal);

  try {
    tempDir = materializeModules(freeze, auth.tooling_modules);
  } catch (err) {
    stop(err.message || err, "SELF_AUTHORITY_MATERIALIZE_FAIL");
    return;
  }

  const entry = path.join(tempDir, "scripts/security/apply-credential-browser-containment.js");
  if (!fs.existsSync(entry) || fs.lstatSync(entry).isSymbolicLink()) {
    cleanup(tempDir);
    stop("materialized entry missing or symlink", "SELF_AUTHORITY_ENTRY_INVALID");
    return;
  }

  // Controlled child env: pass through CONTAINMENT_APPLY_DATABASE_URL only among secrets.
  const childEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,
    USERPROFILE: process.env.USERPROFILE,
    HOME: process.env.HOME,
    LANG: process.env.LANG,
    // Required credential channel (session-only; never logged by launcher)
    CONTAINMENT_APPLY_DATABASE_URL: process.env.CONTAINMENT_APPLY_DATABASE_URL,
  };
  // Explicitly do NOT pass NODE_PATH, NODE_OPTIONS, DATABASE_URL
  delete childEnv.NODE_PATH;
  delete childEnv.NODE_OPTIONS;
  delete childEnv.DATABASE_URL;

  const forward = [
    entry,
    "--pr-head",
    freeze,
    "--authorized-pr-head",
    freeze,
    ...args.forward,
  ];

  // Ensure migration pins are present if caller omitted (still must match auth / constants)
  const ensureFlag = (flag, value) => {
    if (!forward.includes(flag)) {
      forward.push(flag, value);
    }
  };
  ensureFlag("--project-ref", auth.project_ref);
  ensureFlag("--artifact-commit", auth.artifact_commit);
  ensureFlag("--migration-path", auth.migration_path);
  ensureFlag("--migration-blob-oid", auth.migration_blob_oid);
  ensureFlag("--migration-sha256", auth.migration_sha256);
  ensureFlag("--migration-bytes", String(auth.migration_bytes));
  ensureFlag("--version", auth.migration_version);
  ensureFlag("--name", auth.migration_name);

  let result;
  try {
    result = spawnSync(process.execPath, forward, {
      cwd: tempDir,
      env: childEnv,
      encoding: "utf8",
      windowsHide: true,
    });
  } finally {
    cleanup(tempDir);
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);
  }

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) {
    // Never echo secrets; stderr may contain driver noise — print sanitized length only if needed
    const scrubbed = String(result.stderr)
      .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgres://***")
      .replace(/CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*\S+/gi, "CONTAINMENT_APPLY_DATABASE_URL=***");
    if (scrubbed.trim()) process.stderr.write(scrubbed);
  }
  process.exit(result.status == null ? 1 : result.status);
}

main();
