import {
  buildCurrencyConfiguration,
  type BuildCurrencyConfigurationInput,
  type SyntheticCurrencyConfiguration,
} from "./buildCurrencyConfiguration";

export interface BuildCurrencyConfigurationsInput {
  currencyConfigurations: BuildCurrencyConfigurationInput[];
}

export interface BuildCurrencyConfigurationsResult {
  currencyConfigurations: SyntheticCurrencyConfiguration[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCurrencyConfigurations(
  input: BuildCurrencyConfigurationsInput,
): BuildCurrencyConfigurationsResult {
  const currencyConfigurations: SyntheticCurrencyConfiguration[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.currencyConfigurations.forEach((configurationInput, index) => {
    const result = buildCurrencyConfiguration({
      ...configurationInput,
      skippedIndexes: [...(configurationInput.skippedIndexes ?? []), index],
    });

    if (result.currencyConfiguration) {
      currencyConfigurations.push(result.currencyConfiguration);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(...result.warnings.map((warning) => `currencyConfiguration[${index}]: ${warning}`));
  });

  return {
    currencyConfigurations,
    skippedIndexes,
    warnings,
  };
}
