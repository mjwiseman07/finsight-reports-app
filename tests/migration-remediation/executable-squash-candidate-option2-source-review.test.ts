import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const COMMIT = "4888756224129abcdc1729fc772a1300dc1ba074";
const EXPECTED_SEAL = "74d3b7498f4f2327b15c4ea8631c1b0c40b1daf795675f0517a5fb7052f3d3ff";
const EXPECTED_BYTES = 1139927;
const REVIEWER = path.join(
  ROOT,
  "scripts/migration-remediation/review-executable-squash-candidate-option2-source.js",
);
const REPORT_JSON = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-source-review-option2-2026-09-06.json",
);
const REPORT_MD = path.join(
  ROOT,
  "docs/migration-remediation/executable-squash-candidate-source-review-option2-2026-09-06.md",
);

function gitShow(revPath: string) {
  return execFileSync("git", ["show", `${COMMIT}:${revPath}`], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function gitCatBlob(blobId: string) {
  return execFileSync("git", ["cat-file", "blob", blobId], {
    cwd: ROOT,
    maxBuffer: 64 * 1024 * 1024,
  });
}

describe("ESC Option-2 third independent source review gates", () => {
  it("recomputes seal from committed blobs at reviewed HEAD", () => {
    const manifest = JSON.parse(
      gitShow("supabase/migrations-draft/executable-squash-candidate/MANIFEST.json").toString("utf8"),
    );
    expect(manifest.entries).toHaveLength(12);
    const parts: string[] = [];
    let bytes = 0;
    for (const e of manifest.entries) {
      const buf = gitCatBlob(e.gitBlobId);
      expect(createHash("sha256").update(buf).digest("hex")).toBe(e.sha256);
      expect(buf.length).toBe(e.utf8LfBytes);
      parts.push(e.sha256);
      bytes += buf.length;
    }
    expect(createHash("sha256").update(parts.join("\n"), "utf8").digest("hex")).toBe(EXPECTED_SEAL);
    expect(bytes).toBe(EXPECTED_BYTES);
  });

  it("review harness reports CHANGES REQUIRED without mutating candidate seal", () => {
    const before = createHash("sha256")
      .update(gitShow("supabase/migrations-draft/executable-squash-candidate/MANIFEST.json"))
      .digest("hex");
    execFileSync(process.execPath, [REVIEWER], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, ESC_REVIEW_COMMIT: COMMIT },
    });
    const after = createHash("sha256")
      .update(gitShow("supabase/migrations-draft/executable-squash-candidate/MANIFEST.json"))
      .digest("hex");
    expect(after).toBe(before);
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.verdict).toBe("CHANGES REQUIRED");
    expect(report.candidateSqlAndManifestByteIdentical).toBe(true);
    expect(report.packageSealObserved).toBe(EXPECTED_SEAL);
    const codes = report.findings.map((f: { code: string }) => f.code);
    expect(codes).toContain("FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT");
  });

  it("151 accounting and digest uniqueness hold", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.sourceAccounting.equation).toContain("= 151");
    expect(report.sourceAccounting.counts.missing).toBe(0);
    expect(report.sourceAccounting.digestQualifyOccurrences).toBe(1);
    expect(report.sourceAccounting.odAssembledBeginMarkersInAppSecuritySplits).toBe(138);
  });

  it("transactional slices are balanced 1/1", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    for (const h of report.hashResults) {
      if (!/slice_|security_rls_grants_hardening_atomic|phase1_subscriptions_rls_atomic/.test(h.name)) continue;
      expect(h.txn.BEGIN).toBe(1);
      expect(h.txn.COMMIT).toBe(1);
      expect(h.txn.intermediateCommitCount).toBe(0);
    }
  });

  it("human report states CHANGES REQUIRED", () => {
    expect(fs.existsSync(REPORT_MD)).toBe(true);
    const text = fs.readFileSync(REPORT_MD, "utf8");
    expect(text).toContain("CHANGES REQUIRED");
    expect(text).toContain(EXPECTED_SEAL);
    expect(text).toContain("FUNCTION_PUBLIC_EXECUTE_UNREVOKED_AT_COMMIT");
    expect(text).toContain("engagement_posting_policy");
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
