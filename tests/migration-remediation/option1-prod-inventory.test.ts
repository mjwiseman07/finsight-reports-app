import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const SUMMARY = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option1-prod-schema-migrations-hash-inventory.summary.json",
);
const INVENTORY = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option1-prod-schema-migrations-hash-inventory.json",
);
const REPORT = path.join(
  ROOT,
  "docs/migration-remediation/option1-prod-schema-migrations-inventory-2026-09-06.md",
);
const VERSION_LIST = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option1-prod-schema-migrations-version-name-list.json",
);

const SECRETISH =
  /(eyJhbGci|postgres:\/\/|postgresql:\/\/|sk_live_|sk_test_|whsec_|BEGIN (RSA |OPENSSH )?PRIVATE KEY|service_role\s*[:=])/i;

describe("option1 production schema_migrations inventory (read-only)", () => {
  it("summary and inventory artifacts exist with bound pins", () => {
    expect(fs.existsSync(SUMMARY)).toBe(true);
    expect(fs.existsSync(INVENTORY)).toBe(true);
    expect(fs.existsSync(REPORT)).toBe(true);
    expect(fs.existsSync(VERSION_LIST)).toBe(true);
    const summary = JSON.parse(fs.readFileSync(SUMMARY, "utf8"));
    expect(summary.bound.projectRef).toBe("jzmdgwwiestcmmeuhhkr");
    expect(summary.bound.mainHead).toBe("9d8a01d37422179ddd68bbd181a8815d8a893577");
    expect(summary.bound.optionDManifestBlobObserved).toBe("0d2a39a3d4220c8d28e3269a87fa8c01e8bf2d4e");
    expect(summary.manifest_verification.blobMatch).toBe(true);
    expect(summary.manifest_verification.sha256Match).toBe(true);
    expect(summary.dual_hash_verification.allMatch).toBe(true);
    expect(summary.production_totals.version_count).toBe(185);
    expect(summary.production_totals.statements_present_rows).toBe(185);
    expect(summary.production_totals.total_statement_elements).toBe(185);
    expect(summary.option1_feasible_without_squash).toBe(false);
    expect(summary.foundations_gap.can_same_version_host).toBe(false);
  });

  it("version-list cross-check matches inventory order", () => {
    const inv = JSON.parse(fs.readFileSync(INVENTORY, "utf8"));
    const list = JSON.parse(fs.readFileSync(VERSION_LIST, "utf8"));
    expect(list).toHaveLength(185);
    expect(inv.inventory).toHaveLength(185);
    for (let i = 0; i < 185; i++) {
      expect(inv.inventory[i].version).toBe(list[i].version);
      expect(inv.inventory[i].name).toBe(list[i].name);
    }
  });

  it("proposed Option 1 mutate targets are exactly d6_2a-d", () => {
    const summary = JSON.parse(fs.readFileSync(SUMMARY, "utf8"));
    const versions = summary.option1_proposed_mutate_targets.map(
      (t: { production_version: string }) => t.production_version,
    );
    expect(versions).toEqual([
      "20260703182655",
      "20260703184839",
      "20260703190541",
      "20260703192608",
    ]);
    for (const t of summary.option1_proposed_mutate_targets) {
      expect(t.candidate.gitBlob).toMatch(/^[0-9a-f]{40}$/);
      expect(t.candidate.sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(t.existing.combined_sha256).toMatch(/^[0-9a-f]{64}$/);
      expect(t.contains_dml).toBe(true);
    }
  });

  it("inventory artifacts contain no raw SQL bodies or secrets", () => {
    for (const p of [SUMMARY, INVENTORY, REPORT, VERSION_LIST]) {
      const text = fs.readFileSync(p, "utf8");
      expect(SECRETISH.test(text)).toBe(false);
      expect(text).not.toMatch(/INSERT INTO public\.client_active_rules/i);
      expect(text).not.toMatch(/CREATE TABLE public\.firms/i);
    }
  });

  it("candidate substitution SHA-256 matches Option D manifest replacements for d6 family", () => {
    const summary = JSON.parse(fs.readFileSync(SUMMARY, "utf8"));
    const manifest = JSON.parse(
      fs.readFileSync(path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json"), "utf8"),
    );
    const byFile = Object.fromEntries(
      manifest.substitutions.map((s: { filename: string; replacementSha256: string }) => [
        s.filename,
        s.replacementSha256,
      ]),
    );
    const map: Record<string, string> = {
      "20260703182655": "20260703_2000_d6_2a_test_client_activation.sql",
      "20260703184839": "20260703_2200_d6_2b_mfg_activation.sql",
      "20260703190541": "20260703_2300_d6_2c_retail_activation.sql",
      "20260703192608": "20260703_2400_d6_2d_ps_activation.sql",
    };
    for (const t of summary.option1_proposed_mutate_targets) {
      expect(t.candidate.sha256).toBe(byFile[map[t.production_version]]);
    }
  });

  it("phase1 production MD5 matches recovered review-gate pins", () => {
    const inv = JSON.parse(fs.readFileSync(INVENTORY, "utf8"));
    const expected: Record<string, string> = {
      "20260701043602": "5992414bde50c4562925b60361721b44",
      "20260701043707": "60a5d243a32814c9975bd0e1b90e6cee",
      "20260701043911": "6d7ed2de4528c1380dcb0221fc14af39",
      "20260701043931": "d13c0dc54794fe2f0d47dfa43c86ad3e",
    };
    for (const [v, md5] of Object.entries(expected)) {
      const row = inv.inventory.find((r: { version: string }) => r.version === v);
      expect(row.combined_md5).toBe(md5);
    }
  });

  it("secret scan script still passes after inventory docs", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
