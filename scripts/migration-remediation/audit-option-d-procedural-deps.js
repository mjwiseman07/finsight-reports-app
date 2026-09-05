#!/usr/bin/env node
/**
 * Audit Option D assembled set for procedural prerequisite classifications.
 * Read-only static analysis — no database.
 */
const fs = require("fs");
const path = require("path");
const { splitStatements, analyzeStatement } = require("./baseline-sql-analyzer");

const ROOT = path.join(__dirname, "..", "..");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const DEP = path.join(ROOT, "docs/migration-remediation/option-d-dependency-manifest.json");
const OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-procedural-dependency-audit.json",
);

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const dep = JSON.parse(fs.readFileSync(DEP, "utf8"));
  const ordered = [...manifest.entries].sort((a, b) => a.order - b.order);

  const findings = [];
  const byClass = {
    required_prerequisite: 0,
    intentionally_verifies_absence: 0,
    safe_conditional: 0,
    postcondition_assertion: 0,
  };

  for (const entry of ordered) {
    const sql = fs.readFileSync(path.join(ASSEMBLED, entry.assembledFilename), "utf8");
    for (const stmt of splitStatements(sql)) {
      const a = analyzeStatement(stmt);
      for (const f of a.proceduralFindings || []) {
        byClass[f.classification] = (byClass[f.classification] || 0) + 1;
        findings.push({
          file: entry.assembledFilename,
          order: entry.order,
          ...f,
        });
      }
    }
  }

  const proceduralEdges = (dep.sources
    ? Object.entries(dep.sources).flatMap(([from, meta]) =>
        (meta.edgeReasons || []).filter((e) =>
          String(e.reason || "").startsWith("procedural_"),
        ),
      )
    : (dep.edgeReasons || []).filter((e) => String(e.reason || "").startsWith("procedural_")));

  // Prefer edgeReasons from changelog/manifest if present
  const edgeReasons = Array.isArray(dep.edgeReasons)
    ? dep.edgeReasons
    : JSON.parse(
        fs.readFileSync(
          path.join(ROOT, "docs/migration-remediation/option-d-ordering-changelog.json"),
          "utf8",
        ).length
          ? "[]"
          : "[]",
      );

  let allProceduralEdges = [];
  try {
    const changelog = JSON.parse(
      fs.readFileSync(
        path.join(ROOT, "docs/migration-remediation/option-d-ordering-changelog.json"),
        "utf8",
      ),
    );
    // edgeReasons live on dependency graph write — pull from dep manifest sources if stored
  } catch {
    /* ignore */
  }

  // Collect from regenerated dependency manifest: scan edge list if we embedded it
  const depFull = dep;
  if (Array.isArray(depFull.unresolvedDependencies)) {
    /* keep */
  }

  const assertionFiles = ordered.filter((e) =>
    /d_assertions_part_/i.test(e.assembledFilename),
  );
  const assertionOrders = Object.fromEntries(
    assertionFiles.map((e) => [e.assembledFilename, e.order]),
  );

  const part2 = "20260707130000_d_assertions_part_2_coverage_projection.sql";
  const part3 = "20260707140000_d_assertions_part_3_coverage_statement.sql";
  const part2Order = assertionOrders[part2] || null;
  const part3Order = assertionOrders[part3] || null;

  const report = {
    generatedAt: new Date().toISOString(),
    classificationCounts: byClass,
    findingCount: findings.length,
    findings,
    assertionOrders,
    part2BeforePart3: part2Order != null && part3Order != null && part2Order < part3Order,
    part2Order,
    part3Order,
    requiredPrerequisiteFindings: findings.filter(
      (f) => f.classification === "required_prerequisite",
    ),
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.part2BeforePart3,
        out: OUT,
        classificationCounts: byClass,
        findingCount: findings.length,
        part2Order,
        part3Order,
        requiredPrerequisiteCount: report.requiredPrerequisiteFindings.length,
      },
      null,
      2,
    ),
  );
  process.exit(report.part2BeforePart3 ? 0 : 1);
}

if (require.main === module) main();
