import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
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
  ATTESTED_FREEZE_ENV,
} from "../../scripts/security/free-review-lead-session-apply-constants.js";
import { runApplicator } from "../../scripts/security/free-review-lead-session-apply-core.js";

const ROOT = process.cwd();

describe("git-blob authority (FRLS)", () => {
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
    expect(loaded.oid).toBe(MIGRATION_BLOB_OID);
  });

  it("matches git cat-file blob OID at ARTIFACT_COMMIT", () => {
    const oid = execFileSync(
      "git",
      ["rev-parse", `${ARTIFACT_COMMIT}:${MIGRATION_PATH}`],
      { cwd: ROOT, encoding: "utf8" },
    ).trim();
    expect(oid).toBe(MIGRATION_BLOB_OID);
    const blob = execFileSync("git", ["cat-file", "blob", oid], { cwd: ROOT });
    expect(createHash("sha256").update(blob).digest("hex")).toBe(MIGRATION_SHA256);
    expect(blob.length).toBe(MIGRATION_BYTES);
  });

  it("rejects wrong SHA-256 with zero SQL attempts before DB", async () => {
    const evidence = await runApplicator({
      mode: "dry-run",
      projectRef: "jzmdgwwiestcmmeuhhkr",
      prHead: ARTIFACT_COMMIT,
      authorizedPrHead: ARTIFACT_COMMIT,
      artifactCommit: ARTIFACT_COMMIT,
      migrationPath: MIGRATION_PATH,
      migrationBlobOid: MIGRATION_BLOB_OID,
      migrationSha256: "0".repeat(64),
      migrationBytes: MIGRATION_BYTES,
      version: "20260913235500",
      name: "free_review_lead_sessions",
      env: {
        [DATABASE_URL_ENV]: "postgres://u:p@127.0.0.1:1/db",
        [ATTESTED_FREEZE_ENV]: ARTIFACT_COMMIT,
      },
    });
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.databaseConnectionAttempts).toBe(0);
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
    expect(sha256Buffer(Buffer.from(full, "utf8"))).toBe(MIGRATION_SHA256);
  });
});
