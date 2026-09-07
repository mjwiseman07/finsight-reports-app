import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const PKG = path.join(ROOT, "supabase/migrations-draft/executable-squash-candidate");
const MANIFEST = path.join(PKG, "MANIFEST.json");
const BOUNDARY = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-boundary-matrix.json",
);
const DIGEST = "20260906184500_publish_ledger_event_extensions_digest_qualify.sql";

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

function findCreateTables(sql: string) {
  const tables: string[] = [];
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) tables.push(m[1].replace(/^public\./, ""));
  return tables;
}

function findEnableRls(sql: string) {
  const tables = new Set<string>();
  const re =
    /ALTER\s+TABLE(?:\s+IF\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(sql))) tables.add(m[1].replace(/^public\./, ""));
  return tables;
}

function findExecutableGrants(sql: string) {
  const body = stripSqlComments(sql);
  const out: Array<{ to: string; match: string }> = [];
  const re =
    /GRANT\s+EXECUTE\s+ON\s+(?:FUNCTION|PROCEDURE|ALL\s+FUNCTIONS\s+IN\s+SCHEMA)\s+[^\n;]*\s+TO\s+(PUBLIC|anon|authenticated)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) out.push({ to: m[1], match: m[0].slice(0, 160) });
  return out;
}

describe("executable squash candidate remediation gates (fail-closed)", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const moduleSql = Object.fromEntries(
    manifest.entries.map((e: { order: number; path: string }) => [
      e.order,
      fs.readFileSync(path.join(ROOT, e.path), "utf8"),
    ]),
  ) as Record<number, string>;

  it("has 7 modules and recomputes package seal", () => {
    expect(manifest.entries).toHaveLength(7);
    expect(manifest.entries.map((e: { version: string }) => e.version)).toEqual([
      "20260907010000",
      "20260907010010",
      "20260907010020",
      "20260907010030",
      "20260907010040",
      "20260907010050",
      "20260907010060",
    ]);
    const parts: string[] = [];
    let bytes = 0;
    for (const e of manifest.entries) {
      const buf = fs.readFileSync(path.join(ROOT, e.path));
      expect(createHash("sha256").update(buf).digest("hex")).toBe(e.sha256);
      expect(buf.length).toBe(e.utf8LfBytes);
      parts.push(e.sha256);
      bytes += buf.length;
    }
    const seal = createHash("sha256").update(parts.join("\n"), "utf8").digest("hex");
    expect(seal).toBe(manifest.packageSha256OfConcatenatedEntryHashes);
    expect(bytes).toBe(manifest.totalUtf8LfBytes);
    expect(bytes).toBe(1130762);
    expect(seal).toBe("99f556ebab0a73e3a58c770776cf3287d5150887ae22de25f80cb6932dd1dacf");
  });

  it("keeps active supabase/migrations free of ESC versions", () => {
    const active = fs.readdirSync(path.join(ROOT, "supabase/migrations"));
    expect(active.some((f) => f.startsWith("202609070100"))).toBe(false);
    expect(manifest.activeSupabaseMigrationsModified).toBe(false);
  });

  it("enforces zero tables without RLS after every module boundary", () => {
    const cumulativeCreates = new Set<string>();
    const cumulativeRls = new Set<string>();
    const matrix = [];
    for (let ord = 1; ord <= 7; ord++) {
      const sql = moduleSql[ord];
      const creates = findCreateTables(sql);
      const rls = findEnableRls(sql);
      for (const t of creates) cumulativeCreates.add(t);
      for (const t of rls) cumulativeRls.add(t);
      const createdHere = new Set(creates);
      const unsafe = [...createdHere].filter((t) => !rls.has(t));
      const exposed = [...cumulativeCreates].filter((t) => !cumulativeRls.has(t));
      expect(unsafe, `module ${ord} same-module RLS gaps`).toEqual([]);
      expect(exposed, `after module ${ord} cumulative without RLS`).toEqual([]);
      matrix.push({
        afterModule: ord,
        unsafeCreatesInModuleCount: unsafe.length,
        cumulativeTablesWithoutRlsYet: exposed.length,
      });
    }
    const evidence = JSON.parse(fs.readFileSync(BOUNDARY, "utf8"));
    expect(evidence.zeroUnsafeCreates).toBe(true);
    expect(evidence.zeroFinalWithoutRls).toBe(true);
    expect(evidence.matrix).toHaveLength(7);
    expect(matrix.every((m) => m.unsafeCreatesInModuleCount === 0)).toBe(true);
  });

  it("protects gap2_purge_table_registry and curated_rule_fires at creation module", () => {
    const m4 = moduleSql[4];
    expect(m4).toMatch(/CREATE\s+TABLE[\s\S]{0,400}?gap2_purge_table_registry/i);
    expect(m4).toMatch(/ALTER\s+TABLE[\s\S]{0,80}?gap2_purge_table_registry[\s\S]{0,80}?ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(m4).toMatch(/CREATE\s+POLICY[\s\S]{0,120}?gap2_purge_table_registry_service_role/i);
    expect(m4).toMatch(/CREATE\s+TABLE[\s\S]{0,400}?curated_rule_fires/i);
    expect(m4).toMatch(/ALTER\s+TABLE[\s\S]{0,80}?curated_rule_fires[\s\S]{0,80}?ENABLE\s+ROW\s+LEVEL\s+SECURITY/i);
    expect(m4).toMatch(/CREATE\s+TABLE[\s\S]{0,400}?engagement_posting_policy/i);
    expect(m4).toMatch(
      /ALTER\s+TABLE[\s\S]{0,80}?engagement_posting_policy[\s\S]{0,80}?ENABLE\s+ROW\s+LEVEL\s+SECURITY/i,
    );
  });

  it("module 4/5 security is atomic (single proposed version)", () => {
    expect(manifest.entries[3].name).toBe("esc_application_schema_and_security_atomic");
    expect(manifest.entries.some((e: { name: string }) => e.name.includes("security_rls_grants_hardening"))).toBe(
      false,
    );
    expect(manifest.targetModel.module4AtomicSecurity).toMatch(/merged/i);
  });

  it("rejects unintended PUBLIC/anon EXECUTE grants in executable SQL", () => {
    for (const e of manifest.entries) {
      const grants = findExecutableGrants(moduleSql[e.order]);
      const bad = grants.filter((g) => g.to.toLowerCase() === "public" || g.to.toLowerCase() === "anon");
      expect(bad, e.name).toEqual([]);
    }
  });

  it("revokes anon execute on publish_ledger_event and matches share-token disposition", () => {
    const m4 = moduleSql[4];
    expect(m4).toMatch(
      /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.publish_ledger_event\([\s\S]*?\)\s+FROM\s+anon/i,
    );
    expect(m4).toMatch(
      /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.increment_share_token_access\(uuid\)\s+FROM\s+anon/i,
    );
    expect(manifest.privilegeDispositions.publish_ledger_event.anonExecute).toBe("REVOKED");
    expect(manifest.privilegeDispositions.increment_share_token_access.anonExecute).toBe("REVOKED");
    expect(manifest.privilegeDispositions.publish_ledger_event.anonymousRequired).toBe(false);
    expect(manifest.privilegeDispositions.increment_share_token_access.anonymousRequired).toBe(false);
  });

  it("digest qualification occurs exactly once in forward-tail with required shape", () => {
    const all = Object.values(moduleSql).join("\n");
    const markers = all.match(/>>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [];
    const beginMarks = all.match(/>>> begin 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || [];
    expect(markers).toHaveLength(1);
    expect(beginMarks).toHaveLength(0);
    expect(manifest.sourceAccounting.digestQualifyOccurrences).toBe(1);
    expect(manifest.sourceAccounting.digestQualifyLocation).toBe("module_7_forward_tail_only");
    const fwd = moduleSql[7];
    expect(fwd).toContain(DIGEST);
    expect(fwd).toContain("extensions.digest");
    expect(fwd).toContain("'sha256'::text");
    expect(fwd).toMatch(/search_path\s*=\s*public,\s*pg_temp/i);
    expect(moduleSql[4]).not.toContain(">>> begin " + DIGEST);
  });

  it("source accounting has coherent Option D totals without digest double-count", () => {
    expect(manifest.sourceAccounting.optionDEntries).toBe(151);
    expect(manifest.sourceAccounting.includedInBaselineBody).toBeGreaterThan(100);
    expect(manifest.sourceAccounting.excludedFromBaselineBody).toContain(DIGEST);
    expect(manifest.targetModel.forwardTailModule).toMatch(/sole digest/i);
  });

  it("incomplete boundary evidence cannot pass", () => {
    expect(fs.existsSync(BOUNDARY)).toBe(true);
    const evidence = JSON.parse(fs.readFileSync(BOUNDARY, "utf8"));
    expect(evidence.packageSeal).toBe(manifest.packageSha256OfConcatenatedEntryHashes);
    for (const row of evidence.matrix) {
      expect(row).toHaveProperty("unsafeCreatesInModuleCount");
      expect(row).toHaveProperty("cumulativeTablesWithoutRlsYet");
      expect(row.unsafeCreatesInModuleCount).toBe(0);
      expect(row.cumulativeTablesWithoutRlsYet).toBe(0);
    }
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
