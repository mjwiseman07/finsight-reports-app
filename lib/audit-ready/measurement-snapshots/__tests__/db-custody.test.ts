import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260818020716_accounting_measurement_snapshots.sql"),
  "utf8",
).replace(/\r\n/g, "\n");

const repository = readFileSync(
  join(process.cwd(), "lib/audit-ready/measurement-snapshots/repository.ts"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("accounting_measurement_snapshots DB custody (Option A)", () => {
  it("does not duplicate company/connection/provider/tenant columns", () => {
    expect(migration).not.toMatch(/^\s+company_id /m);
    expect(migration).not.toContain("accounting_connection_id");
    expect(migration).not.toContain("tenant_or_realm_id");
    expect(migration).toContain("accounting_sync_id uuid NOT NULL");
    expect(migration).toContain("REFERENCES public.accounting_syncs(id)");
  });

  it("5-6. authenticated RLS authorizes through parent accounting_syncs.company_id", () => {
    expect(migration).toContain("FROM public.accounting_syncs s");
    expect(migration).toContain("JOIN public.company_users cu");
    expect(migration).toContain("ON cu.company_id = s.company_id");
    expect(migration).toContain(
      "s.id = accounting_measurement_snapshots.accounting_sync_id",
    );
    expect(migration).not.toContain(
      "cu.company_id = accounting_measurement_snapshots.company_id",
    );
  });

  it("application still fail-closed matches snapshot fields to the parent sync", () => {
    expect(repository).toContain("assertSnapshotMatchesParentSync");
    expect(repository).toContain("hydrateSnapshot");
    expect(repository).toContain("parent.company_id");
    expect(repository).toContain("parent.connection_id");
    expect(repository).toContain("parent.source_system");
    expect(repository).toContain("parent.tenant_id");
  });
});
