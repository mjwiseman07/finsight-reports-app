import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(ROOT, "supabase/migrations-draft/20260701043599_foundations_baseline.sql");
const GENERATOR = path.join(ROOT, "scripts/migration-remediation/generate-foundations-baseline.js");
const MAPPING = path.join(ROOT, "docs/migration-remediation/migration-mapping.json");
const PROD = path.join(ROOT, "docs/migration-remediation/evidence/production-migrations.json");
const PHASE1_MANIFEST = path.join(ROOT, "docs/migration-remediation/evidence/phase1/provenance-manifest.json");
const PHASE1_DIR = path.join(ROOT, "supabase/migrations-draft/recovered-production-history");
const DEPS = path.join(ROOT, "docs/migration-remediation/phase1-dependency-analysis.json");

const EXPECTED_PHASE1_MD5: Record<string, string> = {
  "20260701043602": "5992414bde50c4562925b60361721b44",
  "20260701043707": "60a5d243a32814c9975bd0e1b90e6cee",
  "20260701043911": "6d7ed2de4528c1380dcb0221fc14af39",
  "20260701043931": "d13c0dc54794fe2f0d47dfa43c86ad3e",
};

const REQUIRED_CREATES_MANIFEST = path.join(
  ROOT,
  "docs/migration-remediation/evidence/option-d-required-creates/provenance-manifest.json",
);

const EXPECTED_REQUIRED_MD5: Record<string, { md5: string; len: number; start: string }> = {
  "20260704024059": { md5: "76b4171c8bad53b1ef0965ebf2436366", len: 105, start: "BEGIN;" },
  "20260804213003": { md5: "34ca62d02d68fac9fc81bf485ba1a02c", len: 5454, start: "-- Phase MEM-LIFECYCLE" },
  "20260804234230": { md5: "0b75c1945dea894acbe0427a847d13c5", len: 3274, start: "-- Phase MEM_LIFECYCLE" },
};

function sqlBodyFromRecoveredFile(filePath: string): string {
  const text = fs.readFileSync(filePath, "utf8");
  const idx = text.indexOf("\n\n");
  return idx >= 0 ? text.slice(idx + 2) : text;
}

function md5Utf8(text: string): string {
  return createHash("md5").update(text, "utf8").digest("hex");
}

describe("migration remediation review gate", () => {
  it("baseline draft exists and is non-empty", () => {
    expect(fs.existsSync(BASELINE)).toBe(true);
    expect(fs.statSync(BASELINE).size).toBeGreaterThan(10_000);
  });

  it("generator is deterministic for baseline bytes", () => {
    execFileSync(process.execPath, [GENERATOR], { cwd: ROOT });
    execFileSync(process.execPath, [GENERATOR], { cwd: ROOT });
    const once = fs.readFileSync(BASELINE);
    execFileSync(process.execPath, [GENERATOR], { cwd: ROOT });
    const twice = fs.readFileSync(BASELINE);
    expect(twice.equals(once)).toBe(true);
  });

  it("baseline dependency order validator passes", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/validate-baseline-order.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });

  it("baseline lives outside supabase/migrations (non-deployable)", () => {
    expect(fs.existsSync(path.join(ROOT, "supabase/migrations/20260701043599_foundations_baseline.sql"))).toBe(false);
    for (const f of fs.readdirSync(PHASE1_DIR)) {
      expect(fs.existsSync(path.join(ROOT, "supabase/migrations", f))).toBe(false);
    }
  });

  it("migration mapping math is consistent", () => {
    const mapping = JSON.parse(fs.readFileSync(MAPPING, "utf8"));
    expect(mapping.mathCheck.localSum).toBe(mapping.counts.local);
    expect(mapping.mathCheck.prodSum).toBe(mapping.counts.production);
    expect(mapping.counts.exactVersionMatch).toBe(0);
    expect(mapping.phase1Recovered).toHaveLength(4);
  });

  it("production history starts at phase1", () => {
    const prod = JSON.parse(fs.readFileSync(PROD, "utf8"));
    expect(prod[0].version).toBe("20260701043602");
    expect(prod.length).toBe(185);
  });

  it("recovered phase1 SQL MD5 matches production metadata (UTF-8)", () => {
    const manifest = JSON.parse(fs.readFileSync(PHASE1_MANIFEST, "utf8"));
    expect(manifest.migrations).toHaveLength(4);
    expect(manifest.contains_data_rows).toBe(false);
    for (const row of manifest.migrations) {
      const file = path.join(PHASE1_DIR, row.filename);
      expect(fs.existsSync(file)).toBe(true);
      const body = sqlBodyFromRecoveredFile(file);
      expect(md5Utf8(body)).toBe(EXPECTED_PHASE1_MD5[row.version]);
      expect(row.database_md5_utf8).toBe(EXPECTED_PHASE1_MD5[row.version]);
      expect(row.statement_count).toBe(1);
    }
  });

  it("recovered Option D required originals match production statements[1] bytes and hashes", () => {
    const manifest = JSON.parse(fs.readFileSync(REQUIRED_CREATES_MANIFEST, "utf8"));
    expect(manifest.source_project_ref).toBe("jzmdgwwiestcmmeuhhkr");
    expect(manifest.contains_data_rows).toBe(false);
    expect(manifest.contains_credentials).toBe(false);
    expect(manifest.migrations).toHaveLength(3);
    for (const row of manifest.migrations) {
      const expectRow = EXPECTED_REQUIRED_MD5[row.version];
      expect(expectRow, row.version).toBeDefined();
      const file = path.join(PHASE1_DIR, row.filename);
      const text = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
      const i = text.indexOf(expectRow.start);
      expect(i).toBeGreaterThanOrEqual(0);
      const body = text.slice(i);
      expect(body.length).toBe(expectRow.len);
      expect(md5Utf8(body)).toBe(expectRow.md5);
      expect(row.database_md5_utf8).toBe(expectRow.md5);
      expect(row.sql_body_md5_utf8).toBe(expectRow.md5);
      expect(row.statement_count).toBe(1);
      expect(row.substitution).toBeNull();
      expect(text).not.toMatch(/postgres(ql)?:\/\//i);
      expect(text).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./);
      expect(text).not.toMatch(/INSERT\s+INTO/i);
    }
  });

  it("baseline excludes production backfills and operational UPDATEs", () => {
    const sql = fs.readFileSync(BASELINE, "utf8");
    expect(sql).not.toMatch(/^update\s+public\./im);
    expect(sql).not.toContain("quickbooks_connections");
    expect(sql).toContain("BASELINE_OMIT");
    expect(sql).not.toMatch(/>>> SOURCE: 20260531_backfill_accounting_connections/);
  });

  it("baseline has single outer transaction wrapper", () => {
    const sql = fs.readFileSync(BASELINE, "utf8");
    const begins = (sql.match(/^\s*BEGIN\s*;/gim) ?? []).length;
    const commits = (sql.match(/^\s*COMMIT\s*;/gim) ?? []).length;
    expect(begins).toBe(1);
    expect(commits).toBe(1);
  });

  it("phase1 dependency analysis documents RLS exposure window", () => {
    const deps = JSON.parse(fs.readFileSync(DEPS, "utf8"));
    expect(deps.rlsExposureWindow.tablesExposedWithoutRlsBetweenMigrations.after_migration_1).toContain(
      "subscriptions",
    );
    expect(deps.foundationPrerequisites.every((p: { inBaseline: boolean }) => p.inBaseline)).toBe(true);
    expect(deps.seedAssumptions.phase1_sql_contains_insert).toBe(false);
  });

  it("baseline static scan has no error-severity findings", () => {
    const scan = JSON.parse(
      fs.readFileSync(path.join(ROOT, "docs/migration-remediation/baseline-static-scan.json"), "utf8"),
    );
    expect(scan.findingsBySeverity.error).toHaveLength(0);
    expect(scan.disallowedInsertTargets).toEqual([]);
  });

  it("remediation package passes secret scan", () => {
    execFileSync(process.execPath, [path.join(ROOT, "scripts/migration-remediation/audit-secret-scan.js")], {
      cwd: ROOT,
      stdio: "pipe",
    });
  });

  const MANIFEST = path.join(
    ROOT,
    "docs/migration-remediation/evidence/production-schema-contract-manifest.json",
  );
  const SCHEMA_DIFF = path.join(ROOT, "docs/migration-remediation/production-schema-diff.json");
  const EXPECTED_CONTRACT_SHA =
    "461C94A36E9CB0B9193DE526AED284E3DBBA854FAA7D200F90692CF6D1246577";

  it("G1 production schema contract manifest hash and inventory", () => {
    expect(fs.existsSync(MANIFEST)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    expect(manifest.sha256).toBe(EXPECTED_CONTRACT_SHA);
    expect(manifest.contains_data_rows).toBe(false);
    expect(manifest.contains_credentials).toBe(false);
    expect(manifest.secretScanPassed).toBe(true);
    expect(manifest.committedToGit).toBe(false);
    expect(manifest.inventory.tables).toBe(47);
    expect(manifest.inventory.columns).toBe(737);
    expect(manifest.inventory.constraints).toBe(171);
    expect(manifest.inventory.indexes).toBe(232);
    expect(manifest.inventory.policies).toBe(82);
    expect(manifest.inventory.triggers).toBe(13);
    expect(manifest.inventory.trigger_functions).toBe(7);
    expect(manifest.inventory.views).toBe(1);
    expect(manifest.sourceProjectRef).toBe("jzmdgwwiestcmmeuhhkr");
  });

  it("G1 production schema diff classifies all scoped table drift", () => {
    expect(fs.existsSync(SCHEMA_DIFF)).toBe(true);
    const diff = JSON.parse(fs.readFileSync(SCHEMA_DIFF, "utf8"));
    expect(diff.g1Verdict).toBe("PASS");
    expect(diff.contractManifestSha256).toBe(EXPECTED_CONTRACT_SHA);
    expect(diff.summary.tablesCompared).toBe(47);
    expect(diff.summary.allTablesInDraft).toBe(true);
    expect(diff.summary.viewMatch).toBe(true);
    expect(diff.summary.unexplainedTableCount).toBe(0);
    expect(diff.baselineValidation.foundationPrerequisitesInDraft).toBe(true);
    expect(diff.baselineValidation.backfillExcluded).toBe(true);
    expect(diff.baselineValidation.companyRolesSeedOnly).toBe(true);
    expect(diff.g1DependencyOrderNote).toMatch(/invalidated by.*G2/i);
    const securityErrors = diff.securityFindings.filter(
      (f: { severity: string }) => f.severity === "error",
    );
    expect(securityErrors).toHaveLength(0);
  });

  it("G1 diff documents unresolved lineage gaps without failing schema review", () => {
    const diff = JSON.parse(fs.readFileSync(SCHEMA_DIFF, "utf8"));
    expect(diff.unresolvedGaps.length).toBeGreaterThanOrEqual(3);
    expect(
      diff.unresolvedGaps.some(
        (g: { classification: string }) =>
          g.classification === "production_only_migration_missing_from_git",
      ),
    ).toBe(true);
  });
});
