import {
  buildCurrencyTranslation,
  type BuildCurrencyTranslationInput,
  type SyntheticCurrencyTranslation,
} from "./buildCurrencyTranslation";

export interface BuildCurrencyTranslationsInput {
  currencyTranslations: BuildCurrencyTranslationInput[];
}

export interface BuildCurrencyTranslationsResult {
  currencyTranslations: SyntheticCurrencyTranslation[];
  skippedIndexes: number[];
  warnings: string[];
}

export function buildCurrencyTranslations(
  input: BuildCurrencyTranslationsInput,
): BuildCurrencyTranslationsResult {
  const currencyTranslations: SyntheticCurrencyTranslation[] = [];
  const skippedIndexes: number[] = [];
  const warnings: string[] = [];

  input.currencyTranslations.forEach((translationInput, index) => {
    const result = buildCurrencyTranslation({
      ...translationInput,
      skippedIndexes: [...(translationInput.skippedIndexes ?? []), index],
    });

    if (result.currencyTranslation) {
      currencyTranslations.push(result.currencyTranslation);
    }

    if (result.skipped) {
      skippedIndexes.push(index);
    }

    warnings.push(
      ...result.warnings.map((warning) => `currencyTranslation[${index}]: ${warning}`),
    );
  });

  return {
    currencyTranslations,
    skippedIndexes,
    warnings,
  };
}
