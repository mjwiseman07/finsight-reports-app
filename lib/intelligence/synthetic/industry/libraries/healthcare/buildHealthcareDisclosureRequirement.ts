import { stableSnapshotHash } from "../../../../core/hash";
import type { SyntheticAuditScope } from "../../../audit/types";
import type { SyntheticMemoryObjectIsolationDimension } from "../../../organizational-memory/memory-object";
import type {
  IndustryBaseContract,
  IndustryTreatmentStatus,
  PhiDerivationStatus,
  RecommendationOutputClassification,
  ReviewerAttestation,
} from "../../contracts";
import {
  HEALTHCARE_DISCLOSURE_BASELINE_IDENTIFIER_ORDER,
  getHealthcareDisclosureBaselineRecord,
  getHealthcareDisclosureLibraryHeaderContent,
  type HealthcareDisclosureBaselineIdentifier,
  type HealthcareDisclosureCitationFlag,
  type HealthcareDisclosureSection,
} from "./loadHealthcareDisclosureBaseline";

export const PHASE_42O_HEALTHCARE_DISCLOSURE_LIBRARY_HEADER =
  getHealthcareDisclosureLibraryHeaderContent();

export type HealthcareDisclosureRequirementModuleType = "disclosure_requirement";
export type HealthcareDisclosureRequirementStatus = IndustryTreatmentStatus;

const HEALTHCARE_BASELINE_SCOPE: SyntheticAuditScope = {
  companyId: "advisacor-healthcare-baseline",
  customerIsolationRequired: true,
  firmIsolationRequired: true,
  clientIsolationRequired: true,
  isolationBoundaryIds: ["advisacor-healthcare-baseline"],
};

const HEALTHCARE_BASELINE_CUSTOMER_ISOLATION: SyntheticMemoryObjectIsolationDimension = {
  required: true,
  referenceIds: ["advisacor-healthcare-baseline"],
};

const HEALTHCARE_BASELINE_FIRM_ISOLATION: SyntheticMemoryObjectIsolationDimension = {
  required: true,
  referenceIds: ["advisacor-firm-baseline"],
};

const HEALTHCARE_BASELINE_CLIENT_ISOLATION: SyntheticMemoryObjectIsolationDimension = {
  required: true,
  referenceIds: ["advisacor-client-baseline"],
};

const HEALTHCARE_DISCLOSURE_REQUIREMENT_BASELINE_DEFAULTS = {
  scope: HEALTHCARE_BASELINE_SCOPE,
  customerIsolation: HEALTHCARE_BASELINE_CUSTOMER_ISOLATION,
  firmIsolation: HEALTHCARE_BASELINE_FIRM_ISOLATION,
  clientIsolation: HEALTHCARE_BASELINE_CLIENT_ISOLATION,
  boundPhase40SnapshotHash: "phase40-baseline-handoff",
  boundPhase40_5SnapshotHash: "phase40-5-baseline-handoff",
  boundPhase41_5SnapshotHash: "phase41-5-baseline-handoff",
  boundPhase39SnapshotHash: "phase39-baseline-handoff",
  reportingFramework: "us_gaap",
  industryClassification: "healthcare",
  industrySubClassification: "healthcare.other",
  industryStatus: "active",
  containsPHI: false,
  phiDerivationStatus: "containsNoPHI",
  version: "1.0.0-recommended-baseline",
  effectiveFromDate: "2026-01-01",
  disclosureStatus: "in_review",
  advisacorRecommendedBaseline: true,
  customerAndAuditorDetermineApplicability: true,
  customerControllerOwnsDisclosure: true,
  priorVersionReferenceId: "",
  industryDisclosureRequirementComplete: false,
} as const satisfies Partial<BuildHealthcareDisclosureRequirementInput>;

function buildBlankReviewerAttestation(): ReviewerAttestation {
  return {
    primaryReviewer: {
      identity: "",
      credentials: [],
      reviewDate: "",
      scope: "",
    },
    specialistReviewRequired: false,
    specialistReviewer: null,
    attestationStatement: "",
    reviewedAgainstAuthoritativeSources: [],
    specialistReviewOptOutJustification: null,
  };
}

function buildHealthcareDisclosureRequirementBaselineInput(
  disclosureIdentifier: HealthcareDisclosureBaselineIdentifier,
): BuildHealthcareDisclosureRequirementInput {
  const baselineRecord = getHealthcareDisclosureBaselineRecord(disclosureIdentifier);

  return {
    ...HEALTHCARE_DISCLOSURE_REQUIREMENT_BASELINE_DEFAULTS,
    moduleType: "disclosure_requirement",
    disclosureIdentifier,
    itemLabel: baselineRecord.itemLabel,
    section: baselineRecord.section,
    disclosureRequirementAuthored: baselineRecord.disclosureRequirementAuthored,
    requiredVsVoluntary: baselineRecord.requiredVsVoluntary,
    ascCitations: baselineRecord.ascCitations,
    whatMustBeDisclosed: baselineRecord.whatMustBeDisclosed,
    providerApplicability: baselineRecord.providerApplicability,
    asc606TransitionNote: baselineRecord.asc606TransitionNote,
    citationFlag: baselineRecord.citationFlag,
    verificationChecklistFlags: baselineRecord.verificationChecklistFlags,
    reviewerAttestation: buildBlankReviewerAttestation(),
  };
}

export interface BuildHealthcareDisclosureRequirementInput extends Partial<IndustryBaseContract> {
  moduleType?: HealthcareDisclosureRequirementModuleType;
  disclosureIdentifier?: string;
  itemLabel?: string;
  section?: HealthcareDisclosureSection;
  disclosureRequirementAuthored?: string;
  requiredVsVoluntary?: string;
  ascCitations?: string[];
  whatMustBeDisclosed?: string;
  providerApplicability?: string;
  asc606TransitionNote?: string;
  citationFlag?: HealthcareDisclosureCitationFlag;
  reviewerAttestation?: ReviewerAttestation;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  disclosureStatus?: HealthcareDisclosureRequirementStatus;
  priorVersionReferenceId?: string;
  industryDisclosureRequirementComplete?: boolean;
  verificationChecklistFlags?: string[];
  advisacorRecommendedBaseline?: boolean;
  customerAndAuditorDetermineApplicability?: boolean;
  customerControllerOwnsDisclosure?: boolean;
}

export interface SyntheticHealthcareDisclosureRequirement extends IndustryBaseContract {
  moduleType: HealthcareDisclosureRequirementModuleType;
  industryDisclosureRequirementId: string;
  industryDisclosureRequirementKey: string;
  disclosureIdentifier: string;
  itemLabel: string;
  section: HealthcareDisclosureSection;
  disclosureRequirementAuthored: string;
  requiredVsVoluntary: string;
  ascCitations: string[];
  whatMustBeDisclosed: string;
  providerApplicability: string;
  asc606TransitionNote: string;
  citationFlag: HealthcareDisclosureCitationFlag;
  containsCopyrightedText: false;
  citationIsReferenceOnlyNeverReproducedText: true;
  reviewerAttestation: ReviewerAttestation;
  isReferenceNotDrafting: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  disclosureStatus: HealthcareDisclosureRequirementStatus;
  activeRequiresAttestation: true;
  launchScope: "path_b";
  executable: false;
  industryDisclosureRequirementComplete: boolean;
  advisacorRecommendedBaseline: boolean;
  customerAndAuditorDetermineApplicability: boolean;
  customerControllerOwnsDisclosure: boolean;
  verificationChecklistFlags: string[];
}

export interface BuildHealthcareDisclosureRequirementResult {
  industryDisclosureRequirement: SyntheticHealthcareDisclosureRequirement | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42O_HEALTHCARE_DISCLOSURE_REQUIREMENT_BLUEPRINT: ReadonlyArray<BuildHealthcareDisclosureRequirementInput> =
  HEALTHCARE_DISCLOSURE_BASELINE_IDENTIFIER_ORDER.map((disclosureIdentifier) =>
    buildHealthcareDisclosureRequirementBaselineInput(disclosureIdentifier),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const HEALTHCARE_INDUSTRY_CLASSIFICATION = "healthcare";
const HEALTHCARE_DISCLOSURE_REQUIREMENT_MODULE_TYPE: HealthcareDisclosureRequirementModuleType =
  "disclosure_requirement";
const HEALTHCARE_BASELINE_LAUNCH_SCOPE = "path_b" as const;

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function getContainsPHI(inputContainsPHI: boolean | undefined): boolean {
  return inputContainsPHI ?? true;
}

function getPhiDerivationStatus(
  inputContainsPHI: boolean | undefined,
  inputPhiDerivationStatus: PhiDerivationStatus | undefined,
): PhiDerivationStatus {
  if (inputPhiDerivationStatus) {
    return inputPhiDerivationStatus;
  }

  return inputContainsPHI === false ? "containsNoPHI" : DEFAULT_PHI_DERIVATION_STATUS;
}

function isHealthcareDisclosureBaselineIdentifier(
  disclosureIdentifier: string,
): disclosureIdentifier is HealthcareDisclosureBaselineIdentifier {
  return (HEALTHCARE_DISCLOSURE_BASELINE_IDENTIFIER_ORDER as readonly string[]).includes(
    disclosureIdentifier,
  );
}

function getReviewerAttestation(input: BuildHealthcareDisclosureRequirementInput): ReviewerAttestation {
  return input.reviewerAttestation ?? buildBlankReviewerAttestation();
}

function hasPrimaryReviewerAttestation(reviewerAttestation: ReviewerAttestation): boolean {
  return (
    hasValue(reviewerAttestation.primaryReviewer.identity) &&
    hasValue(reviewerAttestation.primaryReviewer.reviewDate)
  );
}

function getDisclosureStatus(
  input: BuildHealthcareDisclosureRequirementInput,
  reviewerAttestation: ReviewerAttestation,
): HealthcareDisclosureRequirementStatus {
  const requestedStatus = input.disclosureStatus ?? "draft";

  if (requestedStatus === "active" && !hasPrimaryReviewerAttestation(reviewerAttestation)) {
    return "in_review";
  }

  if (requestedStatus === "superseded" || requestedStatus === "deprecated") {
    return requestedStatus;
  }

  if (requestedStatus === "active" && hasPrimaryReviewerAttestation(reviewerAttestation)) {
    return "active";
  }

  if (requestedStatus === "in_review") {
    return "in_review";
  }

  return "draft";
}

function getSharedBase(input: BuildHealthcareDisclosureRequirementInput): IndustryBaseContract {
  const containsPHI = getContainsPHI(input.containsPHI);

  return {
    phase40OrganizationalHandoffHandle: input.phase40OrganizationalHandoffHandle ?? "",
    phase40_5IntegrationHandoffHandle: input.phase40_5IntegrationHandoffHandle ?? "",
    phase41_5StandardsHandoffHandle: input.phase41_5StandardsHandoffHandle ?? "",
    boundPhase40SnapshotHash: input.boundPhase40SnapshotHash ?? "",
    boundPhase40_5SnapshotHash: input.boundPhase40_5SnapshotHash ?? "",
    boundPhase41_5SnapshotHash: input.boundPhase41_5SnapshotHash ?? "",
    boundPhase39SnapshotHash: input.boundPhase39SnapshotHash ?? "",
    phase42StaleMarker: input.phase42StaleMarker ?? "current",
    executable: false,
    executionReady: input.executionReady === true,
    scope: input.scope,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    reportingFramework: input.reportingFramework as IndustryBaseContract["reportingFramework"],
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "healthcare.other",
    industryStatus: input.industryStatus ?? "active",
    containsPHI,
    phiDerivationStatus: getPhiDerivationStatus(input.containsPHI, input.phiDerivationStatus),
    output_classification: OUTPUT_CLASSIFICATION,
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
  } as IndustryBaseContract;
}

function collectMissingRequiredIdentifiers(input: BuildHealthcareDisclosureRequirementInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.disclosureIdentifier)) {
    missing.push("disclosureIdentifier");
  }

  if (!input.reportingFramework) {
    missing.push("reportingFramework");
  }

  if (
    hasValue(input.industryClassification) &&
    input.industryClassification !== HEALTHCARE_INDUSTRY_CLASSIFICATION
  ) {
    missing.push("industryClassification must be healthcare");
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

  if (!hasValue(input.boundPhase41_5SnapshotHash)) {
    missing.push("boundPhase41_5SnapshotHash");
  }

  if (!hasValue(input.boundPhase39SnapshotHash)) {
    missing.push("boundPhase39SnapshotHash");
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

  if (!input.section) {
    missing.push("section");
  }

  if (!hasValue(input.itemLabel)) {
    missing.push("itemLabel");
  }

  if (!hasValue(input.requiredVsVoluntary)) {
    missing.push("requiredVsVoluntary");
  }

  if (!input.ascCitations || input.ascCitations.length === 0) {
    missing.push("ascCitations");
  }

  if (!hasValue(input.providerApplicability)) {
    missing.push("providerApplicability");
  }

  if (!input.citationFlag) {
    missing.push("citationFlag");
  }

  if (input.moduleType && input.moduleType !== HEALTHCARE_DISCLOSURE_REQUIREMENT_MODULE_TYPE) {
    missing.push("moduleType must be disclosure_requirement");
  }

  return missing;
}

function buildHealthcareDisclosureRequirementKey(
  input: BuildHealthcareDisclosureRequirementInput,
  disclosureStatus: HealthcareDisclosureRequirementStatus,
  reviewerAttestation: ReviewerAttestation,
): string {
  return stableSnapshotHash({
    moduleType: HEALTHCARE_DISCLOSURE_REQUIREMENT_MODULE_TYPE,
    disclosureIdentifier: input.disclosureIdentifier ?? "",
    itemLabel: input.itemLabel ?? "",
    section: input.section ?? "",
    requiredVsVoluntary: input.requiredVsVoluntary ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    disclosureStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    ascCitations: input.ascCitations ?? [],
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
  });
}

function buildHealthcareDisclosureRequirementId(industryDisclosureRequirementKey: string): string {
  return `synthetic-healthcare-disclosure-requirement:${stableSnapshotHash({
    industryDisclosureRequirementKey,
    artifactType: "SyntheticHealthcareDisclosureRequirement",
  })}`;
}

function buildDerivationHash(
  industryDisclosureRequirementKey: string,
  disclosureStatus: HealthcareDisclosureRequirementStatus,
): string {
  return stableSnapshotHash({
    industryDisclosureRequirementKey,
    moduleType: HEALTHCARE_DISCLOSURE_REQUIREMENT_MODULE_TYPE,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    isReferenceNotDrafting: true,
    citationIsReferenceOnlyNeverReproducedText: true,
    containsCopyrightedText: false,
    appendOnlyHistory: true,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
    disclosureStatus,
  });
}

function getWarnings(
  input: BuildHealthcareDisclosureRequirementInput,
  disclosureStatus: HealthcareDisclosureRequirementStatus,
): string[] {
  const disclosureIdentifier = input.disclosureIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...(input.disclosureStatus === "active" && disclosureStatus === "in_review"
      ? [
          "disclosure requirement marked active without primary reviewer identity and reviewDate; forced to in_review",
        ]
      : []),
    ...(!hasValue(input.disclosureRequirementAuthored)
      ? [
          "disclosureRequirementAuthored is human-authored input; draft structure retained until requirement content is supplied",
        ]
      : []),
    ...(!isHealthcareDisclosureBaselineIdentifier(disclosureIdentifier)
      ? [`disclosureIdentifier ${disclosureIdentifier} is outside the healthcare disclosure baseline library`]
      : []),
    ...(input.advisacorRecommendedBaseline
      ? [
          "advisacor recommended disclosure requirement remains in_review on Advisacor side; customer controller and auditor determine applicability at implementation",
        ]
      : []),
    ...(disclosureStatus !== "active"
      ? ["disclosure requirement remains draft or in_review until primary reviewer attestation is complete"]
      : []),
    "metadata-only healthcare disclosure requirement reference library; builder never authors footnote language and performs no disclosure drafting — references only",
  ];
}

export function buildHealthcareDisclosureRequirement(
  input: BuildHealthcareDisclosureRequirementInput,
): BuildHealthcareDisclosureRequirementResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryDisclosureRequirement: null,
      skipped: true,
      warnings: [
        `missing required healthcare disclosure requirement identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredDisclosureIdentifier = input.disclosureIdentifier as string;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const reviewerAttestation = getReviewerAttestation(input);
  const disclosureStatus = getDisclosureStatus(input, reviewerAttestation);
  const industryDisclosureRequirementKey = buildHealthcareDisclosureRequirementKey(
    input,
    disclosureStatus,
    reviewerAttestation,
  );
  const base = getSharedBase(input);
  const industryDisclosureRequirement: SyntheticHealthcareDisclosureRequirement = {
    ...base,
    moduleType: HEALTHCARE_DISCLOSURE_REQUIREMENT_MODULE_TYPE,
    industryDisclosureRequirementId: buildHealthcareDisclosureRequirementId(
      industryDisclosureRequirementKey,
    ),
    industryDisclosureRequirementKey,
    disclosureIdentifier: requiredDisclosureIdentifier,
    itemLabel: input.itemLabel as string,
    section: input.section as HealthcareDisclosureSection,
    disclosureRequirementAuthored: input.disclosureRequirementAuthored ?? "",
    requiredVsVoluntary: input.requiredVsVoluntary as string,
    ascCitations: input.ascCitations as string[],
    whatMustBeDisclosed: input.whatMustBeDisclosed ?? "",
    providerApplicability: input.providerApplicability as string,
    asc606TransitionNote: input.asc606TransitionNote ?? "",
    citationFlag: input.citationFlag as HealthcareDisclosureCitationFlag,
    containsCopyrightedText: false,
    citationIsReferenceOnlyNeverReproducedText: true,
    reviewerAttestation,
    isReferenceNotDrafting: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    deprecatedFromDate: input.deprecatedFromDate,
    disclosureStatus,
    activeRequiresAttestation: true,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
    executable: false,
    derivationHash: buildDerivationHash(industryDisclosureRequirementKey, disclosureStatus),
    warnings: getWarnings(input, disclosureStatus),
    industryDisclosureRequirementComplete:
      input.industryDisclosureRequirementComplete === true &&
      disclosureStatus === "active" &&
      hasPrimaryReviewerAttestation(reviewerAttestation),
    advisacorRecommendedBaseline: input.advisacorRecommendedBaseline ?? false,
    customerAndAuditorDetermineApplicability:
      input.customerAndAuditorDetermineApplicability ?? false,
    customerControllerOwnsDisclosure: input.customerControllerOwnsDisclosure ?? false,
    verificationChecklistFlags: input.verificationChecklistFlags ?? [],
  };

  return {
    industryDisclosureRequirement,
    skipped: false,
    warnings: industryDisclosureRequirement.warnings,
  };
}
