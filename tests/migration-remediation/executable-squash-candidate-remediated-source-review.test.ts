import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const COMMIT = "9b0c3b1a51e5674742c55b2d47aa0a1ecdaa3fc3";
const EXPECTED_SEAL = "99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf";
const EXPECTED_BYTES = 1130762;
const REVIEWER = path.join(
  ROOT,
  "scripts/migration-remediation/review-executable-squash-candidate-remediated-source.js",
);
const REPORT_JSON = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-source-review-remediated-2026-09-06.json",
);
const REPORT_MD = path.join(
  ROOT,
  "docs/migration-remediation/executable-squash-candidate-source-review-remediated-2026-09-06.md",
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

describe("remediated ESC independent source review gates", () => {
  it("recomputes seal from committed blobs at reviewed HEAD", () => {
    const manifest = JSON.parse(
      gitShow("supabase/migrations-draft/executable-squash-candidate/MANIFEST.json").toString("utf8"),
    );
    expect(manifest.entries).toHaveLength(7);
    const parts: string[] = [];
    let bytes = 0;
    for (const e of manifest.entries) {
      const buf = gitCatBlob(e.gitBlobId);
      expect(createHash("sha256").update(buf).digest("hex")).toBe(e.sha256);
      expect(buf.length).toBe(e.utf8LfBytes);
      parts.push(e.sha256);
      bytes += buf.length;
    }
    const seal = createHash("sha256").update(parts.join("\n"), "utf8").digest("hex");
    expect(seal).toBe(EXPECTED_SEAL);
    expect(bytes).toBe(EXPECTED_BYTES);
    expect(manifest.packageSha256OfConcatenatedEntryHashes).toBe(EXPECTED_SEAL);
  });

  it("review harness reports CHANGES REQUIRED without mutating candidate seal", () => {
    const before = gitShow("supabase/migrations-draft/executable-squash-candidate/MANIFEST.json");
    execFileSync(process.execPath, [REVIEWER], {
      cwd: ROOT,
      stdio: "pipe",
      env: { ...process.env, ESC_REVIEW_COMMIT: COMMIT },
    });
    const after = gitShow("supabase/migrations-draft/executable-squash-candidate/MANIFEST.json");
    expect(createHash("sha256").update(after).digest("hex")).toBe(
      createHash("sha256").update(before).digest("hex"),
    );
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.verdict).toBe("CHANGES REQUIRED");
    expect(report.candidateSqlAndManifestByteIdentical).toBe(true);
    expect(report.packageSealObserved).toBe(EXPECTED_SEAL);
    expect(report.findingCounts.P0).toBeGreaterThan(0);
    const codes = report.findings.map((f: { code: string }) => f.code);
    expect(codes).toContain("MODULE4_NOT_SINGLE_TRANSACTION");
  });

  it("151 accounting equation balances with zero missing/duplicate", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.sourceAccounting.optionDEntries).toBe(151);
    expect(report.sourceAccounting.counts.missing).toBe(0);
    expect(report.sourceAccounting.counts.duplicated).toBe(0);
    expect(report.sourceAccounting.equation).toContain("= 151");
    expect(report.sourceAccounting.digestQualifyOccurrences).toBe(1);
  });

  it("boundary matrix is all zeros for without-RLS", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    for (const row of report.failureBoundaryMatrix) {
      expect(row.unsafeCreatesInModuleCount).toBe(0);
      expect(row.cumulativeTablesWithoutRlsYet).toBe(0);
    }
  });

  it("human report exists and states CHANGES REQUIRED", () => {
    expect(fs.existsSync(REPORT_MD)).toBe(true);
    const text = fs.readFileSync(REPORT_MD, "utf8");
    expect(text).toContain("CHANGES REQUIRED");
    expect(text).toContain(EXPECTED_SEAL);
    expect(text).toContain("MODULE4_NOT_SINGLE_TRANSACTION");
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
