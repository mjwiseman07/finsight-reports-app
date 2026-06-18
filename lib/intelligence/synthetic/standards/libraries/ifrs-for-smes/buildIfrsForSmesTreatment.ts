import { stableSnapshotHash } from "../../../../core/hash";
import type {
  StandardsBaseContract,
  StandardsReportingFramework,
  StandardsTreatmentStatus,
} from "../../contracts";

export const IFRS_FOR_SMES_SECTION_TOPIC_SCAFFOLD: Record<string, string> = {
  revenue: "IFRS for SMEs S23",
  leases: "IFRS for SMEs S20",
  ppe: "IFRS for SMEs S17",
  inventories: "IFRS for SMEs S13",
  impairment: "IFRS for SMEs S27",
  financial_instruments: "IFRS for SMEs S11, S12",
  income_taxes: "IFRS for SMEs S29",
  share_based_payment: "IFRS for SMEs S26",
  business_combinations: "IFRS for SMEs S19",
  consolidated_statements: "IFRS for SMEs S9",
  foreign_currency: "IFRS for SMEs S30",
  employee_benefits: "IFRS for SMEs S28",
  provisions_contingencies: "IFRS for SMEs S21",
  associates: "IFRS for SMEs S14",
  joint_arrangements: "IFRS for SMEs S15",
  investment_property: "IFRS for SMEs S16",
  intangibles: "IFRS for SMEs S18",
  government_grants: "IFRS for SMEs S24",
  borrowing_costs: "IFRS for SMEs S25",
  events_after_reporting_period: "IFRS for SMEs S32",
  cash_flows: "IFRS for SMEs S7",
};

export interface BuildIfrsForSmesTreatmentInput extends Partial<StandardsBaseContract> {
  topicIdentifier?: string;
  ifrsForSmesSectionReference?: string;
  treatmentSummaryAuthored?: string;
  disclosureRequirementReferenceIds?: string[];
  commonPitfallsAuthored?: string[];
  version?: string;
  effectiveFromDate?: string;
  isHumanReviewed?: boolean;
  reviewerIdentity?: string;
  reviewDate?: string;
  reviewAttestationReferenceId?: string;
  treatmentStatus?: StandardsTreatmentStatus;
  priorVersionReferenceId?: string;
  ifrsForSmesTreatmentComplete?: boolean;
}

export interface SyntheticIfrsForSmesTreatment extends StandardsBaseContract {
  ifrsForSmesTreatmentId: string;
  ifrsForSmesTreatmentKey: string;
  topicIdentifier: string;
  ifrsForSmesSectionReference: string;
  reportingFramework: "ifrs_for_smes";
  treatmentSummaryAuthored: string;
  disclosureRequirementReferenceIds: string[];
  commonPitfallsAuthored: string[];
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
  priorVersionReferenceId: string;
  appendOnlyHistory: true;
  ifrsForSmesTreatmentComplete: boolean;
}

export interface BuildIfrsForSmesTreatmentResult {
  ifrsForSmesTreatment: SyntheticIfrsForSmesTreatment | null;
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

function hasReviewAttestation(input: BuildIfrsForSmesTreatmentInput): boolean {
  return (
    input.isHumanReviewed === true &&
    hasValue(input.reviewerIdentity) &&
    hasValue(input.reviewDate) &&
    hasValue(input.reviewAttestationReferenceId)
  );
}

function getTreatmentStatus(input: BuildIfrsForSmesTreatmentInput): StandardsTreatmentStatus {
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

function getScaffoldSectionReference(topicIdentifier: string): string | undefined {
  return IFRS_FOR_SMES_SECTION_TOPIC_SCAFFOLD[topicIdentifier];
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
    reportingFramework: "ifrs_for_smes" as StandardsReportingFramework,
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

function collectMissingRequiredIdentifiers(input: BuildIfrsForSmesTreatmentInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.topicIdentifier)) {
    missing.push("topicIdentifier");
  }

  if (!hasValue(input.ifrsForSmesSectionReference)) {
    missing.push("ifrsForSmesSectionReference");
  }

  if (!hasValue(input.version)) {
    missing.push("version");
  }

  if (!hasValue(input.effectiveFromDate)) {
    missing.push("effectiveFromDate");
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

function buildIfrsForSmesTreatmentKey(input: BuildIfrsForSmesTreatmentInput): string {
  return stableSnapshotHash({
    topicIdentifier: input.topicIdentifier ?? "",
    ifrsForSmesSectionReference: input.ifrsForSmesSectionReference ?? "",
    reportingFramework: "ifrs_for_smes",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    treatmentStatus: getTreatmentStatus(input),
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    reviewAttestationReferenceId: input.reviewAttestationReferenceId ?? "",
  });
}

function buildIfrsForSmesTreatmentId(input: BuildIfrsForSmesTreatmentInput): string {
  return `synthetic-ifrs-for-smes-treatment:${stableSnapshotHash({
    ifrsForSmesTreatmentKey: buildIfrsForSmesTreatmentKey(input),
    artifactType: "SyntheticIfrsForSmesTreatment",
  })}`;
}

function buildDerivationHash(input: BuildIfrsForSmesTreatmentInput): string {
  return stableSnapshotHash({
    ifrsForSmesTreatmentKey: buildIfrsForSmesTreatmentKey(input),
    activeRequiresReviewAttestation: true,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    treatmentStatus: getTreatmentStatus(input),
  });
}

function getWarnings(
  input: BuildIfrsForSmesTreatmentInput,
  treatmentStatus: StandardsTreatmentStatus,
): string[] {
  const topicIdentifier = input.topicIdentifier ?? "";
  const scaffoldSectionReference = getScaffoldSectionReference(topicIdentifier);

  return [
    ...getInputArray(input.warnings),
    ...(input.treatmentStatus === "active" && treatmentStatus === "in_review"
      ? ["treatment marked active without reviewer identity, review date, or attestation; forced to in_review"]
      : []),
    ...(!hasValue(input.treatmentSummaryAuthored)
      ? ["treatment summary is human-authored input; draft structure retained until content is supplied"]
      : []),
    ...(scaffoldSectionReference && input.ifrsForSmesSectionReference !== scaffoldSectionReference
      ? [
          `ifrsForSmesSectionReference differs from library scaffold for ${topicIdentifier}: expected ${scaffoldSectionReference}`,
        ]
      : []),
    ...(!scaffoldSectionReference && hasValue(topicIdentifier)
      ? [`topicIdentifier ${topicIdentifier} is outside the IFRS for SMEs section topic scaffold`]
      : []),
    ...(treatmentStatus !== "active"
      ? ["treatment remains draft or in_review until human review attestation is complete"]
      : []),
    "metadata-only IFRS for SMEs treatment library structure; builder never authors content and does not confirm treatment accuracy — attestation confirms review marking only",
    "IFRS for SMEs does not become customer-selectable until treatments are authored, attested, the framework is marked active, and the customer-facing IFRS gate is met",
  ];
}

export function buildIfrsForSmesTreatment(
  input: BuildIfrsForSmesTreatmentInput,
): BuildIfrsForSmesTreatmentResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      ifrsForSmesTreatment: null,
      skipped: true,
      warnings: [
        `missing required IFRS for SMEs treatment identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredTopicIdentifier = input.topicIdentifier as string;
  const requiredIfrsForSmesSectionReference = input.ifrsForSmesSectionReference as string;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const treatmentStatus = getTreatmentStatus(input);
  const base = getSharedBase(input);
  const ifrsForSmesTreatment: SyntheticIfrsForSmesTreatment = {
    ...base,
    ifrsForSmesTreatmentId: buildIfrsForSmesTreatmentId(input),
    ifrsForSmesTreatmentKey: buildIfrsForSmesTreatmentKey(input),
    topicIdentifier: requiredTopicIdentifier,
    ifrsForSmesSectionReference: requiredIfrsForSmesSectionReference,
    reportingFramework: "ifrs_for_smes",
    treatmentSummaryAuthored: input.treatmentSummaryAuthored ?? "",
    disclosureRequirementReferenceIds: getInputArray(input.disclosureRequirementReferenceIds),
    commonPitfallsAuthored: getInputArray(input.commonPitfallsAuthored),
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
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    appendOnlyHistory: true,
    executable: false,
    derivationHash: buildDerivationHash(input),
    warnings: getWarnings(input, treatmentStatus),
    ifrsForSmesTreatmentComplete:
      input.ifrsForSmesTreatmentComplete === true &&
      treatmentStatus === "active" &&
      hasReviewAttestation(input),
  };

  return {
    ifrsForSmesTreatment,
    skipped: false,
    warnings: ifrsForSmesTreatment.warnings,
  };
}
