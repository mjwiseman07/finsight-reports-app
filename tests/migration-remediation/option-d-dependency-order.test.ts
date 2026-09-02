import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeMigrationFile,
  buildDependencyGraph,
  computeOptionDDependencyOrder,
  stableTopoSort,
  validateNoDuplicatesOrOmissions,
} from "../../scripts/migration-remediation/option-d-dependency-order.js";

const ROOT = path.resolve(__dirname, "../..");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const DEP_MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-dependency-manifest.json");
const CHANGELOG = path.join(ROOT, "docs/migration-remediation/option-d-ordering-changelog.json");
const OVERRIDES = path.join(ROOT, "docs/migration-remediation/option-d-dependency-overrides.json");
const MIGRATIONS = path.join(ROOT, "supabase/migrations");

const D6_0 = "20260703_1200_d6_0_vertical_rule_foundation.sql";
const D5 = "20260714_00_d5_recurring_templates.sql";

describe("Option D dependency ordering", () => {
  it("regression: lexicographic order places d6_0 before d5 (order-10 recurring_fires failure)", () => {
    const lex = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort();
    // Among post-phase1-ish files present in migrations dir:
    expect(lex.indexOf(D6_0)).toBeGreaterThanOrEqual(0);
    expect(lex.indexOf(D5)).toBeGreaterThanOrEqual(0);
    expect(lex.indexOf(D6_0)).toBeLessThan(lex.indexOf(D5));

    const d6 = analyzeMigrationFile(path.join(MIGRATIONS, D6_0));
    const d5 = analyzeMigrationFile(path.join(MIGRATIONS, D5));
    expect(d5.creates.tables).toContain("recurring_fires");
    expect(d6.alters).toContain("recurring_fires");
    expect(d6.consumes.tables).toContain("recurring_fires");
  });

  it("assembler dependency order places d5 before d6_0 and preserves source hashes", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, encoding: "utf8" });
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const dep = JSON.parse(fs.readFileSync(DEP_MANIFEST, "utf8"));
    const changelog = JSON.parse(fs.readFileSync(CHANGELOG, "utf8"));

    const d5Order = manifest.entries.find((e: { assembledFilename: string }) => e.assembledFilename === D5)?.order;
    const d6Order = manifest.entries.find((e: { assembledFilename: string }) => e.assembledFilename === D6_0)?.order;
    expect(d5Order).toBeDefined();
    expect(d6Order).toBeDefined();
    expect(d5Order!).toBeLessThan(d6Order!);

    expect(changelog.recurringFiresRegression.dependencyOrderSatisfied).toBe(true);
    expect(manifest.ordering.recurringFiresRegression.dependencyOrderSatisfied).toBe(true);

    // Complete set: no omit/duplicate
    expect(manifest.counts.totalAssembled).toBe(140);
    expect(manifest.entries).toHaveLength(140);
    const names = manifest.entries.map((e: { assembledFilename: string }) => e.assembledFilename);
    expect(new Set(names).size).toBe(140);

    // Source hashes preserved on entries
    for (const e of manifest.entries) {
      expect(e.originalSha256 || e.assembledSha256).toBeTruthy();
      expect(String(e.assembledSha256)).toMatch(/^[a-f0-9]{64}$/);
    }

    // Explicit override documented
    const overrides = JSON.parse(fs.readFileSync(OVERRIDES, "utf8"));
    expect(overrides.explicitDependsOn[D6_0]).toContain(D5);
    expect(dep.explicitDependsOn[D6_0]).toContain(D5);
    expect(dep.dependencyOrder.indexOf(D5)).toBeLessThan(dep.dependencyOrder.indexOf(D6_0));
  });

  it("detects cycles, duplicates, and omissions", () => {
    const names = ["a.sql", "b.sql", "c.sql"];
    const dependsOn = new Map([
      ["a.sql", new Set(["b.sql"])],
      ["b.sql", new Set(["c.sql"])],
      ["c.sql", new Set(["a.sql"])],
    ]);
    const { order, cycles } = stableTopoSort(names, dependsOn);
    expect(cycles.length).toBeGreaterThan(0);
    expect(order.length).toBeLessThan(3);

    expect(validateNoDuplicatesOrOmissions(["a.sql", "a.sql"], ["a.sql"])).toContain(
      "duplicate filenames in candidate set",
    );
    expect(validateNoDuplicatesOrOmissions(["a.sql", "b.sql"], ["a.sql"])).toContain(
      "omitted from order: b.sql",
    );
  });

  it("does not invent edges that only exist because a table name appears later without create→consume", () => {
    // Two independent creates — order should remain lexicographic (stable tie-break)
    const dir = fs.mkdtempSync(path.join(ROOT, ".tmp-option-d-dep-"));
    try {
      const a = "20260101_aaa.sql";
      const b = "20260102_bbb.sql";
      fs.writeFileSync(path.join(dir, a), "CREATE TABLE IF NOT EXISTS public.alpha (id uuid);\n");
      fs.writeFileSync(path.join(dir, b), "CREATE TABLE IF NOT EXISTS public.beta (id uuid);\n");
      const candidates = [
        { filename: a, absPath: path.join(dir, a) },
        { filename: b, absPath: path.join(dir, b) },
      ];
      const result = computeOptionDDependencyOrder(candidates, {
        explicitDependsOn: {},
        semanticConstraints: [],
        optionalExternalTables: [],
        platformProvidedTables: [],
      });
      expect(result.ok).toBe(true);
      expect(result.order).toEqual([a, b]);
      expect(result.sources[a].dependsOn).toEqual([]);
      expect(result.sources[b].dependsOn).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("flags unresolved prerequisites that the analyzer cannot prove", () => {
    const dir = fs.mkdtempSync(path.join(ROOT, ".tmp-option-d-dep-"));
    try {
      const f = "20260103_needs_missing.sql";
      fs.writeFileSync(
        path.join(dir, f),
        "ALTER TABLE public.does_not_exist_anywhere ADD COLUMN IF NOT EXISTS x int;\n",
      );
      const result = computeOptionDDependencyOrder(
        [{ filename: f, absPath: path.join(dir, f) }],
        { explicitDependsOn: {}, optionalExternalTables: [], platformProvidedTables: [] },
      );
      expect(result.unresolved.some((u) => u.missing === "table does_not_exist_anywhere")).toBe(
        true,
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("inferred alter_requires_create edge links d6_0 to d5 for recurring_fires", () => {
    const candidates = [
      { filename: D6_0, absPath: path.join(MIGRATIONS, D6_0) },
      { filename: D5, absPath: path.join(MIGRATIONS, D5) },
    ];
    const overrides = JSON.parse(fs.readFileSync(OVERRIDES, "utf8"));
    const graph = buildDependencyGraph(candidates, overrides);
    expect([...(graph.dependsOn.get(D6_0) || [])]).toContain(D5);
    const reasons = graph.edgeReasons.filter((e) => e.from === D6_0 && e.to === D5);
    expect(reasons.some((r) => /recurring_fires|explicitDependsOn/.test(r.reason))).toBe(true);
  });
});
