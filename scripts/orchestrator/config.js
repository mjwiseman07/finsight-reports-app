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
});
