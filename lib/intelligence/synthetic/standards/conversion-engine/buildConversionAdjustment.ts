import { stableSnapshotHash } from "../../../core/hash";
import type { StandardsBaseContract, StandardsReportingFramework } from "../contracts";

export type ConversionPair =
  | "gaap_to_full_ifrs"
  | "gaap_to_ifrs_for_smes"
  | "gaap_to_eu_ifrs"
  | "gaap_to_uk_ifrs"
  | "full_ifrs_to_ifrs_for_smes"
  | "iasb_to_jurisdictional_variant"
  | "other";

export type PostingStatus =
  | "draft"
  | "pending_human_review"
  | "approved_for_posting"
  | "posted"
  | "reversed";

export interface BuildConversionAdjustmentInput extends Partial<StandardsBaseContract> {
  entityId?: string;
  fromFramework?: StandardsReportingFramework;
  toFramework?: StandardsReportingFramework;
  sourceTransactionReferenceId?: string;
  differenceCatalogEntryReferenceId?: string;
  glImpactUnderFromFramework?: Record<string, unknown>;
  glImpactUnderToFramework?: Record<string, unknown>;
  conversionPair?: ConversionPair;
  humanApproverReferenceId?: string;
  reversalReferenceId?: string;
  version?: string;
  postingStatus?: PostingStatus;
  conversionAdjustmentComplete?: boolean;
}

export interface SyntheticConversionAdjustment extends StandardsBaseContract {
  conversionAdjustmentId: string;
  conversionAdjustmentKey: string;
  entityId: string;
  fromFramework: StandardsReportingFramework;
  toFramework: StandardsReportingFramework;
  sourceTransactionReferenceId: string;
  differenceCatalogEntryReferenceId: string;
  consumesDifferencesCatalogNeverReimplements: true;
  glImpactUnderFromFramework: Record<string, unknown>;
  glImpactUnderToFramework: Record<string, unknown>;
  isConversionAdjustment: true;
  conversionPair: ConversionPair;
  frameworkTaggedAtPosting: true;
  neverSilentlyMerged: true;
  humanReviewRequiredBeforePosting: true;
  postingStatus: PostingStatus;
  approvedForPostingRequiresHumanApproval: true;
  humanApproverReferenceId: string;
  reversible: true;
  reversalReferenceId: string;
  fullAuditTrail: true;
  versioned: true;
  version: string;
  conversionAdjustmentComplete: boolean;
}

export interface BuildConversionAdjustmentResult {
  conversionAdjustment: SyntheticConversionAdjustment | null;
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

function hasHumanApproval(input: BuildConversionAdjustmentInput): boolean {
  return hasValue(input.humanApproverReferenceId);
}

function getConversionPair(input: BuildConversionAdjustmentInput): ConversionPair {
  if (input.conversionPair) {
    return input.conversionPair;
  }

  const fromFramework = input.fromFramework;
  const toFramework = input.toFramework;

  if (fromFramework === "us_gaap" && toFramework === "ifrs_iasb") {
    return "gaap_to_full_ifrs";
  }

  if (fromFramework === "us_gaap" && toFramework === "ifrs_for_smes") {
    return "gaap_to_ifrs_for_smes";
  }

  if (fromFramework === "us_gaap" && toFramework === "ifrs_eu") {
    return "gaap_to_eu_ifrs";
  }

  if (fromFramework === "us_gaap" && toFramework === "ifrs_uk") {
    return "gaap_to_uk_ifrs";
  }

  if (fromFramework === "ifrs_iasb" && toFramework === "ifrs_for_smes") {
    return "full_ifrs_to_ifrs_for_smes";
  }

  if (
    fromFramework === "ifrs_iasb" &&
    (toFramework === "ifrs_eu" || toFramework === "ifrs_uk" || toFramework === "ifrs_ca")
  ) {
    return "iasb_to_jurisdictional_variant";
  }

  return "other";
}

function getPostingStatus(input: BuildConversionAdjustmentInput): PostingStatus {
  const requestedStatus = input.postingStatus ?? "draft";

  if (requestedStatus === "reversed") {
    return "reversed";
  }

  if (requestedStatus === "posted" || requestedStatus === "approved_for_posting") {
    return hasHumanApproval(input) ? requestedStatus : "pending_human_review";
  }

  if (requestedStatus === "pending_human_review") {
    return "pending_human_review";
  }

  return "draft";
}

function getGlImpactMetadata(
  glImpact: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return glImpact ?? {};
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

function collectMissingRequiredIdentifiers(input: BuildConversionAdjustmentInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.entityId)) {
    missing.push("entityId");
  }

  if (!input.fromFramework) {
    missing.push("fromFramework");
  }

  if (!input.toFramework) {
    missing.push("toFramework");
  }

  if (!hasValue(input.differenceCatalogEntryReferenceId)) {
    missing.push("differenceCatalogEntryReferenceId");
  }

  if (!hasValue(input.version)) {
    missing.push("version");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
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

function buildConversionAdjustmentKey(input: BuildConversionAdjustmentInput): string {
  return stableSnapshotHash({
    entityId: input.entityId ?? "",
    fromFramework: input.fromFramework ?? "",
    toFramework: input.toFramework ?? "",
    sourceTransactionReferenceId: input.sourceTransactionReferenceId ?? "",
    differenceCatalogEntryReferenceId: input.differenceCatalogEntryReferenceId ?? "",
    conversionPair: getConversionPair(input),
    postingStatus: getPostingStatus(input),
    humanApproverReferenceId: input.humanApproverReferenceId ?? "",
    reversalReferenceId: input.reversalReferenceId ?? "",
    version: input.version ?? "",
  });
}

function buildConversionAdjustmentId(input: BuildConversionAdjustmentInput): string {
  return `synthetic-conversion-adjustment:${stableSnapshotHash({
    conversionAdjustmentKey: buildConversionAdjustmentKey(input),
    artifactType: "SyntheticConversionAdjustment",
  })}`;
}

function buildDerivationHash(input: BuildConversionAdjustmentInput): string {
  return stableSnapshotHash({
    conversionAdjustmentKey: buildConversionAdjustmentKey(input),
    consumesDifferencesCatalogNeverReimplements: true,
    isConversionAdjustment: true,
    frameworkTaggedAtPosting: true,
    neverSilentlyMerged: true,
    humanReviewRequiredBeforePosting: true,
    approvedForPostingRequiresHumanApproval: true,
    reversible: true,
    fullAuditTrail: true,
    versioned: true,
    postingStatus: getPostingStatus(input),
    conversionPair: getConversionPair(input),
  });
}

function getWarnings(
  input: BuildConversionAdjustmentInput,
  postingStatus: PostingStatus,
): string[] {
  const glImpactUnderFromFramework = getGlImpactMetadata(input.glImpactUnderFromFramework);
  const glImpactUnderToFramework = getGlImpactMetadata(input.glImpactUnderToFramework);

  return [
    ...getInputArray(input.warnings),
    ...((input.postingStatus === "posted" || input.postingStatus === "approved_for_posting") &&
    postingStatus === "pending_human_review"
      ? ["posting requires human approval; status remains pending_human_review until humanApproverReferenceId is supplied"]
      : []),
    ...(!hasValue(input.sourceTransactionReferenceId)
      ? ["conversion adjustment should reference the source transaction via sourceTransactionReferenceId"]
      : []),
    ...(Object.keys(glImpactUnderFromFramework).length === 0 ||
    Object.keys(glImpactUnderToFramework).length === 0
      ? ["conversion adjustment should preserve GL impact metadata under both fromFramework and toFramework"]
      : []),
    ...(postingStatus === "reversed" && !hasValue(input.reversalReferenceId)
      ? ["reversed conversion adjustment should reference the reversal audit trail via reversalReferenceId"]
      : []),
    "metadata-only conversion adjustment contract; consumes 41.5O differences catalog and performs no live posting — conversion accuracy against real dual-book ledgers is deferred to real-data validation",
  ];
}

export function buildConversionAdjustment(
  input: BuildConversionAdjustmentInput,
): BuildConversionAdjustmentResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      conversionAdjustment: null,
      skipped: true,
      warnings: [
        `missing required conversion adjustment identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredEntityId = input.entityId as string;
  const requiredFromFramework = input.fromFramework as StandardsReportingFramework;
  const requiredToFramework = input.toFramework as StandardsReportingFramework;
  const requiredDifferenceCatalogEntryReferenceId = input.differenceCatalogEntryReferenceId as string;
  const requiredVersion = input.version as string;
  const postingStatus = getPostingStatus(input);
  const base = getSharedBase(input);
  const conversionAdjustment: SyntheticConversionAdjustment = {
    ...base,
    conversionAdjustmentId: buildConversionAdjustmentId(input),
    conversionAdjustmentKey: buildConversionAdjustmentKey(input),
    entityId: requiredEntityId,
    fromFramework: requiredFromFramework,
    toFramework: requiredToFramework,
    sourceTransactionReferenceId: input.sourceTransactionReferenceId ?? "",
    differenceCatalogEntryReferenceId: requiredDifferenceCatalogEntryReferenceId,
    consumesDifferencesCatalogNeverReimplements: true,
    glImpactUnderFromFramework: getGlImpactMetadata(input.glImpactUnderFromFramework),
    glImpactUnderToFramework: getGlImpactMetadata(input.glImpactUnderToFramework),
    isConversionAdjustment: true,
    conversionPair: getConversionPair(input),
    frameworkTaggedAtPosting: true,
    neverSilentlyMerged: true,
    humanReviewRequiredBeforePosting: true,
    postingStatus,
    approvedForPostingRequiresHumanApproval: true,
    humanApproverReferenceId: input.humanApproverReferenceId ?? "",
    reversible: true,
    reversalReferenceId: input.reversalReferenceId ?? "",
    fullAuditTrail: true,
    versioned: true,
    version: requiredVersion,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, postingStatus),
    conversionAdjustmentComplete:
      input.conversionAdjustmentComplete === true &&
      (postingStatus === "posted" || postingStatus === "approved_for_posting") &&
      hasHumanApproval(input),
  };

  return {
    conversionAdjustment,
    skipped: false,
    warnings: conversionAdjustment.warnings,
  };
}
