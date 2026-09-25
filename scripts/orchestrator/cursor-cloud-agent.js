/**
 * Cursor Cloud Agents API v1 client.
 * Fail-closed. Never logs or returns API keys.
 * Native fetch only — no heavy SDK.
 */

"use strict";

const config = require("./config");

class CursorCloudAgentError extends Error {
  constructor(message, { status = null, code = null, body = null } = {}) {
    super(message);
    this.name = "CursorCloudAgentError";
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

function getApiKey({ env = process.env } = {}) {
  const key = env.CURSOR_API_KEY;
  if (key == null || String(key).trim() === "") {
    throw new CursorCloudAgentError(
      "CURSOR_API_KEY is not configured. Create an API key in Cursor Dashboard → API Keys, then set CURSOR_API_KEY in your local environment (e.g. .env.local). Never commit the key.",
      { code: "MISSING_API_KEY" },
    );
  }
  return String(key).trim();
}

function redactSecrets(value, apiKey) {
  if (value == null) return value;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!apiKey) return text;
  return text.split(apiKey).join("[REDACTED]");
}

function authHeader(apiKey) {
  // Basic auth with API key as username and empty password (Cursor Cloud Agents API).
  const token = Buffer.from(`${apiKey}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

function buildCreateAgentRequest({
  promptText,
  name = undefined,
  repositoryUrl = config.REPOSITORY_URL,
  startingRef = config.STARTING_REF,
  prUrl = undefined,
  workOnCurrentBranch = config.WORK_ON_CURRENT_BRANCH,
  autoCreatePR = config.AUTO_CREATE_PR,
  skipReviewerRequest = config.SKIP_REVIEWER_REQUEST,
} = {}) {
  if (!promptText || String(promptText).trim().length < 32) {
    throw new CursorCloudAgentError("prompt.text is required and must be substantive", {
      code: "INVALID_PROMPT",
    });
  }
  if (workOnCurrentBranch === true) {
    throw new CursorCloudAgentError(
      "workOnCurrentBranch must be false — Cloud Agents must use isolated cursor/... branches",
      { code: "UNSAFE_BRANCH_MODE" },
    );
  }

  const repoEntry = { url: repositoryUrl };
  if (prUrl) {
    repoEntry.prUrl = String(prUrl);
  } else {
    repoEntry.startingRef = startingRef;
  }

  const body = {
    prompt: { text: String(promptText) },
    repos: [repoEntry],
    workOnCurrentBranch: false,
    autoCreatePR: Boolean(autoCreatePR),
    skipReviewerRequest: Boolean(skipReviewerRequest),
  };
  if (name) {
    body.name = String(name).slice(0, 100);
  }
  return body;
}

function extractSafeAgentMetadata(apiResponse) {
  if (!apiResponse || typeof apiResponse !== "object") {
    throw new CursorCloudAgentError("Malformed Cursor API response", {
      code: "MALFORMED_RESPONSE",
    });
  }
  const agent = apiResponse.agent;
  const run = apiResponse.run;
  if (!agent || typeof agent !== "object") {
    throw new CursorCloudAgentError(
      "Cursor API response missing required agent object",
      { code: "MISSING_AGENT" },
    );
  }
  if (!run || typeof run !== "object") {
    throw new CursorCloudAgentError(
      "Cursor API response missing required run object",
      { code: "MISSING_RUN" },
    );
  }
  if (!agent.id || typeof agent.id !== "string") {
    throw new CursorCloudAgentError(
      "Cursor API response missing required agent.id",
      { code: "MISSING_AGENT_ID" },
    );
  }
  if (!run.id || typeof run.id !== "string") {
    throw new CursorCloudAgentError(
      "Cursor API response missing required run.id",
      { code: "MISSING_RUN_ID" },
    );
  }

  const branches = run.git?.branches || agent.git?.branches || [];
  const firstBranch = Array.isArray(branches) ? branches[0] : null;

  return {
    agent_id: agent.id,
    run_id: run.id,
    status: run.status || agent.status || null,
    agent_status: agent.status || null,
    run_status: run.status || null,
    branch: firstBranch?.branch || null,
    pr_url: firstBranch?.prUrl || null,
    agent_url: agent.url || null,
    latest_run_id: agent.latestRunId || run.id,
  };
}

function extractSafeRunMetadata(run, agent = null) {
  if (!run || typeof run !== "object" || !run.id) {
    throw new CursorCloudAgentError("Malformed run response", {
      code: "MALFORMED_RUN",
    });
  }
  const branches = run.git?.branches || [];
  const firstBranch = Array.isArray(branches) ? branches[0] : null;
  return {
    agent_id: run.agentId || agent?.id || null,
    run_id: run.id,
    status: run.status || null,
    agent_status: agent?.status || null,
    run_status: run.status || null,
    branch: firstBranch?.branch || null,
    pr_url: firstBranch?.prUrl || null,
    agent_url: agent?.url || null,
    latest_run_id: agent?.latestRunId || run.id,
    result_summary:
      typeof run.result === "string" ? run.result.slice(0, 500) : null,
    duration_ms: run.durationMs ?? null,
  };
}

/**
 * @param {object} options
 * @param {typeof fetch} [options.fetchImpl]
 * @param {object} [options.env]
 * @param {number} [options.timeoutMs]
 */
function createCursorCloudClient(options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch;
  const env = options.env || process.env;
  const timeoutMs = options.timeoutMs ?? config.REQUEST_TIMEOUT_MS;
  const baseUrl = (options.baseUrl || config.CURSOR_API_BASE_URL).replace(
    /\/$/,
    "",
  );

  if (typeof fetchImpl !== "function") {
    throw new CursorCloudAgentError("fetch is not available in this runtime", {
      code: "NO_FETCH",
    });
  }

  async function request(method, path, { body = null } = {}) {
    let apiKey;
    try {
      apiKey = getApiKey({ env });
    } catch (err) {
      throw err;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    let text;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: {
          Authorization: authHeader(apiKey),
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      text = await response.text();
    } catch (err) {
      clearTimeout(timer);
      if (err?.name === "AbortError") {
        throw new CursorCloudAgentError("Cursor API request timed out", {
          code: "TIMEOUT",
        });
      }
      throw new CursorCloudAgentError(
        redactSecrets(
          `Cursor API network error: ${err.message || String(err)}`,
          apiKey,
        ),
        { code: "NETWORK" },
      );
    } finally {
      clearTimeout(timer);
    }

    let parsed = null;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = null;
      }
    }

    if (!response.ok) {
      const safeDetail = redactSecrets(
        parsed?.message || parsed?.error || text || response.statusText,
        apiKey,
      );
      throw new CursorCloudAgentError(
        `Cursor API HTTP ${response.status}: ${String(safeDetail).slice(0, 400)}`,
        {
          status: response.status,
          code: `HTTP_${response.status}`,
          body: null,
        },
      );
    }

    if (parsed == null) {
      throw new CursorCloudAgentError("Cursor API returned non-JSON success body", {
        code: "MALFORMED_RESPONSE",
        status: response.status,
      });
    }

    return parsed;
  }

  return {
    async createAgent(createBody) {
      return request("POST", "/v1/agents", { body: createBody });
    },
    async getAgent(agentId) {
      if (!agentId) {
        throw new CursorCloudAgentError("agentId required", { code: "MISSING_AGENT_ID" });
      }
      return request("GET", `/v1/agents/${encodeURIComponent(agentId)}`);
    },
    async getRun(agentId, runId) {
      if (!agentId || !runId) {
        throw new CursorCloudAgentError("agentId and runId required", {
          code: "MISSING_IDS",
        });
      }
      return request(
        "GET",
        `/v1/agents/${encodeURIComponent(agentId)}/runs/${encodeURIComponent(runId)}`,
      );
    },
  };
}

module.exports = {
  CursorCloudAgentError,
  getApiKey,
  redactSecrets,
  buildCreateAgentRequest,
  extractSafeAgentMetadata,
  extractSafeRunMetadata,
  createCursorCloudClient,
};
