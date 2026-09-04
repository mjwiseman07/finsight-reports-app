import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, beforeEach } from "vitest";
import {
  evaluateManifestAuthorization,
  sha256Buffer,
} from "../../scripts/migration-remediation/option-d-manifest-authorization.js";
import {
  evaluatePlatformBootstrap,
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
const CONTRACT = path.join(
  ROOT,
  "docs/migration-remediation/option-d-platform-prerequisite-contract.json",
);

function emptyFreshInventory(overrides: Record<string, unknown> = {}) {
  return {
    databaseName: "option_d_clean_replay",
    expectedDisposableName: "option_d_clean_replay",
    schemas: ["public", "pg_catalog", "information_schema", "auth", "storage", "extensions", "supabase_migrations"],
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
    schemas: ["public", "auth", "storage", "extensions", "supabase_migrations"],
    roles: ["anon", "authenticated", "service_role"],
    extensions: [{ name: "pgcrypto", schema: "extensions" }],
    relations: [
      { schema: "storage", name: "buckets", kind: "r" },
      { schema: "storage", name: "objects", kind: "r" },
      { schema: "auth", name: "users", kind: "r" },
      { schema: "supabase_migrations", name: "schema_migrations", kind: "r" },
    ],
    columnsByRelation: {
      "storage.buckets": ["id", "name", "public", "file_size_limit", "allowed_mime_types"],
      "storage.objects": ["id", "bucket_id", "name"],
      "auth.users": ["id"],
      "supabase_migrations.schema_migrations": ["version"],
    },
    functions: [
      { schema: "auth", name: "uid" },
      { schema: "auth", name: "role" },
      { schema: "auth", name: "jwt" },
      { schema: "auth", name: "token_expired" },
      { schema: "storage", name: "foldername" },
    ],
    ...overrides,
  };
}

describe("Option D manifest authorization integrity", () => {
  beforeEach(() => {
    resetApplyMetrics();
  });

  it("requires explicit OPTION_D_EXPECTED_MANIFEST_SHA256", () => {
    const result = evaluateManifestAuthorization({ expectedSha256: null, manifestPath: MANIFEST });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "missing_OPTION_D_EXPECTED_MANIFEST_SHA256")).toBe(
      true,
    );
  });

  it("passes when expected equals exact on-disk manifest bytes", () => {
    const observed = sha256Buffer(fs.readFileSync(MANIFEST));
    const result = evaluateManifestAuthorization({
      expectedSha256: observed,
      manifestPath: MANIFEST,
    });
    expect(result.ok).toBe(true);
    expect(result.observedManifestSha256).toBe(observed);
  });

  it("mismatch fails closed and authorizeManifestOrBlock leaves sql attempts at zero", () => {
    resetApplyMetrics();
    const result = evaluateManifestAuthorization({
      expectedSha256: "ff4c5ff1656b5d253b61397e63bb3d8dad946821d8cf9d23df0638089dd8fecb",
      manifestPath: MANIFEST,
    });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "manifest_sha256_mismatch")).toBe(true);

    const blocked = authorizeManifestOrBlock({
      OPTION_D_EXPECTED_MANIFEST_SHA256:
        "ff4c5ff1656b5d253b61397e63bb3d8dad946821d8cf9d23df0638089dd8fecb",
    } as NodeJS.ProcessEnv);
    expect(blocked.ok).toBe(false);
    expect(applyMetrics.sqlApplicationAttempts).toBe(0);
  });

  it("harness APPLY with unauthorized manifest hash exits before SQL (attempts=0)", () => {
    const priorStatus = fs.existsSync(RUNTIME_STATUS) ? fs.readFileSync(RUNTIME_STATUS) : null;
    const env = {
      ...process.env,
      OPTION_D_APPLY: "1",
      OPTION_D_EXPECTED_MANIFEST_SHA256:
        "ff4c5ff1656b5d253b61397e63bb3d8dad946821d8cf9d23df0638089dd8fecb",
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
      expect(status.manifestAuthorization.ok).toBe(false);
    } finally {
      if (priorStatus) fs.writeFileSync(RUNTIME_STATUS, priorStatus);
    }
  });
});

describe("Option D platform bootstrap + freshness reconciliation", () => {
  it("schema present but storage tables absent fails platform bootstrap", () => {
    const result = evaluatePlatformBootstrap({
      platformVersion: "17.6",
      platformStateKnown: true,
      platformInventoryComplete: true,
      schemas: ["public", "auth", "storage", "extensions", "supabase_migrations"],
      roles: ["anon", "authenticated", "service_role"],
      extensions: [{ name: "pgcrypto", schema: "extensions" }],
      relations: [],
      columnsByRelation: {},
      functions: [{ schema: "auth", name: "uid" }],
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

  it("incomplete auth/storage bootstrap fails closed", () => {
    const result = evaluatePlatformBootstrap({
      platformVersion: "17.6",
      platformStateKnown: true,
      platformInventoryComplete: true,
      schemas: ["public", "storage"],
      roles: ["anon"],
      extensions: [],
      relations: [{ schema: "storage", name: "buckets", kind: "r" }],
      columnsByRelation: { "storage.buckets": ["id"] },
      functions: [],
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
        platform: {
          platformVersion: "17.6",
          platformStateKnown: true,
          platformInventoryComplete: true,
          schemas: ["public", "auth", "storage", "extensions", "supabase_migrations"],
          roles: ["anon", "authenticated", "service_role"],
          extensions: [{ name: "pgcrypto", schema: "extensions" }],
          relations: [],
          columnsByRelation: {},
          functions: [{ schema: "auth", name: "uid" }],
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => String(f.rule).includes("storage"))).toBe(true);
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

  it("platform prerequisite contract exists and requires storage.buckets/objects", () => {
    expect(fs.existsSync(CONTRACT)).toBe(true);
    const contract = JSON.parse(fs.readFileSync(CONTRACT, "utf8"));
    const names = contract.requiredRelations.map(
      (r: { schema: string; name: string }) => `${r.schema}.${r.name}`,
    );
    expect(names).toContain("storage.buckets");
    expect(names).toContain("storage.objects");
    expect(contract.requiredFunctions.some((f: { name: string }) => f.name === "uid")).toBe(true);
    expect(defaultPlatformContract().failClosedOnUnknownPlatformState).toBe(true);
  });
});
