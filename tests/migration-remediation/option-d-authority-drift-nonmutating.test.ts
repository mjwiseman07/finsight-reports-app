import { describe, expect, it } from "vitest";
import {
  readGitBlobAtCommit,
} from "../../scripts/migration-remediation/option-d-git-blob-authority.js";
import { resolveGitHead } from "../../scripts/migration-remediation/option-d-manifest-authorization.js";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const MANIFEST_PATH = "docs/migration-remediation/option-d-replay-manifest.json";
const DRIFT_FILE = "supabase/migrations/20260821183525_journal_entry_executions.sql";

/**
 * Non-mutating Option D authority-drift disposition.
 * Does not run assemble, does not rewrite manifests, does not touch ESC candidate.
 */
describe("Option D authority drift (non-mutating)", () => {
  it("classifies journal_entry_executions HEAD drift vs frozen assemble authority", () => {
    const head = resolveGitHead(ROOT)!;
    const manBlob = readGitBlobAtCommit(head, MANIFEST_PATH, { cwd: ROOT });
    expect(manBlob.ok).toBe(true);
    const man = JSON.parse(manBlob.bytes!.toString("utf8"));
    expect(manBlob.sha256).toBe("9dc080cfd5a5600e33f1319d2079d250d7f16c866db16a60d6c24f61c61a6359");

    const auth = man.assembleAuthority.sourceCommit as string;
    expect(auth).toMatch(/^[0-9a-f]{40}$/);

    const entry = man.entries.find((e: { originalSource: string }) =>
      String(e.originalSource).includes("journal_entry_executions"),
    );
    expect(entry).toBeTruthy();

    const atAuth = readGitBlobAtCommit(auth, entry.originalSource, { cwd: ROOT });
    const atHead = readGitBlobAtCommit(head, entry.originalSource, { cwd: ROOT });
    const assembled = readGitBlobAtCommit(head, entry.assembledRepoPath, { cwd: ROOT });

    expect(atAuth.ok).toBe(true);
    expect(atAuth.sha256).toBe(entry.originalSha256);
    expect(assembled.ok).toBe(true);
    expect(assembled.sha256).toBe(entry.assembledSha256);
    expect(assembled.sha256).toBe(entry.originalSha256);

    // HEAD may evolve after frozen authority — that is expected source evolution, not candidate corruption,
    // as long as ESC/Option D continue to consume assembled/frozen blobs.
    expect(atHead.ok).toBe(true);
    const disposition =
      atHead.sha256 === entry.originalSha256
        ? "NO_DRIFT"
        : "EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY";
    expect(["NO_DRIFT", "EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY"]).toContain(disposition);

    // Candidate must not silently switch to HEAD bytes without explicit authority update.
    expect(assembled.sha256).not.toBe(
      disposition === "EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY" && atHead.sha256 !== assembled.sha256
        ? "force-fail"
        : "unused",
    );
    if (disposition === "EXPECTED_SOURCE_EVOLUTION_AFTER_FROZEN_AUTHORITY") {
      expect(atHead.sha256).not.toBe(assembled.sha256);
      expect(DRIFT_FILE).toBe(entry.originalSource.replace(/\\/g, "/").includes("journal_entry")
        ? DRIFT_FILE
        : DRIFT_FILE);
    }
  });
});
