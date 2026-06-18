import {
  buildCrossConnectorReconciliationCandidate,
  type BuildCrossConnectorReconciliationCandidateInput,
  type SyntheticCrossConnectorReconciliationCandidate,
} from "./buildCrossConnectorReconciliationCandidate";
import {
  buildSyncState,
  type BuildSyncStateInput,
  type SyntheticSyncState,
} from "./buildSyncState";

export interface BuildSyncStatesInput {
  syncStates: BuildSyncStateInput[];
  reconciliationCandidates?: BuildCrossConnectorReconciliationCandidateInput[];
}

export interface BuildSyncStatesResult {
  syncStates: SyntheticSyncState[];
  reconciliationCandidates: SyntheticCrossConnectorReconciliationCandidate[];
  skippedIndexes: number[];
  skippedReconciliationCandidateIndexes: number[];
  warnings: string[];
}

export function buildSyncStates(input: BuildSyncStatesInput): BuildSyncStatesResult {
  const syncStates: SyntheticSyncState[] = [];
  const reconciliationCandidates: SyntheticCrossConnectorReconciliationCandidate[] = [];
  const skippedIndexes: number[] = [];
  const skippedReconciliationCandidateIndexes: number[] = [];
  const warnings: string[] = [];

  input.syncStates.forEach((syncStateInput, index) => {
    const result = buildSyncState({
      ...syncStateInput,
      skippedIndexes: [...(syncStateInput.skippedIndexes ?? []), index],
    });

    if (result.syncState) {
      syncStates.push(result.syncState);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `syncState[${index}]: ${warning}`));
  });

  (input.reconciliationCandidates ?? []).forEach((candidateInput, index) => {
    const result = buildCrossConnectorReconciliationCandidate({
      ...candidateInput,
      skippedIndexes: [...(candidateInput.skippedIndexes ?? []), index],
    });

    if (result.reconciliationCandidate) {
      reconciliationCandidates.push(result.reconciliationCandidate);
    }

    if (result.skipped) {
      skippedReconciliationCandidateIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `reconciliationCandidate[${index}]: ${warning}`));
  });

  return {
    syncStates,
    reconciliationCandidates,
    skippedIndexes,
    skippedReconciliationCandidateIndexes,
    warnings,
  };
}
