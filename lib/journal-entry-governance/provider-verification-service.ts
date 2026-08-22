/**
 * JE-3C — Public exact QBO JournalEntry verification entry.
 * Hard-disabled by JE_3C_FEATURE_GATE. No Memory. No POST. No discovery authority.
 * No DI/test bypass surface on the public entry.
 */

import { assertJe3cVerificationEnabled } from "./je3c-feature-gate";
import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import type { JeExecutionContext } from "./execution-types";
import type {
  VerifyGovernedJeInput,
  VerifyGovernedJeResult,
} from "./provider-verification-orchestration";

export type {
  VerifyGovernedJeInput,
  VerifyGovernedJeResult,
} from "./provider-verification-orchestration";

/**
 * Sole public verification surface. Always fail-closed while
 * JE_3C_FEATURE_GATE.verificationEnabled=false.
 * Never accepts deps, realm/connection/provider-id overrides, or gate bypass.
 */
export async function verifyGovernedJournalEntry(
  _input: VerifyGovernedJeInput,
  _ctx: JeExecutionContext,
): Promise<VerifyGovernedJeResult> {
  void _input;
  void _ctx;
  void JE_MEMORY_PROJECTION_CONTRACT;
  assertJe3cVerificationEnabled();
}
