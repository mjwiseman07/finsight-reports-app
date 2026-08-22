/**
 * JE-3B2 — Public governed QBO JournalEntry create entry.
 * Hard-disabled by JE_3B2_FEATURE_GATE. No Memory. No legacy poster.
 * No worker. No auto principal. No DI/test bypass surface.
 */

import {
  assertJe3b2GovernedCreateEnabled,
} from "./je3b2-feature-gate";
import { JE_MEMORY_PROJECTION_CONTRACT } from "./memory-projection-contract";
import type { JeExecutionContext } from "./execution-types";
import type {
  ExecuteGovernedJeCreateInput,
  ExecuteGovernedJeCreateResult,
} from "./provider-create-orchestration";

export type {
  ExecuteGovernedJeCreateInput,
  ExecuteGovernedJeCreateResult,
} from "./provider-create-orchestration";

/**
 * Sole public create surface. Always fail-closed while
 * JE_3B2_FEATURE_GATE.governedCreateEnabled=false.
 * Never accepts deps, transport injection, or gate bypass options.
 */
export async function executeGovernedJournalEntryCreate(
  _input: ExecuteGovernedJeCreateInput,
  _ctx: JeExecutionContext,
): Promise<ExecuteGovernedJeCreateResult> {
  void _input;
  void _ctx;
  void JE_MEMORY_PROJECTION_CONTRACT;
  assertJe3b2GovernedCreateEnabled();
}
