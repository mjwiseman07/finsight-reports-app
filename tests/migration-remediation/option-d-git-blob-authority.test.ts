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

function currentManifestPin() {
  const head = resolveGitHead(ROOT)!;
  const blob = readGitBlobAtCommit(head, MANIFEST_REPO_PATH, { cwd: ROOT });
  if (!blob.ok) {
    throw new Error(`manifest blob unreadable: ${JSON.stringify(blob.failures)}`);
  }
  return {
    head,
    sha256: blob.sha256!,
    byteLength: blob.byteLength!,
    bytes: blob.bytes!,
  };
}

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
    const pin = currentManifestPin();
    expect(pin.bytes.includes(0x0d)).toBe(false);

    const disk = fs.readFileSync(path.join(ROOT, MANIFEST_REPO_PATH));
    const diskSha = sha256Buffer(disk);
    const auth = evaluateManifestAuthorization({
      expectedSha256: pin.sha256,
      authorizedCommit: pin.head,
      currentHead: pin.head,
      expectedByteLength: pin.byteLength,
    });
    expect(auth.ok).toBe(true);
    expect(auth.authority).toBe("git_cat_file_blob");
    expect(auth.observedManifestSha256).toBe(pin.sha256);
    if (diskSha !== pin.sha256) {
      expect(auth.observedManifestSha256).not.toBe(diskSha);
    }
  });

  it("worktree tampering does not affect authorization bytes", () => {
    const pin = currentManifestPin();
    const before = loadAuthorizedManifestFromGit({
      expectedSha256: pin.sha256,
      authorizedCommit: pin.head,
      currentHead: pin.head,
    });
    expect(before.ok).toBe(true);
    const tampered = Buffer.concat([
      before.manifestBytes!,
      Buffer.from("\n/* worktree-tamper */\n"),
    ]);
    expect(sha256Buffer(tampered)).not.toBe(pin.sha256);
    const after = loadAuthorizedManifestFromGit({
      expectedSha256: pin.sha256,
      authorizedCommit: pin.head,
      currentHead: pin.head,
    });
    expect(after.ok).toBe(true);
    expect(after.observedManifestSha256).toBe(pin.sha256);
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
    const pin = currentManifestPin();
    const result = evaluateManifestAuthorization({
      expectedSha256: pin.sha256,
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
    const pin = currentManifestPin();
    const loaded = loadAuthorizedManifestFromGit({
      expectedSha256: pin.sha256,
      authorizedCommit: pin.head,
      currentHead: pin.head,
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
      authorizedCommit: pin.head,
      manifest: forged,
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(false);
    expect(
      mat.failures.some((f) => f.rule === "committed_blob_sha256_mismatch_vs_manifest"),
    ).toBe(true);
  });

  it("PowerShell text conversion cannot become the authority", () => {
    const pin = currentManifestPin();
    const blob = gitBlob(pin.head, MANIFEST_REPO_PATH);
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
    const pin = currentManifestPin();
    const loaded = loadAuthorizedManifestFromGit({
      expectedSha256: pin.sha256,
      authorizedCommit: pin.head,
      currentHead: pin.head,
    });
    expect(loaded.ok).toBe(true);
    const mat = materializeAuthorizedSqlFromGit({
      authorizedCommit: pin.head,
      manifest: { ...loaded.manifest, entries: loaded.manifest.entries.slice(0, 1) },
    });
    if (mat.tempDir) tempDirs.push(mat.tempDir);
    expect(mat.ok).toBe(true);
    const art = mat.artifacts[0];
    expect(art.commit).toBe(pin.head);
    expect(art.gitBlobId).toMatch(/^[a-f0-9]{40}$/);
    expect(art.temporaryFileSha256).toBe(art.sha256);
    const live = fs.readFileSync(art.temporaryFile);
    expect(sha256Buffer(live)).toBe(art.sha256);
    const source = gitBlob(pin.head, art.path);
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
    const pin = currentManifestPin();
    const diskSha = sha256Buffer(fs.readFileSync(path.join(ROOT, MANIFEST_REPO_PATH)));
    const ok = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256: pin.sha256,
      OPTION_D_AUTHORIZED_COMMIT: pin.head,
      OPTION_D_EXPECTED_MANIFEST_BYTES: String(pin.byteLength),
    } as NodeJS.ProcessEnv);
    expect(ok.ok).toBe(true);
    expect(ok.observedManifestSha256).toBe(pin.sha256);
    if (diskSha !== pin.sha256) {
      expect(ok.observedManifestSha256).not.toBe(diskSha);
    }
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });
});
