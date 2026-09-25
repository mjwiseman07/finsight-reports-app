import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const CANDIDATE_COMMIT = "c386185f4e33a571a759fd6d57cb8e8c2d5bf6f6";
const EXPECTED_SEAL = "170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e";
const EXPECTED_BYTES = 1_191_852;
const EVIDENCE_JSON = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-quickbooks-connections-disposition-2026-09-07.json",
);
const EVIDENCE_MD = path.join(
  ROOT,
  "docs/migration-remediation/executable-squash-candidate-quickbooks-connections-disposition-2026-09-07.md",
);
const MANIFEST_PATH = "supabase/migrations-draft/executable-squash-candidate/MANIFEST.json";

const REQUIRED_CALLER_PATHS = [
  "lib/erp-adapters/quickbooks-adapter.js",
  "lib/erp/quickbooks/token-resolver.ts",
  "lib/integrations/quickbooks/promote-legacy-grant-execute.ts",
  "scripts/verify-accounting-connections.js",
  "tests/integrations/quickbooks/promote-legacy-grant.test.ts",
  "tests/migration-remediation/review-gate.test.ts",
  "supabase/migrations/20260531_create_accounting_connections.sql",
  "supabase/migrations/20260531_backfill_accounting_connections_from_quickbooks.sql",
];

function gitShow(spec: string) {
  return execFileSync("git", ["show", spec], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function sha256Text(text: string) {
  return createHash("sha256").update(Buffer.from(text.replace(/\r\n/g, "\n"), "utf8")).digest("hex");
}

describe("quickbooks_connections product/security disposition gates", () => {
  it("keeps candidate seal immutable", () => {
    const man = JSON.parse(gitShow(`${CANDIDATE_COMMIT}:${MANIFEST_PATH}`));
    const parts: string[] = [];
    let bytes = 0;
    for (const e of man.entries) {
      const sql = gitShow(`${CANDIDATE_COMMIT}:${e.path}`).replace(/\r\n/g, "\n");
      const h = sha256Text(sql);
      expect(h).toBe(e.sha256);
      bytes += Buffer.byteLength(sql, "utf8");
      parts.push(h);
    }
    const seal = createHash("sha256").update(Buffer.from(parts.join("\n"), "utf8")).digest("hex");
    expect(seal).toBe(EXPECTED_SEAL);
    expect(bytes).toBe(EXPECTED_BYTES);
  });

  it("does not leak ESC into active migrations on HEAD", () => {
    const active = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "supabase/migrations"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .trim()
      .split(/\n/)
      .filter(Boolean);
    expect(active.some((f) => f.includes("202609070100"))).toBe(false);
  });

  it("records complete caller inventory paths that exist on HEAD", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE_JSON, "utf8"));
    const paths = ev.callers.map((c: { path: string }) => c.path);
    for (const p of REQUIRED_CALLER_PATHS) {
      expect(paths).toContain(p);
      expect(fs.existsSync(path.join(ROOT, p))).toBe(true);
    }
    expect(ev.callers.some((c: { writesPlaintextTokens?: boolean }) => c.writesPlaintextTokens === true)).toBe(
      true,
    );
  });

  it("captures schema contract secret columns and unsafe policy posture", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE_JSON, "utf8"));
    const cols = ev.schemaContract.columnsInOrder.map((c: { name: string }) => c.name);
    expect(cols).toEqual([
      "id",
      "user_id",
      "realm_id",
      "access_token",
      "refresh_token",
      "token_expiry",
      "created_at",
      "updated_at",
    ]);
    expect(ev.schemaContract.policies[0].roles).toContain("public");
    expect(ev.schemaContract.policies[0].cmd).toBe("ALL");
    expect(ev.schemaContract.aclRoles).toContain("anon");
    expect(ev.schemaContract.createInProdStatements).toBe(false);
    expect(ev.schemaContract.rowContentsAccessed).toBe(false);
  });

  it("recommends controlled omit and rejects unsafe restricted table", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE_JSON, "utf8"));
    expect(ev.recommendedDisposition).toBe("CONTROLLED_OMIT_AFTER_CALLER_MIGRATION");
    expect(ev.options.B_restricted_compatibility_table.safeIfPlaintextTokenColumnsRetained).toBe(false);
    expect(ev.sevenHardenIncludeObjectsMayProceedIndependently).toBe(true);
    expect(ev.sevenObjects).toHaveLength(7);
    expect(ev.canonicalReplacement.qboTokenEncryptionAtRest).toBe(false);
    expect(ev.tokenSecurity.seedProductionRowsAllowed).toBe(false);
  });

  it("sanitized evidence has no secret/connection patterns", () => {
    for (const file of [EVIDENCE_JSON, EVIDENCE_MD]) {
      const text = fs.readFileSync(file, "utf8");
      expect(text).not.toMatch(/PGPASSWORD\s*=\s*\S+/i);
      expect(text).not.toMatch(/postgres(?:ql)?:\/\/[^\s"']+/i);
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/);
      expect(text).not.toMatch(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(text).not.toMatch(/access_token\s*[:=]\s*['"][^'"]+['"]/);
      expect(text).not.toMatch(/refresh_token\s*[:=]\s*['"][^'"]+['"]/);
    }
  });
});
