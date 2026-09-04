import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  evaluateManifestAuthorization,
  evaluateManifestUnchangedSinceAuthorization,
  buildPrewriteAuthorizationEvidence,
  writePrewriteAuthorizationEvidence,
  sha256Buffer,
  resolveGitHead,
} from "../../scripts/migration-remediation/option-d-manifest-authorization.js";
import {
  evaluatePlatformBootstrap,
  fingerprintPlatformWorkdir,
  defaultPlatformContract,
} from "../../scripts/migration-remediation/option-d-platform-bootstrap.js";
import { evaluateFreshDisposableDatabase } from "../../scripts/migration-remediation/option-d-fresh-db-guard.js";
import {
  applyMetrics,
  resetApplyMetrics,
  authorizeManifestOrBlock,
} from "../../scripts/migration-remediation/run-option-d-isolated-replay.js";

const ROOT = path.resolve(__dirname, "../..");
const RUNTIME = path.join(ROOT, "scripts/migration-remediation/run-option-d-isolated-replay.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const RUNTIME_STATUS = path.join(ROOT, "docs/migration-remediation/option-d-runtime-status.json");
const PREWRITE = path.join(
  ROOT,
  "docs/migration-remediation/option-d-prewrite-authorization-evidence.json",
);
const CONTRACT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-platform-prerequisite-contract.json",
);

function emptyFreshInventory(overrides: Record<string, unknown> = {}) {
  return {
    databaseName: "option_d_clean_replay",
    expectedDisposableName: "option_d_clean_replay",
    schemas: [
      "public",
      "pg_catalog",
      "information_schema",
      "auth",
      "storage",
      "extensions",
      "supabase_migrations",
    ],
    publicRelations: [],
    publicFunctions: [],
    publicTypes: [],
    publicSequences: [],
    publicTriggers: [],
    objectsOutsideAllowedSchemas: [],
    schemaMigrationVersions: [],
    inventoryComplete: true,
    ...overrides,
  };
}

function completePlatformInventory(overrides: Record<string, unknown> = {}) {
  return {
    platformVersion: "17.6",
    platformStateKnown: true,
    platformInventoryComplete: true,
    supabaseCliVersion: "2.116.0",
    schemaMigrationVersions: [],
    schemas: ["public", "auth", "storage", "extensions", "supabase_migrations"],
    roles: ["anon", "authenticated", "service_role"],
    extensions: [{ name: "pgcrypto", schema: "extensions", owner: "supabase_admin" }],
    relations: [
      { schema: "storage", name: "buckets", kind: "r" },
      { schema: "storage", name: "objects", kind: "r" },
      { schema: "auth", name: "users", kind: "r" },
      { schema: "supabase_migrations", name: "schema_migrations", kind: "r" },
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
    relationRls: {
      "storage.buckets": true,
      "storage.objects": true,
    },
    relationConstraints: {
      "storage.objects": [{ type: "FOREIGN KEY", columns: ["bucket_id"] }],
    },
    columnsByRelation: {
      "storage.buckets": ["id", "name", "public", "file_size_limit", "allowed_mime_types"],
      "storage.objects": ["id", "bucket_id", "name"],
      "auth.users": ["id"],
      "supabase_migrations.schema_migrations": ["version"],
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
      "supabase_migrations.schema_migrations": [
        { name: "version", dataType: "text", udtName: "text" },
      ],
    },
    functions: [
      { schema: "auth", name: "uid", identityArgs: "" },
      { schema: "auth", name: "role", identityArgs: "" },
      { schema: "auth", name: "jwt", identityArgs: "" },
      { schema: "storage", name: "foldername", identityArgs: "name text" },
    ],
    ...overrides,
  };
}

describe("Option D manifest authorization integrity", () => {
  beforeEach(() => {
    resetApplyMetrics();
  });

  it("requires explicit expected hash and authorized commit", () => {
    const result = evaluateManifestAuthorization({
      expectedSha256: null,
      authorizedCommit: null,
      currentHead: "a".repeat(40),
      manifestPath: MANIFEST,
    });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "missing_OPTION_D_EXPECTED_MANIFEST_SHA256")).toBe(
      true,
    );
    expect(result.failures.some((f) => f.rule === "missing_OPTION_D_AUTHORIZED_COMMIT")).toBe(true);
  });

  it("passes when expected equals exact on-disk bytes and commit matches HEAD", () => {
    const head = resolveGitHead(ROOT);
    const observed = sha256Buffer(fs.readFileSync(MANIFEST));
    const result = evaluateManifestAuthorization({
      expectedSha256: observed,
      authorizedCommit: head,
      currentHead: head,
      manifestPath: MANIFEST,
    });
    expect(result.ok).toBe(true);
    expect(result.observedManifestSha256).toBe(observed);
  });

  it("commit mismatch fails closed with zero SQL attempts", () => {
    const observed = sha256Buffer(fs.readFileSync(MANIFEST));
    const result = evaluateManifestAuthorization({
      expectedSha256: observed,
      authorizedCommit: "b".repeat(40),
      currentHead: "a".repeat(40),
      manifestPath: MANIFEST,
    });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "authorized_commit_mismatch")).toBe(true);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });

  it("mismatch fails closed and authorizeManifestOrBlock leaves sql attempts at zero", () => {
    resetApplyMetrics();
    const blocked = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256:
        "ff4c5ff1656b5d253b61397e63bb3d8dad946821d8cf9d23df0638089dd8fecb",
      OPTION_D_AUTHORIZED_COMMIT: resolveGitHead(ROOT) || "a".repeat(40),
    } as NodeJS.ProcessEnv);
    expect(blocked.ok).toBe(false);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });

  it("writes immutable pre-write evidence with zero SQL attempts", () => {
    const head = resolveGitHead(ROOT);
    const observed = sha256Buffer(fs.readFileSync(MANIFEST));
    const authz = evaluateManifestAuthorization({
      expectedSha256: observed,
      authorizedCommit: head,
      currentHead: head,
      manifestPath: MANIFEST,
    });
    const evidence = buildPrewriteAuthorizationEvidence({
      ...authz,
      sqlApplicationAttempts: 0,
    });
    expect(evidence.sqlApplicationAttempts).toBe(0);
    expect(evidence.expectedManifestSha256).toBe(observed);
    expect(evidence.actualManifestSha256).toBe(observed);
    const tmp = path.join(os.tmpdir(), `option-d-prewrite-${Date.now()}.json`);
    writePrewriteAuthorizationEvidence(evidence, tmp);
    const roundTrip = JSON.parse(fs.readFileSync(tmp, "utf8"));
    expect(roundTrip.sqlApplicationAttempts).toBe(0);
    fs.unlinkSync(tmp);
  });

  it("detects manifest regeneration after authorization", () => {
    const result = evaluateManifestUnchangedSinceAuthorization({
      authorizedObservedSha256: "a".repeat(64),
      manifestBytes: Buffer.from('{"generatedAt":"changed"}'),
    });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "manifest_regenerated_after_authorization")).toBe(
      true,
    );
  });

  it("harness APPLY without SKIP_ASSEMBLE aborts before SQL when authorized", () => {
    const priorStatus = fs.existsSync(RUNTIME_STATUS) ? fs.readFileSync(RUNTIME_STATUS) : null;
    const priorPrewrite = fs.existsSync(PREWRITE) ? fs.readFileSync(PREWRITE) : null;
    const head = resolveGitHead(ROOT);
    const observed = sha256Buffer(fs.readFileSync(MANIFEST));
    const env = {
      ...process.env,
      OPTION_D_APPLY: "1",
      OPTION_D_EXPECTED_MANIFEST_SHA256: observed,
      OPTION_D_AUTHORIZED_COMMIT: head || "",
      OPTION_D_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      OPTION_D_DISPOSABLE_DB_NAME: "postgres",
      OPTION_D_PLATFORM_ONLY_TARGET: "1",
      // intentionally omit OPTION_D_SKIP_ASSEMBLE
    };
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [RUNTIME], { cwd: ROOT, env, stdio: "pipe" });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
    }
    try {
      expect(exitCode).not.toBe(0);
      const status = JSON.parse(fs.readFileSync(RUNTIME_STATUS, "utf8"));
      expect(status.reason).toBe("apply_requires_skip_assemble_to_preserve_authorized_manifest");
      expect(status.sqlApplicationAttempts).toBe(0);
    } finally {
      if (priorStatus) fs.writeFileSync(RUNTIME_STATUS, priorStatus);
      else if (fs.existsSync(RUNTIME_STATUS)) fs.unlinkSync(RUNTIME_STATUS);
      if (priorPrewrite) fs.writeFileSync(PREWRITE, priorPrewrite);
      else if (fs.existsSync(PREWRITE)) fs.unlinkSync(PREWRITE);
    }
  });

  it("harness APPLY with unauthorized manifest hash exits before SQL (attempts=0)", () => {
    const priorStatus = fs.existsSync(RUNTIME_STATUS) ? fs.readFileSync(RUNTIME_STATUS) : null;
    const priorPrewrite = fs.existsSync(PREWRITE) ? fs.readFileSync(PREWRITE) : null;
    const env = {
      ...process.env,
      OPTION_D_APPLY: "1",
      OPTION_D_EXPECTED_MANIFEST_SHA256:
        "ff4c5ff1656b5d253b61397e63bb3d8dad946821d8cf9d23df0638089dd8fecb",
      OPTION_D_AUTHORIZED_COMMIT: resolveGitHead(ROOT) || "a".repeat(40),
      OPTION_D_DATABASE_URL: "postgresql://postgres:postgres@127.0.0.1:54322/option_d_clean_replay",
      OPTION_D_DISPOSABLE_DB_NAME: "option_d_clean_replay",
      OPTION_D_SKIP_ASSEMBLE: "1",
    };
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [RUNTIME], { cwd: ROOT, env, stdio: "pipe" });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
    }
    try {
      expect(exitCode).not.toBe(0);
      const status = JSON.parse(fs.readFileSync(RUNTIME_STATUS, "utf8"));
      expect(status.reason).toBe("manifest_authorization_failed");
      expect(status.sqlApplicationAttempts).toBe(0);
    } finally {
      if (priorStatus) fs.writeFileSync(RUNTIME_STATUS, priorStatus);
      if (priorPrewrite) fs.writeFileSync(PREWRITE, priorPrewrite);
      else if (fs.existsSync(PREWRITE)) fs.unlinkSync(PREWRITE);
    }
  });
});

describe("Option D platform bootstrap + freshness reconciliation", () => {
  it("schema present but storage tables absent fails platform bootstrap", () => {
    const result = evaluatePlatformBootstrap({
      ...completePlatformInventory({
        relations: [],
        relationOwners: {},
        relationGrants: {},
        relationRls: {},
        relationConstraints: {},
        columnsByRelation: {},
        columnsDetailedByRelation: {},
      }),
    });
    expect(result.ok).toBe(false);
    expect(
      result.failures.some(
        (f) =>
          f.rule === "storage_schema_without_catalog_tables" ||
          f.rule === "missing_required_relation",
      ),
    ).toBe(true);
  });

  it("ownership/grant mismatch fails closed", () => {
    const contract = defaultPlatformContract();
    contract.requiredRelations = contract.requiredRelations.map((r) =>
      r.name === "buckets"
        ? {
            ...r,
            expectedOwner: "supabase_storage_admin",
            requiredGrants: [{ grantee: "service_role", privilege: "INSERT" }],
          }
        : r,
    );
    const result = evaluatePlatformBootstrap(
      completePlatformInventory({
        relationOwners: { "storage.buckets": "postgres", "storage.objects": "postgres" },
        relationGrants: {
          "storage.buckets": [{ grantee: "service_role", privilege: "SELECT" }],
          "storage.objects": [{ grantee: "service_role", privilege: "SELECT" }],
        },
      }),
      contract,
    );
    expect(result.ok).toBe(false);
    expect(
      result.failures.some(
        (f) => f.rule === "relation_owner_mismatch" || f.rule === "relation_grant_mismatch",
      ),
    ).toBe(true);
  });

  it("app migrations present on platform startup fail closed", () => {
    const result = evaluatePlatformBootstrap(
      completePlatformInventory({
        schemaMigrationVersions: ["20260701043599"],
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f) => f.rule === "app_migrations_applied_during_platform_startup"),
    ).toBe(true);
  });

  it("workdir fingerprint detects Advisacor migrations that would be applied on start", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "option-d-workdir-"));
    fs.mkdirSync(path.join(tmp, "supabase", "migrations"), { recursive: true });
    fs.writeFileSync(path.join(tmp, "supabase", "migrations", "20260701_app.sql"), "select 1;\n");
    const fp = fingerprintPlatformWorkdir(tmp, ROOT);
    expect(fp.migrationsSqlCount).toBe(1);
    const result = evaluatePlatformBootstrap(
      completePlatformInventory({
        platformOnlyTarget: true,
        platformWorkdirFingerprint: fp,
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f) => f.rule === "platform_workdir_contains_application_migrations"),
    ).toBe(true);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("incomplete auth/storage bootstrap fails closed", () => {
    const result = evaluatePlatformBootstrap({
      platformVersion: "17.6",
      platformStateKnown: true,
      platformInventoryComplete: true,
      supabaseCliVersion: "2.116.0",
      schemas: ["public", "storage"],
      roles: ["anon"],
      extensions: [],
      relations: [{ schema: "storage", name: "buckets", kind: "r" }],
      columnsByRelation: { "storage.buckets": ["id"] },
      columnsDetailedByRelation: { "storage.buckets": [{ name: "id", dataType: "text" }] },
      functions: [],
      schemaMigrationVersions: [],
    });
    expect(result.ok).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);
  });

  it("unknown platform state fails closed", () => {
    const result = evaluatePlatformBootstrap({
      platformVersion: null,
      platformStateKnown: false,
      platformInventoryComplete: false,
      schemas: [],
      roles: [],
      extensions: [],
      relations: [],
      columnsByRelation: {},
      functions: [],
    });
    expect(result.ok).toBe(false);
    expect(
      result.failures.some(
        (f) => f.rule === "unknown_platform_state" || f.rule === "incomplete_platform_inventory",
      ),
    ).toBe(true);
  });

  it("freshness with requirePlatformBootstrap rejects storage schema without catalogs", () => {
    const result = evaluateFreshDisposableDatabase(
      emptyFreshInventory({
        requirePlatformBootstrap: true,
        platform: completePlatformInventory({
          relations: [],
          relationOwners: {},
          relationGrants: {},
          relationRls: {},
          columnsByRelation: {},
          columnsDetailedByRelation: {},
        }),
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => String(f.rule).includes("storage") || String(f.rule).includes("relation"))).toBe(
      true,
    );
  });

  it("complete platform + empty app inventory can PASS freshness", () => {
    const result = evaluateFreshDisposableDatabase(
      emptyFreshInventory({
        requirePlatformBootstrap: true,
        platform: completePlatformInventory(),
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("platform prerequisite contract exists, rejects dump/restore, requires storage catalogs", () => {
    expect(fs.existsSync(CONTRACT)).toBe(true);
    const contract = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
    expect(contract.dumpRestoreRejected).toBe(true);
    expect(contract.initializationMode).toBe("supabase_cli_platform_only_temp_workdir");
    expect(contract.schemaMigrationsPolicy?.allowedAbsentCliVersions).toContain("2.116.0");
    expect(contract.realtimeInternalSchemaPolicy?.schema).toBe("_realtime");
    expect(contract.realtimeInternalSchemaPolicy?.verifiedCliVersions).toContain("2.116.0");
    const names = contract.requiredRelations.map(
      (r: { schema: string; name: string }) => `${r.schema}.${r.name}`,
    );
    expect(names).toContain("storage.buckets");
    expect(names).toContain("storage.objects");
    expect(names).not.toContain("supabase_migrations.schema_migrations");
    expect(contract.requiredFunctions.some((f: { name: string }) => f.name === "uid")).toBe(true);
  });
});
