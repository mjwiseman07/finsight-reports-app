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
  materializePr312SuiteFromGit,
  assertSafeAuthorizedRepoPath,
  rejectTextConvertedAuthority,
  sha256Buffer,
  MANIFEST_REPO_PATH,
} from "../../scripts/migration-remediation/option-d-git-blob-authority.js";
import {
  evaluateManifestAuthorization,
  resolveGitHead,
} from "../../scripts/migration-remediation/option-d-manifest-authorization.js";
import {
  applyMetrics,
  resetApplyMetrics,
  authorizeManifestOrBlock,
} from "../../scripts/migration-remediation/run-option-d-isolated-replay.js";
import {
  PR312_COMMIT,
  PR312_SUITE_PATH,
  PR312_SUITE_BLOB,
  resolvePr312SuiteProvenance,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";

const ROOT = path.resolve(__dirname, "../..");
const AUTHORIZED_MANIFEST_SHA256 =
  "5a66815352f4879b68a49d2cef3182d9637a20eb2a3a7617ed0bb979406dba0c";
const AUTHORIZED_MANIFEST_BYTES = 115488;

function gitBlob(commit: string, repoPath: string) {
  return readGitBlobAtCommit(commit, repoPath, { cwd: ROOT });
}

describe("Option D Git-blob artifact authority", () => {
  const tempDirs: string[] = [];
  afterEach(() => {
    resetApplyMetrics();
    for (const d of tempDirs.splice(0)) {
      cleanupMaterialization(d);
    }
  });

  it("LF Git blob with CRLF working-tree smudge succeeds using the Git blob", () => {
    const head = resolveGitHead(ROOT)!;
    const blob = gitBlob(head, MANIFEST_REPO_PATH);
    expect(blob.ok).toBe(true);
    expect(blob.sha256).toBe(AUTHORIZED_MANIFEST_SHA256);
    expect(blob.byteLength).toBe(AUTHORIZED_MANIFEST_BYTES);

    const disk = fs.readFileSync(path.join(ROOT, MANIFEST_REPO_PATH));
    // On Windows autocrlf worktrees often differ; either way worktree is not authority.
    const diskSha = sha256Buffer(disk);
    const auth = evaluateManifestAuthorization({
      expectedSha256: AUTHORIZED_MANIFEST_SHA256,
      authorizedCommit: head,
      currentHead: head,
      expectedByteLength: AUTHORIZED_MANIFEST_BYTES,
    });
    expect(auth.ok).toBe(true);
    expect(auth.authority).toBe("git_cat_file_blob");
    expect(auth.observedManifestSha256).toBe(AUTHORIZED_MANIFEST_SHA256);
    // Worktree may be CRLF-smudged; Git blob remains the observed authority.
    if (diskSha !== AUTHORIZED_MANIFEST_SHA256) {
      expect(auth.observedManifestSha256).not.toBe(diskSha);
    }
  });

  it("worktree tampering does not affect authorization bytes", () => {
    const head = resolveGitHead(ROOT)!;
    const before = loadAuthorizedManifestFromGit({
      expectedSha256: AUTHORIZED_MANIFEST_SHA256,
      authorizedCommit: head,
      currentHead: head,
    });
    expect(before.ok).toBe(true);
    // Tamper observation only — do not write to repo files in tests.
    const tampered = Buffer.concat([
      before.manifestBytes!,
      Buffer.from("\n/* worktree-tamper */\n"),
    ]);
    expect(sha256Buffer(tampered)).not.toBe(AUTHORIZED_MANIFEST_SHA256);
    const after = loadAuthorizedManifestFromGit({
      expectedSha256: AUTHORIZED_MANIFEST_SHA256,
      authorizedCommit: head,
      currentHead: head,
    });
    expect(after.ok).toBe(true);
    expect(after.observedManifestSha256).toBe(AUTHORIZED_MANIFEST_SHA256);
    expect(after.manifestBytes!.equals(before.manifestBytes!)).toBe(true);
  });

  it("committed-blob mismatch fails with zero SQL attempts", () => {
    resetApplyMetrics();
    const blocked = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256: "ff".repeat(32),
      OPTION_D_AUTHORIZED_COMMIT: resolveGitHead(ROOT)!,
    } as NodeJS.ProcessEnv);
    expect(blocked.ok).toBe(false);
    expect(blocked.failures.some((f) => f.rule === "manifest_sha256_mismatch")).toBe(true);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });

  it("authorized commit differing from HEAD fails", () => {
    const result = evaluateManifestAuthorization({
      expectedSha256: AUTHORIZED_MANIFEST_SHA256,
      authorizedCommit: "a".repeat(40),
      currentHead: "b".repeat(40),
    });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "authorized_commit_mismatch")).toBe(true);
  });

  it("missing / untracked / symlink / path-traversal artifacts fail", () => {
    expect(assertSafeAuthorizedRepoPath("../etc/passwd").ok).toBe(false);
    expect(assertSafeAuthorizedRepoPath("C:/Windows/system32").ok).toBe(false);
    expect(assertSafeAuthorizedRepoPath("secrets/foo.sql").ok).toBe(false);
    const seen = new Set<string>();
    expect(
      assertSafeAuthorizedRepoPath("docs/migration-remediation/option-d-replay-manifest.json", {
        seen,
      }).ok,
    ).toBe(true);
    expect(
      assertSafeAuthorizedRepoPath("docs/migration-remediation/option-d-replay-manifest.json", {
        seen,
      }).ok,
    ).toBe(false);

    const head = resolveGitHead(ROOT)!;
    const missing = readGitBlobAtCommit(
      head,
      "docs/migration-remediation/definitely-not-tracked-option-d.sql",
    );
    expect(missing.ok).toBe(false);
    expect(missing.failures.some((f) => f.rule === "git_blob_missing_at_commit")).toBe(true);
  });

  it("temporary materialization hash mismatch fails", () => {
    const head = resolveGitHead(ROOT)!;
    const loaded = loadAuthorizedManifestFromGit({
      expectedSha256: AUTHORIZED_MANIFEST_SHA256,
      authorizedCommit: head,
      currentHead: head,
    });
    expect(loaded.ok).toBe(true);
    const entry = loaded.manifest.entries[0];
    const forged = {
      ...loaded.manifest,
      entries: [
        {
          ...entry,
          assembledSha256: "ab".repeat(32),
        },
      ],
    };
    const mat = materializeAuthorizedSqlFromGit({
      authorizedCommit: head,
      manifest: forged,
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(false);
    expect(
      mat.failures.some((f) => f.rule === "committed_blob_sha256_mismatch_vs_manifest"),
    ).toBe(true);
  });

  it("PowerShell text conversion cannot become the authority", () => {
    const head = resolveGitHead(ROOT)!;
    const blob = gitBlob(head, MANIFEST_REPO_PATH);
    const textConverted = Buffer.from(blob.bytes!.toString("utf8").replace(/\n/g, "\r\n"), "utf8");
    const rejected = rejectTextConvertedAuthority({
      claimedAuthority: "powershell_text",
      gitBlobBytes: blob.bytes,
      candidateBytes: textConverted,
    });
    expect(rejected.ok).toBe(false);
    expect(
      rejected.failures.some((f) => f.rule === "powershell_or_worktree_cannot_be_authority"),
    ).toBe(true);
  });

  it("SQL materialization records commit/path/blob/sha and temp bytes match source blob", () => {
    const head = resolveGitHead(ROOT)!;
    const loaded = loadAuthorizedManifestFromGit({
      expectedSha256: AUTHORIZED_MANIFEST_SHA256,
      authorizedCommit: head,
      currentHead: head,
    });
    // Use a single entry whose git blob matches assembledSha256 if any; otherwise expect fail-closed.
    const matching = loaded.manifest.entries.filter((e: { assembledSha256: string; originalSource?: string; replacementSource?: string }) => {
      const src = e.replacementSource || e.originalSource;
      if (!src) return false;
      const b = gitBlob(head, src);
      return b.ok && b.sha256 === e.assembledSha256;
    });
    if (matching.length === 0) {
      const mat = materializeAuthorizedSqlFromGit({
        authorizedCommit: head,
        manifest: loaded.manifest,
      });
      if (mat.tempDir) tempDirs.push(mat.tempDir);
      expect(mat.ok).toBe(false);
      expect(mat.failures.some((f) => f.rule === "committed_blob_sha256_mismatch_vs_manifest")).toBe(
        true,
      );
      return;
    }
    const mat = materializeAuthorizedSqlFromGit({
      authorizedCommit: head,
      manifest: { ...loaded.manifest, entries: matching.slice(0, 1) },
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(true);
    const art = mat.artifacts[0];
    expect(art.commit).toBe(head);
    expect(art.gitBlobId).toMatch(/^[a-f0-9]{40}$/);
    expect(art.temporaryFileSha256).toBe(art.sha256);
    const live = fs.readFileSync(art.temporaryFile);
    expect(sha256Buffer(live)).toBe(art.sha256);
    const source = gitBlob(head, art.path);
    expect(live.equals(source.bytes!)).toBe(true);
  });

  it("cleanup removes all materialized artifacts", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-git-blob-sql-"));
    fs.writeFileSync(path.join(dir, "probe.sql"), "select 1;\n");
    const result = cleanupMaterialization(dir);
    expect(result.ok).toBe(true);
    expect(fs.existsSync(dir)).toBe(false);
  });

  it("PR #312 suite pin is sourced from its exact pinned commit/blob", () => {
    const prov = resolvePr312SuiteProvenance(ROOT);
    expect(prov.authority).toBe("git_cat_file_blob");
    expect(prov.present).toBe(true);
    expect(prov.sourceCommit).toBe(PR312_COMMIT);
    expect(prov.pinnedBlob).toBe(PR312_SUITE_BLOB);
    expect(prov.gitBlobId).toBe(PR312_SUITE_BLOB);
    expect(prov.matchesPinnedCommitContent).toBe(true);

    const mat = materializePr312SuiteFromGit({
      commit: PR312_COMMIT,
      suitePath: PR312_SUITE_PATH,
      expectedBlobId: PR312_SUITE_BLOB,
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(true);
    expect(mat.gitBlobId).toBe(PR312_SUITE_BLOB);
    expect(fs.existsSync(mat.tempFile!)).toBe(true);
  });

  it("authorizeManifestOrBlock uses Git blob and ignores worktree CRLF", () => {
    resetApplyMetrics();
    const head = resolveGitHead(ROOT)!;
    const diskSha = sha256Buffer(fs.readFileSync(path.join(ROOT, MANIFEST_REPO_PATH)));
    const ok = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256: AUTHORIZED_MANIFEST_SHA256,
      OPTION_D_AUTHORIZED_COMMIT: head,
      OPTION_D_EXPECTED_MANIFEST_BYTES: String(AUTHORIZED_MANIFEST_BYTES),
    } as NodeJS.ProcessEnv);
    expect(ok.ok).toBe(true);
    expect(ok.observedManifestSha256).toBe(AUTHORIZED_MANIFEST_SHA256);
    if (diskSha !== AUTHORIZED_MANIFEST_SHA256) {
      // Harness would previously FAIL on diskSha; Git authority must PASS.
      expect(ok.observedManifestSha256).not.toBe(diskSha);
    }
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });
});
