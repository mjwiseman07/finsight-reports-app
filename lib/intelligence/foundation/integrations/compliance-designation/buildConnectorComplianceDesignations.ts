import {
  buildConnectorComplianceDesignation,
  type BuildConnectorComplianceDesignationInput,
  type SyntheticConnectorComplianceDesignation,
} from "./buildConnectorComplianceDesignation";

export interface BuildConnectorComplianceDesignationsInput {
  connectorComplianceDesignations: BuildConnectorComplianceDesignationInput[];
}

export interface BuildConnectorComplianceDesignationsResult {
  connectorComplianceDesignations: SyntheticConnectorComplianceDesignation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildConnectorComplianceDesignations(
  input: BuildConnectorComplianceDesignationsInput,
): BuildConnectorComplianceDesignationsResult {
  const connectorComplianceDesignations: SyntheticConnectorComplianceDesignation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.connectorComplianceDesignations.forEach((designationInput, index) => {
    const result = buildConnectorComplianceDesignation({
      ...designationInput,
      skippedIndexes: [...(designationInput.skippedIndexes ?? []), index],
    });

    if (result.connectorComplianceDesignation) {
      connectorComplianceDesignations.push(result.connectorComplianceDesignation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `connectorComplianceDesignation[${index}]: ${warning}`),
    );
  });

  return {
    connectorComplianceDesignations,
    skippedIndexes,
    warnings,
  };
}
