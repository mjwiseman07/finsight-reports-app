import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const COMMIT = "524ada4933c7d326e79cf69cb69bb88aed7a5c08";
const EXPECTED_SEAL = "ae85b00270d3b89f6e8f57cb6851dec19aba2b860dd0de89126bc93643555d28";
const REVIEWER = path.join(ROOT, "scripts/migration-remediation/review-executable-squash-candidate-source.js");
const REPORT = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-source-review-2026-09-06.md",
);
const REPORT_JSON = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-source-review-2026-09-06.json",
);

function gitShow(revPath: string) {
  return execFileSync("git", ["show", `${COMMIT}:${revPath}`], {
    cwd: ROOT,
    maxBuffer: 32 * 1024 * 1024,
  });
}

function gitCatBlob(blobId: string) {
  return execFileSync("git", ["cat-file", "blob", blobId], {
    cwd: ROOT,
    maxBuffer: 32 * 1024 * 1024,
  });
}

describe("executable squash candidate independent source review gates", () => {
  it("recomputes seal from committed blobs and matches pinned seal", () => {
    const manifest = JSON.parse(
      gitShow("supabase/migrations-draft/executable-squash-candidate/MANIFEST.json").toString("utf8"),
    );
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
    expect(bytes).toBe(1132090);
  });

  it("review harness reports CHANGES REQUIRED without mutating candidate seal", () => {
    execFileSync(process.execPath, [REVIEWER], { cwd: ROOT, stdio: "pipe" });
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.verdict).toBe("CHANGES REQUIRED");
    expect(report.candidateSqlAndManifestByteIdentical).toBe(true);
    expect(report.packageSealObserved).toBe(EXPECTED_SEAL);
    expect(report.findingCounts.P0).toBeGreaterThan(0);
  });

  it("fails closed on module4/5 RLS boundary and final missing RLS", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    const codes = report.findings.map((f: { code: string }) => f.code);
    expect(codes).toContain("MODULE4_TABLES_WITHOUT_RLS_BEFORE_MODULE5");
    expect(codes).toContain("FINAL_PACKAGE_TABLES_WITHOUT_RLS");
    expect(codes).toContain("SOURCE_DUPLICATED_ACROSS_MODULES");
  });

  it("fails closed if incomplete comparison is labeled complete", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.schemaGaps.mandatoryFullPgDumpBeforeReplay).toBe(true);
    expect(report.schemaGaps.packageClaimsCompleteProdMatch).toBe(false);
  });

  it("human review report exists and states CHANGES REQUIRED", () => {
    // report md may live beside evidence or under docs root
    const candidates = [
      REPORT,
      path.join(ROOT, "docs/migration-remediation/executable-squash-candidate-source-review-2026-09-06.md"),
    ];
    const hit = candidates.find((p) => fs.existsSync(p));
    expect(hit).toBeTruthy();
    const text = fs.readFileSync(hit!, "utf8");
    expect(text).toContain("CHANGES REQUIRED");
    expect(text).toContain(EXPECTED_SEAL);
    expect(text).toContain("byte-identical");
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
