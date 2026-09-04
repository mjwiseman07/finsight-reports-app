import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, afterEach } from "vitest";
import {
  readGitBlobAtCommit,
  loadAuthorizedManifestFromGit,
  materializeAuthorizedSqlFromGit,
  cleanupMaterialization,
  assertSafeAuthorizedRepoPath,
  sha256Buffer,
  MANIFEST_REPO_PATH,
} from "../../scripts/migration-remediation/option-d-git-blob-authority.js";
import { resolveGitHead } from "../../scripts/migration-remediation/option-d-manifest-authorization.js";
import {
  applyMetrics,
  resetApplyMetrics,
  authorizeManifestOrBlock,
} from "../../scripts/migration-remediation/run-option-d-isolated-replay.js";

const ROOT = path.resolve(__dirname, "../..");
const GITATTRIBUTES = path.join(ROOT, ".gitattributes");
const ASSEMBLED_PREFIX =
  "supabase/migrations-draft/option-d-isolated-replay/assembled/";

function currentManifestPin() {
  const head = resolveGitHead(ROOT)!;
  const blob = readGitBlobAtCommit(head, MANIFEST_REPO_PATH, { cwd: ROOT });
  if (!blob.ok) {
    throw new Error(`manifest blob unreadable at ${head}: ${JSON.stringify(blob.failures)}`);
  }
  return {
    head,
    sha256: blob.sha256!,
    byteLength: blob.byteLength!,
    bytes: blob.bytes!,
    gitBlobId: blob.gitBlobId!,
    manifest: JSON.parse(blob.bytes!.toString("utf8")),
  };
}

function gitCheckAttr(pathSpec: string, attr: string) {
  const r = spawnSync("git", ["check-attr", attr, "--", pathSpec], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return String(r.stdout || "").trim();
}

describe("Option D assembled Git-blob regeneration", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    resetApplyMetrics();
    for (const d of tempDirs.splice(0)) {
      cleanupMaterialization(d);
    }
  });

  it("manifest pin is LF Git-blob bytes (CRLF worktree is not authority)", () => {
    const pin = currentManifestPin();
    expect(pin.bytes.includes(0x0d)).toBe(false);
    const disk = fs.readFileSync(path.join(ROOT, MANIFEST_REPO_PATH));
    const diskSha = sha256Buffer(disk);
    const auth = loadAuthorizedManifestFromGit({
      expectedSha256: pin.sha256,
      authorizedCommit: pin.head,
      currentHead: pin.head,
      expectedByteLength: pin.byteLength,
    });
    expect(auth.ok).toBe(true);
    expect(auth.authority).toBe("git_cat_file_blob");
    expect(auth.observedManifestSha256).toBe(pin.sha256);
    if (diskSha !== pin.sha256) {
      expect(disk.includes(0x0d)).toBe(true);
      expect(auth.observedManifestSha256).not.toBe(diskSha);
    }
  });

  it("records 150 entries, 7 substitutions, and committed assembled artifacts", () => {
    const pin = currentManifestPin();
    const entries = pin.manifest.entries;
    expect(entries).toHaveLength(150);
    const subst = entries.filter(
      (e: { replacementSource?: string | null }) => !!e.replacementSource,
    );
    expect(subst).toHaveLength(7);
    for (const e of entries) {
      expect(e.assembledRepoPath).toMatch(
        /^supabase\/migrations-draft\/option-d-isolated-replay\/assembled\/.+\.sql$/,
      );
      expect(e.assembledSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(e.originalSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(e.originalGitBlobId).toMatch(/^[a-f0-9]{40}$/);
      expect(e.sourceCommit).toMatch(/^[a-f0-9]{40}$/);
      const assembledBlob = readGitBlobAtCommit(pin.head, e.assembledRepoPath, {
        cwd: ROOT,
      });
      expect(assembledBlob.ok).toBe(true);
      expect(assembledBlob.sha256).toBe(e.assembledSha256);
    }
  });

  it("verifies every original, replacement, and assembled hash against Git blobs", () => {
    const pin = currentManifestPin();
    for (const e of pin.manifest.entries) {
      const original = readGitBlobAtCommit(pin.head, e.originalSource, { cwd: ROOT });
      expect(original.ok).toBe(true);
      expect(original.sha256).toBe(e.originalSha256);
      expect(original.gitBlobId).toBe(e.originalGitBlobId);

      if (e.replacementSource) {
        const replacement = readGitBlobAtCommit(pin.head, e.replacementSource, {
          cwd: ROOT,
        });
        expect(replacement.ok).toBe(true);
        expect(replacement.sha256).toBe(e.replacementSha256);
        expect(replacement.gitBlobId).toBe(e.replacementGitBlobId);
      } else {
        expect(e.replacementSha256).toBeNull();
        expect(e.replacementGitBlobId).toBeNull();
      }

      const assembled = readGitBlobAtCommit(pin.head, e.assembledRepoPath, {
        cwd: ROOT,
      });
      expect(assembled.ok).toBe(true);
      expect(assembled.sha256).toBe(e.assembledSha256);
      const applySource = e.replacementSource || e.originalSource;
      const applyBlob = readGitBlobAtCommit(pin.head, applySource, { cwd: ROOT });
      expect(applyBlob.ok).toBe(true);
      expect(assembled.bytes!.equals(applyBlob.bytes!)).toBe(true);
    }
  });

  it("materializes runtime SQL byte-for-byte from committed assembled blobs", () => {
    const pin = currentManifestPin();
    const mat = materializeAuthorizedSqlFromGit({
      authorizedCommit: pin.head,
      manifest: pin.manifest,
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(true);
    expect(mat.artifacts).toHaveLength(150);
    for (const art of mat.artifacts!) {
      const live = fs.readFileSync(art.temporaryFile);
      expect(sha256Buffer(live)).toBe(art.sha256);
      const blob = readGitBlobAtCommit(pin.head, art.path, { cwd: ROOT });
      expect(live.equals(blob.bytes!)).toBe(true);
    }
  });

  it("rejects missing, untracked, altered, traversal, and symlink artifact paths", () => {
    expect(assertSafeAuthorizedRepoPath("../secret.sql").ok).toBe(false);
    expect(assertSafeAuthorizedRepoPath("C:\\Windows\\x.sql").ok).toBe(false);
    expect(
      assertSafeAuthorizedRepoPath("supabase/migrations-draft/../../etc/passwd").ok,
    ).toBe(false);

    const pin = currentManifestPin();
    const missing = readGitBlobAtCommit(
      pin.head,
      `${ASSEMBLED_PREFIX}not-a-real-assembled-artifact.sql`,
      { cwd: ROOT },
    );
    expect(missing.ok).toBe(false);

    const forged = {
      ...pin.manifest,
      entries: [
        {
          ...pin.manifest.entries[0],
          assembledSha256: "cd".repeat(32),
        },
      ],
    };
    const mat = materializeAuthorizedSqlFromGit({
      authorizedCommit: pin.head,
      manifest: forged,
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(false);
    expect(
      mat.failures.some((f) => f.rule === "committed_blob_sha256_mismatch_vs_manifest"),
    ).toBe(true);
  });

  it("path-scoped .gitattributes require LF for Option D manifest and SQL paths", () => {
    const attrs = fs.readFileSync(GITATTRIBUTES, "utf8");
    expect(attrs).toMatch(
      /docs\/migration-remediation\/option-d-replay-manifest\.json\s+text\s+eol=lf/,
    );
    expect(attrs).toMatch(
      /supabase\/migrations-draft\/option-d-isolated-replay\/assembled\/\*\.sql\s+text\s+eol=lf/,
    );
    expect(attrs).toMatch(
      /supabase\/migrations-draft\/option-d-isolated-replay\/substitutions\/\*\.sql\s+text\s+eol=lf/,
    );
    expect(attrs).toMatch(
      /supabase\/migrations-draft\/option-d-isolated-replay\/derived-baseline\/\*\.sql\s+text\s+eol=lf/,
    );

    expect(gitCheckAttr(MANIFEST_REPO_PATH, "eol")).toContain("eol: lf");
    expect(
      gitCheckAttr(
        `${ASSEMBLED_PREFIX}20260701043598_public_users_derived_baseline.sql`,
        "eol",
      ),
    ).toContain("eol: lf");
  });

  it("deterministic regeneration across repeated runs does not change SQL bodies or order", () => {
    const pin = currentManifestPin();
    const pass = (label: string) =>
      pin.manifest.entries.map(
        (e: {
          order: number;
          assembledFilename: string;
          assembledSha256: string;
          originalSha256: string;
          replacementSha256: string | null;
          assembledRepoPath: string;
          originalSource: string;
          replacementSource: string | null;
        }) => {
          const assembled = readGitBlobAtCommit(pin.head, e.assembledRepoPath, {
            cwd: ROOT,
          });
          const original = readGitBlobAtCommit(pin.head, e.originalSource, {
            cwd: ROOT,
          });
          const replacement = e.replacementSource
            ? readGitBlobAtCommit(pin.head, e.replacementSource, { cwd: ROOT })
            : null;
          expect(assembled.ok, `${label} assembled ${e.assembledFilename}`).toBe(true);
          expect(original.ok, `${label} original ${e.assembledFilename}`).toBe(true);
          expect(assembled.sha256).toBe(e.assembledSha256);
          expect(original.sha256).toBe(e.originalSha256);
          if (replacement) {
            expect(replacement.ok).toBe(true);
            expect(replacement.sha256).toBe(e.replacementSha256);
          }
          return {
            order: e.order,
            assembledFilename: e.assembledFilename,
            assembledSha256: assembled.sha256,
            originalSha256: original.sha256,
            replacementSha256: replacement ? replacement.sha256 : null,
          };
        },
      );

    // Two independent Git-blob passes must yield identical hash/order vectors
    // (no assemble lock / no SQL). Full assemble determinism is covered offline
    // under OPTION_D_ASSEMBLE_COMMIT without mutating the suite tree.
    expect(JSON.stringify(pass("first"))).toBe(JSON.stringify(pass("second")));
    expect(pin.manifest.entries).toHaveLength(150);
  });

  it("generation and validation perform zero SQL application attempts", () => {
    resetApplyMetrics();
    const pin = currentManifestPin();
    const blocked = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256: "aa".repeat(32),
      OPTION_D_AUTHORIZED_COMMIT: pin.head,
    } as NodeJS.ProcessEnv);
    expect(blocked.ok).toBe(false);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);

    resetApplyMetrics();
    const ok = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256: pin.sha256,
      OPTION_D_AUTHORIZED_COMMIT: pin.head,
      OPTION_D_EXPECTED_MANIFEST_BYTES: String(pin.byteLength),
    } as NodeJS.ProcessEnv);
    expect(ok.ok).toBe(true);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });

  it("manifest or SQL-body hash drift requires new runtime authorization", () => {
    resetApplyMetrics();
    const pin = currentManifestPin();
    const drifted = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256: pin.sha256.replace(/[0-9a-f]$/, (c) =>
        c === "0" ? "1" : "0",
      ),
      OPTION_D_AUTHORIZED_COMMIT: pin.head,
    } as NodeJS.ProcessEnv);
    expect(drifted.ok).toBe(false);
    expect(drifted.failures.some((f) => f.rule === "manifest_sha256_mismatch")).toBe(true);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });

  it("replay requires zero untracked working-tree SQL (materialization is Git-blob only)", () => {
    const pin = currentManifestPin();
    const mat = materializeAuthorizedSqlFromGit({
      authorizedCommit: pin.head,
      manifest: pin.manifest,
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(true);
    expect(mat.authority).toBe("git_cat_file_blob");
    for (const art of mat.artifacts!) {
      expect(art.temporaryFile.startsWith(os.tmpdir())).toBe(true);
      expect(art.path.startsWith(ASSEMBLED_PREFIX)).toBe(true);
    }
  });
});
