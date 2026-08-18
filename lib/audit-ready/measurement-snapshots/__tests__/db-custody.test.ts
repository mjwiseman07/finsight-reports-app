import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migrationCc2a1 = readFileSync(
  join(process.cwd(), "supabase/migrations/20260818020716_accounting_measurement_snapshots.sql"),
  "utf8",
).replace(/\r\n/g, "\n");

const migrationCc2a2 = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260818040000_accounting_measurement_snapshots_ap_aging_kind.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const migrationCc2a3 = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260818050000_accounting_measurement_snapshots_inventory_kind.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

const repository = readFileSync(
  join(process.cwd(), "lib/audit-ready/measurement-snapshots/repository.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("accounting_measurement_snapshots DB custody (Option A)", () => {
  it("does not duplicate company/connection/provider/tenant columns", () => {
    expect(migrationCc2a1).not.toMatch(/^\s+company_id /m);
    expect(migrationCc2a1).not.toContain("accounting_connection_id");
    expect(migrationCc2a1).not.toContain("tenant_or_realm_id");
    expect(migrationCc2a1).toContain("accounting_sync_id uuid NOT NULL");
    expect(migrationCc2a1).toContain("REFERENCES public.accounting_syncs(id)");
    expect(migrationCc2a2).not.toMatch(/^\s+company_id /m);
    expect(migrationCc2a2).not.toContain("accounting_connection_id");
    expect(migrationCc2a2).not.toContain("ADD COLUMN");
    expect(migrationCc2a3).not.toMatch(/^\s+company_id /m);
    expect(migrationCc2a3).not.toContain("ADD COLUMN");
  });

  it("5-6. authenticated RLS authorizes through parent accounting_syncs.company_id", () => {
    expect(migrationCc2a1).toContain("FROM public.accounting_syncs s");
    expect(migrationCc2a1).toContain("JOIN public.company_users cu");
    expect(migrationCc2a1).toContain("ON cu.company_id = s.company_id");
    expect(migrationCc2a1).toContain(
      "s.id = accounting_measurement_snapshots.accounting_sync_id",
    );
    expect(migrationCc2a1).not.toContain(
      "cu.company_id = accounting_measurement_snapshots.company_id",
    );
    expect(migrationCc2a2).not.toContain("CREATE POLICY");
    expect(migrationCc2a2).not.toContain("ENABLE ROW LEVEL SECURITY");
    expect(migrationCc2a3).not.toContain("CREATE POLICY");
    expect(migrationCc2a3).not.toContain("ENABLE ROW LEVEL SECURITY");
  });

  it("36. additive CHECK permits ar_aging and ap_aging without rewriting the table", () => {
    expect(migrationCc2a1).toContain("CHECK (snapshot_kind IN ('ar_aging'))");
    expect(migrationCc2a2).toContain("DROP CONSTRAINT IF EXISTS accounting_measurement_snapshots_kind_check");
    expect(migrationCc2a2).toContain(
      "CHECK (snapshot_kind IN ('ar_aging', 'ap_aging'))",
    );
    expect(migrationCc2a2).not.toMatch(/INSERT INTO/i);
    expect(migrationCc2a2).not.toMatch(/UPDATE /i);
    expect(migrationCc2a3).toContain(
      "CHECK (snapshot_kind IN ('ar_aging', 'ap_aging', 'inventory'))",
    );
    expect(migrationCc2a3).not.toMatch(/INSERT INTO/i);
    expect(migrationCc2a3).not.toMatch(/UPDATE /i);
  });

  it("application still fail-closed matches snapshot fields to the parent sync", () => {
    expect(repository).toContain("assertSnapshotMatchesParentSync");
    expect(repository).toContain("hydrateSnapshot");
    expect(repository).toContain("hydrateApSnapshot");
    expect(repository).toContain("persistApMeasurementSnapshot");
    expect(repository).toContain("hydrateInventorySnapshot");
    expect(repository).toContain("persistInventoryMeasurementSnapshot");
    expect(repository).toContain("parent.company_id");
    expect(repository).toContain("parent.connection_id");
    expect(repository).toContain("parent.source_system");
    expect(repository).toContain("parent.tenant_id");
  });
});
