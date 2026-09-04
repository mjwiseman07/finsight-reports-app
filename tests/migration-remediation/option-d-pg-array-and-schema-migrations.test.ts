import { describe, expect, it } from "vitest";
import {
  parsePostgresTextArray,
  normalizePgArrayColumns,
} from "../../scripts/migration-remediation/option-d-pg-array.js";
import {
  evaluatePlatformBootstrap,
  SCHEMA_MIGRATIONS_ABSENCE_POLICY,
  defaultPlatformContract,
} from "../../scripts/migration-remediation/option-d-platform-bootstrap.js";
import { applyMetrics, resetApplyMetrics } from "../../scripts/migration-remediation/run-option-d-isolated-replay.js";

function baseInventory(overrides: Record<string, unknown> = {}) {
  return {
    platformVersion: "17.6",
    platformStateKnown: true,
    platformInventoryComplete: true,
    supabaseCliVersion: "2.116.0",
    platformOnlyTarget: true,
    platformWorkdirFingerprint: {
      workdir: "C:/Users/mattj/tmp-option-d-platform-only",
      migrationsSqlCount: 0,
      migrationFiles: [],
      containsAdvisacorPath: false,
    },
    schemaMigrationVersions: [],
    schemas: ["public", "auth", "storage", "extensions"],
    roles: ["anon", "authenticated", "service_role"],
    extensions: [{ name: "pgcrypto", schema: "extensions", owner: "supabase_admin" }],
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
      "storage.objects": [{ type: "FOREIGN KEY", columns: "{bucket_id}" }],
    },
    columnsByRelation: {
      "storage.buckets": ["id", "name", "public", "file_size_limit", "allowed_mime_types"],
      "storage.objects": ["id", "bucket_id", "name"],
      "auth.users": ["id"],
    },
    columnsDetailedByRelation: {
      "storage.buckets": [
        { name: "id", dataType: "text", udtName: "text" },
        { name: "name", dataType: "text", udtName: "text" },
        { name: "public", dataType: "boolean", udtName: "bool" },
        { name: "file_size_limit", dataType: "bigint", udtName: "int8" },
        { name: "allowed_mime_types", dataType: "ARRAY", udtName: "_text" },
      ],
      "storage.objects": [
        { name: "id", dataType: "uuid", udtName: "uuid" },
        { name: "bucket_id", dataType: "text", udtName: "text" },
        { name: "name", dataType: "text", udtName: "text" },
      ],
      "auth.users": [{ name: "id", dataType: "uuid", udtName: "uuid" }],
    },
    functions: [
      { schema: "auth", name: "jwt", identityArgs: "" },
      { schema: "auth", name: "role", identityArgs: "" },
      { schema: "auth", name: "token_expired", identityArgs: "" },
      { schema: "auth", name: "uid", identityArgs: "" },
      { schema: "storage", name: "foldername", identityArgs: "text" },
    ],
    ...overrides,
  };
}

describe("PostgreSQL array-text parsing", () => {
  it("accepts native JavaScript string arrays", () => {
    const r = parsePostgresTextArray(["bucket_id", "id"]);
    expect(r.ok).toBe(true);
    expect(r.columns).toEqual(["bucket_id", "id"]);
  });

  it("accepts PostgreSQL array-text such as {bucket_id}", () => {
    const r = normalizePgArrayColumns("{bucket_id}");
    expect(r.ok).toBe(true);
    expect(r.columns).toEqual(["bucket_id"]);
  });

  it("accepts quoted/escaped array members", () => {
    const r = parsePostgresTextArray('{"bucket_id","weird,name","a\\"b"}');
    expect(r.ok).toBe(true);
    expect(r.columns).toEqual(["bucket_id", "weird,name", 'a"b']);
  });

  it("fails closed on malformed braces", () => {
    expect(parsePostgresTextArray("bucket_id").ok).toBe(false);
    expect(parsePostgresTextArray("{bucket_id").ok).toBe(false);
    expect(parsePostgresTextArray("bucket_id}").ok).toBe(false);
  });

  it("fails closed on multidimensional arrays", () => {
    expect(parsePostgresTextArray("{{a,b},{c,d}}").ok).toBe(false);
    expect(parsePostgresTextArray([["a"], ["b"]]).ok).toBe(false);
  });

  it("fails closed on null-containing constraint column lists", () => {
    expect(normalizePgArrayColumns("{NULL}").ok).toBe(false);
    expect(normalizePgArrayColumns(["bucket_id", null]).ok).toBe(false);
  });

  it("fails closed on unexpected types and unclosed quotes", () => {
    expect(parsePostgresTextArray(42).ok).toBe(false);
    expect(parsePostgresTextArray('{"unterminated').ok).toBe(false);
    expect(parsePostgresTextArray(null).ok).toBe(false);
  });

  it("does not use naive comma splitting for quoted commas", () => {
    const r = parsePostgresTextArray('{"a,b",c}');
    expect(r.ok).toBe(true);
    expect(r.columns).toEqual(["a,b", "c"]);
  });
});

describe("schema_migrations presence/absence policy", () => {
  it("accepts legitimate platform-only absence on CLI 2.116.0", () => {
    const result = evaluatePlatformBootstrap(baseInventory());
    expect(result.ok).toBe(true);
    expect(SCHEMA_MIGRATIONS_ABSENCE_POLICY.allowedAbsentCliVersions).toContain("2.116.0");
  });

  it("rejects unsafe/ambiguous absence without platform-only provenance", () => {
    const result = evaluatePlatformBootstrap(
      baseInventory({ platformOnlyTarget: false }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "unsafe_schema_migrations_absence")).toBe(true);
  });

  it("rejects absence on CLI version mismatch (drift)", () => {
    const result = evaluatePlatformBootstrap(
      baseInventory({ supabaseCliVersion: "2.117.0" }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f) => f.rule === "schema_migrations_absence_cli_version_mismatch"),
    ).toBe(true);
  });

  it("accepts existing empty platform migration history when relation present", () => {
    const result = evaluatePlatformBootstrap(
      baseInventory({
        schemas: ["public", "auth", "storage", "extensions", "supabase_migrations"],
        relations: [
          { schema: "storage", name: "buckets", kind: "r" },
          { schema: "storage", name: "objects", kind: "r" },
          { schema: "auth", name: "users", kind: "r" },
          { schema: "supabase_migrations", name: "schema_migrations", kind: "r" },
        ],
        schemaMigrationVersions: [],
        relationConstraints: {
          "storage.objects": [{ type: "FOREIGN KEY", columns: ["bucket_id"] }],
        },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("rejects nonempty Advisacor migration history", () => {
    const result = evaluatePlatformBootstrap(
      baseInventory({
        schemas: ["public", "auth", "storage", "extensions", "supabase_migrations"],
        relations: [
          { schema: "storage", name: "buckets", kind: "r" },
          { schema: "storage", name: "objects", kind: "r" },
          { schema: "auth", name: "users", kind: "r" },
          { schema: "supabase_migrations", name: "schema_migrations", kind: "r" },
        ],
        schemaMigrationVersions: ["20260701043599"],
        relationConstraints: {
          "storage.objects": [{ type: "FOREIGN KEY", columns: ["bucket_id"] }],
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f) => f.rule === "app_migrations_applied_during_platform_startup"),
    ).toBe(true);
  });

  it("rejects unknown nonempty migration history", () => {
    const result = evaluatePlatformBootstrap(
      baseInventory({
        schemas: ["public", "auth", "storage", "extensions", "supabase_migrations"],
        relations: [
          { schema: "storage", name: "buckets", kind: "r" },
          { schema: "storage", name: "objects", kind: "r" },
          { schema: "auth", name: "users", kind: "r" },
          { schema: "supabase_migrations", name: "schema_migrations", kind: "r" },
        ],
        schemaMigrationVersions: ["20200101000000"],
        relationConstraints: {
          "storage.objects": [{ type: "FOREIGN KEY", columns: ["bucket_id"] }],
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "unknown_or_nonempty_migration_history")).toBe(
      true,
    );
  });

  it("parses array-text FK columns during constraint checks", () => {
    const result = evaluatePlatformBootstrap(
      baseInventory({
        relationConstraints: {
          "storage.objects": [{ type: "FOREIGN KEY", columns: "{bucket_id}" }],
        },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("fails closed on malformed constraint column arrays", () => {
    const result = evaluatePlatformBootstrap(
      baseInventory({
        relationConstraints: {
          "storage.objects": [{ type: "FOREIGN KEY", columns: "{bucket_id" }],
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "pg_array_parse_failed")).toBe(true);
  });

  it("contract documents absence policy without fabricating the table", () => {
    const c = defaultPlatformContract();
    expect(c.schemaMigrationsPolicy.mode).toBe("optional_absent_on_bound_platform_only_cli");
    expect(c.requiredRelations.some((r) => r.name === "schema_migrations")).toBe(false);
    expect(c.requiredSchemas).not.toContain("supabase_migrations");
  });
});

describe("preflight failure leaves sqlApplicationAttempts at zero", () => {
  it("metrics remain zero when bootstrap evaluation fails", () => {
    resetApplyMetrics();
    const result = evaluatePlatformBootstrap(baseInventory({ platformOnlyTarget: false }));
    expect(result.ok).toBe(false);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });
});
