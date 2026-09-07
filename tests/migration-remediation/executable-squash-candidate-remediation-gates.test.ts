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
const TXN_COMPAT = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-module4-txn-compatibility.json",
);
const DIGEST = "20260906184500_publish_ledger_event_extensions_digest_qualify.sql";
const EXPECTED_SEAL = "75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b";

function stripSqlComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

function countOuterTxn(sql: string) {
  let begin = 0;
  let commit = 0;
  let i = 0;
  const n = sql.length;
  while (i < n) {
    if (sql[i] === "-" && sql[i + 1] === "-") {
      while (i < n && sql[i] !== "\n") i++;
      continue;
    }
    if (sql[i] === "/" && sql[i + 1] === "*") {
      i += 2;
      while (i < n - 1 && !(sql[i] === "*" && sql[i + 1] === "/")) i++;
      i += 2;
      continue;
    }
    if (sql[i] === "$") {
      const m = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (m) {
        const tag = m[0];
        i += tag.length;
        const end = sql.indexOf(tag, i);
        i = end < 0 ? n : end + tag.length;
        continue;
      }
    }
    if (sql[i] === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (sql[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    const prev = i > 0 ? sql[i - 1] : " ";
    if (!/[A-Za-z0-9_]/.test(prev)) {
      const m = /^(BEGIN(\s+(WORK|TRANSACTION))?|COMMIT(\s+(WORK|TRANSACTION))?)\s*;/i.exec(sql.slice(i));
      if (m) {
        if (/^BEGIN/i.test(m[0])) begin++;
        else commit++;
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return { begin, commit };
}

function findCreateTables(sql: string) {
  const cleaned = stripSqlComments(sql);
  const tables: string[] = [];
  const re = /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+((?:public\.)?[a-zA-Z_][\w.]*)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned))) {
    const t = m[1].replace(/^public\./, "");
    if (!["if", "not", "exists", "without"].includes(t.toLowerCase())) tables.push(t);
  }
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

describe("executable squash candidate Option-2 fail-closed gates", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const moduleSql = Object.fromEntries(
    manifest.entries.map((e: { order: number; path: string }) => [
      e.order,
      fs.readFileSync(path.join(ROOT, e.path), "utf8"),
    ]),
  ) as Record<number, string>;

  it("recomputes package seal", () => {
    const parts: string[] = [];
    let bytes = 0;
    for (const e of manifest.entries) {
      const buf = fs.readFileSync(path.join(ROOT, e.path));
      expect(createHash("sha256").update(buf).digest("hex")).toBe(e.sha256);
      parts.push(e.sha256);
      bytes += buf.length;
    }
    expect(createHash("sha256").update(parts.join("\n"), "utf8").digest("hex")).toBe(EXPECTED_SEAL);
    expect(bytes).toBe(manifest.totalUtf8LfBytes);
  });

  it("app/security slices have exactly one outer BEGIN and one COMMIT", () => {
    for (const e of manifest.entries) {
      if (!/slice_|security_rls_grants_hardening_atomic/.test(e.name)) continue;
      const t = countOuterTxn(moduleSql[e.order]);
      expect(t, e.name).toEqual({ begin: 1, commit: 1 });
    }
  });

  it("zero tables without RLS after every module boundary", () => {
    const cumulativeCreates = new Set<string>();
    const cumulativeRls = new Set<string>();
    for (let ord = 1; ord <= manifest.entries.length; ord++) {
      const sql = moduleSql[ord];
      const creates = findCreateTables(sql);
      const rls = findEnableRls(sql);
      for (const t of creates) cumulativeCreates.add(t);
      for (const t of rls) cumulativeRls.add(t);
      const unsafe = [...new Set(creates)].filter((t) => !rls.has(t));
      const exposed = [...cumulativeCreates].filter((t) => !cumulativeRls.has(t));
      expect(unsafe, `module ${ord}`).toEqual([]);
      expect(exposed, `after ${ord}`).toEqual([]);
    }
    const evidence = JSON.parse(fs.readFileSync(BOUNDARY, "utf8"));
    expect(evidence.zeroUnsafeCreates).toBe(true);
    expect(evidence.zeroFinalWithoutRls).toBe(true);
  });

  it("txn compatibility report exists and chose Option 2", () => {
    expect(fs.existsSync(TXN_COMPAT)).toBe(true);
    const r = JSON.parse(fs.readFileSync(TXN_COMPAT, "utf8"));
    expect(r.risk.recommendation).toMatch(/OPTION_2/);
    expect(r.controlCountsByKind.BEGIN).toBe(50);
    expect(r.controlCountsByKind.COMMIT).toBe(50);
  });

  it("digest qualification occurs exactly once", () => {
    const all = Object.values(moduleSql).join("\n");
    expect((all.match(/>>> forward 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || []).length).toBe(
      1,
    );
    expect((all.match(/>>> begin 20260906184500_publish_ledger_event_extensions_digest_qualify/g) || []).length).toBe(
      0,
    );
    expect(manifest.sourceAccounting.digestQualifyOccurrences).toBe(1);
  });

  it("source accounting is 151 with 138 OD assembled in splits", () => {
    expect(manifest.sourceAccounting.optionDEntries).toBe(151);
    expect(manifest.sourceAccounting.appAndSecurityAssembled).toBe(138);
    expect(manifest.sourceAccounting.markerBookkeeping.escRemediationPatchBeginMarker).toBe(1);
  });

  it("keeps active migrations free of ESC versions", () => {
    expect(fs.readdirSync(path.join(ROOT, "supabase/migrations")).some((f) => f.startsWith("202609070100"))).toBe(
      false,
    );
  });

  it("secret scan passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
