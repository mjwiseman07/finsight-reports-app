import { describe, expect, it } from "vitest";
import {
  OPTION_D_COMPLETED_DB_NAME,
  assertNotOptionDCompletedDatabase,
  buildPr312SuiteDatabaseName,
  evaluateSuiteDatabaseFreshnessEvidence,
  planPr312SuiteDatabase,
} from "../../scripts/migration-remediation/option-d-pr312-suite-database-plan.js";
import {
  PR312_COMMIT,
  PR312_SUITE_BLOB,
} from "../../scripts/migration-remediation/option-d-vitest-result-gate.js";

const LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

describe("Option D PR312 suite-database plan", () => {
  it("pins the PR #312 commit used by the suite DB plan", () => {
    expect(PR312_COMMIT).toBe("5972a70782549950db23fc46d84c6f85b87affe6");
    expect(PR312_SUITE_BLOB).toBe("5a565871ee0508ecc6b5afd59928250874b45154");
  });

  it("builds unique scoped suite database names", () => {
    const a = buildPr312SuiteDatabaseName("abc123");
    const b = buildPr312SuiteDatabaseName("def456");
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.name).toMatch(/^option_d_pr312_suite_/);
    expect(a.name).not.toBe(b.name);
    expect(a.name).not.toBe(OPTION_D_COMPLETED_DB_NAME);
  });

  it("rejects Option D completed database reuse for the suite target", () => {
    expect(assertNotOptionDCompletedDatabase("postgres").ok).toBe(false);
    expect(assertNotOptionDCompletedDatabase("option_d_pr312_suite_x").ok).toBe(true);
  });

  it("plans a loopback-only suite DB with sslmode=disable and no create-now side effects", () => {
    const planned = planPr312SuiteDatabase({
      serverUrl: LOCAL,
      runId: "unit1",
      expectedPort: 54322,
    });
    expect(planned.ok).toBe(true);
    expect(planned.plan.createInThisAuthorization).toBe(false);
    expect(planned.plan.requireSslmodeDisable).toBe(true);
    expect(planned.plan.rejectOptionDCompletedDatabaseReuse).toBe(true);
    expect(planned.plan.suiteDatabaseModel).toMatch(/^B_/);
    expect(planned.plan.cleanup.dropSuiteDatabaseOnly).toBe(true);
    expect(planned.plan.cleanup.neverDropOptionDDatabase).toBe(true);
    expect(planned.plan.redactedSuiteUrl).toMatch(/db=option_d_pr312_suite_/);
    expect(JSON.stringify(planned)).not.toMatch(/postgres:postgres/);
  });

  it("fails closed when asked to use the completed Option D database as suite target", () => {
    const planned = planPr312SuiteDatabase({
      serverUrl: LOCAL,
      runId: "unit2",
      useOptionDCompletedDatabase: true,
    });
    expect(planned.ok).toBe(false);
    expect(
      planned.failures.some(
        (f) => f.rule === "option_d_completed_database_reuse_rejected",
      ),
    ).toBe(true);
  });

  it("rejects production/cloud/shared freshness evidence", () => {
    const bad = evaluateSuiteDatabaseFreshnessEvidence({
      exists: true,
      beforeSuite: true,
      journalEntryExecutionRowCount: 0,
      residualSuiteFixtureCount: 0,
      isCloud: true,
      databaseName: "option_d_pr312_suite_x",
    });
    expect(bad.ok).toBe(false);
    expect(bad.failures.some((f) => f.rule === "suite_db_remote_target_rejected")).toBe(
      true,
    );
  });

  it("requires empty residual executions/fixtures before suite", () => {
    const dirty = evaluateSuiteDatabaseFreshnessEvidence({
      exists: true,
      beforeSuite: true,
      journalEntryExecutionRowCount: 3,
      residualSuiteFixtureCount: 0,
      databaseName: "option_d_pr312_suite_x",
    });
    expect(dirty.ok).toBe(false);
    expect(
      dirty.failures.some((f) => f.rule === "suite_db_not_empty_of_executions"),
    ).toBe(true);
  });

  it("rejects wrong-server / non-loopback planning targets", () => {
    const remote = planPr312SuiteDatabase({
      serverUrl: "postgresql://postgres:x@db.example.supabase.co:5432/postgres",
      runId: "remote",
    });
    expect(remote.ok).toBe(false);
  });
});
