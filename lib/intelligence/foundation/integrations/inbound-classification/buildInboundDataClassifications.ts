import {
  buildInboundDataClassification,
  type BuildInboundDataClassificationInput,
  type SyntheticInboundDataClassification,
} from "./buildInboundDataClassification";

export interface BuildInboundDataClassificationsInput {
  classifications: BuildInboundDataClassificationInput[];
}

export interface BuildInboundDataClassificationsResult {
  inboundDataClassifications: SyntheticInboundDataClassification[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildInboundDataClassifications(
  input: BuildInboundDataClassificationsInput,
): BuildInboundDataClassificationsResult {
  const inboundDataClassifications: SyntheticInboundDataClassification[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.classifications.forEach((classificationInput, index) => {
    const result = buildInboundDataClassification({
      ...classificationInput,
      skippedIndexes: [...(classificationInput.skippedIndexes ?? []), index],
    });

    if (result.inboundDataClassification) {
      inboundDataClassifications.push(result.inboundDataClassification);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `inboundDataClassification[${index}]: ${warning}`));
  });

  return {
    inboundDataClassifications,
    skippedIndexes,
    warnings,
  };
}
