import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

export type TranslationFrameworkStandard = "ias_21" | "asc_830";
export type TranslationStage = "transaction_to_functional" | "functional_to_presentation";

const IFRS_FAMILY_FRAMEWORKS: StandardsReportingFramework[] = [
  "ifrs_for_smes",
  "ifrs_iasb",
  "ifrs_eu",
  "ifrs_uk",
  "ifrs_ca",
  "ifrs_au",
];

export interface BuildCurrencyTranslationInput extends Partial<StandardsBaseContract> {
  entityId?: string;
  currencyConfigurationReferenceId?: string;
  transactionCurrency?: string;
  functionalCurrency?: string;
  presentationCurrency?: string;
  translationStage?: TranslationStage;
  ratesUsedReferenceIds?: string[];
  currencyTranslationComplete?: boolean;
}

export interface SyntheticCurrencyTranslation extends StandardsBaseContract {
  currencyTranslationId: string;
  currencyTranslationKey: string;
  entityId: string;
  currencyConfigurationReferenceId: string;
  reportingFramework: StandardsReportingFramework;
  translationFrameworkStandard: TranslationFrameworkStandard;
  translationStandardSelectedByFramework: true;
  transactionCurrency: string;
  functionalCurrency: string;
  presentationCurrency: string;
  translationStage: TranslationStage;
  monetaryItemsAtTransactionDateRate: true;
  nonMonetaryItemsAtHistoricalRate: true;
  incomeStatementAtAverageRate: true;
  balanceSheetAtClosingRate: true;
  translationDifferenceToOci: true;
  ratesUsedReferenceIds: string[];
  allRatesRecordedWithAuditTrail: true;
  exchangeDifferenceRecognizedPerFramework: true;
  hyperinflationaryHandlingDeferred: true;
  ias29RecognizedUnpopulated: true;
  ratesAreInputNotFetched: true;
  currencyTranslationComplete: boolean;
}

export interface BuildCurrencyTranslationResult {
  currencyTranslation: SyntheticCurrencyTranslation | null;
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

function getPresentationCurrency(input: BuildCurrencyTranslationInput): string {
  return input.presentationCurrency ?? input.functionalCurrency ?? "";
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

function collectMissingRequiredIdentifiers(input: BuildCurrencyTranslationInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!input.translationStage) {
    missing.push("translationStage");
  }

  if (!hasValue(input.currencyConfigurationReferenceId)) {
    missing.push("currencyConfigurationReferenceId");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (!getTranslationFrameworkStandard(input.reportingFramework)) {
    missing.push("translationFrameworkStandard");
  }

  if (!hasValue(input.functionalCurrency)) {
    missing.push("functionalCurrency");
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

function buildCurrencyTranslationKey(input: BuildCurrencyTranslationInput): string {
  const translationFrameworkStandard = getTranslationFrameworkStandard(input.reportingFramework) ?? "";

  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    currencyConfigurationReferenceId: input.currencyConfigurationReferenceId ?? "",
    reportingFramework: input.reportingFramework ?? "",
    translationFrameworkStandard,
    translationStage: input.translationStage ?? "",
    transactionCurrency: input.transactionCurrency ?? "",
    functionalCurrency: input.functionalCurrency ?? "",
    presentationCurrency: getPresentationCurrency(input),
    ratesUsedReferenceIds: getInputArray(input.ratesUsedReferenceIds),
  });
}

function buildCurrencyTranslationId(input: BuildCurrencyTranslationInput): string {
  return `synthetic-currency-translation:${stableSnapshotHash({
    currencyTranslationKey: buildCurrencyTranslationKey(input),
    artifactType: "SyntheticCurrencyTranslation",
  })}`;
}

function buildDerivationHash(
  input: BuildCurrencyTranslationInput,
  translationFrameworkStandard: TranslationFrameworkStandard,
): string {
  return stableSnapshotHash({
    currencyTranslationKey: buildCurrencyTranslationKey(input),
    translationStandardSelectedByFramework: true,
    translationFrameworkStandard,
    monetaryItemsAtTransactionDateRate: true,
    nonMonetaryItemsAtHistoricalRate: true,
    incomeStatementAtAverageRate: true,
    balanceSheetAtClosingRate: true,
    translationDifferenceToOci: true,
    allRatesRecordedWithAuditTrail: true,
    exchangeDifferenceRecognizedPerFramework: true,
    hyperinflationaryHandlingDeferred: true,
    ias29RecognizedUnpopulated: true,
    ratesAreInputNotFetched: true,
    translationStage: input.translationStage ?? "",
  });
}

function getWarnings(input: BuildCurrencyTranslationInput): string[] {
  const translationStage = input.translationStage;

  return [
    ...getInputArray(input.warnings),
    ...(translationStage === "transaction_to_functional" && !hasValue(input.transactionCurrency)
      ? ["transaction-to-functional translation should specify transactionCurrency"]
      : []),
    ...(translationStage === "functional_to_presentation" && !hasValue(input.presentationCurrency)
      ? ["functional-to-presentation translation should specify presentationCurrency"]
      : []),
    ...(getInputArray(input.ratesUsedReferenceIds).length === 0
      ? ["exchange rates are supplied as input via ratesUsedReferenceIds; this builder fetches no live rates"]
      : []),
    "translation consumes 41.5G currency configuration; rate rules are not redefined here",
    "metadata-only currency translation contract; live translation under IAS 21 and ASC 830 against real rates and ledgers is deferred to real-data validation",
  ];
}

export function buildCurrencyTranslation(
  input: BuildCurrencyTranslationInput,
): BuildCurrencyTranslationResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      currencyTranslation: null,
      skipped: true,
      warnings: [
        `missing required currency translation identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredCurrencyConfigurationReferenceId = input.currencyConfigurationReferenceId as string;
  const requiredReportingFramework = input.reportingFramework as StandardsReportingFramework;
  const requiredTranslationStage = input.translationStage as TranslationStage;
  const requiredFunctionalCurrency = input.functionalCurrency as string;
  const translationFrameworkStandard = getTranslationFrameworkStandard(
    requiredReportingFramework,
  ) as TranslationFrameworkStandard;
  const base = getSharedBase(input);
  const currencyTranslation: SyntheticCurrencyTranslation = {
    ...base,
    currencyTranslationId: buildCurrencyTranslationId(input),
    currencyTranslationKey: buildCurrencyTranslationKey(input),
    entityId: requiredEntityId,
    currencyConfigurationReferenceId: requiredCurrencyConfigurationReferenceId,
    reportingFramework: requiredReportingFramework,
    translationFrameworkStandard,
    translationStandardSelectedByFramework: true,
    transactionCurrency: input.transactionCurrency ?? "",
    functionalCurrency: requiredFunctionalCurrency,
    presentationCurrency: getPresentationCurrency(input),
    translationStage: requiredTranslationStage,
    monetaryItemsAtTransactionDateRate: true,
    nonMonetaryItemsAtHistoricalRate: true,
    incomeStatementAtAverageRate: true,
    balanceSheetAtClosingRate: true,
    translationDifferenceToOci: true,
    ratesUsedReferenceIds: getInputArray(input.ratesUsedReferenceIds),
    allRatesRecordedWithAuditTrail: true,
    exchangeDifferenceRecognizedPerFramework: true,
    hyperinflationaryHandlingDeferred: true,
    ias29RecognizedUnpopulated: true,
    ratesAreInputNotFetched: true,
    executable: false,
    derivationHash: buildDerivationHash(input, translationFrameworkStandard),
    warnings: getWarnings(input),
    currencyTranslationComplete:
      input.currencyTranslationComplete === true &&
      getInputArray(input.ratesUsedReferenceIds).length > 0,
  };

  return {
    currencyTranslation,
    skipped: false,
    warnings: currencyTranslation.warnings,
  };
}
