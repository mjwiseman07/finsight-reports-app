#!/usr/bin/env node
/**
 * Audit Option D assembled set for column-level dependency gaps.
 * Read-only static analysis — no database.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  analyzeStatement,
  splitStatements,
  simulateReplay,
} = require("./baseline-sql-analyzer");
const { columnIdentity } = require("./option-d-column-identity");
const { withAssembleLock } = require("./option-d-assemble-lock");

const ROOT = path.join(__dirname, "..", "..");
const ASSEMBLED = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/assembled",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const OUT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-column-dependency-audit.json",
);

function sha256File(p) {
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
  const ordered = [...manifest.entries].sort((a, b) => a.order - b.order);

  const columnCreators = new Map(); // id -> {file, order, kind, sourceSha256}
  const consumes = [];

  for (const entry of ordered) {
    const abs = path.join(ASSEMBLED, entry.assembledFilename);
    const sql = fs.readFileSync(abs, "utf8");
    const stmts = splitStatements(sql);
    for (let i = 0; i < stmts.length; i++) {
      const a = analyzeStatement(stmts[i]);
      for (const id of a.creates.columnIdentities || []) {
        if (!columnCreators.has(id)) {
          columnCreators.set(id, {
            identity: id,
            file: entry.assembledFilename,
            order: entry.order,
            kind: a.kind,
            statementIndex: i + 1,
            sourceSha256: entry.assembledSha256 || sha256File(abs),
            originalSource: entry.originalSource,
          });
        }
      }
      if (a.kind === "rename_table") {
        const from = (a.consumes.tables || [])[0];
        const to = (a.creates.tables || [])[0];
        if (from && to) {
          for (const [id, meta] of [...columnCreators.entries()]) {
            if (!id.startsWith(`${from}.`)) continue;
            // Only transfer columns created at/before this rename order
            if (meta.order > entry.order) continue;
            const newId = `${to}${id.slice(from.length)}`;
            if (!columnCreators.has(newId)) {
              columnCreators.set(newId, {
                ...meta,
                identity: newId,
                file: entry.assembledFilename,
                order: entry.order,
                kind: "rename_table",
                statementIndex: i + 1,
                sourceSha256: entry.assembledSha256 || sha256File(abs),
                originalSource: entry.originalSource,
                renamedFrom: id,
              });
            }
          }
        }
      }
      for (const id of a.consumes.columnIdentities || []) {
        const conditional = (a.consumes.conditionalColumnIdentities || []).includes(id);
        const creator = columnCreators.get(id) || null;
        let classification = "required_missing_create";
        if (conditional) classification = "safe_conditional";
        else if (creator && creator.order < entry.order) classification = "creator_in_set_ordered";
        else if (creator && creator.file === entry.assembledFilename) {
          classification =
            creator.statementIndex <= i + 1
              ? "creator_in_set_ordered"
              : "creator_in_set_misordered_same_file";
        } else if (creator && creator.order >= entry.order) {
          classification = "creator_in_set_misordered";
        }
        consumes.push({
          identity: id,
          consumer: entry.assembledFilename,
          consumerOrder: entry.order,
          kind: a.kind,
          statementIndex: i + 1,
          snippet: stmts[i].replace(/\s+/g, " ").trim().slice(0, 220),
          conditional,
          firstCreator: creator
            ? `${creator.file}@${creator.order}`
            : null,
          creatorOrder: creator?.order ?? null,
          creatorSourceSha256: creator?.sourceSha256 ?? null,
          classification,
        });
      }
    }
  }

  const sections = ordered.map((e) => ({
    file: e.assembledFilename,
    sql: fs.readFileSync(path.join(ASSEMBLED, e.assembledFilename), "utf8"),
  }));
  const sim = simulateReplay(sections, { failOnMissing: false });

  const misordered = consumes.filter((c) =>
    ["creator_in_set_misordered", "creator_in_set_misordered_same_file"].includes(
      c.classification,
    ),
  );
  const missing = consumes.filter((c) => c.classification === "required_missing_create");
  const uniqueMissing = [...new Set(missing.map((c) => c.identity))].sort();
  const uniqueMisordered = [...new Set(misordered.map((c) => c.identity))].sort();

  const d67 = ordered.find((e) =>
    e.assembledFilename.includes("20260705_d67_p1_ar_cash_app_layer0_layer1"),
  );
  const order11Focus = {
    runtimeFailedOrder: 11,
    runtimeFailedFile: "20260705_d67_p1_ar_cash_app_layer0_layer1.sql",
    currentAssembledOrder: d67?.order ?? null,
    companyIdConsumes: consumes.filter(
      (c) =>
        c.consumer.includes("20260705_d67_p1_ar_cash_app_layer0_layer1") &&
        c.identity === "firm_clients.company_id",
    ),
    failingHypothesis: {
      statement:
        "INSERT INTO public.ar_cash_app_config (firm_id, company_id) SELECT firm_id, company_id FROM public.firm_clients ON CONFLICT (company_id) DO NOTHING",
      missingColumn: "firm_clients.company_id",
      creator: columnCreators.get("firm_clients.company_id") || null,
      rootCauseClass: columnCreators.has("firm_clients.company_id")
        ? "creator_alter_ordered_too_late_before_column_graph"
        : "missing_original_or_wrong_object",
    },
  };

  const report = {
    generatedAt: new Date().toISOString(),
    assembledCount: ordered.length,
    createIdentityCount: columnCreators.size,
    consumeCount: consumes.length,
    requiredMissingCount: uniqueMissing.length,
    uniqueRequiredMissingIdentities: uniqueMissing,
    misorderedCount: uniqueMisordered.length,
    uniqueMisorderedIdentities: uniqueMisordered,
    requiredDependenciesResolved: uniqueMissing.length === 0 && uniqueMisordered.length === 0,
    simulateReplayColumnViolations: (sim.violations || []).filter((v) =>
      String(v.missing || "").startsWith("column "),
    ),
    order11Focus,
    columnCreators: [...columnCreators.values()].sort((a, b) => a.order - b.order),
    consumes,
  };

  fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        ok: report.requiredDependenciesResolved,
        createIdentityCount: report.createIdentityCount,
        consumeCount: report.consumeCount,
        requiredMissingCount: report.requiredMissingCount,
        misorderedCount: report.misorderedCount,
        order11Missing: order11Focus.failingHypothesis.missingColumn,
        order11Creator: order11Focus.failingHypothesis.creator,
        out: OUT,
      },
      null,
      2,
    ),
  );
  process.exit(report.requiredDependenciesResolved ? 0 : 1);
}

if (require.main === module) withAssembleLock(main);

module.exports = { columnIdentity };
