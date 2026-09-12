import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadAndVerifyGitBlob,
  stripOuterBeginCommit,
  assertUtf8LfNoBom,
  sha256Buffer,
} from "../../scripts/security/git-blob-authority.js";
import {
  ARTIFACT_COMMIT,
  MIGRATION_PATH,
  MIGRATION_BLOB_OID,
  MIGRATION_SHA256,
  MIGRATION_BYTES,
  DATABASE_URL_ENV,
  TOOLING_AUTHORIZATION_PATH,
  SELF_AUTHORITY_MODULES,
} from "../../scripts/security/credential-browser-containment-constants.js";
import { runApplicator } from "../../scripts/security/credential-browser-containment-apply-core.js";

const ROOT = process.cwd();

describe("git-blob authority (containment)", () => {
  it("loads and verifies the sealed migration blob from the artifact commit", () => {
    const loaded = loadAndVerifyGitBlob({
      commit: ARTIFACT_COMMIT,
      path: MIGRATION_PATH,
      expectedOid: MIGRATION_BLOB_OID,
      expectedSha256: MIGRATION_SHA256,
      expectedBytes: MIGRATION_BYTES,
    });
    expect(loaded.source).toBe("git_blob");
    assertUtf8LfNoBom(loaded.buffer);
  });

  it("rejects wrong SHA-256 with zero SQL attempts before DB", async () => {
    const auth = JSON.parse(
      fs.readFileSync(
        "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
        "utf8",
      ),
    );
    const evidence = await runApplicator({
      mode: "dry-run",
      projectRef: "jzmdgwwiestcmmeuhhkr",
      prHead: "c".repeat(40),
      authorizedPrHead: "c".repeat(40),
      authSealsDigest: auth.auth_seals_digest,
      artifactCommit: ARTIFACT_COMMIT,
      migrationPath: MIGRATION_PATH,
      migrationBlobOid: MIGRATION_BLOB_OID,
      migrationSha256: "0".repeat(64),
      migrationBytes: MIGRATION_BYTES,
      version: "20260908031736",
      name: "connection_credential_browser_containment",
      env: {
        [DATABASE_URL_ENV]: "postgres://u:p@127.0.0.1:1/db",
        CONTAINMENT_ATTESTED_FREEZE: "c".repeat(40),
      },
    });
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.databaseConnectionAttempts).toBe(0);
  });

  it("treats CRLF worktree drift as irrelevant to git blob authority", () => {
    const blob = execFileSync("git", ["cat-file", "blob", `${ARTIFACT_COMMIT}:${MIGRATION_PATH}`], {
      cwd: ROOT,
    });
    const crlf = Buffer.from(blob.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
    expect(sha256Buffer(crlf)).not.toBe(MIGRATION_SHA256);
    const loaded = loadAndVerifyGitBlob({
      commit: ARTIFACT_COMMIT,
      path: MIGRATION_PATH,
      expectedSha256: MIGRATION_SHA256,
      expectedBytes: MIGRATION_BYTES,
      expectedOid: MIGRATION_BLOB_OID,
    });
    expect(loaded.sha256).toBe(MIGRATION_SHA256);
    expect(() => assertUtf8LfNoBom(crlf)).toThrow(/CR/);
  });

  it("strips exactly one outer BEGIN/COMMIT", () => {
    const loaded = loadAndVerifyGitBlob({
      commit: ARTIFACT_COMMIT,
      path: MIGRATION_PATH,
      expectedOid: MIGRATION_BLOB_OID,
      expectedSha256: MIGRATION_SHA256,
      expectedBytes: MIGRATION_BYTES,
    });
    const full = loaded.buffer.toString("utf8");
    const inner = stripOuterBeginCommit(full);
    expect(inner.startsWith("BEGIN;")).toBe(false);
    expect(createHash("sha256").update(full, "utf8").digest("hex")).toBe(MIGRATION_SHA256);
  });
});

describe("applicator CLI argv credential prohibition", () => {
  const { parseContainmentStdout } = require("./helpers/containment-evidence.js");

  it("rejects --database-url with zero SQL attempts", () => {
    const r = spawnSync(
      process.execPath,
      [
        "scripts/security/apply-credential-browser-containment.js",
        "--database-url",
        "postgres://u:p@127.0.0.1:1/db",
        "--mode",
        "dry-run",
      ],
      { cwd: ROOT, encoding: "utf8", windowsHide: true },
    );
    expect(r.status).not.toBe(0);
    const ev = parseContainmentStdout(r.stdout);
    expect(String(ev.error || ev.reason_code)).toMatch(/PROHIBITED_CREDENTIAL_CHANNEL/);
    expect(ev.sqlApplicationAttempts).toBe(0);
    expect(JSON.stringify(ev)).not.toMatch(/u:p@/);
  });

  it("rejects --skip-target2-check", () => {
    const r = spawnSync(
      process.execPath,
      ["scripts/security/apply-credential-browser-containment.js", "--skip-target2-check"],
      { cwd: ROOT, encoding: "utf8", windowsHide: true },
    );
    const ev = parseContainmentStdout(r.stdout);
    expect(String(ev.error || "")).toMatch(/skip-target2-check removed/);
  });

  it("rejects bare --apply", () => {
    const r = spawnSync(
      process.execPath,
      ["scripts/security/apply-credential-browser-containment.js", "--apply"],
      { cwd: ROOT, encoding: "utf8", windowsHide: true },
    );
    const ev = parseContainmentStdout(r.stdout);
    expect(String(ev.error || "")).toMatch(/bare --apply is prohibited/);
  });
});

describe("self-authority launcher", () => {
  const { parseContainmentStdout } = require("./helpers/containment-evidence.js");

  it("stops when --pr-head mismatches authorized freeze before DB", () => {
    const r = spawnSync(
      process.execPath,
      [
        "scripts/security/launch-credential-browser-containment-apply.js",
        "--pr-head",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "--mode",
        "dry-run",
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          [DATABASE_URL_ENV]: "postgres://u:p@127.0.0.1:1/db",
        },
      },
    );
    expect(r.status).toBe(2);
    const ev = parseContainmentStdout(r.stdout);
    expect(String(ev.verdict || ev.result_code)).toMatch(/SELF_AUTHORITY_BLOCKED|BLOCKED/);
    expect(String(ev.reason_code || ev.error_code || ev.error)).toMatch(/BLOCKED_PIN_MISMATCH/);
    expect(ev.sqlApplicationAttempts).toBe(0);
  });

  it("refuses NODE_PATH substitution", () => {
    const auth = JSON.parse(
      fs.readFileSync(
        "docs/security/connection-credential-browser-containment/TOOLING_AUTHORIZATION.json",
        "utf8",
      ),
    );
    const r = spawnSync(
      process.execPath,
      [
        "scripts/security/launch-credential-browser-containment-apply.js",
        "--pr-head",
        auth.authorized_pr_head,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        windowsHide: true,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          NODE_PATH: path.join(ROOT, "node_modules"),
          [DATABASE_URL_ENV]: "postgres://u:p@127.0.0.1:1/db",
        },
      },
    );
    const ev = parseContainmentStdout(r.stdout);
    expect(String(ev.error || ev.reason_code || "")).toMatch(/NODE_PATH/);
    expect(ev.sqlApplicationAttempts).toBe(0);
  });

  it("documents SELF_AUTHORITY_MODULES and tooling auth path constants", () => {
    expect(SELF_AUTHORITY_MODULES.length).toBeGreaterThanOrEqual(4);
    expect(TOOLING_AUTHORIZATION_PATH).toMatch(/TOOLING_AUTHORIZATION\.json$/);
  });
});
