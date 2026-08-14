/**
 * PR C — static guards for the Demo authority-preservation migration.
 * Does not apply SQL to production.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION = "supabase/migrations/20260814221500_accounting_canonical_connected_grant.sql";

const CANONICAL = "b718823a-0eb8-437d-beba-05c41f6482f9";
const CANONICAL_SYNC = "95da07be-8e2c-4b84-9dcc-8a98fa841273";
const CE526 = "ce526f9b-5d2c-46fc-b6f3-46617ab375bf";
const CE526_SYNC = "774e6be2-ad1b-41fa-859d-163b0805c3ca";
const SUPERSEDE = [
  CE526,
  "671afdab-8f46-4862-a1f2-6ba09b0aec35",
  "5550d2f4-a4c0-430e-a956-419cf20fb331",
  "27da6a2f-d6f1-4621-b5f3-c0dae24ab2c7",
];

describe("PR C canonical connected-grant migration (static)", () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");

  it("preserves previously accepted Demo authority (not recency ranking)", () => {
    expect(sql).toContain(CANONICAL);
    expect(sql).toContain(CANONICAL_SYNC);
    expect(sql).toMatch(/Activity is not authority/i);
    expect(sql).not.toMatch(/order by[\s\S]*updated_at[\s\S]*desc/i);
    expect(sql).not.toMatch(/row_number\s*\(/i);
  });

  it("targets exactly four competing connected rows for supersession", () => {
    for (const id of SUPERSEDE) {
      expect(sql).toContain(id);
    }
    expect(sql).toMatch(/expected 4 connected competitors/i);
    expect(sql).toMatch(/status = 'superseded'/);
    expect(sql).toContain(`superseded_by_connection_id = '${CANONICAL}'`);
  });

  it("does not touch disconnected rows or clear tokens / move syncs", () => {
    expect(sql).toMatch(/leaves disconnected rows untouched/i);
    expect(sql).not.toMatch(/access_token\s*=/);
    expect(sql).not.toMatch(/refresh_token\s*=/);
    expect(sql).not.toMatch(/delete\s+from\s+public\.accounting_syncs/i);
    expect(sql).not.toMatch(/update\s+public\.accounting_syncs/i);
    expect(sql).toContain(CE526_SYNC);
    expect(sql).toMatch(/connection_id = 'ce526f9b-5d2c-46fc-b6f3-46617ab375bf'/);
  });

  it("guards preconditions and postconditions (fail closed)", () => {
    expect(sql).toMatch(/connected_dup_groups <> 1/);
    expect(sql).toMatch(/connected_count <> 5/);
    expect(sql).toMatch(/disconnected_count <> 6/);
    expect(sql).toMatch(/remaining_connected <> 1/);
    expect(sql).toMatch(/connected_dup_groups <> 0/);
    expect(sql).toMatch(/RAISE EXCEPTION/);
  });

  it("installs partial unique connected-grant index only", () => {
    expect(sql).toContain("accounting_connections_one_connected_grant_uidx");
    expect(sql).toMatch(
      /UNIQUE INDEX[\s\S]*\(user_id, provider, tenant_or_realm_id\)[\s\S]*status = 'connected'[\s\S]*tenant_or_realm_id IS NOT NULL/,
    );
  });

  it("documents that connected + disconnected same key remains allowed", () => {
    expect(sql).toMatch(/connected \+ disconnected for the same key remains allowed/i);
  });
});
