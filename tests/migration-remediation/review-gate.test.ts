import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(ROOT, "supabase/migrations-draft/20260701043599_foundations_baseline.sql");
const GENERATOR = path.join(ROOT, "scripts/migration-remediation/generate-foundations-baseline.js");
const MAPPING = path.join(ROOT, "docs/migration-remediation/migration-mapping.json");
const PROD = path.join(ROOT, "docs/migration-remediation/evidence/production-migrations.json");

describe("migration remediation review gate", () => {
  it("baseline draft exists and is non-empty", () => {
    expect(fs.existsSync(BASELINE)).toBe(true);
    expect(fs.statSync(BASELINE).size).toBeGreaterThan(10_000);
  });

  it("generator is deterministic for baseline bytes", () => {
    const before = fs.readFileSync(BASELINE);
    execFileSync(process.execPath, [GENERATOR], { cwd: ROOT });
    const after = fs.readFileSync(BASELINE);
    expect(after.equals(before)).toBe(true);
  });

  it("baseline lives outside supabase/migrations (non-deployable)", () => {
    const deployable = path.join(ROOT, "supabase/migrations/20260701043599_foundations_baseline.sql");
    expect(fs.existsSync(deployable)).toBe(false);
  });

  it("migration mapping math is consistent", () => {
    const mapping = JSON.parse(fs.readFileSync(MAPPING, "utf8"));
    expect(mapping.mathCheck.localSum).toBe(mapping.counts.local);
    expect(mapping.mathCheck.prodSum).toBe(mapping.counts.production);
    expect(mapping.counts.exactVersionMatch).toBe(0);
    expect(mapping.phase1ProdOnly).toHaveLength(4);
  });

  it("production history starts at phase1", () => {
    const prod = JSON.parse(fs.readFileSync(PROD, "utf8"));
    expect(prod[0].version).toBe("20260701043602");
    expect(prod[0].name).toBe("phase1_subscriptions_core");
    expect(prod.length).toBe(185);
  });

  it("baseline static scan has no error-severity findings", () => {
    const scanPath = path.join(ROOT, "docs/migration-remediation/baseline-static-scan.json");
    expect(fs.existsSync(scanPath)).toBe(true);
    const scan = JSON.parse(fs.readFileSync(scanPath, "utf8"));
    expect(scan.findingsBySeverity.error).toHaveLength(0);
  });

  it("remediation package passes secret scan", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });
});
