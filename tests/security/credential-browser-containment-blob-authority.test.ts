import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
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
    expect(loaded.oid).toBe(MIGRATION_BLOB_OID);
    expect(loaded.sha256).toBe(MIGRATION_SHA256);
    expect(loaded.bytes).toBe(MIGRATION_BYTES);
    assertUtf8LfNoBom(loaded.buffer);
    expect(loaded.buffer.includes(0x0d)).toBe(false);
  });

  it("rejects wrong SHA-256 with BLOCKED_PIN_MISMATCH before any SQL", async () => {
    expect(() =>
      loadAndVerifyGitBlob({
        commit: ARTIFACT_COMMIT,
        path: MIGRATION_PATH,
        expectedOid: MIGRATION_BLOB_OID,
        expectedSha256: "0".repeat(64),
        expectedBytes: MIGRATION_BYTES,
      }),
    ).toThrow(/BLOCKED_PIN_MISMATCH/);

    const evidence = await runApplicator({
      mode: "dry-run",
      projectRef: "jzmdgwwiestcmmeuhhkr",
      prHead: "c7a83dc5c727ffd1ce628221a790897569d747f6",
      artifactCommit: ARTIFACT_COMMIT,
      migrationPath: MIGRATION_PATH,
      migrationBlobOid: MIGRATION_BLOB_OID,
      migrationSha256: "0".repeat(64),
      migrationBytes: MIGRATION_BYTES,
      version: "20260908031736",
      name: "connection_credential_browser_containment",
      databaseUrl: "postgres://invalid:invalid@127.0.0.1:1/postgres",
    });
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.verdict).toMatch(/BLOCKED|DRY_RUN_BLOCKED/);
  });

  it("rejects wrong byte length and wrong blob OID with zero SQL attempts", async () => {
    const wrongBytes = await runApplicator({
      mode: "apply",
      applyAuthorized: true,
      projectRef: "jzmdgwwiestcmmeuhhkr",
      prHead: "c7a83dc5c727ffd1ce628221a790897569d747f6",
      artifactCommit: ARTIFACT_COMMIT,
      migrationPath: MIGRATION_PATH,
      migrationBlobOid: MIGRATION_BLOB_OID,
      migrationSha256: MIGRATION_SHA256,
      migrationBytes: 1,
      version: "20260908031736",
      name: "connection_credential_browser_containment",
      databaseUrl: "postgres://invalid:invalid@127.0.0.1:1/postgres",
    });
    expect(wrongBytes.sqlApplicationAttempts).toBe(0);

    const wrongOid = await runApplicator({
      mode: "dry-run",
      projectRef: "jzmdgwwiestcmmeuhhkr",
      prHead: "c7a83dc5c727ffd1ce628221a790897569d747f6",
      artifactCommit: ARTIFACT_COMMIT,
      migrationPath: MIGRATION_PATH,
      migrationBlobOid: "0".repeat(40),
      migrationSha256: MIGRATION_SHA256,
      migrationBytes: MIGRATION_BYTES,
      version: "20260908031736",
      name: "connection_credential_browser_containment",
      databaseUrl: "postgres://invalid:invalid@127.0.0.1:1/postgres",
    });
    expect(wrongOid.sqlApplicationAttempts).toBe(0);
  });

  it("rejects wrong project/version/name with zero SQL attempts", async () => {
    for (const overrides of [
      { projectRef: "wrong-project" },
      { version: "00000000000000" },
      { name: "wrong_name" },
      { artifactCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
    ]) {
      const evidence = await runApplicator({
        mode: "dry-run",
        projectRef: "jzmdgwwiestcmmeuhhkr",
        prHead: "c7a83dc5c727ffd1ce628221a790897569d747f6",
        artifactCommit: ARTIFACT_COMMIT,
        migrationPath: MIGRATION_PATH,
        migrationBlobOid: MIGRATION_BLOB_OID,
        migrationSha256: MIGRATION_SHA256,
        migrationBytes: MIGRATION_BYTES,
        version: "20260908031736",
        name: "connection_credential_browser_containment",
        databaseUrl: "postgres://invalid:invalid@127.0.0.1:1/postgres",
        ...overrides,
      });
      expect(evidence.sqlApplicationAttempts).toBe(0);
    }
  });

  it("treats CRLF worktree drift as irrelevant to git blob authority", () => {
    const blob = execFileSync("git", ["cat-file", "blob", `${ARTIFACT_COMMIT}:${MIGRATION_PATH}`], {
      cwd: ROOT,
    });
    const crlf = Buffer.from(blob.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
    expect(crlf.includes(0x0d)).toBe(true);
    expect(sha256Buffer(crlf)).not.toBe(MIGRATION_SHA256);
    // Authoritative load still matches LF blob
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

  it("strips exactly one outer BEGIN/COMMIT and preserves full file for history", () => {
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
    expect(inner.trimEnd().endsWith("COMMIT;")).toBe(false);
    expect(full.startsWith("--")).toBe(true);
    expect(full.includes("\nBEGIN;\n")).toBe(true);
    expect(full.trimEnd().endsWith("COMMIT;")).toBe(true);
    expect(createHash("sha256").update(full, "utf8").digest("hex")).toBe(MIGRATION_SHA256);
  });
});
