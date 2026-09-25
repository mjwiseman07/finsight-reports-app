/**
 * Bounded retry helpers for transient infrastructure failures.
 * Fail-closed for auth / missing key / safety-gate errors (never retried).
 */

"use strict";

/** Error codes that must never be retried. */
const NON_RETRYABLE_CODES = Object.freeze([
  "MISSING_API_KEY",
  "UNSAFE_BRANCH_MODE",
  "INVALID_PROMPT",
  "REMEDIATION_BRANCH_UNVERIFIED",
  "REMEDIATION_PROTECTED_BRANCH",
  "REMEDIATION_MISSING_PR",
  "REMEDIATION_BUDGET_EXCEEDED",
  "SAFETY_GATE",
  "FORBIDDEN_TRANSITION",
  "HUMAN_ONLY_STATUS",
]);

function sleep(ms, sleepImpl) {
  const impl = sleepImpl || ((delay) => new Promise((r) => setTimeout(r, delay)));
  return impl(ms);
}

function collectErrorSignals(err) {
  if (err == null) return { message: "", code: null, status: null, name: null };
  if (typeof err === "string") {
    return { message: err, code: null, status: null, name: null };
  }
  return {
    message: String(err.message || err),
    code: err.code != null ? String(err.code) : null,
    status: err.status != null ? Number(err.status) : null,
    name: err.name != null ? String(err.name) : null,
  };
}

/**
 * True when the failure looks like a transient infra/network/rate-limit issue.
 * False for auth (401/403), missing API key, and safety-gate codes.
 */
function isTransientError(err) {
  const { message, code, status, name } = collectErrorSignals(err);

  if (code && NON_RETRYABLE_CODES.includes(code)) {
    return false;
  }

  if (status === 401 || status === 403) {
    return false;
  }
  if (code === "HTTP_401" || code === "HTTP_403") {
    return false;
  }

  const lower = message.toLowerCase();
  if (
    lower.includes("missing_api_key") ||
    lower.includes("api key is not configured") ||
    lower.includes("unauthorized") ||
    lower.includes("forbidden") ||
    lower.includes("safety gate") ||
    lower.includes("unsafe_branch")
  ) {
    return false;
  }

  if (status === 429 || code === "HTTP_429") {
    return true;
  }
  if (status != null && status >= 500 && status <= 599) {
    return true;
  }
  if (code && /^HTTP_5\d\d$/.test(code)) {
    return true;
  }

  if (code === "TIMEOUT" || code === "NETWORK" || name === "AbortError") {
    return true;
  }

  if (
    /timeout|timed out|network|econnreset|econnrefused|enotfound|socket hang up|aborted|abort/i.test(
      message,
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Execute fn with bounded exponential backoff on transient errors only.
 *
 * @template T
 * @param {() => Promise<T>|T} fn
 * @param {object} [opts]
 * @param {number} [opts.maxAttempts=3]
 * @param {number} [opts.baseDelayMs=500]
 * @param {number} [opts.maxDelayMs=8000]
 * @param {(ms:number)=>Promise<void>} [opts.sleepImpl]
 * @returns {Promise<T>}
 */
async function withBoundedRetry(fn, opts = {}) {
  const maxAttempts = Math.max(1, Number(opts.maxAttempts ?? 3));
  const baseDelayMs = Math.max(0, Number(opts.baseDelayMs ?? 500));
  const maxDelayMs = Math.max(baseDelayMs, Number(opts.maxDelayMs ?? 8000));
  const sleepImpl = opts.sleepImpl;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      const retryable = isTransientError(err);
      if (!retryable || attempt >= maxAttempts) {
        throw err;
      }
      const exp = baseDelayMs * 2 ** (attempt - 1);
      const delay = Math.min(maxDelayMs, exp);
      await sleep(delay, sleepImpl);
    }
  }
  throw lastError;
}

module.exports = {
  NON_RETRYABLE_CODES,
  isTransientError,
  withBoundedRetry,
};
