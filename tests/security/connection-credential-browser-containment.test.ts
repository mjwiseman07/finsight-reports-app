import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const DOC = join(ROOT, "docs/security/connection-credential-browser-containment");
const MIGRATION_REL =
  "supabase/migrations/20260908031736_connection_credential_browser_containment.sql";
const ROLLBACK_REL =
  "docs/security/connection-credential-browser-containment/ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql";
const CONTRACT_REL =
  "docs/security/connection-credential-browser-containment/PRE_CHANGE_CONTRACT.json";
const SEALS_REL = "docs/security/connection-credential-browser-containment/SEALS.json";
const ATTRS = join(ROOT, ".gitattributes");

function gitBlob(pathRel: string, rev = "HEAD"): Buffer {
  // Binary-safe: git cat-file blob <rev>:<path>
  return execFileSync("git", ["cat-file", "blob", `${rev}:${pathRel}`], {
    cwd: ROOT,
  });
}

function sha256(buf: Buffer) {
  return createHash("sha256").update(buf).digest("hex");
}

describe("connection credential browser containment migration static gates", () => {
  it("ships CLI-named migration, rollback, contract, and LF attributes", () => {
    expect(existsSync(join(ROOT, MIGRATION_REL))).toBe(true);
    expect(existsSync(join(ROOT, ROLLBACK_REL))).toBe(true);
    expect(existsSync(join(ROOT, CONTRACT_REL))).toBe(true);
    const attrs = readFileSync(ATTRS, "utf8");
    expect(attrs).toMatch(/20260908031736_connection_credential_browser_containment\.sql text eol=lf/);
    expect(attrs).toMatch(/docs\/security\/connection-credential-browser-containment\/\*\* text eol=lf/);
  });

  it("forward migration drops residual SELECT policy and never uses CASCADE", () => {
    const sql = gitBlob(MIGRATION_REL).toString("utf8");
    expect(sql).not.toMatch(/\bDROP\s+(VIEW|TABLE)\b[\s\S]{0,200}?\bCASCADE\b/i);
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS "users can read their accounting connection metadata" ON public\.accounting_connections/,
    );
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Users can access own QB connection"/);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "users can update their accounting connections"/);
    expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/security_invoker\s*=\s*true/i);
  });

  it("includes strengthened fail-closed table privilege assertions", () => {
    const sql = gitBlob(MIGRATION_REL).toString("utf8");
    for (const priv of ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
      expect(sql).toContain(`has_table_privilege(r, t, '${priv}')`);
    }
    expect(sql).toContain("has_column_privilege(r, t, 'access_token', 'SELECT')");
    expect(sql).toContain("has_column_privilege(r, t, 'refresh_token', 'UPDATE')");
    expect(sql).toMatch(/ASSERT_FAIL: role % retains table privilege/);
    expect(sql).toMatch(/non-service browser-applicable policies remain/);
    expect(sql).not.toMatch(/select\s+access_token\s+from/i);
  });

  it("rebuilt view SQL omits credential columns", () => {
    const sql = gitBlob(MIGRATION_REL).toString("utf8");
    const createIdx = sql.search(/CREATE VIEW public\.qbo_connections_unified/i);
    expect(createIdx).toBeGreaterThan(-1);
    const createBlock = sql.slice(createIdx, createIdx + 900);
    expect(createBlock).not.toMatch(/\baccess_token\b/i);
    expect(createBlock).not.toMatch(/\brefresh_token\b/i);
  });

  it("rollback restores residual SELECT policy and is break-glass labeled", () => {
    const sql = gitBlob(ROLLBACK_REL).toString("utf8");
    expect(sql).toMatch(/SECURITY_REGRESSION_BREAK_GLASS_ONLY/);
    expect(sql).toMatch(/users can read their accounting connection metadata/);
    expect(sql).toMatch(/REOPENS the confirmed HIGH-severity/);
    expect(sql).not.toMatch(/\bDROP\s+(VIEW|TABLE)\b[\s\S]{0,120}?\bCASCADE\b/i);
  });

  it("pre-change contract documents actual production policies and forward disposition", () => {
    const contract = JSON.parse(gitBlob(CONTRACT_REL).toString("utf8"));
    expect(contract.notes.join(" ")).toMatch(/ACTUAL pre-change production state/i);
    const acPolicies = contract.objects["public.accounting_connections"].policies.map(
      (p: { name: string }) => p.name,
    );
    expect(acPolicies).toContain("users can read their accounting connection metadata");
    expect(contract.stage1_forward_policy_disposition.drop_policies).toContain(
      "users can read their accounting connection metadata",
    );
  });

  it("active view consumers only require non-token columns still present after rebuild", () => {
    const sql = gitBlob(MIGRATION_REL).toString("utf8").toLowerCase();
    for (const col of ["user_id", "realm_id", "token_expiry", "status"]) {
      expect(sql).toContain(col);
    }
    const tickets = readFileSync(join(ROOT, "app/api/support/tickets/route.js"), "utf8");
    const cdc = readFileSync(join(ROOT, "lib/qbo/cdc.js"), "utf8");
    const signals = readFileSync(join(ROOT, "lib/support/workflow-signals.ts"), "utf8");
    expect(tickets + cdc + signals).not.toMatch(/qbo_connections_unified[\s\S]{0,120}access_token/);
  });
});

describe("connection credential browser containment git-blob seals", () => {
  it("SEALS.json matches HEAD blob hashes when present (Commit-2+)", () => {
    if (!existsSync(join(ROOT, SEALS_REL))) return;
    const seals = JSON.parse(gitBlob(SEALS_REL).toString("utf8"));
    if (seals.seal_status !== "COMMITTED_BLOB_SEALED") return;

    const mig = gitBlob(MIGRATION_REL);
    const rb = gitBlob(ROLLBACK_REL);
    const contract = gitBlob(CONTRACT_REL);
    expect(sha256(mig)).toBe(seals.seals_sha256.forward_migration);
    expect(mig.length).toBe(seals.byte_lengths.forward_migration);
    expect(sha256(rb)).toBe(seals.seals_sha256.rollback);
    expect(rb.length).toBe(seals.byte_lengths.rollback);
    expect(sha256(contract)).toBe(seals.seals_sha256.pre_change_contract);
    expect(contract.length).toBe(seals.byte_lengths.pre_change_contract);
    expect(seals.commit1_sha).toMatch(/^[a-f0-9]{40}$/);
    expect(seals.notes?.join(" ") || "").not.toMatch(/d2739ae21af2f11400d10087457fd102b5ba2fba2f401d5b9a920bd584ae6bca/);
  });
});
