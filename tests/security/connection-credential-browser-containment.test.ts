import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const DOC = join(ROOT, "docs/security/connection-credential-browser-containment");
const MIGRATION = join(
  ROOT,
  "supabase/migrations/20260908031736_connection_credential_browser_containment.sql",
);
const ROLLBACK = join(DOC, "ROLLBACK_SECURITY_REGRESSION_BREAK_GLASS_ONLY.sql");
const CONTRACT = join(DOC, "PRE_CHANGE_CONTRACT.json");

function sha256(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

describe("connection credential browser containment migration static gates", () => {
  it("ships CLI-named migration, rollback, and sealed contract", () => {
    expect(existsSync(MIGRATION)).toBe(true);
    expect(existsSync(ROLLBACK)).toBe(true);
    expect(existsSync(CONTRACT)).toBe(true);
    expect(sha256(MIGRATION)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256(ROLLBACK)).toMatch(/^[a-f0-9]{64}$/);
    expect(sha256(CONTRACT)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("forward migration revokes browser privileges and never uses CASCADE", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).not.toMatch(/\bDROP\s+(VIEW|TABLE)\b[\s\S]{0,200}?\bCASCADE\b/i);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.quickbooks_connections FROM anon/i);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.accounting_connections FROM authenticated/i);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.qbo_connections_unified FROM anon/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Users can access own QB connection"/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS "users can update their accounting connections"/i);
    expect(sql).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE[\s\S]*service_role/i);
    expect(sql).toMatch(/security_invoker\s*=\s*true/i);
    expect(sql).toMatch(/DROP VIEW public\.qbo_connections_unified;/i);
    expect(sql).not.toMatch(/FORCE ROW LEVEL SECURITY/i);
  });

  it("rebuilt view SQL omits credential columns", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    const createIdx = sql.search(/CREATE VIEW public\.qbo_connections_unified/i);
    expect(createIdx).toBeGreaterThan(-1);
    const createBlock = sql.slice(createIdx, createIdx + 900);
    expect(createBlock).not.toMatch(/\baccess_token\b/i);
    expect(createBlock).not.toMatch(/\brefresh_token\b/i);
    expect(createBlock).toMatch(/\brealm_id\b/i);
    expect(createBlock).toMatch(/\btoken_expiry\b/i);
    expect(createBlock).toMatch(/\bstatus\b/i);
    expect(createBlock).toMatch(/\buser_id\b/i);
  });

  it("includes fail-closed privilege assertions without selecting token values", () => {
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toContain("has_column_privilege('authenticated'");
    expect(sql).toContain("'access_token', 'SELECT'");
    expect(sql).toMatch(/ASSERT_FAIL/i);
    expect(sql).not.toMatch(/select\s+access_token\s+from/i);
    expect(sql).not.toMatch(/select\s+refresh_token\s+from/i);
  });

  it("rollback is labeled break-glass and restores sealed exposure surfaces", () => {
    const sql = readFileSync(ROLLBACK, "utf8");
    expect(sql).toMatch(/SECURITY_REGRESSION_BREAK_GLASS_ONLY/);
    expect(sql).toMatch(/access_token/);
    expect(sql).toMatch(/refresh_token/);
    expect(sql).toMatch(/Users can access own QB connection/);
    expect(sql).toMatch(/users can update their accounting connections/);
    expect(sql).toMatch(/GRANT[\s\S]*TO anon, authenticated, service_role, postgres/i);
    expect(sql).not.toMatch(/\bCASCADE\b/i);
  });

  it("pre-change contract has zero production rows/tokens and lists empty browser callers", () => {
    const contract = JSON.parse(readFileSync(CONTRACT, "utf8"));
    expect(contract.notes.join(" ")).toMatch(/Zero token values/i);
    expect(contract.service_role_caller_inventory_summary.browser_direct_callers_found).toEqual([]);
    expect(contract.objects["public.qbo_connections_unified"].dependent_objects_non_internal).toEqual(
      [],
    );
  });

  it("active view consumers only require non-token columns still present after rebuild", () => {
    const required = ["user_id", "realm_id", "token_expiry", "status"];
    const sql = readFileSync(MIGRATION, "utf8");
    const createIdx = sql.search(/CREATE VIEW public\.qbo_connections_unified/i);
    const createBlock = sql.slice(createIdx, createIdx + 900).toLowerCase();
    for (const col of required) {
      expect(createBlock).toContain(col);
    }
    // Proven consumers from main:
    const tickets = readFileSync(join(ROOT, "app/api/support/tickets/route.js"), "utf8");
    const cdc = readFileSync(join(ROOT, "lib/qbo/cdc.js"), "utf8");
    const signals = readFileSync(join(ROOT, "lib/support/workflow-signals.ts"), "utf8");
    expect(tickets).toMatch(/\.select\("realm_id"\)/);
    expect(cdc).toMatch(/\.select\("user_id"\)/);
    expect(signals).toMatch(/realm_id, token_expiry, status/);
    expect(tickets + cdc + signals).not.toMatch(/qbo_connections_unified[\s\S]{0,120}access_token/);
    expect(tickets + cdc + signals).not.toMatch(/qbo_connections_unified[\s\S]{0,120}select\("\*"/);
  });
});
