import {
  buildTrustVerificationObservation,
  type BuildTrustVerificationObservationInput,
  type SyntheticTrustVerificationObservation,
} from "./buildTrustVerificationObservation";

export interface BuildTrustVerificationObservationsInput {
  observations: BuildTrustVerificationObservationInput[];
}

export interface BuildTrustVerificationObservationsResult {
  trustVerificationObservations: SyntheticTrustVerificationObservation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildTrustVerificationObservations(
  input: BuildTrustVerificationObservationsInput,
): BuildTrustVerificationObservationsResult {
  const trustVerificationObservations: SyntheticTrustVerificationObservation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.observations.forEach((observationInput, index) => {
    const result = buildTrustVerificationObservation(observationInput);

    if (result.trustVerificationObservation) {
      trustVerificationObservations.push(result.trustVerificationObservation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `observation[${index}]: ${warning}`));
  });

  return {
    trustVerificationObservations,
    skippedIndexes,
    warnings,
  };
}
