import {
  buildJournalEntryStateMachine,
  type BuildJournalEntryStateMachineInput,
  type SyntheticJournalEntryStateMachine,
} from "./buildJournalEntryStateMachine";

export interface BuildJournalEntryStateMachinesInput {
  items: BuildJournalEntryStateMachineInput[];
}

export interface BuildJournalEntryStateMachinesResult {
  stateMachines: SyntheticJournalEntryStateMachine[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildJournalEntryStateMachines(
  input: BuildJournalEntryStateMachinesInput,
): BuildJournalEntryStateMachinesResult {
  const stateMachines: SyntheticJournalEntryStateMachine[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.items.forEach((item, index) => {
    const result = buildJournalEntryStateMachine(item);

    if (result.stateMachine) {
      stateMachines.push(result.stateMachine);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `stateMachines[${index}]: ${warning}`));
  });

  return {
    stateMachines,
    skippedIndexes,
    warnings,
  };
}
