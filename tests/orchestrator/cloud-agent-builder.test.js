/**
 * Cursor Cloud Agent builder — mocked API + fail-closed tests.
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
const config = require(path.join(REPO_ROOT, "scripts/orchestrator/config.js"));
const {
  buildCreateAgentRequest,
  extractSafeAgentMetadata,
  createCursorCloudClient,
  redactSecrets,
  getApiKey,
  CursorCloudAgentError,
} = require(path.join(REPO_ROOT, "scripts/orchestrator/cursor-cloud-agent.js"));
const { buildImplementationPrompt } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/prompt-builder.js",
));
const { launchBuilder } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/launch-builder.js",
));
const { statusBuilder } = require(path.join(
  REPO_ROOT,
  "scripts/orchestrator/status-builder.js",
));

const SECRET = "sk-test-CURSOR-SECRET-VALUE-DO-NOT-LEAK";

function buildPlan({
  planId = "CLOUD-TEST-001",
  status = "APPROVED_FOR_IMPLEMENTATION",
} = {}) {
  return `# ${planId}

## Plan ID

Plan ID: ${planId}

## Title

Title: Cloud builder fixture

## Status

STATUS: ${status}

## Objective

Verify Cursor Cloud Agent builder launch gates with a temporary fixture plan.

## Scope

- Fixture files under docs/plans/_tmp only

## Out of Scope

- Production systems
- Real smoke execution

## Security Requirements

- No secrets; mocked API only

## Tenant Isolation Requirements

- N/A for fixture

## Acceptance Criteria

- Launch gates enforce APPROVED_FOR_IMPLEMENTATION
- Dry-run performs no network mutation

## Required Tests

- npm run orchestrator

## Validation Commands

- npm run orchestrator

## Prohibited Changes

- app/, lib/, supabase/, production

## Rollback Considerations

- Delete temporary fixture directory

## Human Approval Gate

| Field | Value |
| Author | test |
| Approved by | test-fixture |
`;
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

function rel(planPath) {
  return path.relative(REPO_ROOT, planPath).split(path.sep).join("/");
}

function mockFetchSequence(handlers) {
  let i = 0;
  return vi.fn(async (url, init) => {
    const handler = handlers[i] || handlers[handlers.length - 1];
    i += 1;
    return handler(url, init);
  });
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

describe("cursor cloud agent builder", () => {
  let fixtureDir;

  beforeEach(() => {
    fs.mkdirSync(PLANS_TMP, { recursive: true });
    fixtureDir = fs.mkdtempSync(path.join(PLANS_TMP, "case-"));
  });

  afterEach(() => {
    if (fixtureDir && fs.existsSync(fixtureDir)) {
      fs.rmSync(fixtureDir, { recursive: true, force: true });
    }
  });

  describe("request construction", () => {
    it("approved plan creates correct API request shape", () => {
      const prompt = buildImplementationPrompt({
        planId: "CLOUD-TEST-001",
        planPathRelative: "docs/plans/_tmp/x.md",
      });
      const body = buildCreateAgentRequest({ promptText: prompt });
      expect(body.repos[0].url).toBe(config.REPOSITORY_URL);
      expect(body.repos[0].startingRef).toBe("main");
      expect(body.workOnCurrentBranch).toBe(false);
      expect(body.autoCreatePR).toBe(true);
      expect(body.skipReviewerRequest).toBe(false);
      expect(body.prompt.text).toContain("CLOUD-TEST-001");
      expect(body.prompt.text).toContain("APPROVED_FOR_IMPLEMENTATION");
      expect(body.prompt.text).toContain("AGENTS.md");
    });

    it("refuses workOnCurrentBranch true", () => {
      expect(() =>
        buildCreateAgentRequest({
          promptText: "x".repeat(40),
          workOnCurrentBranch: true,
        }),
      ).toThrow(/workOnCurrentBranch must be false/);
    });
  });

  describe("success cases", () => {
    it("successful API creation records agent/run IDs and advances only after success", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });

      let createCalled = false;
      const fetchImpl = mockFetchSequence([
        async () => {
          createCalled = true;
          // Ensure status not yet IN_PROGRESS before response handling completes
          const before = lib.readStatusJson(planPath);
          expect(before.status).toBe("APPROVED_FOR_IMPLEMENTATION");
          return jsonResponse(200, {
            agent: {
              id: "bc-11111111-1111-1111-1111-111111111111",
              status: "ACTIVE",
              url: "https://cursor.com/agents/bc-11111111-1111-1111-1111-111111111111",
              latestRunId: "run-22222222-2222-2222-2222-222222222222",
            },
            run: {
              id: "run-22222222-2222-2222-2222-222222222222",
              agentId: "bc-11111111-1111-1111-1111-111111111111",
              status: "CREATING",
            },
          });
        },
      ]);

      const result = await launchBuilder(rel(planPath), {
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });

      expect(createCalled).toBe(true);
      expect(result.status).toBe("IN_PROGRESS");
      expect(result.cursor_agent.agent_id).toBe(
        "bc-11111111-1111-1111-1111-111111111111",
      );
      expect(result.cursor_agent.run_id).toBe(
        "run-22222222-2222-2222-2222-222222222222",
      );
      expect(JSON.stringify(result)).not.toContain(SECRET);

      const companion = lib.readStatusJson(planPath);
      expect(companion.status).toBe("IN_PROGRESS");
      expect(companion.cursor_agent.agent_id).toBe(
        "bc-11111111-1111-1111-1111-111111111111",
      );
      expect(JSON.stringify(companion)).not.toContain(SECRET);
    });

    it("status polling updates safe metadata", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "IN_PROGRESS",
        cursor_agent: {
          agent_id: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          run_id: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          launched_at: "2026-09-25T00:00:00.000Z",
        },
      });

      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            id: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            status: "ACTIVE",
            latestRunId: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            url: "https://cursor.com/agents/bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          }),
        async () =>
          jsonResponse(200, {
            id: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            agentId: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            status: "RUNNING",
            git: {
              branches: [
                {
                  repoUrl: "github.com/mjwiseman07/finsight-reports-app",
                  branch: "cursor/cloud-test-001",
                },
              ],
            },
          }),
      ]);

      const result = await statusBuilder(rel(planPath), {
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(result.status).toBe("IN_PROGRESS");
      expect(result.branch).toBe("cursor/cloud-test-001");
      expect(result.advanced).toBe(false);
    });

    it("completed builder may transition to IMPLEMENTATION_COMPLETE", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "IN_PROGRESS",
        cursor_agent: {
          agent_id: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          run_id: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          launched_at: "2026-09-25T00:00:00.000Z",
        },
      });

      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            id: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            status: "IDLE",
            latestRunId: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          }),
        async () =>
          jsonResponse(200, {
            id: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            agentId: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            status: "FINISHED",
            git: {
              branches: [
                {
                  repoUrl: "github.com/mjwiseman07/finsight-reports-app",
                  branch: "cursor/cloud-test-001",
                  prUrl:
                    "https://github.com/mjwiseman07/finsight-reports-app/pull/999",
                },
              ],
            },
          }),
      ]);

      const result = await statusBuilder(rel(planPath), {
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(result.status).toBe("IMPLEMENTATION_COMPLETE");
      expect(result.advanced).toBe(true);
      expect(result.pr_url).toContain("/pull/999");
      expect(result.status).not.toBe("REVIEW_PASSED");
      expect(result.status).not.toBe("READY_FOR_HUMAN_APPROVAL");
      expect(result.status).not.toBe("COMPLETED");
    });

    it("dry-run performs no network mutation", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const fetchImpl = vi.fn();
      const result = await launchBuilder(rel(planPath), {
        dryRun: true,
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(result.dryRun).toBe(true);
      expect(result.networkCalled).toBe(false);
      expect(result.statusChanged).toBe(false);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(lib.readStatusJson(planPath).status).toBe(
        "APPROVED_FOR_IMPLEMENTATION",
      );
      expect(result.request.workOnCurrentBranch).toBe(false);
      expect(result.request.repos[0].startingRef).toBe("main");
      expect(result.request.autoCreatePR).toBe(true);
      expect(JSON.stringify(result)).not.toContain(SECRET);
    });
  });

  describe("fail-closed cases", () => {
    it("DRAFT plan cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "DRAFT" }),
      );
      writeCompanion(planPath, { planId: "CLOUD-TEST-001", status: "DRAFT" });
      const fetchImpl = vi.fn();
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/APPROVED_FOR_IMPLEMENTATION/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("READY_FOR_REVIEW cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "READY_FOR_REVIEW" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "READY_FOR_REVIEW",
      });
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl: vi.fn(),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/APPROVED_FOR_IMPLEMENTATION/);
    });

    it("IN_PROGRESS cannot duplicate launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "IN_PROGRESS",
        cursor_agent: {
          agent_id: "bc-existing",
          run_id: "run-existing",
        },
      });
      const fetchImpl = vi.fn();
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/APPROVED_FOR_IMPLEMENTATION|already has cursor_agent/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("duplicate invocation cannot create second agent", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
        cursor_agent: {
          agent_id: "bc-already-launched",
          run_id: "run-already-launched",
        },
      });
      const fetchImpl = vi.fn();
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/already has cursor_agent/);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("missing CURSOR_API_KEY cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const fetchImpl = vi.fn();
      await expect(
        launchBuilder(rel(planPath), { fetchImpl, env: {} }),
      ).rejects.toThrow(/CURSOR_API_KEY/);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(lib.readStatusJson(planPath).status).toBe(
        "APPROVED_FOR_IMPLEMENTATION",
      );
    });

    it("invalid plan cannot launch", async () => {
      const planPath = writeFixture(fixtureDir, "plan.md", "not a plan");
      const fetchImpl = vi.fn();
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/invalid|Missing/i);
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("malformed companion JSON cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      fs.writeFileSync(lib.getStatusJsonPath(planPath), "{bad", "utf8");
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl: vi.fn(),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/Malformed|malformed|invalid/i);
    });

    it("plan/status PLAN_ID mismatch cannot launch", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "OTHER-PLAN",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl: vi.fn(),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/mismatch|PLAN_ID/i);
    });

    for (const httpStatus of [400, 401, 403, 429, 500]) {
      it(`Cursor ${httpStatus} response cannot advance state`, async () => {
        const planPath = writeFixture(
          fixtureDir,
          "plan.md",
          buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
        );
        writeCompanion(planPath, {
          planId: "CLOUD-TEST-001",
          status: "APPROVED_FOR_IMPLEMENTATION",
        });
        const fetchImpl = mockFetchSequence([
          async () =>
            jsonResponse(httpStatus, {
              message: `error ${httpStatus}`,
            }),
        ]);
        await expect(
          launchBuilder(rel(planPath), {
            fetchImpl,
            env: { CURSOR_API_KEY: SECRET },
          }),
        ).rejects.toThrow(/status unchanged|HTTP/);
        expect(lib.readStatusJson(planPath).status).toBe(
          "APPROVED_FOR_IMPLEMENTATION",
        );
      });
    }

    it("network timeout cannot advance state", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const fetchImpl = vi.fn(async () => {
        const err = new Error("aborted");
        err.name = "AbortError";
        throw err;
      });
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/timed out|status unchanged/i);
      expect(lib.readStatusJson(planPath).status).toBe(
        "APPROVED_FOR_IMPLEMENTATION",
      );
    });

    it("malformed API response cannot advance state", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const fetchImpl = mockFetchSequence([
        async () => ({
          ok: true,
          status: 200,
          statusText: "OK",
          async text() {
            return "not-json";
          },
        }),
      ]);
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/status unchanged|non-JSON|Malformed/i);
      expect(lib.readStatusJson(planPath).status).toBe(
        "APPROVED_FOR_IMPLEMENTATION",
      );
    });

    it("successful API response missing required IDs cannot advance state", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            agent: { status: "ACTIVE" },
            run: { status: "CREATING" },
          }),
      ]);
      await expect(
        launchBuilder(rel(planPath), {
          fetchImpl,
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/incomplete|missing required/i);
      expect(lib.readStatusJson(planPath).status).toBe(
        "APPROVED_FOR_IMPLEMENTATION",
      );
    });

    it("unsafe path cannot launch", async () => {
      await expect(
        launchBuilder("tests/orchestrator/_tmp/outside-plans.md", {
          fetchImpl: vi.fn(),
          env: { CURSOR_API_KEY: SECRET },
        }),
      ).rejects.toThrow(/not found|must be inside docs\/plans/i);
    });

    it("API key never appears in output/errors/status", async () => {
      expect(redactSecrets(`leak ${SECRET} end`, SECRET)).not.toContain(SECRET);
      expect(() => getApiKey({ env: {} })).toThrow(/CURSOR_API_KEY/);
      const err = new CursorCloudAgentError(`bad ${SECRET}`);
      expect(redactSecrets(err.message, SECRET)).not.toContain(SECRET);
    });

    it("dry-run never invokes network", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "APPROVED_FOR_IMPLEMENTATION" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "APPROVED_FOR_IMPLEMENTATION",
      });
      const fetchImpl = vi.fn();
      await launchBuilder(rel(planPath), {
        dryRun: true,
        fetchImpl,
        env: {},
      });
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("builder completion cannot produce REVIEW_PASSED / READY_FOR_HUMAN_APPROVAL / COMPLETED", async () => {
      const planPath = writeFixture(
        fixtureDir,
        "plan.md",
        buildPlan({ status: "IN_PROGRESS" }),
      );
      writeCompanion(planPath, {
        planId: "CLOUD-TEST-001",
        status: "IN_PROGRESS",
        cursor_agent: {
          agent_id: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          run_id: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          launched_at: "2026-09-25T00:00:00.000Z",
        },
      });
      const fetchImpl = mockFetchSequence([
        async () =>
          jsonResponse(200, {
            id: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            status: "IDLE",
            latestRunId: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          }),
        async () =>
          jsonResponse(200, {
            id: "run-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            agentId: "bc-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            status: "FINISHED",
            git: {
              branches: [
                {
                  branch: "cursor/x",
                  prUrl: "https://github.com/mjwiseman07/finsight-reports-app/pull/1",
                },
              ],
            },
          }),
      ]);
      const result = await statusBuilder(rel(planPath), {
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      expect(result.status).toBe("IMPLEMENTATION_COMPLETE");
      expect(["REVIEW_PASSED", "READY_FOR_HUMAN_APPROVAL", "COMPLETED"]).not.toContain(
        result.status,
      );
      const companion = lib.readStatusJson(planPath);
      expect(companion.status).toBe("IMPLEMENTATION_COMPLETE");
      expect(companion.review).toBeUndefined();
    });
  });

  describe("client helpers", () => {
    it("extractSafeAgentMetadata requires ids", () => {
      expect(() => extractSafeAgentMetadata({})).toThrow(/missing required agent/i);
      const meta = extractSafeAgentMetadata({
        agent: { id: "bc-1", status: "ACTIVE" },
        run: { id: "run-1", status: "CREATING" },
      });
      expect(meta.agent_id).toBe("bc-1");
      expect(meta.run_id).toBe("run-1");
    });

    it("createCursorCloudClient getAgent uses Basic auth without leaking key", async () => {
      let seenAuth = null;
      const fetchImpl = vi.fn(async (_url, init) => {
        seenAuth = init.headers.Authorization;
        return jsonResponse(200, {
          id: "bc-1",
          status: "IDLE",
          latestRunId: "run-1",
        });
      });
      const client = createCursorCloudClient({
        fetchImpl,
        env: { CURSOR_API_KEY: SECRET },
      });
      await client.getAgent("bc-1");
      expect(seenAuth.startsWith("Basic ")).toBe(true);
      expect(seenAuth).not.toContain(SECRET);
    });
  });
});
