/**
 * JE-3C test-only verification runner.
 * Cannot select the live QBO transport — callers must inject readById.
 */

import type { JeExecutionContext } from "../../execution-types";
import {
  runGovernedJournalEntryVerification,
  type GovernedJeVerificationDeps,
  type VerifyGovernedJeInput,
  type VerifyGovernedJeResult,
} from "../../provider-verification-orchestration";

export async function runJe3cVerificationForTests(
  input: VerifyGovernedJeInput,
  ctx: JeExecutionContext,
  deps: GovernedJeVerificationDeps,
): Promise<VerifyGovernedJeResult> {
  if (typeof deps.readById !== "function") {
    throw new Error(
      "JE-3C test runner requires an injected readById; live QBO GET is never selected.",
    );
  }
  return runGovernedJournalEntryVerification(input, ctx, deps);
}
