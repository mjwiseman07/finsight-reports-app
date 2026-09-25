/**
 * Non-secret Advisacor orchestrator / Cursor Cloud Agent configuration.
 * Secrets (CURSOR_API_KEY) must come from environment only — never from this file.
 */

"use strict";

module.exports = Object.freeze({
  /** Cursor Cloud Agents API base (no trailing slash). */
  CURSOR_API_BASE_URL:
    process.env.CURSOR_API_BASE_URL || "https://api.cursor.com",

  /** GitHub repository Cloud Agents must clone. */
  REPOSITORY_URL: "https://github.com/mjwiseman07/finsight-reports-app",

  /** Default starting ref for isolated cursor/... branches. */
  STARTING_REF: "main",

  /** Must remain false — Cloud Agents create isolated cursor/... branches. */
  WORK_ON_CURRENT_BRANCH: false,

  /** Open a PR when the builder run finishes. */
  AUTO_CREATE_PR: true,

  /** Request API-key owner as PR reviewer unless documented otherwise. */
  SKIP_REVIEWER_REQUEST: false,

  /** Plans must live under this repo-relative directory. */
  PLANS_DIR: "docs/plans",

  /** HTTP timeout for Cursor API calls (ms). */
  REQUEST_TIMEOUT_MS: Number(process.env.CURSOR_API_TIMEOUT_MS || 60_000),

  /** Max autonomous remediation cycles before HUMAN_DECISION_REQUIRED. */
  MAX_REMEDIATION_CYCLES: Number(
    process.env.ORCHESTRATOR_MAX_REMEDIATION_CYCLES || 5,
  ),

  /** Bounded retries for transient Cursor/GitHub/network failures. */
  MAX_TRANSIENT_RETRIES: Number(
    process.env.ORCHESTRATOR_MAX_TRANSIENT_RETRIES || 3,
  ),

  /** Base delay (ms) for transient retry backoff. */
  TRANSIENT_RETRY_BASE_MS: Number(
    process.env.ORCHESTRATOR_TRANSIENT_RETRY_BASE_MS || 1000,
  ),

  /** Overnight controller poll interval (ms). */
  CONTROLLER_POLL_INTERVAL_MS: Number(
    process.env.ORCHESTRATOR_POLL_INTERVAL_MS || 15_000,
  ),

  /** Max time spent polling a single agent run (ms). */
  CONTROLLER_MAX_POLL_MS: Number(
    process.env.ORCHESTRATOR_MAX_POLL_MS || 45 * 60 * 1000,
  ),
});
