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
  "docs/migration-remediation/evidence/executable-squash-candidate-eight-object-provenance-2026-09-07.json",
);
const EVIDENCE_MD = path.join(
  ROOT,
  "docs/migration-remediation/executable-squash-candidate-eight-object-provenance-disposition-2026-09-07.md",
);
const MANIFEST_PATH = "supabase/migrations-draft/executable-squash-candidate/MANIFEST.json";

const EIGHT = [
  "public.pilot_lifecycle_coverage_downloads",
  "public.pulse_je_submissions",
  "public.qbo_accounts_cache",
  "public.quickbooks_connections",
  "public.xero_accounts_cache",
  "public.platform_integrity_chain_status(p_firm_id uuid)",
  "public.sp_write_pilot_slot_and_event(p_slot_op text, p_slot_payload jsonb, p_event jsonb)",
  "public.v_platform_integrity_current",
] as const;

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

describe("ESC eight-object provenance/disposition gates", () => {
  it("keeps candidate seal immutable at authority commit", () => {
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
    expect(man.moduleFileCount).toBe(12);
  });

  it("does not leak ESC versions into active supabase/migrations on HEAD", () => {
    const active = execFileSync("git", ["ls-tree", "-r", "--name-only", "HEAD", "supabase/migrations"], {
      cwd: ROOT,
      encoding: "utf8",
    })
      .trim()
      .split(/\n/)
      .filter(Boolean);
    expect(active.some((f) => f.includes("202609070100"))).toBe(false);
  });

  it("records dispositions for all eight identities exactly once", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE_JSON, "utf8"));
    expect(ev.objects).toHaveLength(8);
    const ids = ev.objects.map((o: { identity: string }) => o.identity);
    expect(new Set(ids).size).toBe(8);
    for (const id of EIGHT) expect(ids).toContain(id);
    expect(ev.dispositionTotals.includeSecurityHardened).toBe(7);
    expect(ev.dispositionTotals.blockPendingDecision).toBe(1);
    expect(ev.dispositionTotals.includeExact).toBe(0);
    expect(ev.passSchemaSeal).toBe(false);
    expect(ev.credentialExposure.credentialRotationRequired).toBe(false);
    expect(ev.credentialExposure.classification).toBe("EPHEMERAL_CLI_LOGIN_ROLE_PASSWORD");
  });

  it("blocks exact include of quickbooks_connections and requires hardening for others", () => {
    const ev = JSON.parse(fs.readFileSync(EVIDENCE_JSON, "utf8"));
    const qb = ev.objects.find((o: { identity: string }) => o.identity === "public.quickbooks_connections");
    expect(qb.dispositionCode).toBe(5);
    expect(qb.live.secretBearingColumns).toEqual(["access_token", "refresh_token"]);
    for (const o of ev.objects) {
      if (o.identity === "public.quickbooks_connections") continue;
      expect(o.dispositionCode).toBe(2);
    }
  });

  it("sanitized evidence has no credential/connection secret patterns", () => {
    const blobs = [
      fs.readFileSync(EVIDENCE_JSON, "utf8"),
      fs.readFileSync(EVIDENCE_MD, "utf8"),
    ];
    for (const text of blobs) {
      expect(text).not.toMatch(/PGPASSWORD\s*=\s*\S+/i);
      expect(text).not.toMatch(/postgres(?:ql)?:\/\/[^\s"']+/i);
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/);
      expect(text).not.toMatch(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/);
      expect(text).not.toMatch(/azgyvAcEANsZl9PGMiw0DKnbTnyNwr9g/);
    }
  });

  it("candidate working tree modules still omit the eight object CREATE names", () => {
    const names = [
      "pilot_lifecycle_coverage_downloads",
      "pulse_je_submissions",
      "qbo_accounts_cache",
      "quickbooks_connections",
      "xero_accounts_cache",
      "platform_integrity_chain_status",
      "sp_write_pilot_slot_and_event",
      "v_platform_integrity_current",
    ];
    const man = JSON.parse(gitShow(`${CANDIDATE_COMMIT}:${MANIFEST_PATH}`));
    for (const e of man.entries) {
      const sql = gitShow(`${CANDIDATE_COMMIT}:${e.path}`);
      for (const n of names) {
        // Allow incidental comments only if present; CREATE TABLE/FUNCTION/VIEW of these must be absent
        expect(sql).not.toMatch(new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?(TABLE|FUNCTION|VIEW)\\s+[\\s\\S]{0,40}${n}`, "i"));
      }
    }
  });
});
