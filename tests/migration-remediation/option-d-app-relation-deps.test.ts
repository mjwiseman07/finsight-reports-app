import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeStatement } from "../../scripts/migration-remediation/baseline-sql-analyzer.js";
import {
  evaluateAppRelationOrdering,
  evaluateFixtureSql,
  extractQualifiedRelationRefs,
  extractSecurityDefinerFindings,
  ORDER_107_FILE,
} from "../../scripts/migration-remediation/audit-option-d-app-relation-deps.js";
import {
  evaluateManifestAuthorization,
  sha256Buffer,
} from "../../scripts/migration-remediation/option-d-manifest-authorization.js";

const ROOT = path.resolve(__dirname, "../..");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const GATE = path.join(ROOT, "scripts/migration-remediation/audit-option-d-replay-gate.js");
const APP_REL_AUDIT = path.join(
  ROOT,
  "scripts/migration-remediation/audit-option-d-app-relation-deps.js",
);
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const PROVENANCE = path.join(
  ROOT,
  "docs/migration-remediation/option-d-public-users-provenance.json",
);
const EVIDENCE = path.join(
  ROOT,
  "docs/migration-remediation/option-d-runtime-evidence-2026-09-04a.md",
);
const CLEANUP = path.join(
  ROOT,
  "docs/migration-remediation/option-d-runtime-cleanup-2026-09-04a.json",
);
const ORDER_107 = path.join(
  ROOT,
  "supabase/migrations/20260727000100_users_auth_trigger_single_writer.sql",
);
const OVERRIDES = path.join(
  ROOT,
  "docs/migration-remediation/option-d-dependency-overrides.json",
);
const GATE_JSON = path.join(ROOT, "docs/migration-remediation/option-d-replay-gate.json");
const CLASS_JSON = path.join(
  ROOT,
  "docs/migration-remediation/option-d-unresolved-classification.json",
);

const ORDER_107_SQL = fs.readFileSync(ORDER_107, "utf8");

describe("Option D public.users provenance (order-107)", () => {
  it("retains 2026-09-04a runtime failure and cleanup evidence", () => {
    expect(fs.existsSync(EVIDENCE)).toBe(true);
    expect(fs.existsSync(CLEANUP)).toBe(true);
    const evidence = fs.readFileSync(EVIDENCE, "utf8");
    expect(evidence).toMatch(/order\s+\*\*107\*\*/i);
    expect(evidence).toMatch(/public\.users/);
    expect(evidence).toMatch(/42P01/);
    expect(evidence).toMatch(/3be1765c0d7bda50913b55421541aa8e55cf9c11/);
    const cleanup = JSON.parse(fs.readFileSync(CLEANUP, "utf8"));
    expect(cleanup.error).toMatch(/public\.users/);
  });

  it("classifies historical preexisting / baseline gap; no statements[] CREATE", () => {
    const p = JSON.parse(fs.readFileSync(PROVENANCE, "utf8"));
    expect(p.rootCauseClassification).toBe(
      "historical_reliance_on_preexisting_application_state",
    );
    expect(p.secondaryClassifications).toContain("creator_incorrectly_excluded_from_baseline");
    expect(p.productionSchemaMigrations.authoritativeCreatorRecoverableFromStatements).toBe(
      false,
    );
    expect(p.productionSchemaMigrations.versionsContainingCreateTablePublicUsers).toEqual([]);
    expect(p.gitProvenance.createTableAnywhereInGitHistory).toBe(false);
    expect(p.createRemediation.authorized).toBe(false);
    expect(p.recoveredArtifact).toBeNull();
    expect(p.freshLocalReplayReady).toBe(false);
  });

  it("records required columns, RLS, FK to auth.users, and safe SECURITY DEFINER", () => {
    const p = JSON.parse(fs.readFileSync(PROVENANCE, "utf8"));
    const cols = p.productionLiveDefinition.columns.map((c: { name: string }) => c.name);
    expect(cols).toEqual(
      expect.arrayContaining([
        "id",
        "email",
        "first_name",
        "last_name",
        "business_name",
        "created_at",
      ]),
    );
    expect(p.productionLiveDefinition.rlsEnabled).toBe(true);
    expect(p.productionLiveDefinition.policies.length).toBeGreaterThanOrEqual(2);
    expect(
      p.productionLiveDefinition.constraints.some(
        (c: { def: string }) => /REFERENCES auth\.users\(id\)/i.test(c.def),
      ),
    ).toBe(true);
    expect(p.productionLiveDefinition.writerFunction.securityDefiner).toBe(true);
    expect(p.productionLiveDefinition.writerFunction.searchPath).toBe("public, pg_temp");
    expect(p.productionLiveDefinition.writerFunction.authorizationUsesEditableMetadata).toBe(
      false,
    );
  });

  it("separates public.users from auth.users in the order-107 migration", () => {
    expect(/insert\s+into\s+public\.users\b/i.test(ORDER_107_SQL)).toBe(true);
    expect(/on\s+auth\.users\b/i.test(ORDER_107_SQL)).toBe(true);
    expect(/create\s+table[\s\S]{0,40}public\.users/i.test(ORDER_107_SQL)).toBe(false);
    const refs = extractQualifiedRelationRefs(ORDER_107_SQL);
    expect(refs.some((r) => r.qualified === "public.users")).toBe(true);
    expect(refs.some((r) => r.qualified === "auth.users")).toBe(true);
  });

  it("does not embed production user data in provenance artifact", () => {
    const raw = fs.readFileSync(PROVENANCE, "utf8");
    expect(raw).not.toMatch(/@gmail\.com|@yahoo\.com|password\s*=/i);
    expect(raw).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}\./);
    expect(JSON.parse(raw).recoveredArtifact).toBeNull();
  });
});

describe("Option D application-relation static gate", () => {
  it("detects order-107 missing public.users creator", () => {
    const result = evaluateAppRelationOrdering([
      { filename: "baseline.sql", order: 1, sql: "CREATE TABLE public.companies (id uuid);" },
      { filename: ORDER_107_FILE, order: 107, sql: ORDER_107_SQL },
    ]);
    expect(result.ok).toBe(false);
    expect(result.publicUsersMissingCreator).toBe(true);
    expect(
      result.failures.some(
        (f) =>
          f.rule === "missing_application_relation_creator" &&
          f.table === "users" &&
          f.order107Regression === true,
      ),
    ).toBe(true);
  });

  it("detects misordered creator after consumer", () => {
    const result = evaluateAppRelationOrdering([
      {
        filename: "consumer.sql",
        order: 1,
        sql: "INSERT INTO public.widgets(id) VALUES (gen_random_uuid());",
      },
      {
        filename: "creator.sql",
        order: 2,
        sql: "CREATE TABLE public.widgets (id uuid PRIMARY KEY);",
      },
    ]);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f) => f.rule === "misordered_application_relation_creator")).toBe(
      true,
    );
  });

  it("accepts ordered creator before consumer", () => {
    const result = evaluateAppRelationOrdering([
      {
        filename: "creator.sql",
        order: 1,
        sql: `CREATE TABLE public.users (
          id uuid PRIMARY KEY REFERENCES auth.users(id),
          email text NOT NULL UNIQUE
        );
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        CREATE POLICY "Users can read own record" ON public.users FOR SELECT USING (auth.uid() = id);`,
      },
      { filename: ORDER_107_FILE, order: 2, sql: ORDER_107_SQL },
    ]);
    expect(result.publicUsersCreatorPresent).toBe(true);
    expect(result.publicUsersMissingCreator).toBe(false);
    expect(
      result.failures.filter((f) => f.rule === "missing_application_relation_creator"),
    ).toEqual([]);
  });

  it("function-body INSERT consumes public.users (trigger-function dependency)", () => {
    const a = analyzeStatement(ORDER_107_SQL.split(/;\s*(?=drop trigger)/i)[0] + ";");
    // Full file analysis via evaluate is the integration check; unit-check function stmt:
    const fnOnly = ORDER_107_SQL.match(
      /create or replace function[\s\S]+?\$\$;/i,
    )![0];
    const analyzed = analyzeStatement(fnOnly);
    expect(analyzed.kind).toBe("create_function");
    expect(analyzed.consumes.tables).toContain("users");
    expect(analyzed.consumes.tables).not.toContain("auth");
  });

  it("rejects SECURITY DEFINER without safe search_path", () => {
    const missing = extractSecurityDefinerFindings(
      `CREATE FUNCTION public.bad() RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN NULL; END; $$;`,
      "bad.sql",
    );
    expect(missing.some((f) => f.rule === "security_definer_missing_search_path")).toBe(true);

    const mutable = extractSecurityDefinerFindings(
      `CREATE FUNCTION public.bad() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$ BEGIN NULL; END; $$;`,
      "bad.sql",
    );
    expect(
      mutable.some((f) => f.rule === "security_definer_mutable_or_unsafe_search_path"),
    ).toBe(true);

    const safe = extractSecurityDefinerFindings(ORDER_107_SQL, ORDER_107_FILE);
    expect(safe).toEqual([]);
  });

  it("rejects bare users as platformProvided / optionalExternal", () => {
    const ov = JSON.parse(fs.readFileSync(OVERRIDES, "utf8"));
    expect(ov.platformProvidedTables || []).not.toContain("users");
    expect(ov.optionalExternalTables || []).not.toContain("users");
    const conflated = evaluateFixtureSql(
      "INSERT INTO public.users(id, email) VALUES (gen_random_uuid(), 'x');",
    );
    // Fixture alone has no creator → missing
    expect(conflated.publicUsersMissingCreator).toBe(true);
  });

  it("assembled set + unresolved classification surface public.users as required", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, stdio: "pipe" });
    const classified = JSON.parse(fs.readFileSync(CLASS_JSON, "utf8"));
    const users = (classified.classifications || []).filter(
      (c: { table?: string; classification?: string }) =>
        c.table === "users" && c.classification === "required_missing_create",
    );
    expect(users.length).toBeGreaterThanOrEqual(1);
    expect(classified.requiredDependenciesResolved).toBe(false);

    let gateExit = 0;
    try {
      execFileSync(process.execPath, [GATE], { cwd: ROOT, stdio: "pipe" });
    } catch (e: unknown) {
      gateExit = (e as { status?: number }).status ?? 1;
    }
    expect(gateExit).not.toBe(0);
    const gate = JSON.parse(fs.readFileSync(GATE_JSON, "utf8"));
    expect(gate.ok).toBe(false);
    expect(gate.candidateReplayStaticReady).toBe(false);
    expect(gate.publicUsersMissingCreator).toBe(true);
    expect(gate.appRelationDependenciesResolved).toBe(false);

    let appExit = 0;
    try {
      execFileSync(process.execPath, [APP_REL_AUDIT], { cwd: ROOT, stdio: "pipe" });
    } catch (e: unknown) {
      appExit = (e as { status?: number }).status ?? 1;
    }
    expect(appExit).not.toBe(0);
  });

  it("changed manifest bytes require new runtime authorization", () => {
    const bytes = fs.readFileSync(MANIFEST);
    const hash = sha256Buffer(bytes);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    const auth = evaluateManifestAuthorization({
      expectedSha256: "0".repeat(64),
      authorizedCommit: "a".repeat(40),
      currentHead: "a".repeat(40),
      manifestPath: MANIFEST,
      requireCommitBinding: true,
    });
    expect(auth.ok).toBe(false);
    expect(auth.failures.some((f: { rule: string }) => f.rule === "manifest_sha256_mismatch")).toBe(
      true,
    );
  });
});
