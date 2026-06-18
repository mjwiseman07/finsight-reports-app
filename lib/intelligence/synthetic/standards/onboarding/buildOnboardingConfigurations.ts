import {
  buildOnboardingConfiguration,
  type BuildOnboardingConfigurationInput,
  type SyntheticOnboardingConfiguration,
} from "./buildOnboardingConfiguration";

export interface BuildOnboardingConfigurationsInput {
  onboardingConfigurations: BuildOnboardingConfigurationInput[];
}

export interface BuildOnboardingConfigurationsResult {
  onboardingConfigurations: SyntheticOnboardingConfiguration[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildOnboardingConfigurations(
  input: BuildOnboardingConfigurationsInput,
): BuildOnboardingConfigurationsResult {
  const onboardingConfigurations: SyntheticOnboardingConfiguration[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.onboardingConfigurations.forEach((configurationInput, index) => {
    const result = buildOnboardingConfiguration({
      ...configurationInput,
      skippedIndexes: [...(configurationInput.skippedIndexes ?? []), index],
    });

    if (result.onboardingConfiguration) {
      onboardingConfigurations.push(result.onboardingConfiguration);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `onboardingConfiguration[${index}]: ${warning}`),
    );
  });

  return {
    onboardingConfigurations,
    skippedIndexes,
    warnings,
  };
}
