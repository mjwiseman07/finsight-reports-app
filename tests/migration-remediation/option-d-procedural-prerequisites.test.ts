import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeStatement,
  splitStatements,
} from "../../scripts/migration-remediation/baseline-sql-analyzer.js";
import {
  buildDependencyGraph,
  stableTopoSort,
} from "../../scripts/migration-remediation/option-d-dependency-order.js";
import {
  extractProceduralFindings,
  requiredPrerequisiteTablesInSql,
} from "../../scripts/migration-remediation/option-d-procedural-prerequisites.js";

const PART2 = "20260707130000_d_assertions_part_2_coverage_projection.sql";
const PART3 = "20260707140000_d_assertions_part_3_coverage_statement.sql";
const PART1 = "20260707120000_d_assertions_part_1_schema_and_backfill.sql";

const PART3_RAISE = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'close_assertion_coverage'
  ) THEN
    RAISE EXCEPTION 'D-Assertions Part 2 close_assertion_coverage missing — Part 3 requires Part 2 applied first';
  END IF;
END$$;
`;

describe("option-d procedural prerequisites", () => {
  it("classifies Part 3 information_schema NOT EXISTS + RAISE as required_prerequisite", () => {
    const findings = extractProceduralFindings(PART3_RAISE);
    expect(findings.some((f) => f.identity === "close_assertion_coverage")).toBe(true);
    expect(
      findings.find((f) => f.identity === "close_assertion_coverage")?.classification,
    ).toBe("required_prerequisite");
    expect(requiredPrerequisiteTablesInSql(PART3_RAISE)).toContain(
      "close_assertion_coverage",
    );
    const a = analyzeStatement(PART3_RAISE.trim());
    expect(a.consumes.requiredPrerequisiteTables).toContain("close_assertion_coverage");
    expect(a.consumes.tables).toContain("close_assertion_coverage");
  });

  it("does not treat comments or filenames as proof", () => {
    const sql = `-- Part 3 requires Part 2 close_assertion_coverage
SELECT 1;`;
    expect(extractProceduralFindings(sql)).toEqual([]);
    expect(requiredPrerequisiteTablesInSql(sql)).toEqual([]);
  });

  it("classifies to_regclass IS NOT NULL as safe_conditional (not required)", () => {
    const sql = `DO $$ BEGIN
  IF to_regclass('public.erp_connections') IS NOT NULL THEN
    ALTER TABLE public.erp_connections ADD COLUMN IF NOT EXISTS x int;
  END IF;
END$$;`;
    const findings = extractProceduralFindings(sql);
    expect(findings.every((f) => f.classification === "safe_conditional")).toBe(true);
    expect(requiredPrerequisiteTablesInSql(sql)).toEqual([]);
  });

  it("classifies IF EXISTS then RAISE as intentionally_verifies_absence", () => {
    const sql = `DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='legacy_bad'
  ) THEN
    RAISE EXCEPTION 'legacy_bad must not exist';
  END IF;
END$$;`;
    const findings = extractProceduralFindings(sql);
    expect(findings[0]?.classification).toBe("intentionally_verifies_absence");
    expect(requiredPrerequisiteTablesInSql(sql)).toEqual([]);
  });

  it("classifies RAISE inside CREATE FUNCTION as postcondition_assertion", () => {
    const sql = `CREATE OR REPLACE FUNCTION public.guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable';
END;
$$;`;
    const a = analyzeStatement(sql);
    expect(
      a.proceduralFindings.some((f) => f.classification === "postcondition_assertion"),
    ).toBe(true);
    expect(a.consumes.requiredPrerequisiteTables || []).toEqual([]);
  });

  it("orders Part 2 before Part 3 via procedural_requires_table edge (P0001 regression)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-assert-"));
    fs.writeFileSync(
      path.join(dir, PART2),
      `CREATE TABLE public.close_assertion_coverage (id uuid PRIMARY KEY);\nCREATE TABLE public.assertion_gap_root_causes (root_cause_code text PRIMARY KEY);\n`,
    );
    fs.writeFileSync(path.join(dir, PART3), PART3_RAISE);
    const candidates = [PART3, PART2].map((filename) => ({
      filename,
      absPath: path.join(dir, filename),
    }));
    const graph = buildDependencyGraph(candidates, {
      explicitDependsOn: {},
      semanticConstraints: [],
      optionalExternalTables: [],
      platformProvidedTables: [],
    });
    expect(
      graph.edgeReasons.some(
        (e) =>
          e.from === PART3 &&
          e.to === PART2 &&
          e.reason === "procedural_requires_table:close_assertion_coverage",
      ),
    ).toBe(true);
    const { order, cycles } = stableTopoSort(
      candidates.map((c) => c.filename),
      graph.dependsOn,
    );
    expect(cycles).toEqual([]);
    expect(order.indexOf(PART2)).toBeLessThan(order.indexOf(PART3));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("fails unresolved when required procedural table has no creator", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-assert-miss-"));
    fs.writeFileSync(path.join(dir, PART3), PART3_RAISE);
    const candidates = [{ filename: PART3, absPath: path.join(dir, PART3) }];
    const graph = buildDependencyGraph(candidates, {
      explicitDependsOn: {},
      semanticConstraints: [],
      optionalExternalTables: [],
      platformProvidedTables: [],
    });
    expect(
      graph.unresolved.some(
        (u) => u.file === PART3 && u.missing === "table close_assertion_coverage",
      ),
    ).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("links Part 2 constraint RAISE to Part 1 ADD CONSTRAINT creator", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-assert-con-"));
    fs.writeFileSync(
      path.join(dir, PART1),
      `ALTER TABLE public.ai_action_log
  ADD CONSTRAINT ai_action_log_action_category_check CHECK (true);\n`,
    );
    fs.writeFileSync(
      path.join(dir, PART2),
      `DO $$
DECLARE cur_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO cur_def
  FROM pg_constraint
  WHERE conname = 'ai_action_log_action_category_check';
  IF cur_def IS NULL OR cur_def NOT LIKE '%assertion_coverage_scan%' THEN
    RAISE EXCEPTION 'ai_action_log_action_category_check missing Part 1 widenings; Part 2 refusing to run';
  END IF;
END$$;\n`,
    );
    const candidates = [PART1, PART2].map((filename) => ({
      filename,
      absPath: path.join(dir, filename),
    }));
    const graph = buildDependencyGraph(candidates, {
      explicitDependsOn: {},
      semanticConstraints: [],
      optionalExternalTables: [],
      platformProvidedTables: [],
    });
    expect(graph.constraintCreators.get("ai_action_log_action_category_check")).toContain(
      PART1,
    );
    expect(
      graph.edgeReasons.some(
        (e) =>
          e.from === PART2 &&
          e.to === PART1 &&
          e.reason ===
            "procedural_requires_constraint:ai_action_log_action_category_check",
      ),
    ).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("real Part 3 migration SQL declares the three required tables", () => {
    const root = path.resolve(__dirname, "../..");
    const sql = fs.readFileSync(
      path.join(root, "supabase/migrations", PART3),
      "utf8",
    );
    const required = requiredPrerequisiteTablesInSql(sql);
    expect(required).toEqual(
      expect.arrayContaining([
        "close_assertion_coverage",
        "assertion_gap_root_causes",
        "assertions_catalog",
      ]),
    );
  });
});
