import {
  buildGovernancePackage,
  type BuildGovernancePackageInput,
  type SyntheticGovernancePackage,
} from "./buildGovernancePackage";
import {
  buildRecommendationAuditChain,
  type BuildRecommendationAuditChainInput,
  type SyntheticRecommendationAuditChain,
} from "./buildRecommendationAuditChain";

export interface BuildGovernancePackagesInput {
  governancePackageInputs?: BuildGovernancePackageInput[];
  recommendationAuditChainInputs?: BuildRecommendationAuditChainInput[];
}

export interface BuildGovernancePackagesResult {
  governancePackages: SyntheticGovernancePackage[];
  recommendationAuditChains: SyntheticRecommendationAuditChain[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildGovernancePackages(input: BuildGovernancePackagesInput): BuildGovernancePackagesResult {
  const governancePackages: SyntheticGovernancePackage[] = [];
  const recommendationAuditChains: SyntheticRecommendationAuditChain[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.recommendationAuditChainInputs).forEach((chainInput, index) => {
    const result = buildRecommendationAuditChain(chainInput);

    warnings.push(...result.warnings.map((warning) => `recommendationAuditChain[${index}]: ${warning}`));

    if (result.skipped || !result.recommendationAuditChain) {
      skippedIndexes.push(index);
      return;
    }

    recommendationAuditChains.push(result.recommendationAuditChain);
  });

  const chainOffset = getInputArray(input.recommendationAuditChainInputs).length;

  getInputArray(input.governancePackageInputs).forEach((packageInput, index) => {
    const result = buildGovernancePackage(packageInput);

    warnings.push(...result.warnings.map((warning) => `governancePackage[${index}]: ${warning}`));

    if (result.skipped || !result.governancePackage) {
      skippedIndexes.push(chainOffset + index);
      return;
    }

    governancePackages.push(result.governancePackage);
  });

  return {
    governancePackages,
    recommendationAuditChains,
    skippedIndexes,
    warnings,
  };
}
