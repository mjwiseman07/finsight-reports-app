import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  validateIsolatedReplayTarget,
  PRODUCTION_PROJECT_REF,
} from "../../scripts/migration-remediation/option-d-target-safety.js";
import { evaluateFreshDisposableDatabase } from "../../scripts/migration-remediation/option-d-fresh-db-guard.js";
import {
  evaluateSecurityBundle,
  evaluateFinalSchemaRls,
  evaluateViewSecurity,
  evaluateImmutability,
  evaluateImmutabilityTriggers,
  evaluateImmutabilityBehavior,
  classifyProbeError,
  PROBE_EXPECTATIONS,
  REQUIRED_BEHAVIORAL_PROBES,
  REQUIRED_IMMUTABILITY_TRIGGERS,
} from "../../scripts/migration-remediation/option-d-security-assertions.js";
import {
  evaluateVitestStructuredResult,
  evaluateVitestRunGate,
  EXPECTED_PR312_TEST_TITLES,
  PR312_COMMIT,
  BLOCKED_SENTINEL_TITLE,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";
import { evaluateOverallRuntimePass } from "../../scripts/migration-remediation/run-option-d-isolated-replay.js";

const ROOT = path.resolve(__dirname, "../..");
const ASSEMBLE = path.join(ROOT, "scripts/migration-remediation/assemble-option-d-replay.js");
const GATE = path.join(ROOT, "scripts/migration-remediation/audit-option-d-replay-gate.js");
const ACTIVE_GATE = path.join(ROOT, "scripts/migration-remediation/audit-data-dependent-replay-gate.js");
const RUNTIME = path.join(ROOT, "scripts/migration-remediation/run-option-d-isolated-replay.js");
const MANIFEST = path.join(ROOT, "docs/migration-remediation/option-d-replay-manifest.json");
const OPTION_D_GATE_JSON = path.join(ROOT, "docs/migration-remediation/option-d-replay-gate.json");
const RUNTIME_STATUS = path.join(ROOT, "docs/migration-remediation/option-d-runtime-status.json");
const SUBST_DIR = path.join(
  ROOT,
  "supabase/migrations-draft/option-d-isolated-replay/substitutions",
);

const BLOCKERS = [
  "20260703_2000_d6_2a_test_client_activation.sql",
  "20260703_2200_d6_2b_mfg_activation.sql",
  "20260703_2300_d6_2c_retail_activation.sql",
  "20260703_2400_d6_2d_ps_activation.sql",
  "20260708120000_tcp1_w1_solo_bk_pilot_slots.sql",
  "20260814221500_accounting_canonical_connected_grant.sql",
];

function vitestReportFromTests(tests: Array<{ title: string; status: string }>, extra: Record<string, unknown> = {}) {
  return {
    success: true,
    numFailedTestSuites: 0,
    numFailedTests: 0,
    testResults: [
      {
        name: "execution-reservation.postgres.integration.test.ts",
        status: "passed",
        assertionResults: tests.map((t) => ({
          title: t.title,
          fullName: t.title,
          status: t.status,
        })),
      },
    ],
    ...extra,
  };
}

function emptyFreshInventory(overrides: Record<string, unknown> = {}) {
  return {
    databaseName: "option_d_clean_replay",
    expectedDisposableName: "option_d_clean_replay",
    schemas: ["public", "pg_catalog", "information_schema"],
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

function passingBehavioralProbes() {
  return REQUIRED_BEHAVIORAL_PROBES.map((id) => {
    const exp = PROBE_EXPECTATIONS[id];
    return {
      id,
      expectedRejected: true,
      rejected: true,
      rejectedByImmutabilityRule: true,
      preconditionMet: true,
      rowUnchangedAfter: true,
      fixtureCleanupConfirmed: true,
      sqlState: exp.sqlState,
      classifyReason: "immutability_rule_matched",
      errorMessage: exp.messageIncludes,
    };
  });
}

function passingTriggerBindings() {
  return REQUIRED_IMMUTABILITY_TRIGGERS.map((t) => ({
    table: t.table,
    trigger: t.trigger,
    enabled: true,
    events: ["UPDATE", "DELETE"],
  }));
}

describe("Option D isolated Git replay harness", () => {
  it("assembles deterministic candidate lineage with in-place substitutions", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, stdio: "pipe" });
    expect(fs.existsSync(MANIFEST)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    expect(manifest.mechanism).toBe("option_d_isolated_git_replay");
    expect(manifest.counts.substitutions).toBe(6);
    expect(manifest.substitutions.map((s: { filename: string }) => s.filename).sort()).toEqual(
      [...BLOCKERS].sort(),
    );
  });

  it("covers all six blockers with substitution files on disk", () => {
    for (const file of BLOCKERS) {
      expect(fs.existsSync(path.join(SUBST_DIR, file))).toBe(true);
    }
  });

  it("Option D candidate gate is static PASS once required CREATE/RENAME are in-set; prMerge/runtime stay false", () => {
    execFileSync(process.execPath, [GATE], { cwd: ROOT, stdio: "pipe" });
    const gate = JSON.parse(fs.readFileSync(OPTION_D_GATE_JSON, "utf8"));
    expect(gate.fixtureScanOk).toBe(true);
    expect(gate.requiredDependenciesResolved).toBe(true);
    expect(gate.candidateReplayStaticReady).toBe(true);
    expect(gate.mergeReady).toBe(true);
    expect(gate.mergeReadyMeaning).toMatch(/candidateReplayStaticReady only/);
    expect(gate.prMergeReady).toBe(false);
    expect(gate.runtimeReady).toBe(false);
    expect(gate.requiredUnresolvedCount).toBe(0);
    expect(gate.ok).toBe(true);
  });

  it("active supabase/migrations gate still fails (promotion not done)", () => {
    try {
      execFileSync(process.execPath, [ACTIVE_GATE], { cwd: ROOT, stdio: "pipe" });
    } catch {
      /* expected */
    }
    const gate = JSON.parse(
      fs.readFileSync(path.join(ROOT, "docs/migration-remediation/data-dependent-replay-gate.json"), "utf8"),
    );
    expect(gate.mergeReady).toBe(false);
  });

  it("target safety rejects production hosts", () => {
    expect(
      validateIsolatedReplayTarget(
        `postgresql://postgres:secret@db.${PRODUCTION_PROJECT_REF}.supabase.co:5432/postgres`,
      ).ok,
    ).toBe(false);
  });

  it("runtime harness reports BLOCKED without apply; separate statuses present", () => {
    const env = { ...process.env };
    delete env.OPTION_D_APPLY;
    delete env.OPTION_D_DATABASE_URL;
    delete env.JE_REUSE_POSTING_MIGRATION_TEST_DATABASE_URL;
    let exitCode = 0;
    try {
      execFileSync(process.execPath, [RUNTIME], { cwd: ROOT, env, stdio: "pipe" });
    } catch (err: unknown) {
      exitCode = (err as { status?: number }).status ?? 1;
    }
    expect(exitCode).not.toBe(0);
    const status = JSON.parse(fs.readFileSync(RUNTIME_STATUS, "utf8"));
    expect(status.overall).toBe("BLOCKED");
    expect(status.reason).toBe("runtime_apply_not_requested");
    expect(status.scopes.candidateReplay).toBe("BLOCKED");
    expect(status.scopes.securityImmutabilityChecks).toBe("BLOCKED");
    expect(status.scopes.pr312RpcValidation).toBe("BLOCKED");
    expect(status.scopes.productionDashboardReplayParity).toBe("unresolved");
  });
});

describe("Option D negative gates (false PASS prevention)", () => {
  it("all-skipped Vitest results cannot PASS", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "skipped" })),
    );
    expect(evaluateVitestStructuredResult(report).ok).toBe(false);
    expect(evaluateVitestRunGate({ processExitCode: 0, report }).ok).toBe(false);
  });

  it("partial Vitest execution cannot PASS", () => {
    const report = vitestReportFromTests([
      { title: EXPECTED_PR312_TEST_TITLES[0], status: "passed" },
      { title: EXPECTED_PR312_TEST_TITLES[1], status: "passed" },
    ]);
    expect(evaluateVitestRunGate({ processExitCode: 0, report }).ok).toBe(false);
  });

  it("BLOCKED sentinel-only cannot PASS", () => {
    const report = vitestReportFromTests([{ title: BLOCKED_SENTINEL_TITLE, status: "passed" }]);
    expect(evaluateVitestRunGate({ processExitCode: 0, report }).ok).toBe(false);
  });

  it("nonzero Vitest exit cannot PASS even if all titles passed", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "passed" })),
    );
    const result = evaluateVitestRunGate({ processExitCode: 1, report });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f: { rule: string }) => f.rule === "vitest_nonzero_exit")).toBe(true);
  });

  it("null Vitest exit cannot PASS even if all titles passed", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "passed" })),
    );
    const result = evaluateVitestRunGate({ processExitCode: null, report });
    expect(result.ok).toBe(false);
    expect(result.failures.some((f: { rule: string }) => f.rule === "vitest_exit_status_null")).toBe(
      true,
    );
  });

  it("spawn error / timeout / signal cannot PASS", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "passed" })),
    );
    expect(
      evaluateVitestRunGate({
        processExitCode: 0,
        error: new Error("spawn ENOENT"),
        report,
      }).ok,
    ).toBe(false);
    expect(
      evaluateVitestRunGate({ processExitCode: null, timedOut: true, signal: "SIGTERM", report }).ok,
    ).toBe(false);
    expect(
      evaluateVitestRunGate({ processExitCode: 0, signal: "SIGKILL", report }).ok,
    ).toBe(false);
  });

  it("failed suites / report success:false cannot PASS despite passed titles", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "passed" })),
      { success: false, numFailedTestSuites: 1 },
    );
    const result = evaluateVitestRunGate({ processExitCode: 0, report });
    expect(result.ok).toBe(false);
  });

  it("process exit 0 + full structured pass can PASS", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "passed" })),
    );
    const result = evaluateVitestRunGate({ processExitCode: 0, report });
    expect(result.ok).toBe(true);
    expect(result.structured.pr312.commit).toBe(PR312_COMMIT);
  });

  it("absent security evidence / behavioral probes cannot PASS", () => {
    expect(evaluateSecurityBundle(null).ok).toBe(false);
    expect(
      evaluateSecurityBundle({
        tables: [],
        views: [],
        triggers: [],
        functions: [],
        // behavioralProbes missing
      }).ok,
    ).toBe(false);
    expect(evaluateImmutabilityBehavior({}).ok).toBe(false);
  });

  it("loose immut substring trigger is not accepted; exact binding required", () => {
    const evidence = {
      triggers: [
        {
          table: "company_memory_records",
          trigger: "some_immut_helper",
          enabled: true,
          events: ["UPDATE", "DELETE"],
        },
      ],
      behavioralProbes: passingBehavioralProbes(),
    };
    expect(evaluateImmutabilityTriggers(evidence).ok).toBe(false);
    expect(evaluateImmutability(evidence).ok).toBe(false);
  });

  it("trigger present but mutation not rejected cannot PASS", () => {
    const evidence = {
      triggers: passingTriggerBindings(),
      behavioralProbes: REQUIRED_BEHAVIORAL_PROBES.map((id) => ({
        id,
        expectedRejected: true,
        rejected: false,
        rejectedByImmutabilityRule: false,
        preconditionMet: true,
        rowUnchangedAfter: true,
        fixtureCleanupConfirmed: true,
        sqlState: null,
        classifyReason: "mutation_succeeded",
        errorMessage: null,
      })),
    };
    expect(evaluateImmutability(evidence).ok).toBe(false);
  });

  it("transaction-aborted 25P02 must not count as immutability PASS", () => {
    const exp = PROBE_EXPECTATIONS.si_finalized_metadata_update_rejected;
    const classified = classifyProbeError(
      { code: "25P02", message: "current transaction is aborted, commands ignored until end of transaction block" },
      exp,
    );
    expect(classified.intendedImmutabilityRejection).toBe(false);
    expect(classified.reason).toBe("non_immutability_sqlstate");

    const evidence = {
      triggers: passingTriggerBindings(),
      behavioralProbes: REQUIRED_BEHAVIORAL_PROBES.map((id) => ({
        id,
        expectedRejected: true,
        rejected: true,
        rejectedByImmutabilityRule: false,
        preconditionMet: true,
        rowUnchangedAfter: true,
        fixtureCleanupConfirmed: true,
        sqlState: "25P02",
        classifyReason: "non_immutability_sqlstate",
        errorMessage: "current transaction is aborted",
      })),
    };
    const result = evaluateImmutabilityBehavior(evidence);
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f: { rule: string }) => f.rule === "not_intended_immutability_rejection"),
    ).toBe(true);
  });

  it("unrelated errors (undefined table / FK / permission) must not count as PASS", () => {
    const exp = PROBE_EXPECTATIONS.memory_delete_rejected;
    for (const code of ["42P01", "23503", "42501", "42601", "08006"]) {
      const classified = classifyProbeError(
        { code, message: "unrelated database error" },
        exp,
      );
      expect(classified.intendedImmutabilityRejection).toBe(false);
    }
    // Wrong message with correct SQLSTATE also fails
    expect(
      classifyProbeError(
        { code: "P0001", message: "some other raise exception" },
        exp,
      ).intendedImmutabilityRejection,
    ).toBe(false);
  });

  it("intended P0001 + trigger message classifies as immutability rejection", () => {
    const exp = PROBE_EXPECTATIONS.si_finalized_metadata_delete_rejected;
    const classified = classifyProbeError(
      { code: "P0001", message: exp.messageIncludes },
      exp,
    );
    expect(classified.intendedImmutabilityRejection).toBe(true);
  });

  it("passing behavioral probes with full classification can PASS evaluator", () => {
    expect(
      evaluateImmutability({
        triggers: passingTriggerBindings(),
        behavioralProbes: passingBehavioralProbes(),
      }).ok,
    ).toBe(true);
  });

  it("disabled trigger or missing UPDATE/DELETE event cannot PASS", () => {
    expect(
      evaluateImmutabilityTriggers({
        triggers: [
          {
            table: "si_historical_snapshots",
            trigger: "prevent_si_snapshot_metadata_mutation",
            enabled: false,
            events: ["UPDATE", "DELETE"],
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      evaluateImmutabilityTriggers({
        triggers: [
          {
            table: "si_historical_snapshots",
            trigger: "prevent_si_snapshot_metadata_mutation",
            enabled: true,
            events: ["UPDATE"],
          },
        ],
      }).ok,
    ).toBe(false);
  });

  it("missing RLS / view-security cannot PASS", () => {
    const empty = {
      tables: [],
      views: [],
      triggers: [],
      functions: [],
      behavioralProbes: [],
    };
    expect(evaluateFinalSchemaRls(empty).ok).toBe(false);
    expect(evaluateViewSecurity(empty).ok).toBe(false);
  });

  it("existing application objects / functions / types reject freshness", () => {
    expect(
      evaluateFreshDisposableDatabase(
        emptyFreshInventory({ publicRelations: ["companies", "firms"] }),
      ).ok,
    ).toBe(false);
    expect(
      evaluateFreshDisposableDatabase(
        emptyFreshInventory({ publicFunctions: ["persist_journal_entry_execution_reservation"] }),
      ).ok,
    ).toBe(false);
    expect(
      evaluateFreshDisposableDatabase(emptyFreshInventory({ publicTypes: ["my_app_enum"] })).ok,
    ).toBe(false);
    expect(
      evaluateFreshDisposableDatabase(emptyFreshInventory({ publicSequences: ["companies_id_seq"] })).ok,
    ).toBe(false);
    expect(
      evaluateFreshDisposableDatabase(
        emptyFreshInventory({ publicTriggers: ["prevent_si_snapshot_metadata_mutation"] }),
      ).ok,
    ).toBe(false);
  });

  it("objects outside allowlisted schemas reject freshness", () => {
    const result = evaluateFreshDisposableDatabase(
      emptyFreshInventory({
        schemas: ["public", "pg_catalog", "app_private"],
        objectsOutsideAllowedSchemas: [{ schema: "app_private", name: "secret_table", kind: "r" }],
      }),
    );
    expect(result.ok).toBe(false);
    expect(
      result.failures.some(
        (f: { rule: string }) =>
          f.rule === "unknown_or_disallowed_schemas" ||
          f.rule === "application_objects_outside_allowed_schemas",
      ),
    ).toBe(true);
  });

  it("missing inventory evidence cannot PASS freshness", () => {
    expect(evaluateFreshDisposableDatabase(null).ok).toBe(false);
    expect(
      evaluateFreshDisposableDatabase({
        databaseName: "option_d_clean_replay",
        expectedDisposableName: "option_d_clean_replay",
        inventoryComplete: false,
        schemas: [],
        publicRelations: [],
        publicFunctions: [],
        publicTypes: [],
        publicSequences: [],
        publicTriggers: [],
        objectsOutsideAllowedSchemas: [],
        schemaMigrationVersions: [],
      }).ok,
    ).toBe(false);
    expect(
      evaluateFreshDisposableDatabase({
        databaseName: "option_d_clean_replay",
        expectedDisposableName: "option_d_clean_replay",
        inventoryComplete: true,
        // missing arrays
      }).ok,
    ).toBe(false);
  });

  it("partial replay / nonempty migration history cannot be reused", () => {
    expect(
      evaluateFreshDisposableDatabase(
        emptyFreshInventory({ schemaMigrationVersions: ["20260703182655"] }),
      ).ok,
    ).toBe(false);
    expect(
      evaluateFreshDisposableDatabase(
        emptyFreshInventory({ schemaMigrationVersions: ["20240101000000"] }),
      ).ok,
    ).toBe(false);
  });

  it("ambiguous postgres database name is rejected even if empty", () => {
    expect(
      evaluateFreshDisposableDatabase(
        emptyFreshInventory({
          databaseName: "postgres",
          expectedDisposableName: "postgres",
        }),
      ).ok,
    ).toBe(false);
  });

  it("complete empty option_d inventory can PASS freshness", () => {
    expect(evaluateFreshDisposableDatabase(emptyFreshInventory()).ok).toBe(true);
  });

  it("overall PASS_RUNTIME requires all three applicable gates", () => {
    expect(
      evaluateOverallRuntimePass({
        candidateReplay: "PASS",
        securityImmutabilityChecks: "PASS",
        pr312RpcValidation: "PASS",
        productionDashboardReplayParity: "unresolved",
      }).ok,
    ).toBe(true);
    expect(
      evaluateOverallRuntimePass({
        candidateReplay: "PASS",
        securityImmutabilityChecks: "BLOCKED",
        pr312RpcValidation: "PASS",
        productionDashboardReplayParity: "unresolved",
      }).ok,
    ).toBe(false);
  });
});
