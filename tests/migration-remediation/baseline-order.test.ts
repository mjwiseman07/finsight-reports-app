import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadManifest,
  orderedFilesFromPhases,
  parseBaselineSections,
  simulateReplay,
  validateBaselineSql,
  validateFileOrder,
  validateManifestGraph,
  lexicographicSourceOrder,
} from "../../scripts/migration-remediation/baseline-sql-analyzer.js";

const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(ROOT, "supabase/migrations-draft/20260701043599_foundations_baseline.sql");
const GENERATOR = path.join(ROOT, "scripts/migration-remediation/generate-foundations-baseline.js");
const VALIDATOR = path.join(ROOT, "scripts/migration-remediation/validate-baseline-order.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/baseline-source-dependency-manifest.json");
const SRC_DIR = path.join(ROOT, "supabase/migrations");

const G2_FAILED_BLOB_SHA = "4b955a1d48a0b6d07d2fa6c27e3f6f2dea784f91";

describe("baseline dependency ordering", () => {
  const manifest = loadManifest();

  it("manifest covers exactly 33 source files across phases", () => {
    const phaseFiles = orderedFilesFromPhases(manifest);
    expect(phaseFiles).toHaveLength(33);
    expect(Object.keys(manifest.sources)).toHaveLength(33);
    expect(new Set(phaseFiles).size).toBe(33);
  });

  it("manifest dependency graph is acyclic and phase order respects dependsOn", () => {
    const graph = validateManifestGraph(manifest);
    expect(graph.ok).toBe(true);
    expect(graph.errors).toHaveLength(0);
  });

  it("regression: lexicographic order fails replay (reproduces G2 42P01)", () => {
    const lex = lexicographicSourceOrder(manifest, SRC_DIR);
    const companiesCreateIdx = lex.indexOf("20260530_create_company_accounts.sql");
    const accountTypeIdx = lex.indexOf("20260530_add_account_type_onboarding.sql");
    expect(accountTypeIdx).toBeLessThan(companiesCreateIdx);

    const replay = validateFileOrder(lex, manifest, SRC_DIR);
    expect(replay.ok).toBe(false);
    const companiesViolation = replay.violations.find(
      (v) =>
        v.file === "20260530_add_account_type_onboarding.sql" && v.missing === "table companies",
    );
    expect(companiesViolation).toBeDefined();
    expect(manifest.g2FailureRegression.sqlstate).toBe("42P01");
    expect(manifest.g2FailureRegression.failedBlobSha256).toBe(G2_FAILED_BLOB_SHA);
  });

  it("dependency phase order passes replay simulation", () => {
    const order = orderedFilesFromPhases(manifest);
    const replay = validateFileOrder(order, manifest, SRC_DIR);
    expect(replay.ok).toBe(true);
    expect(replay.violations).toHaveLength(0);
  });

  it("companies creation precedes add_account_type_onboarding in generated baseline", () => {
    const sections = parseBaselineSections(fs.readFileSync(BASELINE, "utf8"));
    const files = sections.map((s) => s.file);
    const companiesIdx = files.indexOf("20260530_create_company_accounts.sql");
    const accountTypeIdx = files.indexOf("20260530_add_account_type_onboarding.sql");
    expect(companiesIdx).toBeGreaterThanOrEqual(0);
    expect(accountTypeIdx).toBeGreaterThan(companiesIdx);
  });

  it("pdf create precedes pdf alter in generated baseline", () => {
    const sections = parseBaselineSections(fs.readFileSync(BASELINE, "utf8"));
    const files = sections.map((s) => s.file);
    expect(files.indexOf("20260531_create_pdf_package_customizations.sql")).toBeLessThan(
      files.indexOf("20260531_alter_pdf_package_customizations_for_package_control.sql"),
    );
  });

  it("company memory core precedes constraints, indexes, RLS, and immutability", () => {
    const sections = parseBaselineSections(fs.readFileSync(BASELINE, "utf8"));
    const files = sections.map((s) => s.file);
    const coreIdx = files.indexOf("20260605_create_company_memory_persistence_core_tables.sql");
    for (const dep of [
      "20260605_add_company_memory_persistence_constraints.sql",
      "20260605_add_company_memory_persistence_indexes.sql",
      "20260605_add_company_memory_persistence_rls_policies.sql",
      "20260605_harden_company_memory_persistence_immutability.sql",
    ]) {
      expect(files.indexOf(dep)).toBeGreaterThan(coreIdx);
    }
  });

  it("SI table creators precede SI RLS and immutability", () => {
    const sections = parseBaselineSections(fs.readFileSync(BASELINE, "utf8"));
    const files = sections.map((s) => s.file);
    const rlsIdx = files.indexOf("20260603_add_si_snapshot_rls_policies.sql");
    const immutIdx = files.indexOf("20260603_harden_si_snapshot_immutability.sql");
    for (const creator of [
      "20260603_create_si_historical_snapshots.sql",
      "20260603_create_si_snapshot_audit.sql",
      "20260603_create_si_snapshot_payloads.sql",
    ]) {
      expect(files.indexOf(creator)).toBeLessThan(rlsIdx);
      expect(files.indexOf(creator)).toBeLessThan(immutIdx);
    }
  });

  it("shuffled source order fails replay simulation", () => {
    const order = orderedFilesFromPhases(manifest);
    const shuffled = [...order];
    // Swap first company-dependent alter before create_company_accounts
    const createIdx = shuffled.indexOf("20260530_create_company_accounts.sql");
    const alterIdx = shuffled.indexOf("20260530_add_account_type_onboarding.sql");
    [shuffled[createIdx], shuffled[alterIdx]] = [shuffled[alterIdx], shuffled[createIdx]];
    const sections = shuffled.map((file) => ({
      file,
      sql: fs.readFileSync(path.join(SRC_DIR, file), "utf8"),
    }));
    const replay = simulateReplay(sections, {
      optionalTables: manifest.optionalExternalTables || [],
    });
    expect(replay.ok).toBe(false);
  });

  it("generated baseline contains every expected source exactly once", () => {
    const expected = orderedFilesFromPhases(manifest);
    const sections = parseBaselineSections(fs.readFileSync(BASELINE, "utf8"));
    const actual = sections.map((s) => s.file);
    expect(actual).toEqual(expected);
  });

  it("generated baseline passes replay simulation", () => {
    const replay = validateBaselineSql(fs.readFileSync(BASELINE, "utf8"), manifest);
    expect(replay.ok).toBe(true);
  });

  it("generator is deterministic", () => {
    const before = fs.readFileSync(BASELINE);
    execFileSync(process.execPath, [GENERATOR], { cwd: ROOT });
    const after = fs.readFileSync(BASELINE);
    expect(after.equals(before)).toBe(true);
  });

  it("generator fails closed when manifest would equal lexicographic order", () => {
    // Guard is structural: current manifest order differs from lex sort
    const lex = lexicographicSourceOrder(manifest, SRC_DIR).join("|");
    const phase = orderedFilesFromPhases(manifest).join("|");
    expect(lex).not.toBe(phase);
  });

  it("validate-baseline-order CLI passes on current baseline", () => {
    execFileSync(process.execPath, [VALIDATOR], { cwd: ROOT, stdio: "pipe" });
    const report = JSON.parse(
      fs.readFileSync(path.join(ROOT, "docs/migration-remediation/baseline-order-validation.json"), "utf8"),
    );
    expect(report.ok).toBe(true);
    expect(report.checks.lexicographicOrderReplay.ok).toBe(false);
    expect(report.checks.phaseOrderReplay.ok).toBe(true);
    expect(report.checks.baselineReplay.ok).toBe(true);
  });

  it("baseline excludes backfill source and retains only allowlisted reference DML", () => {
    const sql = fs.readFileSync(BASELINE, "utf8");
    expect(sql).not.toMatch(/>>> SOURCE: 20260531_backfill_accounting_connections/);
    expect(sql).not.toMatch(/^update\s+public\./im);
    const inserts = [...sql.matchAll(/insert\s+into\s+(?:public\.)?(\w+)/gi)].map((m) => m[1].toLowerCase());
    const unique = [...new Set(inserts)];
    expect(unique.every((t) => t === "company_roles")).toBe(true);
  });

  it("baseline has single outer transaction without nested boundaries", () => {
    const sql = fs.readFileSync(BASELINE, "utf8");
    expect((sql.match(/^\s*BEGIN\s*;/gim) ?? []).length).toBe(1);
    expect((sql.match(/^\s*COMMIT\s*;/gim) ?? []).length).toBe(1);
    expect(sql).not.toMatch(/^\s*COMMIT\s*;\s*\n[\s\S]*?\n\s*BEGIN\s*;/im);
  });

  it("manifest documents deleted G2 branch and untouched production", () => {
    expect(manifest.g2FailureRegression.branchDeleted).toBe(true);
    expect(manifest.g2FailureRegression.productionUntouched).toBe(true);
    expect(manifest.g2FailureRegression.failedBranchRef).toBe("ewegbkbknmepmmohdxdw");
  });
});
