import { stableSnapshotHash } from "../../../../core/hash";
import type {
  StandardsBaseContract,
  StandardsReportingFramework,
  StandardsTreatmentStatus,
} from "../../contracts";

export type OverlayVariantFramework = Extract<
  StandardsReportingFramework,
  "ifrs_eu" | "ifrs_uk" | "ifrs_ca"
> | "none";

export const FULL_IFRS_IAS_TOPIC_SCAFFOLD: Record<string, string> = {
  revenue: "IFRS 15",
  leases: "IFRS 16",
  ppe: "IAS 16",
  inventories: "IAS 2",
  impairment: "IAS 36",
  financial_instruments: "IFRS 9",
  income_taxes: "IAS 12",
  employee_benefits: "IAS 19",
  share_based_payment: "IFRS 2",
  business_combinations: "IFRS 3",
  consolidated_statements: "IFRS 10",
  joint_arrangements: "IFRS 11",
  associates_jvs: "IAS 28",
  insurance_contracts: "IFRS 17",
  agriculture: "IAS 41",
  investment_property: "IAS 40",
  first_time_adoption: "IFRS 1",
  interim_reporting: "IAS 34",
  eps: "IAS 33",
  operating_segments: "IFRS 8",
  fair_value: "IFRS 13",
  foreign_exchange: "IAS 21",
  provisions_contingencies: "IAS 37",
  intangibles: "IAS 38",
  borrowing_costs: "IAS 23",
  government_grants: "IAS 20",
  events_after_reporting_period: "IAS 10",
  cash_flows: "IAS 7",
  presentation: "IAS 1",
  policies_estimates_errors: "IAS 8",
};

export interface BuildFullIfrsTreatmentInput extends Partial<StandardsBaseContract> {
  topicIdentifier?: string;
  iasIfrsReference?: string;
  treatmentSummaryAuthored?: string;
  disclosureRequirementReferenceIds?: string[];
  commonPitfallsAuthored?: string[];
  hasGaapDifference?: boolean;
  differenceCatalogEntryReferenceId?: string;
  version?: string;
  effectiveFromDate?: string;
  isHumanReviewed?: boolean;
  reviewerIdentity?: string;
  reviewDate?: string;
  reviewAttestationReferenceId?: string;
  treatmentStatus?: StandardsTreatmentStatus;
  isJurisdictionalOverlay?: boolean;
  overlayVariantFramework?: OverlayVariantFramework;
  priorVersionReferenceId?: string;
  fullIfrsTreatmentComplete?: boolean;
}

export interface SyntheticFullIfrsTreatment extends StandardsBaseContract {
  fullIfrsTreatmentId: string;
  fullIfrsTreatmentKey: string;
  topicIdentifier: string;
  iasIfrsReference: string;
  reportingFramework: "ifrs_iasb";
  treatmentSummaryAuthored: string;
  disclosureRequirementReferenceIds: string[];
  commonPitfallsAuthored: string[];
  hasGaapDifference: boolean;
  differenceCatalogEntryReferenceId: string;
  version: string;
  effectiveFromDate: string;
  isHumanReviewed: boolean;
  reviewerIdentity: string;
  reviewDate: string;
  reviewAttestationReferenceId: string;
  treatmentStatus: StandardsTreatmentStatus;
  activeRequiresReviewAttestation: true;
  containsCopyrightedText: false;
  citationIsReferenceOnlyNeverReproducedText: true;
  builderNeverAuthorsContent: true;
  isJurisdictionalOverlay: boolean;
  overlayBaselineReference: "ifrs_iasb";
  overlayVariantFramework: OverlayVariantFramework;
  overlayCapturesEndorsedVarianceOnly: true;
  priorVersionReferenceId: string;
  appendOnlyHistory: true;
  fullIfrsTreatmentComplete: boolean;
}

export interface BuildFullIfrsTreatmentResult {
  fullIfrsTreatment: SyntheticFullIfrsTreatment | null;
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

function hasReviewAttestation(input: BuildFullIfrsTreatmentInput): boolean {
  return (
    input.isHumanReviewed === true &&
    hasValue(input.reviewerIdentity) &&
    hasValue(input.reviewDate) &&
    hasValue(input.reviewAttestationReferenceId)
  );
}

function getTreatmentStatus(input: BuildFullIfrsTreatmentInput): StandardsTreatmentStatus {
  const requestedStatus = input.treatmentStatus ?? "draft";

  if (requestedStatus === "active" && !hasReviewAttestation(input)) {
    return "in_review";
  }

  if (requestedStatus === "superseded") {
    return "superseded";
  }

  if (requestedStatus === "active" && hasReviewAttestation(input)) {
    return "active";
  }

  if (requestedStatus === "in_review") {
    return "in_review";
  }

  return "draft";
}

function getOverlayVariantFramework(input: BuildFullIfrsTreatmentInput): OverlayVariantFramework {
  return input.overlayVariantFramework ?? "none";
}

function getScaffoldIasIfrsReference(topicIdentifier: string): string | undefined {
  return FULL_IFRS_IAS_TOPIC_SCAFFOLD[topicIdentifier];
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
    reportingFramework: "ifrs_iasb" as StandardsReportingFramework,
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

function collectMissingRequiredIdentifiers(input: BuildFullIfrsTreatmentInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
  }

  if (!hasValue(input.iasIfrsReference)) {
    missing.push("iasIfrsReference");
  }

  if (!hasValue(input.version)) {
    missing.push("version");
  }

  if (!hasValue(input.effectiveFromDate)) {
    missing.push("effectiveFromDate");
  }

  if (input.isJurisdictionalOverlay === true) {
    const overlayVariantFramework = getOverlayVariantFramework(input);
    if (!overlayVariantFramework || overlayVariantFramework === "none") {
      missing.push("overlayVariantFramework");
    }
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

function buildFullIfrsTreatmentKey(input: BuildFullIfrsTreatmentInput): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    iasIfrsReference: input.iasIfrsReference ?? "",
    reportingFramework: "ifrs_iasb",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    treatmentStatus: getTreatmentStatus(input),
    hasGaapDifference: input.hasGaapDifference === true,
    differenceCatalogEntryReferenceId: input.differenceCatalogEntryReferenceId ?? "",
    isJurisdictionalOverlay: input.isJurisdictionalOverlay === true,
    overlayVariantFramework: getOverlayVariantFramework(input),
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
  });
}

function buildFullIfrsTreatmentId(input: BuildFullIfrsTreatmentInput): string {
  return `synthetic-full-ifrs-treatment:${stableSnapshotHash({
    fullIfrsTreatmentKey: buildFullIfrsTreatmentKey(input),
    artifactType: "SyntheticFullIfrsTreatment",
  })}`;
}

function buildDerivationHash(input: BuildFullIfrsTreatmentInput): string {
  return stableSnapshotHash({
    fullIfrsTreatmentKey: buildFullIfrsTreatmentKey(input),
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    overlayCapturesEndorsedVarianceOnly: true,
    appendOnlyHistory: true,
    treatmentStatus: getTreatmentStatus(input),
    isJurisdictionalOverlay: input.isJurisdictionalOverlay === true,
    overlayBaselineReference: "ifrs_iasb",
  });
}

function getWarnings(
  input: BuildFullIfrsTreatmentInput,
  treatmentStatus: StandardsTreatmentStatus,
): string[] {
  const topicIdentifier = input.topicIdentifier ?? "";
  const scaffoldIasIfrsReference = getScaffoldIasIfrsReference(topicIdentifier);
  const overlayVariantFramework = getOverlayVariantFramework(input);

  return [
    ...getInputArray(input.warnings),
    ...(input.treatmentStatus === "active" && treatmentStatus === "in_review"
      ? ["treatment marked active without reviewer identity, review date, or attestation; forced to in_review"]
      : []),
    ...(!hasValue(input.treatmentSummaryAuthored)
      ? ["treatment summary is human-authored input; draft structure retained until content is supplied"]
      : []),
    ...(scaffoldIasIfrsReference && input.iasIfrsReference !== scaffoldIasIfrsReference
      ? [`iasIfrsReference differs from library scaffold for ${topicIdentifier}: expected ${scaffoldIasIfrsReference}`]
      : []),
    ...(!scaffoldIasIfrsReference && hasValue(topicIdentifier)
      ? [`topicIdentifier ${topicIdentifier} is outside the Full IFRS IAS/IFRS topic scaffold`]
      : []),
    ...(input.hasGaapDifference === true && !hasValue(input.differenceCatalogEntryReferenceId)
      ? ["hasGaapDifference is true; differenceCatalogEntryReferenceId should link to the 41.5O Differences Catalog entry"]
      : []),
    ...(input.isJurisdictionalOverlay === true
      ? [
          `jurisdictional overlay captures endorsed variance only from IASB baseline for variant ${overlayVariantFramework}`,
        ]
      : []),
    ...(input.isJurisdictionalOverlay === true && treatmentStatus === "active"
      ? ["jurisdictional overlay applies only after the IASB baseline treatment is active"]
      : []),
    ...(treatmentStatus !== "active"
      ? ["treatment remains draft or in_review until human review attestation is complete"]
      : []),
    "metadata-only Full IFRS treatment library structure; builder never authors content and does not confirm treatment accuracy — attestation confirms review marking only",
    "Full IFRS does not become customer-selectable until treatments are authored, attested, the framework is marked active, and the customer-facing IFRS gate is met",
  ];
}

export function buildFullIfrsTreatment(
  input: BuildFullIfrsTreatmentInput,
): BuildFullIfrsTreatmentResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      fullIfrsTreatment: null,
      skipped: true,
      warnings: [
        `missing required Full IFRS treatment identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredIasIfrsReference = input.iasIfrsReference as string;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const treatmentStatus = getTreatmentStatus(input);
  const base = getSharedBase(input);
  const fullIfrsTreatment: SyntheticFullIfrsTreatment = {
    ...base,
    fullIfrsTreatmentId: buildFullIfrsTreatmentId(input),
    fullIfrsTreatmentKey: buildFullIfrsTreatmentKey(input),
    topicIdentifier: requiredTopicIdentifier,
    iasIfrsReference: requiredIasIfrsReference,
    reportingFramework: "ifrs_iasb",
    treatmentSummaryAuthored: input.treatmentSummaryAuthored ?? "",
    disclosureRequirementReferenceIds: getInputArray(input.disclosureRequirementReferenceIds),
    commonPitfallsAuthored: getInputArray(input.commonPitfallsAuthored),
    hasGaapDifference: input.hasGaapDifference === true,
    differenceCatalogEntryReferenceId: input.differenceCatalogEntryReferenceId ?? "",
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    isHumanReviewed: input.isHumanReviewed === true,
    reviewerIdentity: input.reviewerIdentity ?? "",
    reviewDate: input.reviewDate ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
    treatmentStatus,
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    isJurisdictionalOverlay: input.isJurisdictionalOverlay === true,
    overlayBaselineReference: "ifrs_iasb",
    overlayVariantFramework: getOverlayVariantFramework(input),
    overlayCapturesEndorsedVarianceOnly: true,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    appendOnlyHistory: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, treatmentStatus),
    fullIfrsTreatmentComplete:
      input.fullIfrsTreatmentComplete === true &&
      treatmentStatus === "active" &&
      hasReviewAttestation(input),
  };

  return {
    fullIfrsTreatment,
    skipped: false,
    warnings: fullIfrsTreatment.warnings,
  };
}
