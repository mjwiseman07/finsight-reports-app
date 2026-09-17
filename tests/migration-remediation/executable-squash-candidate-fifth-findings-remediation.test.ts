import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST,
  SERVICE_ROLE_RPC_CALLER_EVIDENCE,
  SP_WRITE_ANCHOR_BATCH_DISPOSITION,
  assertNoUsersUpdatePolicy,
  assertNoUsersAuthenticatedTableUpdate,
  PUBLIC_USERS_COLUMN_CONTRACT,
} from "../../scripts/migration-remediation/esc-privilege-remediation.js";
import { identityFromNameAndArgs } from "../../scripts/migration-remediation/option-d-function-identity.js";

const ROOT = path.resolve(__dirname, "../..");
const PKG = path.join(ROOT, "supabase/migrations-draft/executable-squash-candidate");
const MANIFEST = path.join(PKG, "MANIFEST.json");
const RETAINED = path.join(
  ROOT,
  "docs/migration-remediation/evidence/executable-squash-candidate-retained-service-role-grants.json",
);

const EXPECTED_SEAL = "170b7105b09acdb2fd1d5d1846e5242234b263528e18b8ee9180eab8cc2df48e";
const EXPECTED_BYTES = 1191852;

const JE_DISPATCH = [
  "public.apply_journal_entry_provider_dispatch_started(uuid,text,jsonb,text,uuid,uuid,uuid,text,text)",
  "public.apply_journal_entry_provider_posted(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)",
  "public.apply_journal_entry_provider_post_unknown(uuid,text,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)",
  "public.apply_journal_entry_provider_precommit_failed(uuid,text,text,text,jsonb,text,uuid,uuid,uuid,text,text)",
] as const;

function netExecute(sql: string) {
  const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
  const m = new Map<string, string>();
  const re =
    /\b(GRANT|REVOKE)\s+EXECUTE\s+ON\s+FUNCTION\s+((?:[A-Za-z_][\w]*\.)?[A-Za-z_][\w]*)\s*\(([^)]*)\)\s+(?:TO|FROM)\s+([A-Za-z_][\w,\s]*)/gi;
  let x: RegExpExecArray | null;
  while ((x = re.exec(cleaned))) {
    const id = identityFromNameAndArgs(x[2], x[3]);
    if (!id) continue;
    for (const role of x[4]
      .split(",")
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean)) {
      m.set(`${id}::${role}`, x[1].toLowerCase());
    }
  }
  return m;
}

describe("ESC sixth-prep privilege remediation (fifth-review findings)", () => {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const byVersion: Record<string, string> = Object.fromEntries(
    manifest.entries.map((e: { version: string; path: string }) => [
      e.version,
      fs.readFileSync(path.join(ROOT, e.path), "utf8"),
    ]),
  );
  const packageNet = new Map<string, string>();
  for (const e of manifest.entries) {
    for (const [k, v] of netExecute(byVersion[e.version])) {
      packageNet.set(k, v);
    }
  }

  it("reseals to post-remediation seal and preserves 151 accounting", () => {
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
    expect(manifest.sourceAccounting.equation).toBe("144 unchanged + 6 overlays + 1 forward = 151");
    expect(manifest.moduleFileCount).toBe(12);
  });

  it("exact-identity allowlist covers four JE dispatch RPCs with service_role only", () => {
    for (const id of JE_DISPATCH) {
      expect(SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.has(id)).toBe(true);
      expect(packageNet.get(`${id}::service_role`)).toBe("grant");
      expect(packageNet.get(`${id}::authenticated`)).toBe("revoke");
      expect(packageNet.get(`${id}::anon`)).toBe("revoke");
      expect(packageNet.get(`${id}::public`)).toBe("revoke");
      const ev = SERVICE_ROLE_RPC_CALLER_EVIDENCE[id];
      expect(ev?.authority).toMatch(/getSupabaseAdmin/);
      expect(ev?.callers?.[0]).toContain("provider-dispatch-repository.ts");
    }
  });

  it("fails if a later revoke cancels required JE dispatch service_role grants in 10034", () => {
    const sql = byVersion["20260907010034"];
    const net = netExecute(sql);
    for (const id of JE_DISPATCH) {
      expect(net.get(`${id}::service_role`)).toBe("grant");
    }
  });

  it("retains next_document_number service_role with createServiceClient callers", () => {
    const id = "public.next_document_number(uuid,text)";
    expect(SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.has(id)).toBe(true);
    expect(packageNet.get(`${id}::service_role`)).toBe("grant");
    expect(SERVICE_ROLE_RPC_CALLER_EVIDENCE[id].callers.join(" ")).toMatch(/createServiceClient/);
    const numbering = fs.readFileSync(path.join(ROOT, "lib/ap-intake/requisitions/numbering.ts"), "utf8");
    expect(numbering).toContain('rpc("next_document_number"');
    const service = fs.readFileSync(path.join(ROOT, "lib/ap-intake/requisitions/service.ts"), "utf8");
    expect(service).toContain("createServiceClient");
    expect(service).toContain("nextDocumentNumber");
  });

  it("revokes sp_write_anchor_batch service_role without proven caller", () => {
    const id = SP_WRITE_ANCHOR_BATCH_DISPOSITION.identity;
    expect(SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.has(id)).toBe(false);
    expect(packageNet.get(`${id}::service_role`)).toBe("revoke");
    expect(SP_WRITE_ANCHOR_BATCH_DISPOSITION.serviceRoleExecute).toBe("REVOKED");
  });

  it("drops stale public.users FOR UPDATE policy while keeping SELECT-only contract", () => {
    const sql = byVersion["20260907010010"];
    expect(assertNoUsersUpdatePolicy(sql)).toBe(true);
    expect(assertNoUsersAuthenticatedTableUpdate(sql)).toBe(true);
    expect(PUBLIC_USERS_COLUMN_CONTRACT.authenticatedUpdateFullyRevoked).toBe(true);
    const cleaned = sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");
    expect(cleaned).toMatch(/CREATE\s+POLICY[\s\S]{0,120}?ON\s+public\.users\s+FOR\s+SELECT/i);
    expect(cleaned).not.toMatch(/CREATE\s+POLICY[\s\S]{0,120}?ON\s+public\.users\s+FOR\s+UPDATE/i);
  });

  it("retained-grant report lists concrete callers for every allowlisted identity", () => {
    const report = JSON.parse(fs.readFileSync(RETAINED, "utf8"));
    expect(report.packageSeal).toBe(EXPECTED_SEAL);
    expect(report.allowlistMode).toBe("exact_identity");
    expect(report.retainedServiceRoleGrantCount).toBe(SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.size);
    for (const g of report.grants) {
      expect(g.callers.length).toBeGreaterThan(0);
      expect(g.authority).toBeTruthy();
      expect(SERVICE_ROLE_RPC_IDENTITY_ALLOWLIST.has(g.identity)).toBe(true);
    }
    for (const id of JE_DISPATCH) {
      expect(report.grants.some((g: { identity: string }) => g.identity === id)).toBe(true);
    }
  });

  it("active supabase/migrations has no ESC versions", () => {
    const active = fs.readdirSync(path.join(ROOT, "supabase/migrations"));
    expect(active.some((f) => /202609070100/.test(f))).toBe(false);
  });
});
