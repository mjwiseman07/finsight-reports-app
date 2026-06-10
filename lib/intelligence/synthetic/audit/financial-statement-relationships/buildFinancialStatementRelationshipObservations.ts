import {
  buildFinancialStatementRelationshipObservation,
  type BuildFinancialStatementRelationshipObservationInput,
  type SyntheticFinancialStatementRelationshipObservation,
} from "./buildFinancialStatementRelationshipObservation";

export interface BuildFinancialStatementRelationshipObservationsInput {
  observations: BuildFinancialStatementRelationshipObservationInput[];
}

export interface BuildFinancialStatementRelationshipObservationsResult {
  financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildFinancialStatementRelationshipObservations(
  input: BuildFinancialStatementRelationshipObservationsInput,
): BuildFinancialStatementRelationshipObservationsResult {
  const financialStatementRelationshipObservations: SyntheticFinancialStatementRelationshipObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildFinancialStatementRelationshipObservation(observationInput);

    if (result.financialStatementRelationshipObservation) {
      financialStatementRelationshipObservations.push(result.financialStatementRelationshipObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    financialStatementRelationshipObservations,
    skippedIndexes,
    warnings,
  };
}
