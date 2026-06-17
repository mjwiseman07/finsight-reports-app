import {
  buildDeploymentArtifact,
  type BuildDeploymentArtifactInput,
  type SyntheticDeploymentArtifact,
} from "./buildDeploymentArtifact";
import {
  buildMarketplaceListing,
  type BuildMarketplaceListingInput,
  type SyntheticMarketplaceListing,
} from "./buildMarketplaceListing";

export interface BuildMarketplaceListingsInput {
  marketplaceListingInputs?: BuildMarketplaceListingInput[];
  deploymentArtifactInputs?: BuildDeploymentArtifactInput[];
}

export interface BuildMarketplaceListingsResult {
  marketplaceListings: SyntheticMarketplaceListing[];
  deploymentArtifacts: SyntheticDeploymentArtifact[];
  skippedIndexes: number[];
  warnings: string[];
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

export function buildMarketplaceListings(input: BuildMarketplaceListingsInput): BuildMarketplaceListingsResult {
  const marketplaceListings: SyntheticMarketplaceListing[] = [];
  const deploymentArtifacts: SyntheticDeploymentArtifact[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  getInputArray(input.marketplaceListingInputs).forEach((listingInput, index) => {
    const result = buildMarketplaceListing(listingInput);

    warnings.push(...result.warnings.map((warning) => `marketplaceListing[${index}]: ${warning}`));

    if (result.skipped || !result.marketplaceListing) {
      skippedIndexes.push(index);
      return;
    }

    marketplaceListings.push(result.marketplaceListing);
  });

  const listingOffset = getInputArray(input.marketplaceListingInputs).length;

  getInputArray(input.deploymentArtifactInputs).forEach((deploymentInput, index) => {
    const result = buildDeploymentArtifact(deploymentInput);

    warnings.push(...result.warnings.map((warning) => `deploymentArtifact[${index}]: ${warning}`));

    if (result.skipped || !result.deploymentArtifact) {
      skippedIndexes.push(listingOffset + index);
      return;
    }

    deploymentArtifacts.push(result.deploymentArtifact);
  });

  return {
    marketplaceListings,
    deploymentArtifacts,
    skippedIndexes,
    warnings,
  };
}
