import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const COMMIT = "d558c39b4a42540f9c485b30c6b9f0972b4ac500";
const EXPECTED_SEAL = "c5c360d8325e2cbfa474d97ea0d33e0f2449ab89820770146def8c4c13da5a37";
const EXPECTED_BYTES = 1190718;
const REVIEWER = path.join(
  ROOT,
  "scripts/migration-remediation/review-executable-squash-candidate-privilege-source.js",
);
const REPORT_JSON = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-source-review-privilege-2026-09-07.json",
);
const REPORT_MD = path.join(
  ROOT,
  "docs/migration-remediation/executable-squash-candidate-source-review-privilege-2026-09-07.md",
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

describe("ESC fourth independent privilege source review gates", () => {
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
    expect(report.usersColumnSecurity.escalationPossible).toBe(true);
    const codes = report.findings.map((f: { code: string }) => f.code);
    expect(codes).toContain("USERS_AUTHENTICATED_COLUMN_UPDATE_ESCALATION");
  });

  it("independent inventory explains 116 creates vs 95 unique identities", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.functionInventoryIndependent.regexCreateHits).toBe(116);
    expect(report.functionInventoryIndependent.uniqueIdentities).toBe(95);
    expect(report.sourceAccounting.digestQualifyOccurrences).toBe(1);
    expect(report.sourceAccounting.equation).toContain("= 151");
  });

  it("human report states CHANGES REQUIRED and users column P0", () => {
    expect(fs.existsSync(REPORT_MD)).toBe(true);
    const text = fs.readFileSync(REPORT_MD, "utf8");
    expect(text).toContain("CHANGES REQUIRED");
    expect(text).toContain(EXPECTED_SEAL);
    expect(text).toContain("USERS_AUTHENTICATED_COLUMN_UPDATE_ESCALATION");
    expect(text).toContain("95");
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
