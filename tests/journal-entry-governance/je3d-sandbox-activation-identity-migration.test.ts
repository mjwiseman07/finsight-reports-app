/**
 * JE-3D — static guards for durable sandbox activation identity migration.
 * Does not apply SQL to production.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION =
  "supabase/migrations/20260822200000_je3d_sandbox_activation_identity.sql";

describe("JE-3D sandbox activation identity migration (static)", () => {
  const sql = readFileSync(join(process.cwd(), MIGRATION), "utf8");

  it("adds durable provider_environment on accounting_connections", () => {
    expect(sql).toContain("provider_environment");
    expect(sql).toContain("accounting_connections_provider_environment_check");
    expect(sql).toMatch(/IN \('sandbox', 'production'\)/);
  });

  it("adds durable je_activation_demo_role on companies", () => {
    expect(sql).toContain("je_activation_demo_role");
    expect(sql).toContain("companies_je_activation_demo_role_check");
    expect(sql).toContain("DEMO_A_GENERAL_ACCOUNTING");
    expect(sql).toContain("DEMO_B_SPECIALTY");
  });

  it("does not backfill or infer sandbox from company name", () => {
    expect(sql).toMatch(/DO NOT APPLY/i);
    expect(sql).not.toMatch(/UPDATE public\.companies[\s\S]*name/i);
    expect(sql).not.toMatch(/UPDATE public\.accounting_connections[\s\S]*WHERE[\s\S]*name/i);
  });
});
