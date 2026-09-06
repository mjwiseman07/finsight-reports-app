#!/usr/bin/env node
/**
 * Fail-closed dependency-order validator for draft foundations baseline.
 * Validates manifest graph, source order, and generated baseline replay simulation.
 */
const fs = require("fs");
const path = require("path");
const {
  loadManifest,
  validateManifestGraph,
  validateFileOrder,
  validateBaselineSql,
  orderedFilesFromPhases,
  lexicographicSourceOrder,
  parseBaselineSections,
} = require("./baseline-sql-analyzer");

const ROOT = path.join(__dirname, "..", "..");
const SRC_DIR = path.join(ROOT, "supabase", "migrations");
const BASELINE = path.join(ROOT, "supabase", "migrations-draft", "20260701043599_foundations_baseline.sql");
const OUT_JSON = path.join(ROOT, "docs", "migration-remediation", "baseline-order-validation.json");

function main() {
  const manifest = loadManifest();
  const report = {
    generatedAt: new Date().toISOString(),
    ok: true,
    checks: {},
  };

  const graph = validateManifestGraph(manifest);
  report.checks.manifestGraph = graph;
  if (!graph.ok) report.ok = false;

  const lexOrder = lexicographicSourceOrder(manifest, SRC_DIR);
  const lexReplay = validateFileOrder(lexOrder, manifest, SRC_DIR);
  report.checks.lexicographicOrderReplay = {
    order: lexOrder,
    ok: lexReplay.ok,
    violationCount: lexReplay.violations.length,
    firstViolation: lexReplay.violations[0] || null,
    note: "Expected to FAIL — reproduces G2 regression",
  };

  const phaseOrder = orderedFilesFromPhases(manifest);
  const phaseReplay = validateFileOrder(phaseOrder, manifest, SRC_DIR);
  report.checks.phaseOrderReplay = {
    order: phaseOrder,
    ok: phaseReplay.ok,
    violationCount: phaseReplay.violations.length,
    firstViolation: phaseReplay.violations[0] || null,
  };
  if (!phaseReplay.ok) report.ok = false;

  if (!fs.existsSync(BASELINE)) {
    report.checks.baselineFile = { ok: false, error: "Baseline file missing" };
    report.ok = false;
  } else {
    const sql = fs.readFileSync(BASELINE, "utf8");
    const baselineReplay = validateBaselineSql(sql, manifest);
    const sections = parseBaselineSections(sql);
    const sourceFiles = sections.map((s) => s.file);
    const expected = phaseOrder;
    report.checks.baselineReplay = {
      ok: baselineReplay.ok,
      violationCount: baselineReplay.violations.length,
      firstViolation: baselineReplay.violations[0] || null,
    };
    report.checks.baselineSourceOrder = {
      ok:
        sourceFiles.length === expected.length &&
        sourceFiles.every((f, i) => f === expected[i]),
      actual: sourceFiles,
      expected,
    };
    report.checks.baselineSourceCoverage = {
      ok: sourceFiles.length === expected.length && new Set(sourceFiles).size === expected.length,
      count: sourceFiles.length,
    };
    if (!baselineReplay.ok || !report.checks.baselineSourceOrder.ok) report.ok = false;
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2) + "\n");

  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        lexicographicFails: !report.checks.lexicographicOrderReplay.ok,
        phaseOrderOk: report.checks.phaseOrderReplay?.ok,
        baselineReplayOk: report.checks.baselineReplay?.ok,
        outPath: OUT_JSON,
      },
      null,
      2,
    ),
  );
  process.exit(report.ok ? 0 : 1);
}

main();
