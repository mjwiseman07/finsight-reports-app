/**
 * Internal two-person sandbox mechanical prepare — not exported from index.ts.
 */

import { prepareSandboxTwoPersonMechanicalExecution } from "./execution-prepare-internal";
import type {
  JeExecutionContext,
  PrepareJeExecutionResult,
} from "./execution-types";

/**
 * Mechanical execution preparation for sandbox two-person custody.
 * Caller must have already enforced capability, identity, MFA, and custody guards.
 */
export async function executeSandboxTwoPersonMechanicalPrepare(args: {
  proposalId: string;
  approvalId: string;
  executionContext: JeExecutionContext;
}): Promise<PrepareJeExecutionResult> {
  return prepareSandboxTwoPersonMechanicalExecution(args);
}
