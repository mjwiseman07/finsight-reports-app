import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  analyzeStatement,
  analyzeSql,
  simulateReplay,
} from "../../scripts/migration-remediation/baseline-sql-analyzer.js";
import {
  buildDependencyGraph,
  computeOptionDDependencyOrder,
} from "../../scripts/migration-remediation/option-d-dependency-order.js";
import {
  allConsumesConditionallyGuarded,
  classifyUnresolvedOccurrences,
} from "../../scripts/migration-remediation/option-d-unresolved-classifier.js";

const ROOT = path.resolve(__dirname, "../..");
const MIGRATIONS = path.join(ROOT, "supabase/migrations");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const CLASS_JSON = path.join(
  ROOT,
  "docs/migration-remediation/option-d-unresolved-classification.json",
);

const ERP_ONLY = {
  file: "20260717130000_tcp1_w3_erp_connections_disconnected_at.sql",
  table: "erp_connections",
  classification: "safe_conditional",
};

const FORMERLY_REQUIRED = [
  { file: "20260805054000_schema_drift_issue_policies.sql", table: "lifecycle_issues" },
  { file: "20260806031500_major_2_2_lifecycle_issues_drift_kinds.sql", table: "lifecycle_issues" },
  { file: "20260806032000_lifecycle_issues_schema_drift_checks.sql", table: "lifecycle_issues" },
  { file: "20260806040000_major_2_3_block_a_assertion_linkage.sql", table: "lifecycle_issues" },
  { file: "20260806042000_major_2_3_block_a_1_research_revision.sql", table: "lifecycle_issues" },
  { file: "20260810070050_dash_1c_a_widen_provenance.sql", table: "pilot_lifecycle_events" },
  { file: "20260810070100_dash_1c_a_lifecycle_scan_indexes.sql", table: "pilot_lifecycle_events" },
  { file: "20260718220000_q8e_rls_service_role_policies.sql", table: "stripe_webhook_events_legacy" },
  { file: "20260706140000_d_entitlements_followup.sql", table: "stripe_webhook_events_legacy" },
];

const KNOWN_REQUIRED_COLUMN_GAPS = [];

describe("Option D unresolved classification", () => {
  it("erp remains a justified exclusion; recovered CREATE/RENAME/FUNCTION resolve required rows", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, stdio: "pipe" });
    expect(fs.existsSync(CLASS_JSON)).toBe(true);
    const doc = JSON.parse(fs.readFileSync(CLASS_JSON, "utf8"));
    const erp = doc.classifications.find(
      (c: { file: string; table: string }) =>
        c.file === ERP_ONLY.file && c.table === ERP_ONLY.table,
    );
    expect(erp, "erp_connections still listed").toBeDefined();
    expect(erp.classification).toBe("safe_conditional");
    expect(erp.justifiedExclusion).toBe(true);
    expect(erp.absentObjectGenuinelySafe).toBe(true);
    expect(erp.executesWhen.every((w: string) => w !== "unconditional_on_apply")).toBe(true);
    expect(erp.dependencyEdge).toBeNull();

    for (const want of FORMERLY_REQUIRED) {
      const hit = doc.classifications.find(
        (c: { file: string; table: string; classification: string }) =>
          c.file === want.file &&
          c.table === want.table &&
          c.classification === "required_missing_create",
      );
      expect(hit, `${want.file} ${want.table} must not stay required_missing`).toBeUndefined();
    }

    // erp safe_conditional may remain; firm_clients.company_id must not be required_missing.
    const required = doc.classifications.filter(
      (c: { classification: string }) => c.classification === "required_missing_create",
    );
    expect(doc.requiredCount).toBe(required.length);
    expect(
      required.filter((r: { identity?: string }) => r.identity === "firm_clients.company_id"),
    ).toHaveLength(0);
    for (const gap of KNOWN_REQUIRED_COLUMN_GAPS) {
      expect(
        required.some(
          (r: { file: string; identity?: string }) =>
            r.file === gap.file && r.identity === gap.identity,
        ),
        `expected required column gap ${gap.identity}`,
      ).toBe(true);
    }
    expect(doc.requiredDependenciesResolved).toBe(required.length === 0);
    expect(
      doc.classifications.filter(
        (c: { kind?: string; classification: string }) =>
          c.kind === "function" && c.classification === "required_missing_create",
      ),
    ).toHaveLength(0);
  });

  it("erp_connections SQL is to_regclass-gated; lifecycle_issues ALTER is not", () => {
    const erp = fs.readFileSync(
      path.join(MIGRATIONS, "20260717130000_tcp1_w3_erp_connections_disconnected_at.sql"),
      "utf8",
    );
    const life = fs.readFileSync(
      path.join(MIGRATIONS, "20260806032000_lifecycle_issues_schema_drift_checks.sql"),
      "utf8",
    );
    expect(allConsumesConditionallyGuarded(erp, "erp_connections")).toBe(true);
    expect(allConsumesConditionallyGuarded(life, "lifecycle_issues")).toBe(false);
  });

  it("rename-created objects are not required-missing and order CREATE/RENAME before consumers", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-rename-"));
    try {
      const a = "20260101_create_old.sql";
      const b = "20260102_rename_old_to_new.sql";
      const c = "20260103_alter_new.sql";
      fs.writeFileSync(path.join(dir, a), "CREATE TABLE public.old_name (id int);\n");
      fs.writeFileSync(
        path.join(dir, b),
        "ALTER TABLE public.old_name RENAME TO new_name;\n",
      );
      fs.writeFileSync(
        path.join(dir, c),
        "ALTER TABLE public.new_name ADD COLUMN IF NOT EXISTS x int;\n",
      );
      const parsed = analyzeStatement("ALTER TABLE public.old_name RENAME TO new_name");
      expect(parsed.kind).toBe("rename_table");
      expect(parsed.creates.tables).toContain("new_name");
      expect(parsed.consumes.tables).toContain("old_name");

      const candidates = [a, b, c].map((filename) => ({
        filename,
        absPath: path.join(dir, filename),
      }));
      const result = computeOptionDDependencyOrder(candidates, {
        explicitDependsOn: {},
        optionalExternalTables: [],
        platformProvidedTables: [],
      });
      expect(result.ok).toBe(true);
      expect(result.order.indexOf(a)).toBeLessThan(result.order.indexOf(b));
      expect(result.order.indexOf(b)).toBeLessThan(result.order.indexOf(c));
      expect(result.unresolved.some((u) => /new_name/.test(u.missing))).toBe(false);
      expect(result.sources[c].dependsOn).toContain(b);

      const sim = simulateReplay(
        candidates.map((x) => ({
          file: x.filename,
          sql: fs.readFileSync(x.absPath, "utf8"),
        })),
      );
      expect(sim.ok).toBe(true);
      expect(sim.available.tables.has("new_name")).toBe(true);
      expect(sim.available.tables.has("old_name")).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("unsafe missing CREATE stays required (not treated as conditional)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-unsafe-"));
    try {
      const f = "20260104_alter_ghost.sql";
      fs.writeFileSync(
        path.join(dir, f),
        "ALTER TABLE public.ghost_table ADD COLUMN IF NOT EXISTS x int;\n",
      );
      const candidates = [{ filename: f, absPath: path.join(dir, f) }];
      const graph = buildDependencyGraph(candidates, {
        explicitDependsOn: {},
        optionalExternalTables: [],
        platformProvidedTables: [],
      });
      const classified = classifyUnresolvedOccurrences({
        unresolved: graph.unresolved,
        candidates,
        graph,
        knownProvidedTables: new Set(),
        lineageHints: {},
      });
      expect(classified.requiredCount).toBe(1);
      expect(classified.classifications[0].classification).toBe("required_missing_create");
      expect(classified.classifications[0].justifiedExclusion).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("ALTER TABLE IF EXISTS is a justified exclusion; DROP POLICY IF EXISTS is not", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-cond-"));
    try {
      const safeFile = "20260105_alter_if_exists.sql";
      const unsafeFile = "20260106_drop_policy.sql";
      fs.writeFileSync(
        path.join(dir, safeFile),
        "ALTER TABLE IF EXISTS public.maybe_missing ADD COLUMN IF NOT EXISTS x int;\n",
      );
      fs.writeFileSync(
        path.join(dir, unsafeFile),
        'DROP POLICY IF EXISTS "p" ON public.still_required;\n',
      );
      const candidates = [
        { filename: safeFile, absPath: path.join(dir, safeFile) },
        { filename: unsafeFile, absPath: path.join(dir, unsafeFile) },
      ];
      const graph = buildDependencyGraph(candidates, {
        explicitDependsOn: {},
        optionalExternalTables: [],
        platformProvidedTables: [],
      });
      const classified = classifyUnresolvedOccurrences({
        unresolved: graph.unresolved,
        candidates,
        graph,
        knownProvidedTables: new Set(),
        lineageHints: {},
      });
      const safe = classified.classifications.find((c) => c.table === "maybe_missing");
      const unsafe = classified.classifications.find((c) => c.table === "still_required");
      expect(safe?.classification).toBe("safe_conditional");
      expect(safe?.justifiedExclusion).toBe(true);
      expect(unsafe?.classification).toBe("required_missing_create");
      expect(unsafe?.justifiedExclusion).toBe(false);
      expect(classified.requiredCount).toBe(1);
      expect(classified.requiredDependenciesResolved).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("does not drop unresolved rows when classifying (erp still listed)", () => {
    const sql = analyzeSql(
      fs.readFileSync(
        path.join(MIGRATIONS, "20260717130000_tcp1_w3_erp_connections_disconnected_at.sql"),
        "utf8",
      ),
    );
    expect(sql.consumes.tables).toContain("erp_connections");
  });
});
