import {
  buildConnectionDisruption,
  type BuildConnectionDisruptionInput,
  type SyntheticConnectionDisruption,
} from "./buildConnectionDisruption";
import {
  buildConnectionHealth,
  type BuildConnectionHealthInput,
  type SyntheticConnectionHealth,
} from "./buildConnectionHealth";

export interface BuildConnectionHealthsInput {
  connectionHealths: BuildConnectionHealthInput[];
  connectionDisruptions?: BuildConnectionDisruptionInput[];
}

export interface BuildConnectionHealthsResult {
  connectionHealths: SyntheticConnectionHealth[];
  connectionDisruptions: SyntheticConnectionDisruption[];
  skippedIndexes: number[];
  skippedConnectionDisruptionIndexes: number[];
  warnings: string[];
}

export function buildConnectionHealths(input: BuildConnectionHealthsInput): BuildConnectionHealthsResult {
  const connectionHealths: SyntheticConnectionHealth[] = [];
  const connectionDisruptions: SyntheticConnectionDisruption[] = [];
  const skippedIndexes: number[] = [];
  const skippedConnectionDisruptionIndexes: number[] = [];
  const warnings: string[] = [];

  input.connectionHealths.forEach((healthInput, index) => {
    const result = buildConnectionHealth({
      ...healthInput,
      skippedIndexes: [...(healthInput.skippedIndexes ?? []), index],
    });

    if (result.connectionHealth) {
      connectionHealths.push(result.connectionHealth);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `connectionHealth[${index}]: ${warning}`));
  });

  (input.connectionDisruptions ?? []).forEach((disruptionInput, index) => {
    const result = buildConnectionDisruption({
      ...disruptionInput,
      skippedIndexes: [...(disruptionInput.skippedIndexes ?? []), index],
    });

    if (result.connectionDisruption) {
      connectionDisruptions.push(result.connectionDisruption);
    }

    if (result.skipped) {
      skippedConnectionDisruptionIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `connectionDisruption[${index}]: ${warning}`));
  });

  return {
    connectionHealths,
    connectionDisruptions,
    skippedIndexes,
    skippedConnectionDisruptionIndexes,
    warnings,
  };
}
