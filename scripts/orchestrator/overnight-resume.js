/**
 * Resume overnight controller from companion status + Cloud Agent + GitHub.
 * Does not launch duplicates when an agent is already active.
 *
 * Usage:
 *   node scripts/orchestrator/overnight-resume.js <plan.md> [--dry-run]
 */

"use strict";

const { resumeOvernight, parseArgs } = require("./overnight-run");
const { fail, ok, emitJson } = require("./lib");
const { isTransientError } = require("./retry");
const { loadEnvLocal } = require("./load-env-local");
const {
  assertWorkspaceSafeForOvernight,
  InfrastructureBlockError,
} = require("./worktree-guard");

async function main() {
  const { planPath, dryRun, maxCycles } = parseArgs(process.argv);
  if (!planPath) {
    fail(
      "Usage: node scripts/orchestrator/overnight-resume.js <plan.md> [--dry-run]",
    );
  }
  try {
    loadEnvLocal();
    assertWorkspaceSafeForOvernight({ env: process.env });
    const result = await resumeOvernight(planPath, { dryRun, maxCycles });
    ok(result.message || "Resume complete");
    emitJson({ ...result, resumed: true });
  } catch (err) {
    const infra =
      err instanceof InfrastructureBlockError ||
      err?.code === "FATAL_INFRASTRUCTURE_BLOCK";
    emitJson(
      infra && typeof err.toJSON === "function"
        ? { ...err.toJSON(), resumed: true }
        : {
            ok: false,
            resumed: true,
            error: err.message,
            transient: isTransientError(err),
            code: err?.code || undefined,
            infrastructure_block: infra || undefined,
          },
    );
    fail(err.message);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
