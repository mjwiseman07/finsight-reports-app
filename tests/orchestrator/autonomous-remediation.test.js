/**
 * Autonomous remediation + overnight controller — mocked tests.
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
const {
  buildBlockerPacket,
  writeBlockerPacket,
} = require(path.join(REPO_ROOT, "scripts/orchestrator/blocker-packet.js"));
const {
  extractResolverResultJson,
  assertResolverResultValid,
  RESULT_MARK_START,
  RESULT_MARK_END,
} = require(path.join(REPO_ROOT, "scripts/orchestrator/resolver-result.js"));
const {
  buildCreateAgentRequest,
  buildRemediationAgentRequest,
} = require(path.join(REPO_ROOT, "scripts/orchestrator/cursor-cloud-agent.js"));
const { isTransientError, withBoundedRetry } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/retry.js",
));
const { runOvernight, inferNextAction } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/overnight-run.js",
));
const { launchResolver } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/launch-resolver.js",
));
const { statusResolver } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/status-resolver.js",
));
const { launchRemediation } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/launch-remediation.js",
));
const { buildMorningReport } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/morning-report.js",
));
const {
  buildHumanDecisionPacket,
} = require(path.join(REPO_ROOT, "scripts/orchestrator/human-decision.js"));

const SECRET = "sk-test-REMEDIATION-SECRET-DO-NOT-LEAK";
const BUILDER_ID = "bc-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const REVIEWER_ID = "bc-rrrrrrrr-rrrr-rrrr-rrrr-rrrrrrrrrrrr";
const RESOLVER_ID = "bc-zzzzzzzz-zzzz-zzzz-zzzz-zzzzzzzzzzzz";
const REMEDIATOR_ID = "bc-mmmmmmmm-mmmm-mmmm-mmmm-mmmmmmmmmmmm";
const PR_URL =
  "https://github.com/mjwiseman07/finsight-reports-app/pull/999";
const BRANCH = "cursor/advisacor-remediation-test-branch";
const HEAD_SHA = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function buildPlanMd({
  planId = "REMEDIATE-TEST-001",
  status = "REVIEW_FAILED",
} = {}) {
  return `# ${planId}

## Plan ID

Plan ID: ${planId}

## Title

Title: Remediation fixture

## Status

STATUS: ${status}

## Objective

Verify autonomous remediation orchestration with temporary fixtures.

## Scope

- Fixture files under docs/plans/_tmp only

## Out of Scope

- Production systems

## Security Requirements

- No secrets; mocked API only

## Tenant Isolation Requirements

- N/A for fixture

## Acceptance Criteria

- Resolver classifies blockers
- Remediation never targets main
- Overnight reaches READY_FOR_HUMAN_APPROVAL or HUMAN_DECISION_REQUIRED

## Required Tests

- npm run orchestrator

## Validation Commands

- npm run orchestrator

## Prohibited Changes

- No merge, deploy, or COMPLETED writes by automation

## Rollback Considerations

- Delete fixture plans

## Human Approval Gate

- Human merge only
`;
}

function writeFixture(planId, status, companionExtra = {}) {
  fs.mkdirSync(PLANS_TMP, { recursive: true });
  const planPath = path.join(PLANS_TMP, `${planId}.md`);
  fs.writeFileSync(planPath, buildPlanMd({ planId, status }), "utf8");
  const companion = {
    planId,
    planPath,
    status,
    phase: "review",
    implementation: {
      completedAt: "2026-09-25T00:00:00.000Z",
      results: {
        planId,
        success: true,
        source: "cursor_cloud_agent",
        agent_id: BUILDER_ID,
        branch: BRANCH,
        pr_url: PR_URL,
      },
    },
    cursor_agent: {
      agent_id: BUILDER_ID,
      run_id: "run-builder",
      status: "FINISHED",
      run_status: "FINISHED",
      branch: BRANCH,
      pr_url: PR_URL,
    },
    builder_head_sha: HEAD_SHA,
    merge: false,
    deploy: false,
    ...companionExtra,
  };
  if (status === "REVIEW_FAILED") {
    companion.review = {
      completedAt: "2026-09-25T00:01:00.000Z",
      verdict: "NEEDS_CHANGES",
      notes: "fixture finding",
      result: {
        plan_id: planId,
        review_result: "NEEDS_CHANGES",
        findings: [
          {
            severity: "MEDIUM",
            explanation: "missing smoke note",
            remediation: "add note",
          },
        ],
      },
    };
  }
  if (status === "READY_FOR_HUMAN_APPROVAL" || status === "REVIEW_PASSED") {
    companion.review = {
      completedAt: "2026-09-25T00:02:00.000Z",
      verdict: "PASS",
      notes: "ok",
    };
  }
  fs.writeFileSync(
    path.join(PLANS_TMP, `${planId}.status.json`),
    `${JSON.stringify(companion, null, 2)}\n`,
    "utf8",
  );
  return {
    planPath: `docs/plans/_tmp/${planId}.md`,
    absolute: planPath,
  };
}

function cleanupFixtures() {
  if (!fs.existsSync(PLANS_TMP)) return;
  for (const name of fs.readdirSync(PLANS_TMP)) {
    if (name.startsWith("REMEDIATE-") || name.startsWith("OVERNIGHT-")) {
      fs.unlinkSync(path.join(PLANS_TMP, name));
    }
  }
}

function mockPrFetch(headSha = HEAD_SHA) {
  return async (url) => {
    if (String(url).includes("/pulls/")) {
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            number: 999,
            html_url: PR_URL,
            state: "open",
            merged: false,
            draft: true,
            base: { ref: "main" },
            head: { ref: BRANCH, sha: headSha },
          }),
      };
    }
    throw new Error(`Unexpected fetch ${url}`);
  };
}

afterEach(() => {
  cleanupFixtures();
  vi.restoreAllMocks();
});

describe("resolver result schema", () => {
  it("parses markers and validates AUTONOMOUSLY_RESOLVABLE", () => {
    const text = `notes
${RESULT_MARK_START}
{"plan_id":"REMEDIATE-TEST-001","classification":"AUTONOMOUSLY_RESOLVABLE","root_cause":"missing assertion in test","evidence":["tests/foo.test.js"],"recommended_resolution":"add assertion","confidence":0.9,"human_decision_required":false,"remediation_plan":{"summary":"fix test","steps":["edit test"]},"merge":false,"deploy":false}
${RESULT_MARK_END}`;
    const raw = extractResolverResultJson(text);
    const v = assertResolverResultValid(raw, {
      expectedPlanId: "REMEDIATE-TEST-001",
    });
    expect(v.classification).toBe("AUTONOMOUSLY_RESOLVABLE");
    expect(v.remediation_plan).toBeTruthy();
  });

  it("requires human_question for HUMAN_DECISION_REQUIRED", () => {
    expect(() =>
      assertResolverResultValid({
        plan_id: "X",
        classification: "HUMAN_DECISION_REQUIRED",
        root_cause: "need live stripe key from matthew",
        evidence: ["billing"],
        recommended_resolution: "ask matthew",
        confidence: 0.7,
        human_decision_required: true,
        merge: false,
        deploy: false,
      }),
    ).toThrow(/human_question/);
  });
});

describe("blocker packet", () => {
  it("redacts secret-like values", () => {
    const { absolute } = writeFixture("REMEDIATE-SEC-001", "REVIEW_FAILED");
    const companion = lib.readStatusJson(absolute);
    const packet = buildBlockerPacket(companion, { planId: "REMEDIATE-SEC-001" }, {
      current_error_messages: [`auth failed ${SECRET}`],
      api_key: SECRET,
    });
    const dumped = JSON.stringify(packet);
    expect(dumped).not.toContain(SECRET);
    expect(dumped).toMatch(/REDACTED|truncated/);
    writeBlockerPacket(absolute, packet);
  });
});

describe("remediation branch safety", () => {
  it("buildCreateAgentRequest still forbids workOnCurrentBranch", () => {
    expect(() =>
      buildCreateAgentRequest({
        promptText: "x".repeat(40),
        workOnCurrentBranch: true,
      }),
    ).toThrow(/workOnCurrentBranch/);
  });

  it("buildRemediationAgentRequest refuses main and unverified", () => {
    expect(() =>
      buildRemediationAgentRequest({
        promptText: "x".repeat(40),
        prUrl: PR_URL,
        builderBranch: BRANCH,
        verified: false,
      }),
    ).toThrow(/verified/);
    expect(() =>
      buildRemediationAgentRequest({
        promptText: "x".repeat(40),
        prUrl: PR_URL,
        builderBranch: "main",
        verified: true,
      }),
    ).toThrow(/protected|main/i);
  });

  it("buildRemediationAgentRequest allows verified non-main PR branch", () => {
    const body = buildRemediationAgentRequest({
      promptText: "x".repeat(40),
      prUrl: PR_URL,
      builderBranch: BRANCH,
      builderHeadSha: HEAD_SHA,
      verified: true,
    });
    expect(body.workOnCurrentBranch).toBe(true);
    expect(body.autoCreatePR).toBe(false);
    expect(body.repos[0].prUrl).toBe(PR_URL);
  });
});

describe("transient retry", () => {
  it("classifies 429/5xx/network as transient; 401 not", () => {
    expect(isTransientError({ status: 429, code: "HTTP_429" })).toBe(true);
    expect(isTransientError({ status: 503, code: "HTTP_503" })).toBe(true);
    expect(isTransientError({ code: "NETWORK", message: "network error" })).toBe(
      true,
    );
    expect(isTransientError({ status: 401, code: "HTTP_401" })).toBe(false);
    expect(isTransientError({ code: "MISSING_API_KEY" })).toBe(false);
  });

  it("withBoundedRetry succeeds after transient failure", async () => {
    let n = 0;
    const result = await withBoundedRetry(
      async () => {
        n += 1;
        if (n < 3) {
          const err = new Error("HTTP 429");
          err.status = 429;
          err.code = "HTTP_429";
          throw err;
        }
        return "ok";
      },
      { maxAttempts: 4, baseDelayMs: 1, sleepImpl: async () => {} },
    );
    expect(result).toBe("ok");
    expect(n).toBe(3);
  });

  it("withBoundedRetry exhausts safely", async () => {
    await expect(
      withBoundedRetry(
        async () => {
          const err = new Error("HTTP 503");
          err.status = 503;
          err.code = "HTTP_503";
          throw err;
        },
        { maxAttempts: 2, baseDelayMs: 1, sleepImpl: async () => {} },
      ),
    ).rejects.toThrow(/503/);
  });
});

describe("launch resolver / remediation gates", () => {
  it("resolver dry-run does not mutate network when preconditions pass", async () => {
    const { planPath, absolute } = writeFixture(
      "REMEDIATE-RES-001",
      "REVIEW_FAILED",
    );
    const result = await launchResolver(planPath, {
      dryRun: true,
      env: { CURSOR_API_KEY: SECRET },
    });
    expect(result.dryRun).toBe(true);
    expect(result.networkCalled).toBe(false);
    expect(lib.readStatusJson(absolute).status).toBe("REVIEW_FAILED");
  });

  it("remediation dry-run verifies same PR branch", async () => {
    const { planPath } = writeFixture("REMEDIATE-REM-001", "RESOLUTION_PROPOSED", {
      review: {
        completedAt: "2026-09-25T00:01:00.000Z",
        verdict: "NEEDS_CHANGES",
        notes: "x",
      },
      resolver: {
        classification: "AUTONOMOUSLY_RESOLVABLE",
        result: {
          plan_id: "REMEDIATE-REM-001",
          classification: "AUTONOMOUSLY_RESOLVABLE",
          remediation_plan: { summary: "fix", steps: ["edit"] },
        },
      },
      resolution: {
        remediation_plan: { summary: "fix", steps: ["edit"] },
      },
      cursor_resolver: {
        agent_id: RESOLVER_ID,
        run_id: "run-resolver",
        run_status: "FINISHED",
      },
    });
    const result = await launchRemediation(planPath, {
      dryRun: true,
      env: { CURSOR_API_KEY: SECRET },
      githubFetchImpl: mockPrFetch(),
    });
    expect(result.dryRun).toBe(true);
    expect(result.builderBranch).toBe(BRANCH);
    expect(result.request.workOnCurrentBranch).toBe(true);
    expect(result.request.autoCreatePR).toBe(false);
  });

  it("remediation refuses when PR head is main", async () => {
    const { planPath } = writeFixture("REMEDIATE-REM-002", "RESOLUTION_PROPOSED", {
      review: { verdict: "NEEDS_CHANGES", notes: "x" },
      resolution: { remediation_plan: { summary: "fix" } },
      cursor_agent: {
        agent_id: BUILDER_ID,
        run_id: "run-builder",
        branch: "main",
        pr_url: PR_URL,
        run_status: "FINISHED",
      },
    });
    await expect(
      launchRemediation(planPath, {
        dryRun: true,
        env: { CURSOR_API_KEY: SECRET },
        githubFetchImpl: async () => ({
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              number: 999,
              html_url: PR_URL,
              state: "open",
              merged: false,
              base: { ref: "main" },
              head: { ref: "main", sha: HEAD_SHA },
            }),
        }),
      }),
    ).rejects.toThrow(/main|branch/i);
  });
});

describe("status resolver ingest", () => {
  it("AUTONOMOUSLY_RESOLVABLE → RESOLUTION_PROPOSED", async () => {
    const planId = "REMEDIATE-ING-001";
    const { planPath, absolute } = writeFixture(planId, "ANALYZING_BLOCKER", {
      review: { verdict: "NEEDS_CHANGES", notes: "x" },
      cursor_resolver: {
        agent_id: RESOLVER_ID,
        run_id: "run-resolver",
        run_status: "RUNNING",
        launched_at: "2026-09-25T00:00:00.000Z",
      },
    });
    const marker = `${RESULT_MARK_START}
{"plan_id":"${planId}","classification":"AUTONOMOUSLY_RESOLVABLE","root_cause":"test assertion missing in fixture","evidence":["a"],"recommended_resolution":"add assertion","confidence":0.85,"human_decision_required":false,"remediation_plan":{"summary":"fix test","steps":["edit"]},"merge":false,"deploy":false}
${RESULT_MARK_END}`;
    const fetchImpl = async (url) => {
      if (String(url).includes("/runs/")) {
        return {
          ok: true,
          json: async () => ({
            id: "run-resolver",
            status: "FINISHED",
            agentId: RESOLVER_ID,
            result: marker,
            git: { branches: [] },
          }),
          text: async () =>
            JSON.stringify({
              id: "run-resolver",
              status: "FINISHED",
              agentId: RESOLVER_ID,
              result: marker,
            }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          id: RESOLVER_ID,
          status: "IDLE",
          latestRunId: "run-resolver",
          url: "https://cursor.com/agents/x",
        }),
        text: async () =>
          JSON.stringify({
            id: RESOLVER_ID,
            status: "IDLE",
            latestRunId: "run-resolver",
          }),
      };
    };
    // createCursorCloudClient uses response.text then JSON.parse
    const textFetch = async (url) => {
      const res = await fetchImpl(url);
      const body = await res.json();
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify(body),
      };
    };
    const result = await statusResolver(planPath, {
      fetchImpl: textFetch,
      env: { CURSOR_API_KEY: SECRET },
      resultTextOverride: marker,
    });
    expect(result.status).toBe("RESOLUTION_PROPOSED");
    expect(lib.readStatusJson(absolute).status).toBe("RESOLUTION_PROPOSED");
  });

  it("HUMAN_DECISION_REQUIRED stops autonomous modification", async () => {
    const planId = "REMEDIATE-HUM-001";
    const { planPath, absolute } = writeFixture(planId, "ANALYZING_BLOCKER", {
      review: { verdict: "NEEDS_CHANGES", notes: "x" },
      cursor_resolver: {
        agent_id: RESOLVER_ID,
        run_id: "run-resolver",
        run_status: "RUNNING",
      },
    });
    const marker = `${RESULT_MARK_START}
{"plan_id":"${planId}","classification":"HUMAN_DECISION_REQUIRED","root_cause":"need production stripe live mode decision","evidence":["billing"],"recommended_resolution":"choose test vs live","confidence":0.9,"human_decision_required":true,"human_question":"Should Stripe run in live mode for this plan?","merge":false,"deploy":false}
${RESULT_MARK_END}`;
    const textFetch = async () => ({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: "run-resolver",
          status: "FINISHED",
          agentId: RESOLVER_ID,
          result: marker,
        }),
    });
    const result = await statusResolver(planPath, {
      fetchImpl: textFetch,
      env: { CURSOR_API_KEY: SECRET },
      resultTextOverride: marker,
    });
    expect(result.status).toBe("HUMAN_DECISION_REQUIRED");
    expect(lib.readStatusJson(absolute).human_decision).toBeTruthy();
  });
});

describe("overnight controller (injected deps)", () => {
  it("FULL SUCCESS path to READY_FOR_HUMAN_APPROVAL", async () => {
    const planId = "OVERNIGHT-OK-001";
    const { planPath, absolute } = writeFixture(
      planId,
      "APPROVED_FOR_IMPLEMENTATION",
      {
        implementation: undefined,
        cursor_agent: undefined,
        builder_head_sha: undefined,
        phase: "planning",
      },
    );
    // APPROVED doesn't need implementation evidence
    fs.writeFileSync(
      path.join(PLANS_TMP, `${planId}.status.json`),
      `${JSON.stringify({
        planId,
        planPath: absolute,
        status: "APPROVED_FOR_IMPLEMENTATION",
        phase: "planning",
        merge: false,
        deploy: false,
      }, null, 2)}\n`,
    );

    let phase = "builder";
    const deps = {
      launchBuilder: async () => {
        lib.writeStatusJson(
          absolute,
          {
            planId,
            planPath: absolute,
            status: "IN_PROGRESS",
            cursor_agent: {
              agent_id: BUILDER_ID,
              run_id: "run-b",
              run_status: "RUNNING",
              branch: BRANCH,
            },
            merge: false,
            deploy: false,
          },
          { fromStatus: "APPROVED_FOR_IMPLEMENTATION" },
        );
        return { ok: true };
      },
      statusBuilder: async () => {
        lib.writeStatusJson(
          absolute,
          {
            planId,
            planPath: absolute,
            status: "IMPLEMENTATION_COMPLETE",
            implementation: {
              completedAt: "2026-09-25T00:00:00.000Z",
              results: { planId, success: true },
            },
            cursor_agent: {
              agent_id: BUILDER_ID,
              run_id: "run-b",
              run_status: "FINISHED",
              branch: BRANCH,
              pr_url: PR_URL,
            },
            builder_head_sha: HEAD_SHA,
            merge: false,
            deploy: false,
          },
          { fromStatus: "IN_PROGRESS" },
        );
        phase = "review";
        return { ok: true, status: "IMPLEMENTATION_COMPLETE" };
      },
      launchReviewer: async () => {
        const c = lib.readStatusJson(absolute);
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            cursor_reviewer: {
              agent_id: REVIEWER_ID,
              run_id: "run-r",
              run_status: "RUNNING",
            },
          },
          { fromStatus: "IMPLEMENTATION_COMPLETE", syncMarkdown: false },
        );
        return { ok: true };
      },
      statusReviewer: async () => {
        const c = lib.readStatusJson(absolute);
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            status: "REVIEW_PASSED",
            review: { verdict: "PASS", notes: "ok" },
            cursor_reviewer: {
              agent_id: REVIEWER_ID,
              run_id: "run-r",
              run_status: "FINISHED",
            },
          },
          { fromStatus: "IMPLEMENTATION_COMPLETE" },
        );
        lib.writeStatusJson(
          absolute,
          {
            ...lib.readStatusJson(absolute),
            status: "READY_FOR_HUMAN_APPROVAL",
            review: {
              verdict: "PASS",
              notes: "ok",
              advancedToHumanApprovalAt: "2026-09-25T00:03:00.000Z",
            },
          },
          { fromStatus: "REVIEW_PASSED" },
        );
        return {
          ok: true,
          advanced: true,
          review_result: "PASS",
          status: "READY_FOR_HUMAN_APPROVAL",
        };
      },
      launchResolver: async () => {
        throw new Error("should not launch resolver");
      },
      statusResolver: async () => {
        throw new Error("should not status resolver");
      },
      launchRemediation: async () => {
        throw new Error("should not remediate");
      },
      statusRemediation: async () => {
        throw new Error("should not status remediation");
      },
    };

    const result = await runOvernight(planPath, {
      deps,
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      maxPollMs: 5_000,
      env: { CURSOR_API_KEY: SECRET },
    });
    expect(result.status).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(phase).toBe("review");
  });

  it("ONE REMEDIATION then PASS", async () => {
    const planId = "OVERNIGHT-ONE-001";
    const { planPath, absolute } = writeFixture(
      planId,
      "IMPLEMENTATION_COMPLETE",
    );
    let reviews = 0;
    const deps = {
      launchBuilder: async () => {
        throw new Error("no builder");
      },
      statusBuilder: async () => {
        throw new Error("no builder poll");
      },
      launchReviewer: async () => {
        const c = lib.readStatusJson(absolute);
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            cursor_reviewer: {
              agent_id: `${REVIEWER_ID}-${reviews}`,
              run_id: `run-r-${reviews}`,
              run_status: "RUNNING",
            },
          },
          { fromStatus: "IMPLEMENTATION_COMPLETE", syncMarkdown: false },
        );
        return { ok: true };
      },
      statusReviewer: async () => {
        reviews += 1;
        const c = lib.readStatusJson(absolute);
        if (reviews === 1) {
          lib.writeStatusJson(
            absolute,
            {
              ...c,
              status: "REVIEW_FAILED",
              review: {
                verdict: "NEEDS_CHANGES",
                notes: "fix me",
                result: { findings: [{ severity: "MEDIUM", explanation: "x" }] },
              },
              cursor_reviewer: {
                agent_id: REVIEWER_ID,
                run_id: "run-r-0",
                run_status: "FINISHED",
              },
            },
            { fromStatus: "IMPLEMENTATION_COMPLETE" },
          );
          return {
            ok: true,
            advanced: true,
            review_result: "NEEDS_CHANGES",
            status: "REVIEW_FAILED",
          };
        }
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            status: "REVIEW_PASSED",
            review: { verdict: "PASS", notes: "ok" },
            cursor_reviewer: {
              agent_id: `${REVIEWER_ID}-2`,
              run_id: "run-r-1",
              run_status: "FINISHED",
            },
          },
          { fromStatus: "IMPLEMENTATION_COMPLETE" },
        );
        lib.writeStatusJson(
          absolute,
          {
            ...lib.readStatusJson(absolute),
            status: "READY_FOR_HUMAN_APPROVAL",
            review: {
              verdict: "PASS",
              notes: "ok",
              advancedToHumanApprovalAt: "2026-09-25T00:03:00.000Z",
            },
          },
          { fromStatus: "REVIEW_PASSED" },
        );
        return {
          ok: true,
          advanced: true,
          review_result: "PASS",
          status: "READY_FOR_HUMAN_APPROVAL",
        };
      },
      launchResolver: async () => {
        const c = lib.readStatusJson(absolute);
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            status: "ANALYZING_BLOCKER",
            cursor_resolver: {
              agent_id: RESOLVER_ID,
              run_id: "run-z",
              run_status: "RUNNING",
            },
          },
          { fromStatus: c.status },
        );
        return { ok: true };
      },
      statusResolver: async () => {
        const c = lib.readStatusJson(absolute);
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            status: "RESOLUTION_PROPOSED",
            resolver: {
              classification: "AUTONOMOUSLY_RESOLVABLE",
              result: {
                classification: "AUTONOMOUSLY_RESOLVABLE",
                remediation_plan: { summary: "fix" },
              },
            },
            resolution: { remediation_plan: { summary: "fix" } },
            cursor_resolver: {
              agent_id: RESOLVER_ID,
              run_id: "run-z",
              run_status: "FINISHED",
            },
          },
          { fromStatus: "ANALYZING_BLOCKER" },
        );
        return {
          ok: true,
          advanced: true,
          classification: "AUTONOMOUSLY_RESOLVABLE",
          status: "RESOLUTION_PROPOSED",
        };
      },
      launchRemediation: async () => {
        const c = lib.readStatusJson(absolute);
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            status: "REMEDIATION_IN_PROGRESS",
            remediation: { cycle_number: 1, max_cycles: 5 },
            cursor_remediation: {
              agent_id: REMEDIATOR_ID,
              run_id: "run-m",
              run_status: "RUNNING",
            },
          },
          { fromStatus: "RESOLUTION_PROPOSED" },
        );
        return { ok: true };
      },
      statusRemediation: async () => {
        const c = lib.readStatusJson(absolute);
        // mimic clear reviewer for re-review
        const next = {
          ...c,
          status: "IMPLEMENTATION_COMPLETE",
          previous_review: c.review,
          previous_cursor_reviewer: c.cursor_reviewer,
          builder_head_sha: "cccccccccccccccccccccccccccccccccccccccc",
          remediation: { ...(c.remediation || {}), cycle_number: 1 },
          cursor_remediation: {
            agent_id: REMEDIATOR_ID,
            run_id: "run-m",
            run_status: "FINISHED",
          },
        };
        delete next.review;
        delete next.cursor_reviewer;
        // write via REMEDIATION_COMPLETE intermediate
        lib.writeStatusJson(
          absolute,
          { ...c, status: "REMEDIATION_COMPLETE" },
          { fromStatus: "REMEDIATION_IN_PROGRESS" },
        );
        lib.writeStatusJson(absolute, next, {
          fromStatus: "REMEDIATION_COMPLETE",
        });
        return {
          ok: true,
          advanced: true,
          status: "IMPLEMENTATION_COMPLETE",
        };
      },
    };

    const result = await runOvernight(planPath, {
      deps,
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      maxPollMs: 5_000,
      env: { CURSOR_API_KEY: SECRET },
    });
    expect(result.status).toBe("READY_FOR_HUMAN_APPROVAL");
    expect(reviews).toBe(2);
  });

  it("HUMAN_DECISION_REQUIRED does not remediate", async () => {
    const planId = "OVERNIGHT-HUM-001";
    const { planPath, absolute } = writeFixture(planId, "REVIEW_FAILED");
    let remediateCalls = 0;
    const deps = {
      launchBuilder: async () => {
        throw new Error("no");
      },
      statusBuilder: async () => {
        throw new Error("no");
      },
      launchReviewer: async () => {
        throw new Error("no");
      },
      statusReviewer: async () => {
        throw new Error("no");
      },
      launchResolver: async () => {
        const c = lib.readStatusJson(absolute);
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            status: "ANALYZING_BLOCKER",
            cursor_resolver: {
              agent_id: RESOLVER_ID,
              run_id: "run-z",
              run_status: "RUNNING",
            },
          },
          { fromStatus: "REVIEW_FAILED" },
        );
        return { ok: true };
      },
      statusResolver: async () => {
        const c = lib.readStatusJson(absolute);
        const packet = buildHumanDecisionPacket({
          planId,
          state: "HUMAN_DECISION_REQUIRED",
          question: "Use live Stripe or test mode for this change?",
          why: "Business/financial decision not inferable from plan",
        });
        lib.writeStatusJson(
          absolute,
          {
            ...c,
            status: "HUMAN_DECISION_REQUIRED",
            human_decision: packet,
            cursor_resolver: {
              agent_id: RESOLVER_ID,
              run_id: "run-z",
              run_status: "FINISHED",
            },
          },
          { fromStatus: "ANALYZING_BLOCKER" },
        );
        return {
          ok: true,
          advanced: true,
          classification: "HUMAN_DECISION_REQUIRED",
          status: "HUMAN_DECISION_REQUIRED",
        };
      },
      launchRemediation: async () => {
        remediateCalls += 1;
        throw new Error("should not remediate");
      },
      statusRemediation: async () => {
        throw new Error("no");
      },
    };
    const result = await runOvernight(planPath, {
      deps,
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      maxPollMs: 5_000,
      env: { CURSOR_API_KEY: SECRET },
    });
    expect(result.status).toBe("HUMAN_DECISION_REQUIRED");
    expect(remediateCalls).toBe(0);
  });

  it("MAX CYCLES → HUMAN_DECISION_REQUIRED", async () => {
    const planId = "OVERNIGHT-MAX-001";
    const { planPath, absolute } = writeFixture(planId, "REVIEW_FAILED", {
      remediation: { cycle_number: 5, max_cycles: 5 },
    });
    const result = await runOvernight(planPath, {
      maxCycles: 5,
      deps: {
        launchBuilder: async () => {
          throw new Error("no");
        },
        statusBuilder: async () => {
          throw new Error("no");
        },
        launchReviewer: async () => {
          throw new Error("no");
        },
        statusReviewer: async () => {
          throw new Error("no");
        },
        launchResolver: async () => {
          throw new Error("should stop before resolver when budget exhausted");
        },
        statusResolver: async () => {
          throw new Error("no");
        },
        launchRemediation: async () => {
          throw new Error("no");
        },
        statusRemediation: async () => {
          throw new Error("no");
        },
      },
      sleepImpl: async () => {},
      pollIntervalMs: 0,
      env: { CURSOR_API_KEY: SECRET },
    });
    expect(result.status).toBe("HUMAN_DECISION_REQUIRED");
    expect(lib.readStatusJson(absolute).human_decision).toBeTruthy();
  });

  it("dry-run reports next action without network", async () => {
    const { planPath } = writeFixture(
      "OVERNIGHT-DRY-001",
      "IMPLEMENTATION_COMPLETE",
    );
    const result = await runOvernight(planPath, { dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.nextAction).toMatch(/reviewer/);
  });
});

describe("resume inference", () => {
  it("infers next actions without duplicate launches", () => {
    expect(
      inferNextAction("IN_PROGRESS", {
        cursor_agent: { agent_id: BUILDER_ID },
      }),
    ).toBe("status-builder");
    expect(
      inferNextAction("IMPLEMENTATION_COMPLETE", {
        cursor_reviewer: { agent_id: REVIEWER_ID },
      }),
    ).toBe("status-reviewer");
    expect(inferNextAction("IMPLEMENTATION_COMPLETE", {})).toBe(
      "launch-reviewer",
    );
    expect(inferNextAction("RESOLUTION_PROPOSED", {})).toBe(
      "launch-remediation",
    );
    expect(inferNextAction("READY_FOR_HUMAN_APPROVAL", {})).toBe(
      "human-merge-decision",
    );
  });
});

describe("morning report", () => {
  it("renders concise overnight summary", () => {
    const report = buildMorningReport({
      planId: "ADV-047",
      companion: {
        status: "READY_FOR_HUMAN_APPROVAL",
        cursor_agent: { pr_url: PR_URL },
        builder_head_sha: HEAD_SHA,
        remediation: {
          cycle_number: 2,
          builder_attempts: 3,
          reviewer_attempts: 3,
          resolver_attempts: 2,
        },
        review: {
          verdict: "PASS",
          result: { security_review: { status: "PASS" }, test_review: { status: "PASS" } },
        },
      },
    });
    expect(report.text).toContain("ADVISACOR OVERNIGHT RUN");
    expect(report.text).toContain("READY_FOR_HUMAN_APPROVAL");
    expect(report.text).toContain("Human intervention required: NO");
  });
});
