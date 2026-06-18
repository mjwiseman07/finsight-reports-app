import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

export type TranslationFrameworkStandard = "ias_21" | "asc_830";

const IFRS_FAMILY_FRAMEWORKS: StandardsReportingFramework[] = [
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
  "ifrs_uk",
  "ifrs_ca",
  "ifrs_au",
];

export interface BuildCurrencyConfigurationInput extends Partial<StandardsBaseContract> {
  entityId?: string;
  functionalCurrency?: string;
  presentationCurrency?: string;
  translationEngineReferenceId?: string;
  currencyConfigurationComplete?: boolean;
}

export interface SyntheticCurrencyConfiguration extends StandardsBaseContract {
  currencyConfigurationId: string;
  currencyConfigurationKey: string;
  entityId: string;
  reportingFramework: StandardsReportingFramework;
  functionalCurrency: string;
  presentationCurrency: string;
  functionalAndPresentationCurrencySeparate: true;
  presentationDefaultsToFunctionalWhenOmitted: true;
  translationFrameworkStandard: TranslationFrameworkStandard;
  translationStandardSelectedByFramework: true;
  monetaryItemsAtTransactionDateRate: true;
  nonMonetaryItemsAtHistoricalRate: true;
  incomeStatementAtAverageRate: true;
  balanceSheetAtClosingRate: true;
  translationDifferenceToOci: true;
  hyperinflationaryHandlingDeferred: true;
  ias29RecognizedUnpopulated: true;
  translationEngineReferenceId: string;
  performsNoTranslationItself: true;
  currencyConfigurationComplete: boolean;
}

export interface BuildCurrencyConfigurationResult {
  currencyConfiguration: SyntheticCurrencyConfiguration | null;
  skipped: boolean;
  warnings: string[];
}

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getPresentationCurrency(input: BuildCurrencyConfigurationInput): string {
  return input.presentationCurrency ?? input.functionalCurrency ?? "";
}

function getTranslationFrameworkStandard(
  reportingFramework: StandardsReportingFramework | undefined,
): TranslationFrameworkStandard | null {
  if (!reportingFramework) {
    return null;
  }

  if (reportingFramework === "us_gaap") {
    return "asc_830";
  }

  if (IFRS_FAMILY_FRAMEWORKS.includes(reportingFramework)) {
    return "ias_21";
  }

  return null;
}

function getSharedBase(input: Partial<StandardsBaseContract>): StandardsBaseContract {
  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    boundPhase38SnapshotHash: input.boundPhase38SnapshotHash ?? "",
    phase41_5StaleMarker: input.phase41_5StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: input.reportingFramework as StandardsReportingFramework,
    containsPHI: getContainsPHI(input.containsPHI),
    derivationLineageIds: getInputArray(input.derivationLineageIds),
    derivationMethod: input.derivationMethod ?? "handoff_metadata_preservation",
    derivationHash: "",
    confidenceFloorMetadata: getInputArray(input.confidenceFloorMetadata),
    sourceConfidenceReferenceIds: getInputArray(input.sourceConfidenceReferenceIds),
    evidenceReferenceIds: getInputArray(input.evidenceReferenceIds),
    lineageReferenceIds: getInputArray(input.lineageReferenceIds),
    trustMetadata: getInputArray(input.trustMetadata),
    confidenceMetadata: getInputArray(input.confidenceMetadata),
    governanceMetadata: getInputArray(input.governanceMetadata),
    warnings: getInputArray(input.warnings),
    skippedIndexes: getInputArray(input.skippedIndexes),
  } as StandardsBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildCurrencyConfigurationInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!hasValue(input.functionalCurrency)) {
    missing.push("functionalCurrency");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (!getTranslationFrameworkStandard(input.reportingFramework)) {
    missing.push("translationFrameworkStandard");
  }

  if (!hasValue(input.boundPhase40SnapshotHash)) {
    missing.push("boundPhase40SnapshotHash");
  }

  if (!hasValue(input.boundPhase40_5SnapshotHash)) {
    missing.push("boundPhase40_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
  }

  if (!hasValue(input.boundPhase38SnapshotHash)) {
    missing.push("boundPhase38SnapshotHash");
  }

  if (!input.scope) {
    missing.push("scope");
  }

  if (!input.customerIsolation) {
    missing.push("customerIsolation");
  }

  if (!input.firmIsolation) {
    missing.push("firmIsolation");
  }

  if (!input.clientIsolation) {
    missing.push("clientIsolation");
  }

  return missing;
}

function buildCurrencyConfigurationKey(input: BuildCurrencyConfigurationInput): string {
  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    reportingFramework: input.reportingFramework ?? "",
    functionalCurrency: input.functionalCurrency ?? "",
    presentationCurrency: getPresentationCurrency(input),
    translationFrameworkStandard: getTranslationFrameworkStandard(input.reportingFramework) ?? "",
    translationEngineReferenceId: input.translationEngineReferenceId ?? "",
  });
}

function buildCurrencyConfigurationId(input: BuildCurrencyConfigurationInput): string {
  return `synthetic-currency-configuration:${stableSnapshotHash({
    currencyConfigurationKey: buildCurrencyConfigurationKey(input),
    artifactType: "SyntheticCurrencyConfiguration",
  })}`;
}

function buildDerivationHash(
  input: BuildCurrencyConfigurationInput,
  translationFrameworkStandard: TranslationFrameworkStandard,
): string {
  return stableSnapshotHash({
    currencyConfigurationKey: buildCurrencyConfigurationKey(input),
    functionalAndPresentationCurrencySeparate: true,
    presentationDefaultsToFunctionalWhenOmitted: true,
    translationStandardSelectedByFramework: true,
    translationFrameworkStandard,
    monetaryItemsAtTransactionDateRate: true,
    nonMonetaryItemsAtHistoricalRate: true,
    incomeStatementAtAverageRate: true,
    balanceSheetAtClosingRate: true,
    translationDifferenceToOci: true,
    hyperinflationaryHandlingDeferred: true,
    ias29RecognizedUnpopulated: true,
    performsNoTranslationItself: true,
  });
}

function getWarnings(input: BuildCurrencyConfigurationInput): string[] {
  const presentationCurrency = getPresentationCurrency(input);
  const presentationWasOmitted = !hasValue(input.presentationCurrency);

  return [
    ...getInputArray(input.warnings),
    ...(presentationWasOmitted && hasValue(input.functionalCurrency)
      ? ["presentation currency defaulted to functional currency"]
      : []),
    ...(!hasValue(input.translationEngineReferenceId)
      ? ["currency configuration should reference the 41.5R translation engine via translationEngineReferenceId"]
      : []),
    "metadata-only currency configuration contract; live translation under IAS 21 and ASC 830 is deferred to the 41.5R engine and real-data validation",
  ];
}

export function buildCurrencyConfiguration(
  input: BuildCurrencyConfigurationInput,
): BuildCurrencyConfigurationResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      currencyConfiguration: null,
      skipped: true,
      warnings: [`missing required currency configuration identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredFunctionalCurrency = input.functionalCurrency as string;
  const requiredReportingFramework = input.reportingFramework as StandardsReportingFramework;
  const translationFrameworkStandard = getTranslationFrameworkStandard(requiredReportingFramework) as TranslationFrameworkStandard;
  const base = getSharedBase(input);
  const currencyConfiguration: SyntheticCurrencyConfiguration = {
    ...base,
    currencyConfigurationId: buildCurrencyConfigurationId(input),
    currencyConfigurationKey: buildCurrencyConfigurationKey(input),
    entityId: requiredEntityId,
    reportingFramework: requiredReportingFramework,
    functionalCurrency: requiredFunctionalCurrency,
    presentationCurrency: getPresentationCurrency(input),
    functionalAndPresentationCurrencySeparate: true,
    presentationDefaultsToFunctionalWhenOmitted: true,
    translationFrameworkStandard,
    translationStandardSelectedByFramework: true,
    monetaryItemsAtTransactionDateRate: true,
    nonMonetaryItemsAtHistoricalRate: true,
    incomeStatementAtAverageRate: true,
    balanceSheetAtClosingRate: true,
    translationDifferenceToOci: true,
    hyperinflationaryHandlingDeferred: true,
    ias29RecognizedUnpopulated: true,
    translationEngineReferenceId: input.translationEngineReferenceId ?? "",
    performsNoTranslationItself: true,
    executable: false,
    derivationHash: buildDerivationHash(input, translationFrameworkStandard),
    warnings: getWarnings(input),
    currencyConfigurationComplete: input.currencyConfigurationComplete === true,
  };

  return {
    currencyConfiguration,
    skipped: false,
    warnings: currencyConfiguration.warnings,
  };
}
