/**
 * JE-3A public prepare API — custody-safe surface only.
 * Authority-changing hooks live in execution-prepare-internal.ts (not barrel-exported).
 */

import {
  createDefaultJeExecutionInternalDeps,
  prepareGovernedJournalEntryExecutionInternal,
  type PrepareJeExecutionInternalDeps,
} from "./execution-prepare-internal";
import {
  DEFAULT_JE_EXECUTION_POLICY,
  type JeExecutionContext,
  type JeExecutionPolicy,
  type PrepareJeExecutionInput,
  type PrepareJeExecutionResult,
} from "./execution-types";

/** Public test/extend deps — connection resolution is never caller-overridable. */
export type PrepareJeExecutionDeps = Omit<
  PrepareJeExecutionInternalDeps,
  "resolveConnection"
>;

export function createDefaultJeExecutionDeps(): PrepareJeExecutionDeps {
  const { resolveConnection: _omit, ...rest } =
    createDefaultJeExecutionInternalDeps();
  return rest;
}

/**
 * Public JE-3A entry point. No provider-write method.
 * Connection, policy hash, and Patent #6 payload are always server-derived.
 */
export async function prepareGovernedJournalEntryExecution(
  input: PrepareJeExecutionInput,
  executionContext: JeExecutionContext,
  executionPolicy: JeExecutionPolicy,
  deps?: Partial<PrepareJeExecutionDeps>,
): Promise<PrepareJeExecutionResult> {
  return prepareGovernedJournalEntryExecutionInternal(
    input,
    executionContext,
    executionPolicy,
    deps,
    { mode: "canonical" },
  );
}

export { DEFAULT_JE_EXECUTION_POLICY };
