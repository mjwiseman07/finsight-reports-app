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
} from "../../scripts/migration-remediation/option-d-security-assertions.js";
import {
  evaluateVitestStructuredResult,
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

function vitestReportFromTests(tests: Array<{ title: string; status: string }>) {
  return {
    testResults: [
      {
        name: "execution-reservation.postgres.integration.test.ts",
        assertionResults: tests.map((t) => ({
          title: t.title,
          fullName: t.title,
          status: t.status,
        })),
      },
    ],
  };
}

describe("Option D isolated Git replay harness", () => {
  it("assembles deterministic candidate lineage with in-place substitutions", () => {
    execFileSync(process.execPath, [ASSEMBLE], { cwd: ROOT, stdio: "pipe" });
    expect(fs.existsSync(MANIFEST)).toBe(true);
    const manifest = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    expect(manifest.mechanism).toBe("option_d_isolated_git_replay");
    expect(manifest.notMergeApproval).toBe(true);
    expect(manifest.pr312HeadRequiredUnchanged).toBe(
      "f65730b3d38e9cb3b192e54f62c798c74a07a1c2",
    );
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

  it("Option D candidate gate passes (zero executable blockers in assembled set)", () => {
    execFileSync(process.execPath, [GATE], { cwd: ROOT, stdio: "pipe" });
    const gate = JSON.parse(fs.readFileSync(OPTION_D_GATE_JSON, "utf8"));
    expect(gate.mergeReady).toBe(true);
    expect(gate.violationCount).toBe(0);
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

  it("target safety rejects production and remote supabase hosts", () => {
    expect(
      validateIsolatedReplayTarget(
        `postgresql://postgres:secret@db.${PRODUCTION_PROJECT_REF}.supabase.co:5432/postgres`,
      ).ok,
    ).toBe(false);
    expect(
      validateIsolatedReplayTarget("postgresql://postgres:postgres@127.0.0.1:54322/postgres").ok,
    ).toBe(true);
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
    expect(status.scopes.candidateReplay).toBe("BLOCKED");
    expect(status.scopes.securityImmutabilityChecks).toBe("BLOCKED");
    expect(status.scopes.pr312RpcValidation).toBe("BLOCKED");
    expect(status.scopes.productionDashboardReplayParity).toBe("unresolved");
    expect(status.overallGate.ok).toBe(false);
    expect(status.requiredExecutableChecks).toEqual(
      expect.arrayContaining([
        "final_schema_rls",
        "view_security_invoker",
        "si_memory_immutability",
        "pr312_structured_vitest",
      ]),
    );
  });
});

describe("Option D negative gates (false PASS prevention)", () => {
  it("all-skipped Vitest results cannot PASS", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "skipped" })),
    );
    const result = evaluateVitestStructuredResult(report);
    expect(result.ok).toBe(false);
    expect(result.failures.some((f: { rule: string }) => f.rule === "all_skipped_cannot_pass" || f.rule === "skipped_present")).toBe(
      true,
    );
  });

  it("partial Vitest execution (missing expected titles) cannot PASS", () => {
    const report = vitestReportFromTests([
      { title: EXPECTED_PR312_TEST_TITLES[0], status: "passed" },
      { title: EXPECTED_PR312_TEST_TITLES[1], status: "passed" },
    ]);
    const result = evaluateVitestStructuredResult(report);
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f: { rule: string }) => f.rule === "expected_tests_not_all_passed"),
    ).toBe(true);
  });

  it("BLOCKED sentinel-only Vitest pass cannot PASS", () => {
    const report = vitestReportFromTests([
      { title: BLOCKED_SENTINEL_TITLE, status: "passed" },
    ]);
    const result = evaluateVitestStructuredResult(report);
    expect(result.ok).toBe(false);
  });

  it("process-exit-success shape without structured tests cannot PASS", () => {
    const result = evaluateVitestStructuredResult({ success: true, numPassedTests: 12 });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("zero_tests_in_report");
  });

  it("full expected Vitest passed set can PASS structured gate", () => {
    const report = vitestReportFromTests(
      EXPECTED_PR312_TEST_TITLES.map((title) => ({ title, status: "passed" })),
    );
    const result = evaluateVitestStructuredResult(report);
    expect(result.ok).toBe(true);
    expect(result.pr312.commit).toBe(PR312_COMMIT);
    expect(result.counts.skipped).toBe(0);
  });

  it("absent security evidence cannot PASS", () => {
    expect(evaluateSecurityBundle(null).ok).toBe(false);
    expect(evaluateSecurityBundle({}).ok).toBe(false);
    expect(
      evaluateSecurityBundle({ tables: [], views: undefined, triggers: [], functions: [] }).ok,
    ).toBe(false);
  });

  it("missing RLS / view-security / immutability checks cannot PASS", () => {
    const empty = {
      tables: [],
      views: [],
      triggers: [],
      functions: [],
    };
    expect(evaluateSecurityBundle(empty).ok).toBe(false);
    expect(evaluateFinalSchemaRls(empty).ok).toBe(false);
    expect(evaluateViewSecurity(empty).ok).toBe(false);
    expect(evaluateImmutability(empty).ok).toBe(false);
  });

  it("existing application objects reject fresh-DB claim before writes", () => {
    const result = evaluateFreshDisposableDatabase({
      databaseName: "option_d_clean_replay",
      expectedDisposableName: "option_d_clean_replay",
      publicRelations: ["companies", "firms"],
      schemaMigrationVersions: [],
    });
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f: { rule: string }) => f.rule === "application_sentinel_relations_present"),
    ).toBe(true);
  });

  it("partial replay (schema_migrations app versions) cannot be reused as clean evidence", () => {
    const result = evaluateFreshDisposableDatabase({
      databaseName: "option_d_clean_replay",
      expectedDisposableName: "option_d_clean_replay",
      publicRelations: [],
      schemaMigrationVersions: ["20260701043599", "20260703182655"],
    });
    expect(result.ok).toBe(false);
    expect(
      result.failures.some((f: { rule: string }) => f.rule === "partial_or_prior_app_replay_detected"),
    ).toBe(true);
  });

  it("ambiguous postgres database name is rejected even if empty", () => {
    const result = evaluateFreshDisposableDatabase({
      databaseName: "postgres",
      expectedDisposableName: "postgres",
      publicRelations: [],
      schemaMigrationVersions: [],
    });
    expect(result.ok).toBe(false);
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

    expect(
      evaluateOverallRuntimePass({
        candidateReplay: "PASS",
        securityImmutabilityChecks: "PASS",
        pr312RpcValidation: "PASS_STATIC",
        productionDashboardReplayParity: "unresolved",
      }).ok,
    ).toBe(false);
  });
});
