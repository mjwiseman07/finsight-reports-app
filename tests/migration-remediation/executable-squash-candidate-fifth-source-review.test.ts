import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const COMMIT = "1a4c8182b68a2506f85140970073558fb1b1ebb2";
const EXPECTED_SEAL = "75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b";
const EXPECTED_BYTES = 1191052;
const REVIEWER = path.join(
  ROOT,
  "scripts/migration-remediation/review-executable-squash-candidate-fifth-source.js",
);
const REPORT_JSON = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-source-review-fifth-2026-09-07.json",
);
const REPORT_MD = path.join(
  ROOT,
  "docs/migration-remediation/executable-squash-candidate-source-review-fifth-2026-09-07.md",
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

describe("ESC fifth independent source review gates", () => {
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
    expect(manifest.packageSha256OfConcatenatedEntryHashes).toBe(EXPECTED_SEAL);
    expect(manifest.totalUtf8LfBytes).toBe(EXPECTED_BYTES);
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
    expect(report.usersSecurity.updateRevokedAuth).toBe(true);
    expect(report.usersSecurity.noTableUpdateGrantAuth).toBe(true);
    expect(report.usersSecurity.browserUsersUpdate).toBe(false);
    const codes = report.findings.map((f: { code: string }) => f.code);
    expect(codes).toContain("SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED");
    expect(report.revokedButCalledServiceRoleRpcs).toHaveLength(4);
  });

  it("independent inventory and accounting pins", () => {
    const report = JSON.parse(fs.readFileSync(REPORT_JSON, "utf8"));
    expect(report.functionInventoryIndependent.createHits).toBe(116);
    expect(report.functionInventoryIndependent.uniqueIdentities).toBe(95);
    expect(report.sourceAccounting.digestQualifyOccurrences).toBe(1);
    expect(report.sourceAccounting.equation).toBe("144 unchanged + 6 overlays + 1 forward = 151");
    expect(report.schemaGaps.mandatoryFullPgDumpBeforeReplay).toBe(true);
    expect(report.schemaGaps.readyForLocalReplay).toBe(false);
  });

  it("human report states CHANGES REQUIRED and JE dispatch P0", () => {
    expect(fs.existsSync(REPORT_MD)).toBe(true);
    const text = fs.readFileSync(REPORT_MD, "utf8");
    expect(text).toContain("CHANGES REQUIRED");
    expect(text).toContain(EXPECTED_SEAL);
    expect(text).toContain("SERVICE_ROLE_RPC_CALLER_BUT_EXECUTE_REVOKED");
    expect(text).toContain("apply_journal_entry_provider_dispatch_started");
    expect(text).toContain("1a4c8182b68a2506f85140970073558fb1b1ebb2");
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
