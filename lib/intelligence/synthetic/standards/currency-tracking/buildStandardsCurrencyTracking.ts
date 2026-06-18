import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

export type PipelineSource = "fasb" | "iasb" | "iaasb" | "other";

export type IfrsEndorsementStatus =
  | "iasb_issued"
  | "eu_endorsed"
  | "uk_endorsed"
  | "ca_endorsed"
  | "not_endorsed"
  | "pending";

export interface BuildStandardsCurrencyTrackingInput extends Partial<StandardsBaseContract> {
  topicIdentifier?: string;
  treatmentReferenceId?: string;
  standardVersionReference?: string;
  amendmentReferences?: string[];
  lastHumanReviewedDate?: string;
  freshnessEvaluationDate?: string;
  treatmentFreshnessReportReferenceId?: string;
  pendingChangeReferences?: string[];
  pipelineSource?: PipelineSource;
  requiresReReview?: boolean;
  ifrsEndorsementStatusByJurisdiction?: Partial<
    Record<StandardsReportingFramework, IfrsEndorsementStatus>
  >;
  standardsCurrencyTrackingComplete?: boolean;
}

export interface SyntheticStandardsCurrencyTracking extends StandardsBaseContract {
  standardsCurrencyTrackingId: string;
  standardsCurrencyTrackingKey: string;
  reportingFramework: StandardsReportingFramework;
  topicIdentifier: string;
  treatmentReferenceId: string;
  standardVersionReference: string;
  amendmentReferences: string[];
  lastHumanReviewedDate: string;
  reviewFreshnessThresholdMonths: 12;
  isStaleForReview: boolean;
  treatmentFreshnessReportReferenceId: string;
  pendingChangeReferences: string[];
  pipelineSource: PipelineSource;
  requiresReReview: boolean;
  remainsActiveUntilReReviewed: true;
  newTreatmentRequiresHumanReviewBeforeActive: true;
  ifrsEndorsementStatusByJurisdiction: Partial<
    Record<StandardsReportingFramework, IfrsEndorsementStatus>
  >;
  tracksIfrsEndorsementByJurisdiction: true;
  doesNotClaimRealTimeCurrency: true;
  currencyIsHumanOrLicenseMaintained: true;
  standardsCurrencyTrackingComplete: boolean;
}

export interface BuildStandardsCurrencyTrackingResult {
  standardsCurrencyTracking: SyntheticStandardsCurrencyTracking | null;
  skipped: boolean;
  warnings: string[];
}

const REVIEW_FRESHNESS_THRESHOLD_MONTHS = 12;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function parseDate(value: string): Date | null {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthsBetween(reviewedDate: Date, evaluationDate: Date): number {
  return (
    (evaluationDate.getFullYear() - reviewedDate.getFullYear()) * 12 +
    (evaluationDate.getMonth() - reviewedDate.getMonth())
  );
}

function getIsStaleForReview(input: BuildStandardsCurrencyTrackingInput): boolean {
  if (!hasValue(input.lastHumanReviewedDate)) {
    return true;
  }

  const reviewedDate = parseDate(input.lastHumanReviewedDate as string);
  if (!reviewedDate) {
    return true;
  }

  if (!hasValue(input.freshnessEvaluationDate)) {
    return false;
  }

  const evaluationDate = parseDate(input.freshnessEvaluationDate as string);
  if (!evaluationDate) {
    return false;
  }

  return monthsBetween(reviewedDate, evaluationDate) >= REVIEW_FRESHNESS_THRESHOLD_MONTHS;
}

function getPipelineSource(input: BuildStandardsCurrencyTrackingInput): PipelineSource {
  if (input.pipelineSource) {
    return input.pipelineSource;
  }

  if (input.reportingFramework === "us_gaap") {
    return "fasb";
  }

  if (
    input.reportingFramework === "ifrs_iasb" ||
    input.reportingFramework === "ifrs_for_smes"
  ) {
    return "iasb";
  }

  if (
    input.reportingFramework === "ifrs_eu" ||
    input.reportingFramework === "ifrs_uk" ||
    input.reportingFramework === "ifrs_ca"
  ) {
    return "iaasb";
  }

  return "other";
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

function collectMissingRequiredIdentifiers(
  input: BuildStandardsCurrencyTrackingInput,
): string[] {
  const missing: string[] = [];

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (!hasValue(input.treatmentReferenceId)) {
    missing.push("treatmentReferenceId");
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

function buildStandardsCurrencyTrackingKey(input: BuildStandardsCurrencyTrackingInput): string {
  return stableSnapshotHash({
    reportingFramework: input.reportingFramework ?? "",
    topicIdentifier: input.topicIdentifier ?? "",
    treatmentReferenceId: input.treatmentReferenceId ?? "",
    standardVersionReference: input.standardVersionReference ?? "",
    amendmentReferences: getInputArray(input.amendmentReferences),
    lastHumanReviewedDate: input.lastHumanReviewedDate ?? "",
    reviewFreshnessThresholdMonths: REVIEW_FRESHNESS_THRESHOLD_MONTHS,
    isStaleForReview: getIsStaleForReview(input),
    treatmentFreshnessReportReferenceId: input.treatmentFreshnessReportReferenceId ?? "",
    pendingChangeReferences: getInputArray(input.pendingChangeReferences),
    pipelineSource: getPipelineSource(input),
    requiresReReview: input.requiresReReview === true,
    ifrsEndorsementStatusByJurisdiction: input.ifrsEndorsementStatusByJurisdiction ?? {},
  });
}

function buildStandardsCurrencyTrackingId(input: BuildStandardsCurrencyTrackingInput): string {
  return `synthetic-standards-currency-tracking:${stableSnapshotHash({
    standardsCurrencyTrackingKey: buildStandardsCurrencyTrackingKey(input),
    artifactType: "SyntheticStandardsCurrencyTracking",
  })}`;
}

function buildDerivationHash(input: BuildStandardsCurrencyTrackingInput): string {
  return stableSnapshotHash({
    standardsCurrencyTrackingKey: buildStandardsCurrencyTrackingKey(input),
    remainsActiveUntilReReviewed: true,
    newTreatmentRequiresHumanReviewBeforeActive: true,
    tracksIfrsEndorsementByJurisdiction: true,
    doesNotClaimRealTimeCurrency: true,
    currencyIsHumanOrLicenseMaintained: true,
    reviewFreshnessThresholdMonths: REVIEW_FRESHNESS_THRESHOLD_MONTHS,
    isStaleForReview: getIsStaleForReview(input),
    requiresReReview: input.requiresReReview === true,
  });
}

function getWarnings(
  input: BuildStandardsCurrencyTrackingInput,
  isStaleForReview: boolean,
): string[] {
  const isIfrsFamily =
    input.reportingFramework === "ifrs_iasb" ||
    input.reportingFramework === "ifrs_for_smes" ||
    input.reportingFramework === "ifrs_eu" ||
    input.reportingFramework === "ifrs_uk" ||
    input.reportingFramework === "ifrs_ca" ||
    input.reportingFramework === "ifrs_au";

  return [
    ...getInputArray(input.warnings),
    ...(!hasValue(input.lastHumanReviewedDate)
      ? ["lastHumanReviewedDate missing; treatment treated as stale for review"]
      : []),
    ...(hasValue(input.lastHumanReviewedDate) && !hasValue(input.freshnessEvaluationDate)
      ? ["freshnessEvaluationDate not supplied; isStaleForReview defaults false until an evaluation date is provided"]
      : []),
    ...(isStaleForReview
      ? [`treatment not reviewed within ${REVIEW_FRESHNESS_THRESHOLD_MONTHS} months; include in freshness report`]
      : []),
    ...(input.requiresReReview === true
      ? ["amendment affects treatment; requiresReReview flagged while treatment remains active until re-reviewed"]
      : []),
    ...(isIfrsFamily &&
    Object.keys(input.ifrsEndorsementStatusByJurisdiction ?? {}).length === 0
      ? ["IFRS tracking should record endorsement status by jurisdiction for variant resolvers"]
      : []),
    ...(!hasValue(input.standardVersionReference)
      ? ["standard version should be recorded as a reference only, never reproduced text"]
      : []),
    "metadata-only standards currency tracking; no live FASB/IASB integration — currency is human- or license-maintained",
  ];
}

export function buildStandardsCurrencyTracking(
  input: BuildStandardsCurrencyTrackingInput,
): BuildStandardsCurrencyTrackingResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      standardsCurrencyTracking: null,
      skipped: true,
      warnings: [
        `missing required standards currency tracking identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredReportingFramework = input.reportingFramework as StandardsReportingFramework;
  const requiredTreatmentReferenceId = input.treatmentReferenceId as string;
  const isStaleForReview = getIsStaleForReview(input);
  const base = getSharedBase(input);
  const standardsCurrencyTracking: SyntheticStandardsCurrencyTracking = {
    ...base,
    standardsCurrencyTrackingId: buildStandardsCurrencyTrackingId(input),
    standardsCurrencyTrackingKey: buildStandardsCurrencyTrackingKey(input),
    reportingFramework: requiredReportingFramework,
    topicIdentifier: input.topicIdentifier ?? "",
    treatmentReferenceId: requiredTreatmentReferenceId,
    standardVersionReference: input.standardVersionReference ?? "",
    amendmentReferences: getInputArray(input.amendmentReferences),
    lastHumanReviewedDate: input.lastHumanReviewedDate ?? "",
    reviewFreshnessThresholdMonths: 12,
    isStaleForReview,
    treatmentFreshnessReportReferenceId: input.treatmentFreshnessReportReferenceId ?? "",
    pendingChangeReferences: getInputArray(input.pendingChangeReferences),
    pipelineSource: getPipelineSource(input),
    requiresReReview: input.requiresReReview === true,
    remainsActiveUntilReReviewed: true,
    newTreatmentRequiresHumanReviewBeforeActive: true,
    ifrsEndorsementStatusByJurisdiction: input.ifrsEndorsementStatusByJurisdiction ?? {},
    tracksIfrsEndorsementByJurisdiction: true,
    doesNotClaimRealTimeCurrency: true,
    currencyIsHumanOrLicenseMaintained: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, isStaleForReview),
    standardsCurrencyTrackingComplete: input.standardsCurrencyTrackingComplete === true,
  };

  return {
    standardsCurrencyTracking,
    skipped: false,
    warnings: standardsCurrencyTracking.warnings,
  };
}
