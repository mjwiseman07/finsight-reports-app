import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const COMMIT = "c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6";
const EXPECTED_SEAL = "170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e";
const EXPECTED_BYTES = 1191852;
const REVIEWER = path.join(
  ROOT,
  "scripts/migration-remediation/review-executable-squash-candidate-sixth-source.js",
);
const REPORT_JSON = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-source-review-sixth-2026-09-07.json",
);
const REPORT_MD = path.join(
  ROOT,
  "docs/migration-remediation/executable-squash-candidate-source-review-sixth-2026-09-07.md",
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

describe("ESC sixth independent source review gates", () => {
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

  it("review harness reports PASS_SOURCE_REVIEW without mutating candidate seal", () => {
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
    expect(report.verdict).toBe("PASS_SOURCE_REVIEW");
    expect(report.candidateSqlAndManifestByteIdentical).toBe(true);
    expect(report.packageSealObserved).toBe(EXPECTED_SEAL);
    expect(report.findingCounts.P0).toBe(0);
    expect(report.usersSecurity.updatePolicyAbsent).toBe(true);
    expect(report.jeDispatchVerdicts).toHaveLength(4);
    expect(report.jeDispatchVerdicts.every((v: { netServiceRole: string }) => v.netServiceRole === "grant")).toBe(
      true,
    );
    expect(report.nextDocumentNumberVerdict.netServiceRole).toBe("grant");
    expect(report.spWriteAnchorBatchVerdict.netServiceRole).toBe("revoke");
    expect(report.schemaGaps.readyForLocalReplay).toBe(false);
    expect(report.schemaGaps.mandatoryFullPgDumpBeforeReplay).toBe(true);
    expect(report.retainedGrantReportDiff.ok).toBe(true);
  });

  it("human report states scoped PASS and dump requirement", () => {
    expect(fs.existsSync(REPORT_MD)).toBe(true);
    const text = fs.readFileSync(REPORT_MD, "utf8");
    expect(text).toContain("PASS_SOURCE_REVIEW");
    expect(text).toContain(EXPECTED_SEAL);
    expect(text).toContain("does **not** claim live production schema parity");
    expect(text).toContain("pg_dump --schema-only");
    expect(text).toContain("c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6");
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
