import { describe, expect, it } from "vitest";
import {
  REALTIME_INTERNAL_SCHEMA_POLICY,
  REALTIME_INTERNAL_EXACT_RELATIONS,
  evaluateRealtimeInternalSchema,
} from "../../scripts/migration-remediation/option-d-realtime-internal-schema.js";
import { evaluateFreshDisposableDatabase } from "../../scripts/migration-remediation/option-d-fresh-db-guard.js";
import { evaluatePlatformBootstrap } from "../../scripts/migration-remediation/option-d-platform-bootstrap.js";
import { applyMetrics, resetApplyMetrics } from "../../scripts/migration-remediation/run-option-d-isolated-replay.js";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const audit = require("../../scripts/migration-remediation/audit-option-d-platform-deps.js");

function verifiedRealtimeRelations(overrides: Record<string, unknown>[] = []) {
  const base = REALTIME_INTERNAL_EXACT_RELATIONS.map((r) => ({
    schema: "_realtime",
    name: r.name,
    kind: r.kind,
    owner: r.expectedOwner,
    rlsEnabled: false,
  }));
  return [...base, ...overrides];
}

function platformOnlyFreshInventory(overrides: Record<string, unknown> = {}) {
  return {
    databaseName: "postgres",
    expectedDisposableName: "postgres",
    platformOnlyTarget: true,
    supabaseCliVersion: "2.116.0",
    schemas: [
      "public",
      "pg_catalog",
      "information_schema",
      "auth",
      "storage",
      "extensions",
      "realtime",
      "_realtime",
    ],
    publicRelations: [],
    publicFunctions: [],
    publicTypes: [],
    publicSequences: [],
    publicTriggers: [],
    objectsOutsideAllowedSchemas: [],
    realtimeInternalRelations: verifiedRealtimeRelations(),
    schemaMigrationVersions: [],
    inventoryComplete: true,
    requirePlatformBootstrap: false,
    ...overrides,
  };
}

describe("_realtime exact platform inventory", () => {
  it("accepts the verified CLI 2.116.0 four-relation inventory", () => {
    const result = evaluateRealtimeInternalSchema(platformOnlyFreshInventory());
    expect(result.ok).toBe(true);
    expect(REALTIME_INTERNAL_SCHEMA_POLICY.verifiedCliVersions).toContain("2.116.0");
    expect(REALTIME_INTERNAL_EXACT_RELATIONS.map((r) => r.name).sort()).toEqual([
      "extensions",
      "feature_flags",
      "schema_migrations",
      "tenants",
    ]);
  });

  it("rejects extra _realtime relations (inventory drift)", () => {
    const result = evaluateRealtimeInternalSchema(
      platformOnlyFreshInventory({
        realtimeInternalRelations: verifiedRealtimeRelations([
          { schema: "_realtime", name: "advisacor_extra", kind: "r", owner: "supabase_admin", rlsEnabled: false },
        ]),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "realtime_internal_unexpected_relation")).toBe(true);
  });

  it("rejects missing required _realtime relations", () => {
    const result = evaluateRealtimeInternalSchema(
      platformOnlyFreshInventory({
        realtimeInternalRelations: verifiedRealtimeRelations().filter((r) => r.name !== "tenants"),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "realtime_internal_relation_missing")).toBe(true);
  });

  it("rejects misowned _realtime relations", () => {
    const rels = verifiedRealtimeRelations().map((r) =>
      r.name === "tenants" ? { ...r, owner: "postgres" } : r,
    );
    const result = evaluateRealtimeInternalSchema(
      platformOnlyFreshInventory({ realtimeInternalRelations: rels }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "realtime_internal_owner_mismatch")).toBe(true);
  });

  it("rejects missing owner inventory fail-closed", () => {
    const rels = verifiedRealtimeRelations().map((r) =>
      r.name === "extensions" ? { ...r, owner: null } : r,
    );
    const result = evaluateRealtimeInternalSchema(
      platformOnlyFreshInventory({ realtimeInternalRelations: rels }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "realtime_internal_owner_missing")).toBe(true);
  });

  it("rejects application sentinel objects inside _realtime", () => {
    const result = evaluateRealtimeInternalSchema(
      platformOnlyFreshInventory({
        realtimeInternalRelations: verifiedRealtimeRelations([
          {
            schema: "_realtime",
            name: "companies",
            kind: "r",
            owner: "supabase_admin",
            rlsEnabled: false,
          },
        ]),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "realtime_internal_application_object")).toBe(true);
  });

  it("rejects absent _realtime on verified platform-only CLI", () => {
    const result = evaluateRealtimeInternalSchema(
      platformOnlyFreshInventory({
        schemas: ["public", "auth", "storage", "extensions"],
        realtimeInternalRelations: [],
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "realtime_internal_schema_absent")).toBe(true);
  });

  it("freshness gate accepts verified _realtime inventory when schema is present", () => {
    const result = evaluateFreshDisposableDatabase(
      platformOnlyFreshInventory({
        databaseName: "option_d_clean_replay",
        expectedDisposableName: "option_d_clean_replay",
        platformOnlyTarget: false,
        requirePlatformBootstrap: false,
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("freshness gate rejects version-mismatched / incomplete _realtime inventory", () => {
    const result = evaluateFreshDisposableDatabase(
      platformOnlyFreshInventory({
        databaseName: "option_d_clean_replay",
        expectedDisposableName: "option_d_clean_replay",
        platformOnlyTarget: false,
        requirePlatformBootstrap: false,
        realtimeInternalRelations: verifiedRealtimeRelations().slice(0, 2),
      }),
    );
    expect(result.ok).toBe(false);
  });
});

describe("auth.token_expired dependency classification", () => {
  it("does not promote COMMENT taxonomy qbo.auth.token_expired to a startup function prerequisite", () => {
    const sql = `
COMMENT ON COLUMN public.support_tickets.error_class IS
  'Canonical error taxonomy value (e.g. qbo.auth.token_expired). Set on auto-filed tickets.';
`;
    const refs = audit.scanSql(sql, "20260719000000_support_auto_file_engine.sql", 80);
    expect(refs.some((r: { kind: string; name: string }) => r.kind === "function" && r.name === "token_expired")).toBe(
      false,
    );
    expect(
      refs.some(
        (r: { kind: string; classification?: string }) =>
          r.kind === "non_executing_reference" &&
          r.classification === "string_taxonomy_not_startup_prerequisite",
      ),
    ).toBe(true);
  });

  it("still records executable auth.uid() call sites", () => {
    const refs = audit.scanSql(
      `CREATE POLICY p ON public.t USING (auth.uid() = user_id);`,
      "sample.sql",
      1,
    );
    expect(refs.some((r: { kind: string; name: string }) => r.kind === "function" && r.name === "uid")).toBe(true);
  });

  it("platform contract must not require auth.token_expired after reclassification", () => {
    const contractPath = path.join(
      process.cwd(),
      "docs/migration-remediation/option-d-platform-prerequisite-contract.json",
    );
    const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
    const names = (contract.requiredFunctions || []).map(
      (f: { schema: string; name: string }) => `${f.schema}.${f.name}`,
    );
    expect(names).not.toContain("auth.token_expired");
    expect(names).toContain("auth.uid");
  });

  it("missing genuinely required auth.uid is still rejected", () => {
    const result = evaluatePlatformBootstrap({
      platformVersion: "17.6",
      platformStateKnown: true,
      platformInventoryComplete: true,
      supabaseCliVersion: "2.116.0",
      platformOnlyTarget: true,
      platformWorkdirFingerprint: {
        workdir: "C:/tmp/x",
        migrationsSqlCount: 0,
        migrationFiles: [],
        containsAdvisacorPath: false,
      },
      schemaMigrationVersions: [],
      schemas: ["public", "auth", "storage", "extensions"],
      roles: ["anon", "authenticated", "service_role"],
      extensions: [{ name: "pgcrypto", schema: "extensions" }],
      relations: [
        { schema: "storage", name: "buckets", kind: "r" },
        { schema: "storage", name: "objects", kind: "r" },
        { schema: "auth", name: "users", kind: "r" },
      ],
      relationOwners: {
        "storage.buckets": "supabase_storage_admin",
        "storage.objects": "supabase_storage_admin",
        "auth.users": "supabase_auth_admin",
      },
      relationGrants: {
        "storage.buckets": [{ grantee: "service_role", privilege: "SELECT" }],
        "storage.objects": [{ grantee: "service_role", privilege: "SELECT" }],
        "auth.users": [{ grantee: "postgres", privilege: "SELECT" }],
      },
      relationRls: { "storage.buckets": true, "storage.objects": true },
      relationConstraints: {
        "storage.objects": [{ type: "FOREIGN KEY", columns: ["bucket_id"] }],
      },
      columnsByRelation: {
        "storage.buckets": ["id", "name", "public", "file_size_limit", "allowed_mime_types"],
        "storage.objects": ["id", "bucket_id", "name"],
        "auth.users": ["id"],
      },
      columnsDetailedByRelation: {
        "storage.buckets": [
          { name: "id", dataType: "text" },
          { name: "name", dataType: "text" },
          { name: "public", dataType: "boolean" },
          { name: "file_size_limit", dataType: "bigint" },
          { name: "allowed_mime_types", dataType: "ARRAY" },
        ],
        "storage.objects": [
          { name: "id", dataType: "uuid" },
          { name: "bucket_id", dataType: "text" },
          { name: "name", dataType: "text" },
        ],
        "auth.users": [{ name: "id", dataType: "uuid" }],
      },
      functions: [],
    });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "missing_required_function")).toBe(true);
  });
});

describe("preflight failure keeps sqlApplicationAttempts at zero", () => {
  it("does not increment apply metrics when freshness rejects _realtime drift", () => {
    resetApplyMetrics();
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
    const result = evaluateFreshDisposableDatabase(
      platformOnlyFreshInventory({
        realtimeInternalRelations: verifiedRealtimeRelations([
          { schema: "_realtime", name: "extra", kind: "r", owner: "supabase_admin", rlsEnabled: false },
        ]),
      }),
    );
    expect(result.ok).toBe(false);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });
});
