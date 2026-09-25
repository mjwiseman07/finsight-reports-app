/**
 * Independent Cloud Agent reviewer — mocked API tests.
 * Never launches a real Cloud Agent.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");
const PLANS_TMP = path.join(REPO_ROOT, "docs/plans/_tmp");

const lib = require(path.join(REPO_ROOT, "scripts/orchestrator/lib.js"));
const { buildReviewerPrompt } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/reviewer-prompt-builder.js",
));
const {
  extractReviewResultJson,
  assertReviewResultValid,
  RESULT_MARK_START,
  RESULT_MARK_END,
} = require(path.join(REPO_ROOT, "scripts/orchestrator/reviewer-result.js"));
const { launchReviewer } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/launch-reviewer.js",
));
const { statusReviewer } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/status-reviewer.js",
));
const { buildCreateAgentRequest } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/cursor-cloud-agent.js",
));

const SECRET = "sk-test-REVIEWER-SECRET-DO-NOT-LEAK";
const BUILDER_ID = "bc-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const REVIEWER_ID = "bc-rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr";
const BUILDER_RUN = "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const REVIEWER_RUN = "run-rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr";
const PR_URL =
  "https://github.com/mjwiseman07/finsight-reports-app/pull/328";
const HEAD_SHA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function buildPlan({
  planId = "REVIEW-TEST-001",
  status = "IMPLEMENTATION_COMPLETE",
} = {}) {
  return `# ${planId}

## Plan ID

Plan ID: ${planId}

## Title

Title: Reviewer fixture

## Status

STATUS: ${status}

## Objective

Verify independent reviewer orchestration with temporary fixtures.

## Scope

- Fixture files under docs/plans/_tmp only

## Out of Scope

- Production systems

## Security Requirements

- No secrets; mocked API only

## Tenant Isolation Requirements

- N/A for fixture

## Acceptance Criteria

- Reviewer launch gates enforce IMPLEMENTATION_COMPLETE
- PASS advances to READY_FOR_HUMAN_APPROVAL

## Required Tests

- npm run orchestrator

## Validation Commands

- npm run orchestrator

## Prohibited Changes

- app/

## Rollback Considerations

- Delete fixture

## Human Approval Gate

| Field | Value |
| Author | test |
| Approved by | fixture |
`;
}

function writeFixture(dir, name, content) {
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, name);
  fs.writeFileSync(filePath, content, "utf8");
  return filePath;
}

function writeCompanion(planPath, data) {
  fs.writeFileSync(
    lib.getStatusJsonPath(planPath),
    `${JSON.stringify(data, null, 2)}\n`,
    "utf8",
  );
}

function rel(planPath) {
  return path.relative(REPO_ROOT, planPath).split(path.sep).join("/");
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    async text() {
      return JSON.stringify(body);
    },
  };
}

function mockFetchSequence(handlers) {
  let i = 0;
  return vi.fn(async (url, init) => {
    const handler = handlers[i] || handlers[handlers.length - 1];
    i += 1;
    return handler(url, init);
  });
}

function githubOpenPr(overrides = {}) {
  return {
    number: 328,
    html_url: PR_URL,
    state: "open",
    merged: false,
    draft: true,
    base: { ref: "main" },
    head: { ref: "cursor/smoke", sha: HEAD_SHA },
    ...overrides,
  };
}

function implCompanion(extra = {}) {
  return {
    planId: "REVIEW-TEST-001",
    status: "IMPLEMENTATION_COMPLETE",
    implementation: {
      completedAt: "2026-09-25T00:00:00.000Z",
      results: { planId: "REVIEW-TEST-001", success: true },
    },
    cursor_agent: {
      agent_id: BUILDER_ID,
      run_id: BUILDER_RUN,
      pr_url: PR_URL,
      branch: "cursor/smoke",
      launched_at: "2026-09-25T00:00:00.000Z",
    },
    merge: false,
    deploy: false,
    ...extra,
  };
}

function wrapResult(obj) {
  return `${RESULT_MARK_START}\n${JSON.stringify(obj, null, 2)}\n${RESULT_MARK_END}`;
}

function validPassResult(overrides = {}) {
  return {
    plan_id: "REVIEW-TEST-001",
    review_result: "PASS",
    summary: "Scope and acceptance criteria satisfied for the smoke change.",
    acceptance_criteria: [
      { criterion: "Doc note added", status: "PASS", notes: "ok" },
    ],
    scope_compliance: { status: "PASS", notes: "ok" },
    security_review: { status: "PASS", notes: "ok" },
    test_review: { status: "PASS", notes: "ok" },
    prohibited_changes_review: { status: "PASS", notes: "ok" },
    findings: [],
    reviewed_pr: PR_URL,
    reviewed_commit: HEAD_SHA,
    reviewed_at: "2026-09-25T01:00:00.000Z",
    ...overrides,
  };
}

describe("cloud agent reviewer", () => {
  let fixtureDir;

  beforeEach(() => {
    fs.mkdirSync(PLANS_TMP, { recursive: true });
    fixtureDir = fs.mkdtempSync(path.join(PLANS_TMP, "rev-"));
  });

  afterEach(() => {
    if (fixtureDir && fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  describe("prompt + request", () => {
    it("includes builder PR and independent reviewer instructions", () => {
      const prompt = buildReviewerPrompt({
        planId: "REVIEW-TEST-001",
        planPathRelative: "docs/plans/x.md",
        builderPrUrl: PR_URL,
        builderAgentId: BUILDER_ID,
        builderHeadSha: HEAD_SHA,
      });
      expect(prompt).toContain(PR_URL);
      expect(prompt).toContain("INDEPENDENT");
      expect(prompt).toContain("Do NOT merge");
      expect(prompt).toContain(RESULT_MARK_START);
      const body = buildCreateAgentRequest({
        promptText: prompt,
        prUrl: PR_URL,
        autoCreatePR: false,
      });
      expect(body.repos[0].prUrl).toBe(PR_URL);
      expect(body.repos[0].startingRef).toBeUndefined();
      expect(body.autoCreatePR).toBe(false);
      expect(body.workOnCurrentBranch).toBe(false);
    });
  });

  describe("success", () => {
    it("IMPLEMENTATION_COMPLETE can launch reviewer as separate agent", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(planPath, implCompanion());

      const githubFetch = vi.fn(async () =>
        jsonResponse(200, githubOpenPr()),
      );
      const cursorFetch = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            agent: {
              id: REVIEWER_ID,
              status: "ACTIVE",
              url: `https://cursor.com/agents/${REVIEWER_ID}`,
              latestRunId: REVIEWER_RUN,
            },
            run: {
              id: REVIEWER_RUN,
              agentId: REVIEWER_ID,
              status: "CREATING",
            },
          }),
      ]);

      const result = await launchReviewer(rel(planPath), {
        fetchImpl: cursorFetch,
        githubFetchImpl: githubFetch,
        env: { CURSOR_API_KEY: SECRET },
      });

      expect(result.ok).toBe(true);
      expect(result.status).toBe("IMPLEMENTATION_COMPLETE");
      expect(result.cursor_reviewer.agent_id).toBe(REVIEWER_ID);
      expect(result.builder_agent_id).toBe(BUILDER_ID);
      expect(result.builder_agent_id).not.toBe(result.cursor_reviewer.agent_id);
      expect(JSON.stringify(result)).not.toContain(SECRET);

      const createBody = JSON.parse(cursorFetch.mock.calls[0][1].body);
      expect(createBody.repos[0].prUrl).toBe(PR_URL);
      expect(createBody.autoCreatePR).toBe(false);
      expect(createBody.prompt.text).toContain(PR_URL);

      const companion = lib.readStatusJson(planPath);
      expect(companion.status).toBe("IMPLEMENTATION_COMPLETE");
      expect(companion.cursor_reviewer.agent_id).toBe(REVIEWER_ID);
      expect(companion.builder_head_sha).toBe(HEAD_SHA);
    });

    it("PASS advances to REVIEW_PASSED then READY_FOR_HUMAN_APPROVAL", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(
        planPath,
        implCompanion({
          builder_head_sha: HEAD_SHA,
          cursor_reviewer: {
            agent_id: REVIEWER_ID,
            run_id: REVIEWER_RUN,
            launched_at: "2026-09-25T00:00:00.000Z",
          },
        }),
      );

      const passText = wrapResult(validPassResult());
      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            id: REVIEWER_ID,
            status: "IDLE",
            latestRunId: REVIEWER_RUN,
          }),
        async () =>
          jsonResponse(200, {
            id: REVIEWER_RUN,
            agentId: REVIEWER_ID,
            status: "FINISHED",
            result: passText,
          }),
      ]);

      const result = await statusReviewer(rel(planPath), {
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(result.advanced).toBe(true);
      expect(result.review_result).toBe("PASS");
      expect(result.status).toBe("READY_FOR_HUMAN_APPROVAL");
      expect(result.status).not.toBe("COMPLETED");
      const companion = lib.readStatusJson(planPath);
      expect(companion.status).toBe("READY_FOR_HUMAN_APPROVAL");
      expect(companion.review.verdict).toBe("PASS");
    });

    it("reviewer cannot set COMPLETED via result payload", () => {
      expect(() =>
        assertReviewResultValid(
          validPassResult({ set_status: "COMPLETED" }),
          {
            expectedPlanId: "REVIEW-TEST-001",
            expectedPrUrl: PR_URL,
            expectedCommitSha: HEAD_SHA,
            builderAgentId: BUILDER_ID,
            reviewerAgentId: REVIEWER_ID,
          },
        ),
      ).toThrow(/COMPLETED/);
    });
  });

  describe("NEEDS_CHANGES", () => {
    it("produces REVIEW_FAILED and requires findings", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(
        planPath,
        implCompanion({
          builder_head_sha: HEAD_SHA,
          cursor_reviewer: {
            agent_id: REVIEWER_ID,
            run_id: REVIEWER_RUN,
            launched_at: "2026-09-25T00:00:00.000Z",
          },
        }),
      );

      const needs = validPassResult({
        review_result: "NEEDS_CHANGES",
        summary: "Scope drift found in unrelated files.",
        findings: [
          {
            severity: "HIGH",
            requirement: "Scope",
            file: "docs/plans/ORCHESTRATOR-SMOKE-001.md",
            explanation: "Plan metadata edited beyond README scope",
            remediation: "Revert plan file edits or expand approved scope",
          },
        ],
      });

      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            id: REVIEWER_ID,
            status: "IDLE",
            latestRunId: REVIEWER_RUN,
          }),
        async () =>
          jsonResponse(200, {
            id: REVIEWER_RUN,
            agentId: REVIEWER_ID,
            status: "FINISHED",
            result: wrapResult(needs),
          }),
      ]);

      const result = await statusReviewer(rel(planPath), {
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(result.status).toBe("REVIEW_FAILED");
      expect(result.review_result).toBe("NEEDS_CHANGES");
    });

    it("malformed findings fail closed", () => {
      expect(() =>
        assertReviewResultValid(
          validPassResult({
            review_result: "NEEDS_CHANGES",
            findings: [{ severity: "NOPE", explanation: "x", remediation: "y" }],
          }),
          {
            expectedPlanId: "REVIEW-TEST-001",
            expectedPrUrl: PR_URL,
            expectedCommitSha: HEAD_SHA,
          },
        ),
      ).toThrow(/severity/i);
    });
  });

  describe("BLOCKED", () => {
    it("does not advance to human approval", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(
        planPath,
        implCompanion({
          builder_head_sha: HEAD_SHA,
          cursor_reviewer: {
            agent_id: REVIEWER_ID,
            run_id: REVIEWER_RUN,
            launched_at: "2026-09-25T00:00:00.000Z",
          },
        }),
      );

      const blocked = validPassResult({
        review_result: "BLOCKED",
        summary: "Unable to complete security review safely.",
        findings: [
          {
            severity: "CRITICAL",
            requirement: "Security",
            explanation: "Ambiguous production credential reference",
            remediation: "Human investigation required",
          },
        ],
      });

      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            id: REVIEWER_ID,
            status: "IDLE",
            latestRunId: REVIEWER_RUN,
          }),
        async () =>
          jsonResponse(200, {
            id: REVIEWER_RUN,
            agentId: REVIEWER_ID,
            status: "FINISHED",
            result: wrapResult(blocked),
          }),
      ]);

      const result = await statusReviewer(rel(planPath), {
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(result.status).toBe("BLOCKED");
      expect(result.status).not.toBe("READY_FOR_HUMAN_APPROVAL");
      expect(lib.readStatusJson(planPath).review.blocked).toBe(true);
    });
  });

  describe("fail-closed", () => {
    it("non-IMPLEMENTATION_COMPLETE cannot launch reviewer", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "REVIEW-TEST-001",
        status: "IN_PROGRESS",
        cursor_agent: {
          agent_id: BUILDER_ID,
          run_id: BUILDER_RUN,
          pr_url: PR_URL,
        },
      });
      await expect(
        launchReviewer(rel(planPath), {
          fetchImpl: vi.fn(),
          githubFetchImpl: vi.fn(),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/IMPLEMENTATION_COMPLETE/);
    });

    it("missing builder PR cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(
        planPath,
        implCompanion({
          cursor_agent: {
            agent_id: BUILDER_ID,
            run_id: BUILDER_RUN,
          },
        }),
      );
      await expect(
        launchReviewer(rel(planPath), {
          fetchImpl: vi.fn(),
          githubFetchImpl: vi.fn(),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/Builder PR URL missing/);
    });

    it("closed/mismatched PR cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(planPath, implCompanion());
      const githubFetch = vi.fn(async () =>
        jsonResponse(200, githubOpenPr({ state: "closed", merged: false })),
      );
      await expect(
        launchReviewer(rel(planPath), {
          fetchImpl: vi.fn(),
          githubFetchImpl: githubFetch,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/not OPEN|precondition/i);
    });

    it("missing API key cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(planPath, implCompanion());
      const githubFetch = vi.fn(async () =>
        jsonResponse(200, githubOpenPr()),
      );
      await expect(
        launchReviewer(rel(planPath), {
          fetchImpl: vi.fn(),
          githubFetchImpl: githubFetch,
          env: {},
        }),
      ).rejects.toThrow(/CURSOR_API_KEY/);
    });

    it("malformed plan/status cannot launch", async () => {
      const planPath = writeFixture(fixtureDir, "plan.md", "nope");
      await expect(
        launchReviewer(rel(planPath), {
          fetchImpl: vi.fn(),
          githubFetchImpl: vi.fn(),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/invalid|Missing/i);
    });

    it("duplicate reviewer launch blocked", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(
        planPath,
        implCompanion({
          cursor_reviewer: {
            agent_id: REVIEWER_ID,
            run_id: REVIEWER_RUN,
          },
        }),
      );
      await expect(
        launchReviewer(rel(planPath), {
          fetchImpl: vi.fn(),
          githubFetchImpl: vi.fn(async () =>
            jsonResponse(200, githubOpenPr()),
          ),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/already set/);
    });

    it("builder and reviewer IDs must differ", () => {
      expect(() =>
        assertReviewResultValid(validPassResult(), {
          expectedPlanId: "REVIEW-TEST-001",
          expectedPrUrl: PR_URL,
          expectedCommitSha: HEAD_SHA,
          builderAgentId: BUILDER_ID,
          reviewerAgentId: BUILDER_ID,
        }),
      ).toThrow(/must differ/);
    });

    it("malformed reviewer JSON rejected", () => {
      expect(() => extractReviewResultJson("no markers")).toThrow(/markers/i);
    });

    it("mismatched plan ID rejected", () => {
      expect(() =>
        assertReviewResultValid(validPassResult({ plan_id: "OTHER" }), {
          expectedPlanId: "REVIEW-TEST-001",
          expectedPrUrl: PR_URL,
          expectedCommitSha: HEAD_SHA,
        }),
      ).toThrow(/plan_id mismatch/i);
    });

    it("mismatched PR rejected", () => {
      expect(() =>
        assertReviewResultValid(
          validPassResult({
            reviewed_pr:
              "https://github.com/mjwiseman07/finsight-reports-app/pull/1",
          }),
          {
            expectedPlanId: "REVIEW-TEST-001",
            expectedPrUrl: PR_URL,
            expectedCommitSha: HEAD_SHA,
          },
        ),
      ).toThrow(/reviewed_pr mismatch/i);
    });

    it("mismatched commit rejected", () => {
      expect(() =>
        assertReviewResultValid(
          validPassResult({ reviewed_commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" }),
          {
            expectedPlanId: "REVIEW-TEST-001",
            expectedPrUrl: PR_URL,
            expectedCommitSha: HEAD_SHA,
          },
        ),
      ).toThrow(/reviewed_commit mismatch/i);
    });

    it("unknown review result rejected", () => {
      expect(() =>
        assertReviewResultValid(validPassResult({ review_result: "LGTM" }), {
          expectedPlanId: "REVIEW-TEST-001",
          expectedPrUrl: PR_URL,
          expectedCommitSha: HEAD_SHA,
        }),
      ).toThrow(/Unknown review_result/i);
    });

    for (const httpStatus of [400, 401, 403, 429, 500]) {
      it(`Cursor ${httpStatus} does not advance state`, async () => {
        const planPath = writeFixture(
          fixtureDir,
          "plan.md",
          buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
        );
        writeCompanion(planPath, implCompanion());
        const githubFetch = vi.fn(async () =>
          jsonResponse(200, githubOpenPr()),
        );
        const cursorFetch = mockFetchSequence([
          async () => jsonResponse(httpStatus, { message: "err" }),
        ]);
        await expect(
          launchReviewer(rel(planPath), {
            fetchImpl: cursorFetch,
            githubFetchImpl: githubFetch,
            env: { CURSOR_API_KEY: SECRET },
          }),
        ).rejects.toThrow(/status unchanged|HTTP/);
        expect(lib.readStatusJson(planPath).status).toBe(
          "IMPLEMENTATION_COMPLETE",
        );
        expect(lib.readStatusJson(planPath).cursor_reviewer).toBeUndefined();
      });
    }

    it("reviewer completion without result does not advance state", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(
        planPath,
        implCompanion({
          builder_head_sha: HEAD_SHA,
          cursor_reviewer: {
            agent_id: REVIEWER_ID,
            run_id: REVIEWER_RUN,
            launched_at: "2026-09-25T00:00:00.000Z",
          },
        }),
      );
      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            id: REVIEWER_ID,
            status: "IDLE",
            latestRunId: REVIEWER_RUN,
          }),
        async () =>
          jsonResponse(200, {
            id: REVIEWER_RUN,
            agentId: REVIEWER_ID,
            status: "FINISHED",
            result: "",
          }),
      ]);
      await expect(
        statusReviewer(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/without a parseable result|state not advanced/i);
      expect(lib.readStatusJson(planPath).status).toBe(
        "IMPLEMENTATION_COMPLETE",
      );
    });

    it("no secret leakage / no merge or deploy authority in dry-run", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IMPLEMENTATION_COMPLETE" }),
      );
      writeCompanion(planPath, implCompanion());
      const githubFetch = vi.fn(async () =>
        jsonResponse(200, githubOpenPr()),
      );
      const cursorFetch = vi.fn();
      const result = await launchReviewer(rel(planPath), {
        dryRun: true,
        fetchImpl: cursorFetch,
        githubFetchImpl: githubFetch,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(cursorFetch).not.toHaveBeenCalled();
      expect(result.request.autoCreatePR).toBe(false);
      expect(result.request.workOnCurrentBranch).toBe(false);
      expect(JSON.stringify(result)).not.toContain(SECRET);
      expect(lib.readStatusJson(planPath).status).toBe(
        "IMPLEMENTATION_COMPLETE",
      );
    });
  });
});
