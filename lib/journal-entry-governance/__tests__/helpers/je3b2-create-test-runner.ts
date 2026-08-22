/**
 * JE-3B2 test-only orchestration runner.
 * Cannot select the real QBO transport — callers must inject postOnce.
 * Not imported by production modules or package index.
 */

import type { JeExecutionContext } from "../../execution-types";
import {
  runGovernedJournalEntryCreateOrchestration,
  type ExecuteGovernedJeCreateInput,
  type ExecuteGovernedJeCreateResult,
  type GovernedJeCreateOrchestrationDeps,
} from "../../provider-create-orchestration";

export async function runJe3b2CreateOrchestrationForTests(
  input: ExecuteGovernedJeCreateInput,
  ctx: JeExecutionContext,
  deps: GovernedJeCreateOrchestrationDeps,
): Promise<ExecuteGovernedJeCreateResult> {
  if (typeof deps.postOnce !== "function") {
    throw new Error(
      "JE-3B2 test runner requires an injected postOnce; real QBO transport is never selected.",
    );
  }
  return runGovernedJournalEntryCreateOrchestration(input, ctx, deps);
}
