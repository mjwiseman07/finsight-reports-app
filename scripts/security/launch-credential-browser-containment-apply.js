#!/usr/bin/env node
/**
 * Bootstrap launcher — verifies tip auth + freeze standalone bundle, then executes
 * only the materialized sealed bundle. No worktree node_modules resolution for the child.
 */
"use strict";

const { spawnSync, execFileSync } = require("node:child_process");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  extractEvidenceFrame,
  writeEvidenceFrameToStdout,
  buildWrapperFallback,
  normalizeApplicatorEvidence,
} = require("./containment-evidence-protocol");

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
  });
}

function loadBlob(commit, rel) {
  return git(["cat-file", "blob", `${commit}:${rel}`], { encoding: undefined });
}

function blobOid(commit, rel) {
  return String(git(["rev-parse", `${commit}:${rel}`], { encoding: "utf8" })).trim();
}

function canonicalAuthSealsDigest(auth) {
  const seals = {
    artifact_commit: auth.artifact_commit,
    project_ref: auth.project_ref,
    migration_path: auth.migration_path,
    migration_blob_oid: auth.migration_blob_oid,
    migration_sha256: auth.migration_sha256,
    migration_bytes: auth.migration_bytes,
    migration_version: auth.migration_version,
    migration_name: auth.migration_name,
    database_url_env: auth.database_url_env,
    apply_authorization_token: auth.apply_authorization_token,
    advisory_lock: auth.advisory_lock,
    pg_version: auth.standalone_bundle?.pg_version || "8.21.0",
    lockfile_path: auth.standalone_bundle?.lockfile_path || "package-lock.json",
  };
  return sha256(Buffer.from(JSON.stringify(seals), "utf8"));
}

function stop(reason, code, extra = {}) {
  const evidence = buildWrapperFallback({
    result_code: "SELF_AUTHORITY_BLOCKED",
    verdict: "SELF_AUTHORITY_BLOCKED",
    reason_code: code,
    error_code: code,
    phase: extra.phase || "launcher",
    error: String(reason).slice(0, 500),
    databaseConnectionAttempts: 0,
    sqlApplicationAttempts: 0,
    nodeProcessStarted: false,
    child_output_received: false,
    cleanup: extra.cleanup != null ? extra.cleanup : { completed: true },
    extra: {
      tip_head: extra.tipHead || null,
      tooling_freeze: extra.freeze || null,
      bundle_oid: extra.bundleOid || null,
      bundle_sha256: extra.bundleSha || null,
      database_connected: false,
    },
  });
  writeEvidenceFrameToStdout(evidence);
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
    if (a === "--evidence-tip") {
      out.evidenceTip = argv[++i];
      continue;
    }
    if (a === "--database-url" || a === "--databaseUrl" || a === "--db-url") {
      stop(
        `PROHIBITED_CREDENTIAL_CHANNEL: ${a} forbidden on launcher argv`,
        "PROHIBITED_CREDENTIAL_CHANNEL",
        { phase: "parse_args" },
      );
    }
    out.forward.push(a);
  }
  return out;
}

function assertNoDangerousNodeEnv() {
  if (process.env.NODE_PATH) {
    stop("NODE_PATH is set; refusing module-resolution substitution", "NODE_PATH_FORBIDDEN", {
      phase: "env_guard",
    });
  }
  const opts = process.env.NODE_OPTIONS || "";
  if (
    /(?:^|\s)(-r|--require|--import|--experimental-loader|--inspect(?:-brk)?|--inspect-port)\b/i.test(
      opts,
    )
  ) {
    stop("NODE_OPTIONS preload/loader/inspector flags forbidden", "NODE_OPTIONS_FORBIDDEN", {
      phase: "env_guard",
    });
  }
}

function cleanup(dir) {
  if (!dir) return { cleaned: true, missing: true };
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    return { cleaned: !fs.existsSync(dir), path_redacted: true };
  } catch (err) {
    return { cleaned: false, error: String(err.message || err).slice(0, 200) };
  }
}

function materializeBundle(freeze, bundleSpec) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "containment-apply-"));
  try {
    const oid = blobOid(freeze, bundleSpec.path);
    const buf = loadBlob(freeze, bundleSpec.path);
    if (!(buf instanceof Buffer)) throw new Error("non-buffer bundle blob");
    if (buf.includes(0x0d)) throw new Error("CR bytes in committed bundle blob");
    const digest = sha256(buf);
    if (oid !== bundleSpec.oid) {
      throw new Error(`bundle OID mismatch got ${oid} expected ${bundleSpec.oid}`);
    }
    if (digest !== bundleSpec.sha256) {
      throw new Error("bundle SHA-256 mismatch");
    }
    if (buf.length !== bundleSpec.bytes) {
      throw new Error(`bundle bytes mismatch got ${buf.length} expected ${bundleSpec.bytes}`);
    }
    const dest = path.join(dir, "applicator.standalone.cjs");
    fs.writeFileSync(dest, buf, { flag: "wx" });
    const st = fs.lstatSync(dest);
    if (st.isSymbolicLink()) {
      throw new Error("symlink materialized bundle refused");
    }
    // Refuse if anything else appears as a junction into the repo
    return { dir, entry: dest, oid, digest, bytes: buf.length };
  } catch (err) {
    cleanup(dir);
    throw err;
  }
}

function extractJsonEvidence(stdout) {
  // Legacy name retained for tests; delegates to V1 frame extractor.
  const r = extractEvidenceFrame(stdout);
  return r.ok ? r.evidence : null;
}

function main() {
  let tempDir = null;
  let cleanupResult = null;
  const onSignal = () => {
    cleanupResult = cleanup(tempDir);
    stop("interrupted", "LAUNCHER_INTERRUPTED", {
      phase: "signal",
      cleanup: cleanupResult,
    });
  };

  try {
    assertNoDangerousNodeEnv();
    const args = parseLauncherArgs(process.argv);

    const tipHead = String(git(["rev-parse", "HEAD"], { encoding: "utf8" })).trim();
    if (!args.prHead || !/^[0-9a-f]{40}$/i.test(args.prHead)) {
      stop(
        "MISSING_INPUT: --pr-head <full 40-char authorized freeze SHA> required",
        "MISSING_INPUT",
        { phase: "parse_args", tipHead },
      );
    }

    let auth;
    try {
      const authBuf = loadBlob(tipHead, AUTH_PATH);
      auth = JSON.parse(authBuf.toString("utf8"));
    } catch (err) {
      stop(`failed to load TOOLING_AUTHORIZATION.json from tip ${tipHead}: ${err.message}`, "AUTH_METADATA_LOAD_FAIL", {
        phase: "load_auth",
        tipHead,
      });
    }

    if (auth.authorized_pr_head !== args.prHead) {
      stop(
        `BLOCKED_PIN_MISMATCH: --pr-head ${args.prHead} != authorization.authorized_pr_head ${auth.authorized_pr_head}`,
        "BLOCKED_PIN_MISMATCH",
        { phase: "tip_freeze_relation", tipHead, freeze: auth.authorized_pr_head },
      );
    }

    const freeze = auth.authorized_pr_head;
    if (args.evidenceTip && args.evidenceTip === freeze) {
      stop(
        "BLOCKED_PIN_MISMATCH: --evidence-tip cannot equal tooling freeze",
        "BLOCKED_PIN_MISMATCH",
        { phase: "tip_freeze_relation", tipHead, freeze },
      );
    }
    const evidenceTip = args.evidenceTip || tipHead;
    if (evidenceTip === freeze) {
      // Allowed only if tip == freeze (freeze publication commit).
    }

    const bundleSpec = auth.standalone_bundle;
    if (!bundleSpec || !bundleSpec.path || !bundleSpec.oid || !bundleSpec.sha256 || !bundleSpec.bytes) {
      stop("TOOLING_AUTHORIZATION missing standalone_bundle seals", "AUTH_METADATA_INVALID", {
        phase: "load_auth",
        tipHead,
        freeze,
      });
    }

    // Verify source module seals at freeze (review authority; child does not load them)
    if (Array.isArray(auth.tooling_modules)) {
      for (const mod of auth.tooling_modules) {
        const oid = blobOid(freeze, mod.path);
        const buf = loadBlob(freeze, mod.path);
        const digest = sha256(buf);
        if (oid !== mod.oid || digest !== mod.sha256 || buf.length !== mod.bytes) {
          stop(`source module seal mismatch for ${mod.path}`, "SOURCE_MODULE_SEAL_MISMATCH", {
            phase: "verify_source_modules",
            tipHead,
            freeze,
          });
        }
      }
    }

    const authSealsDigest = canonicalAuthSealsDigest(auth);
    if (auth.auth_seals_digest && auth.auth_seals_digest !== authSealsDigest) {
      stop("auth_seals_digest mismatch vs tip authorization metadata", "AUTH_SEALS_DIGEST_MISMATCH", {
        phase: "verify_auth_digest",
        tipHead,
        freeze,
      });
    }

    process.on("SIGINT", onSignal);
    process.on("SIGTERM", onSignal);

    let materialized;
    try {
      materialized = materializeBundle(freeze, bundleSpec);
      tempDir = materialized.dir;
    } catch (err) {
      cleanupResult = cleanup(tempDir);
      stop(err.message || err, "SELF_AUTHORITY_MATERIALIZE_FAIL", {
        phase: "materialize_bundle",
        tipHead,
        freeze,
        cleanup: cleanupResult,
      });
    }

    const childEnv = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      TEMP: process.env.TEMP,
      TMP: process.env.TMP,
      USERPROFILE: process.env.USERPROFILE,
      HOME: process.env.HOME,
      LANG: process.env.LANG,
      CONTAINMENT_APPLY_DATABASE_URL: process.env.CONTAINMENT_APPLY_DATABASE_URL,
      CONTAINMENT_ATTESTED_FREEZE: freeze,
      CONTAINMENT_GIT_CWD: ROOT,
    };
    delete childEnv.NODE_PATH;
    delete childEnv.NODE_OPTIONS;
    delete childEnv.DATABASE_URL;

    const forward = [
      materialized.entry,
      "--pr-head",
      freeze,
      "--authorized-pr-head",
      freeze,
      "--evidence-tip",
      evidenceTip === freeze ? "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" : evidenceTip,
      "--auth-seals-digest",
      authSealsDigest,
      ...args.forward,
    ];
    // If tip==freeze, pass a synthetic non-equal evidence tip placeholder that is still valid 40-hex
    // only when needed — prefer omitting evidence tip when tip==freeze by not forcing placeholder.
    if (evidenceTip === freeze) {
      // remove the forced pair
      const et = forward.indexOf("--evidence-tip");
      if (et >= 0) forward.splice(et, 2);
    }

    const ensureFlag = (flag, value) => {
      if (!forward.includes(flag)) forward.push(flag, value);
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
        timeout: 120000,
      });
    } catch (err) {
      cleanupResult = cleanup(tempDir);
      tempDir = null;
      stop(`child spawn failed: ${err.message}`, "CHILD_SPAWN_FAIL", {
        phase: "child_spawn",
        tipHead,
        freeze,
        bundleOid: materialized.oid,
        bundleSha: materialized.digest,
        cleanup: cleanupResult,
      });
      return;
    }

    cleanupResult = cleanup(tempDir);
    tempDir = null;
    process.removeListener("SIGINT", onSignal);
    process.removeListener("SIGTERM", onSignal);

    const extracted = extractEvidenceFrame(result.stdout);
    if (result.error && result.error.code === "ETIMEDOUT") {
      writeEvidenceFrameToStdout(
        buildWrapperFallback({
          result_code: "SELF_AUTHORITY_BLOCKED",
          reason_code: "CHILD_TIMEOUT",
          phase: "child_execute",
          error: "child process timed out",
          nodeProcessStarted: true,
          child_output_received: Boolean(result.stdout || result.stderr),
          cleanup: cleanupResult,
          extra: {
            tip_head: tipHead,
            tooling_freeze: freeze,
            bundle_oid: materialized.oid,
            bundle_sha256: materialized.digest,
          },
        }),
      );
      process.exit(2);
    }

    if (!extracted.ok) {
      const scrubbed = String(result.stderr || "")
        .replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "postgres://***")
        .replace(/CONTAINMENT_APPLY_DATABASE_URL\s*[:=]\s*\S+/gi, "CONTAINMENT_APPLY_DATABASE_URL=***")
        .slice(0, 400);
      writeEvidenceFrameToStdout(
        buildWrapperFallback({
          result_code: "SELF_AUTHORITY_BLOCKED",
          reason_code: extracted.code || "APPLICATOR_EVIDENCE_MISSING",
          phase: extracted.phase || "child_execute",
          error: scrubbed || extracted.code || "child produced no valid evidence frame",
          nodeProcessStarted: true,
          child_output_received: Boolean(String(result.stdout || "").trim()),
          cleanup: cleanupResult,
          extra: {
            tip_head: tipHead,
            tooling_freeze: freeze,
            bundle_oid: materialized.oid,
            bundle_sha256: materialized.digest,
            child_exit_status: result.status,
            missing_or_invalid: extracted.missing_or_invalid || null,
          },
        }),
      );
      process.exit(2);
    }

    // Enrich with launcher metadata (non-secret); do not invent applicator counters
    const parsed = normalizeApplicatorEvidence({
      ...extracted.evidence,
      launcher: {
        tip_head: tipHead,
        tooling_freeze: freeze,
        bundle_oid: materialized.oid,
        bundle_sha256: materialized.digest,
        bundle_bytes: materialized.bytes,
        cleanup: cleanupResult,
        cwd_was_temp: true,
        node_path_set: false,
      },
    });

    writeEvidenceFrameToStdout(parsed);
    process.exit(result.status == null ? 1 : result.status);
  } catch (err) {
    cleanupResult = cleanup(tempDir);
    stop(err.message || err, "LAUNCHER_UNEXPECTED", {
      phase: "unexpected",
      cleanup: cleanupResult,
    });
  }
}

main();
