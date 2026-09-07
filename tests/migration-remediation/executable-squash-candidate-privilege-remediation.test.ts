import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertNoUsersAnonAllGrant,
  engagementPostingPolicyOrder,
  findCreateFunctionsDetailed,
  sameSlicePublicRevokeGaps,
  AUTHENTICATED_HELPER_ALLOWLIST,
} from "../../scripts/migration-remediation/esc-privilege-remediation.js";

const ROOT = path.resolve(__dirname, "../..");
const PKG = path.join(ROOT, "supabase/migrations-draft/executable-squash-candidate");
const MANIFEST = path.join(PKG, "MANIFEST.json");
const INV = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-function-privilege-inventory.json",
);
const EXPECTED_SEAL = "75b3466195ad01ae336cb1a5f6e89f29232757b2d048dd68ac9ad50bad1d049b";
const EXPECTED_BYTES = 1191052;

function stripComments(sql: string) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
}

describe("ESC privilege + RLS-order remediation fail-closed gates", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const inv = JSON.parse(fs.readFileSync(INV, "utf8"));
  const byVersion: Record<string, string> = Object.fromEntries(
    manifest.entries.map((e: { version: string; path: string }) => [
      e.version,
      fs.readFileSync(path.join(ROOT, e.path), "utf8"),
    ]),
  );

  it("reseals package to privilege-remediation seal and byte count", () => {
    const parts: string[] = [];
    let bytes = 0;
    for (const e of manifest.entries) {
      const buf = fs.readFileSync(path.join(ROOT, e.path));
      expect(createHash("sha256").update(buf).digest("hex")).toBe(e.sha256);
      parts.push(e.sha256);
      bytes += buf.length;
    }
    expect(bytes).toBe(EXPECTED_BYTES);
    expect(createHash("sha256").update(parts.join("\n"), "utf8").digest("hex")).toBe(EXPECTED_SEAL);
    expect(manifest.packageSha256OfConcatenatedEntryHashes).toBe(EXPECTED_SEAL);
    expect(manifest.moduleFileCount).toBe(12);
    expect(manifest.sourceAccounting.equation).toBe("144 unchanged + 6 overlays + 1 forward = 151");
  });

  it("every created function has same-slice PUBLIC revoke and a disposition class", () => {
    expect(inv.unclassifiedCount).toBe(0);
    expect(inv.totalFunctions).toBeGreaterThan(80);
    for (const e of manifest.entries) {
      const sql = byVersion[e.version];
      const gaps = sameSlicePublicRevokeGaps(sql);
      expect(gaps, e.version).toEqual([]);
      for (const fn of findCreateFunctionsDetailed(sql)) {
        expect(fn.identity).toBeTruthy();
      }
    }
  });

  it("rejects incomplete privilege evidence labeled as PASS", () => {
    expect(manifest.bound.sourceReviewVerdictPrior).toBe("CHANGES REQUIRED");
    expect(manifest.bound.productionMutationReadiness).toBe(false);
    expect(fs.readFileSync(path.join(PKG, "README.md"), "utf8")).toMatch(/Mutation readiness: NO/i);
  });

  it("internal/sensitive functions are not granted to anon or authenticated", () => {
    for (const fn of inv.functions) {
      if (fn.class === "authenticated_rls_helper") {
        expect(AUTHENTICATED_HELPER_ALLOWLIST.has(fn.identity)).toBe(true);
        continue;
      }
      expect(fn.grant).not.toContain("anon");
      expect(fn.grant).not.toContain("authenticated");
      expect(fn.revoke).toEqual(expect.arrayContaining(["PUBLIC", "anon", "authenticated"]));
    }
    // Net-at-COMMIT: last GRANT/REVOKE per identity+role wins. Source may GRANT authenticated
    // earlier; ESC closure must leave anon denied and authenticated denied unless allowlisted.
    for (const e of manifest.entries) {
      const sql = byVersion[e.version];
      const events: { identity: string; role: string; kind: "grant" | "revoke"; index: number }[] = [];
      const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
      const gre =
        /\b(GRANT|REVOKE)\s+EXECUTE\s+ON\s+FUNCTION\s+((?:[A-Za-z_][\w]*\.)?[A-Za-z_][\w]*)\s*\(([^)]*)\)\s+(?:TO|FROM)\s+([A-Za-z_][\w,\s]*)/gi;
      let m: RegExpExecArray | null;
      while ((m = gre.exec(cleaned))) {
        const roles = m[4]
          .split(",")
          .map((r) => r.trim().toLowerCase())
          .filter(Boolean);
        const { identityFromNameAndArgs } = require("../../scripts/migration-remediation/option-d-function-identity.js");
        const identity = identityFromNameAndArgs(m[2], m[3]);
        if (!identity) continue;
        for (const role of roles) {
          events.push({
            identity,
            role: role === "public" ? "PUBLIC" : role,
            kind: /^grant/i.test(m[1]) ? "grant" : "revoke",
            index: m.index,
          });
        }
      }
      const net = new Map<string, "grant" | "revoke">();
      for (const ev of events.sort((a, b) => a.index - b.index)) {
        net.set(`${ev.identity}::${ev.role}`, ev.kind);
      }
      for (const [key, kind] of net) {
        const [identity, role] = key.split("::");
        if (role === "anon" && kind === "grant") {
          throw new Error(`net anon EXECUTE grant at COMMIT in ${e.version}: ${identity}`);
        }
        if (role === "authenticated" && kind === "grant" && !AUTHENTICATED_HELPER_ALLOWLIST.has(identity)) {
          throw new Error(`net authenticated EXECUTE grant at COMMIT in ${e.version}: ${identity}`);
        }
      }
    }
  });

  it("engagement_posting_policy CREATE and ENABLE share the create slice in order", () => {
    const epp = engagementPostingPolicyOrder(byVersion);
    expect(epp.createVer).toBe("20260907010031");
    expect(epp.enableVer).toBe("20260907010031");
    expect(epp.okOrder).toBe(true);
    expect(epp.sameModule).toBe(true);
    expect(epp.createLine!).toBeLessThan(epp.enableLine!);
    // Must not ENABLE in 10031 before CREATE — already covered by line order
    const sec = byVersion["20260907010035"];
    expect(stripComments(sec)).not.toMatch(
      /CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?\s+(?:public\.)?engagement_posting_policy\b/i,
    );
  });

  it("public.users has no anon ALL and authenticated UPDATE fully revoked", () => {
    const foundations = byVersion["20260907010010"];
    expect(assertNoUsersAnonAllGrant(foundations)).toBe(true);
    const cleaned = stripComments(foundations);
    expect(cleaned).toMatch(/GRANT\s+SELECT\s+ON\s+TABLE\s+public\.users\s+TO\s+authenticated/i);
    expect(cleaned).toMatch(/REVOKE\s+UPDATE\s+ON\s+TABLE\s+public\.users\s+FROM\s+authenticated/i);
    expect(cleaned).not.toMatch(/GRANT\s+ALL\s+ON\s+TABLE\s+public\.users\s+TO\s+anon/i);
    expect(cleaned).not.toMatch(/GRANT\s+SELECT\s*,\s*UPDATE\s+ON\s+TABLE\s+public\.users\s+TO\s+authenticated/i);
    expect(cleaned).not.toMatch(/GRANT\s+UPDATE\s*\([^)]*\)\s+ON\s+TABLE\s+public\.users\s+TO\s+authenticated/i);
  });

  it("publish_ledger_event CREATE includes locked search_path", () => {
    const sql = byVersion["20260907010031"];
    expect(sql).toMatch(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.publish_ledger_event\([\s\S]*?SECURITY\s+DEFINER\s+SET\s+search_path\s*=\s*public,\s*pg_temp\s+AS/i,
    );
  });

  it("trigger_only functions do not grant service_role EXECUTE", () => {
    for (const fn of inv.functions) {
      if (fn.class === "trigger_only") {
        expect(fn.grant || []).not.toContain("service_role");
        expect(fn.revoke).toEqual(expect.arrayContaining(["service_role"]));
      }
    }
  });

  it("digest qualify remains once in forward-tail only", () => {
    let hits = 0;
    for (const e of manifest.entries) {
      const sql = byVersion[e.version];
      const n = (sql.match(/extensions\.digest/gi) || []).length;
      if (n) {
        hits += n;
        expect(e.version).toBe("20260907010060");
      }
    }
    expect(hits).toBeGreaterThanOrEqual(1);
    expect(manifest.sourceAccounting.digestQualifyOccurrences).toBe(1);
  });

  it("active supabase/migrations is untouched by candidate package paths", () => {
    for (const e of manifest.entries) {
      expect(e.path.startsWith("supabase/migrations-draft/executable-squash-candidate/")).toBe(true);
      expect(e.path.startsWith("supabase/migrations/")).toBe(false);
    }
    expect(manifest.activeSupabaseMigrationsModified).toBe(false);
  });

  it("inventory seal matches package seal", () => {
    expect(inv.packageSeal).toBe(EXPECTED_SEAL);
    expect(inv.public_users_anon_all_absent).toBe(true);
  });
});
