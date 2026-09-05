import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  analyzeStatement,
  simulateReplay,
} from "../../scripts/migration-remediation/baseline-sql-analyzer.js";
import {
  columnIdentity,
  parseAlterAddColumns,
  parseCreateTableColumns,
  parseInsertSelectColumnConsumes,
} from "../../scripts/migration-remediation/option-d-column-identity.js";
import {
  buildDependencyGraph,
  stableTopoSort,
} from "../../scripts/migration-remediation/option-d-dependency-order.js";

describe("option-d column identity", () => {
  it("parses CREATE TABLE column list", () => {
    const sql = `CREATE TABLE public.firm_clients (
      id uuid PRIMARY KEY,
      firm_id uuid NOT NULL,
      name text NOT NULL,
      UNIQUE (firm_id, name)
    )`;
    const parsed = parseCreateTableColumns(sql);
    expect(parsed?.table).toBe("firm_clients");
    expect(parsed?.columns).toEqual(["id", "firm_id", "name"]);
  });

  it("parses ALTER ADD COLUMN company_id", () => {
    const sql = `ALTER TABLE firm_clients
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS industry_vertical text`;
    const parsed = parseAlterAddColumns(sql);
    expect(parsed?.table).toBe("firm_clients");
    expect(parsed?.columns).toEqual(["company_id", "industry_vertical"]);
    expect(analyzeStatement(sql).creates.columnIdentities).toContain(
      "firm_clients.company_id",
    );
  });

  it("attributes INSERT SELECT columns to FROM table", () => {
    const sql = `INSERT INTO public.ar_cash_app_config (firm_id, company_id)
SELECT firm_id, company_id
FROM public.firm_clients
ON CONFLICT (company_id) DO NOTHING`;
    const ids = parseInsertSelectColumnConsumes(sql);
    expect(ids).toContain("firm_clients.firm_id");
    expect(ids).toContain("firm_clients.company_id");
    const a = analyzeStatement(sql);
    expect(a.consumes.columnIdentities).toContain("firm_clients.company_id");
  });

  it("orders column creator before consumer via dependency graph", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-col-"));
    const creator = "20260708_00_d0_identity_and_memory_activation.sql";
    const consumer = "20260705_d67_p1_ar_cash_app_layer0_layer1.sql";
    fs.writeFileSync(
      path.join(dir, creator),
      `ALTER TABLE firm_clients ADD COLUMN IF NOT EXISTS company_id uuid;\n`,
    );
    fs.writeFileSync(
      path.join(dir, consumer),
      `INSERT INTO public.ar_cash_app_config (firm_id, company_id)
SELECT firm_id, company_id FROM public.firm_clients;\n`,
    );
    const candidates = [creator, consumer].map((filename) => ({
      filename,
      absPath: path.join(dir, filename),
    }));
    const graph = buildDependencyGraph(candidates, {
      explicitDependsOn: {},
      semanticConstraints: [],
    });
    expect(graph.columnCreators.get("firm_clients.company_id")).toContain(creator);
    const edge = graph.edgeReasons.find(
      (e) => e.reason === "consume_column:firm_clients.company_id",
    );
    expect(edge).toEqual({
      from: consumer,
      to: creator,
      reason: "consume_column:firm_clients.company_id",
    });
    const { order, cycles } = stableTopoSort(
      candidates.map((c) => c.filename),
      graph.dependsOn,
    );
    expect(cycles).toEqual([]);
    expect(order.indexOf(creator)).toBeLessThan(order.indexOf(consumer));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("simulateReplay fails when company_id consumed before ADD COLUMN", () => {
    const sim = simulateReplay(
      [
        {
          file: "consumer.sql",
          sql: `INSERT INTO t(a) SELECT company_id FROM firm_clients;`,
        },
        {
          file: "creator.sql",
          sql: `ALTER TABLE firm_clients ADD COLUMN company_id uuid;`,
        },
      ],
      { failOnMissing: true, optionalTables: ["t", "firm_clients"] },
    );
    expect(sim.ok).toBe(false);
    expect(sim.violations[0].missing).toBe("column firm_clients.company_id");
  });

  it("REFERENCES auth.users consumes users not auth schema", () => {
    const a = analyzeStatement(`CREATE TABLE t (
      id uuid PRIMARY KEY,
      user_id uuid REFERENCES auth.users(id),
      firm_id uuid REFERENCES public.firm_clients(id)
    )`);
    expect(a.consumes.tables).toContain("firm_clients");
    expect(a.consumes.tables).not.toContain("auth");
    // auth.* is platform — not treated as a candidate-table dependency
    expect(a.consumes.tables).not.toContain("users");
  });

  it("DROP POLICY ON storage.objects ignores platform schema", () => {
    const a = analyzeStatement(
      `DROP POLICY IF EXISTS je_backup_service_role_all ON storage.objects`,
    );
    expect(a.consumes.tables).toEqual([]);
  });

  it("columnIdentity normalizes", () => {
    expect(columnIdentity("Public.Firm_Clients", '"Company_Id"')).toBe(
      "firm_clients.company_id",
    );
  });
});
