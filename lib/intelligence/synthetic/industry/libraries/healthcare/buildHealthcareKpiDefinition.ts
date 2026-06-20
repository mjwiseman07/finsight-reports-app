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
  HEALTHCARE_KPI_BASELINE_IDENTIFIER_ORDER,
  getHealthcareKpiBaselineRecord,
  getHealthcareKpiLibraryHeaderContent,
  type HealthcareKpiBaselineIdentifier,
  type HealthcareKpiCitationFlag,
  type HealthcareKpiDomain,
  type HealthcareKpiStandardVsVariable,
  type HealthcareKpiSubTypeApplicabilityMatrix,
} from "./loadHealthcareKpiBaseline";

export const PHASE_42N1_HEALTHCARE_KPI_LIBRARY_HEADER = getHealthcareKpiLibraryHeaderContent();

export type HealthcareKpiDefinitionModuleType = "kpi_definition";
export type HealthcareKpiDefinitionStatus = IndustryTreatmentStatus;

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

const HEALTHCARE_KPI_DEFINITION_BASELINE_DEFAULTS = {
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
  kpiStatus: "in_review",
  advisacorRecommendedBaseline: true,
  customerConfirmsDefinitionAtImplementation: true,
  customerControllerOwnsAppliedDefinition: true,
  priorVersionReferenceId: "",
  industryKpiDefinitionComplete: false,
} as const satisfies Partial<BuildHealthcareKpiDefinitionInput>;

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

function buildHealthcareKpiDefinitionBaselineInput(
  kpiIdentifier: HealthcareKpiBaselineIdentifier,
): BuildHealthcareKpiDefinitionInput {
  const baselineRecord = getHealthcareKpiBaselineRecord(kpiIdentifier);

  return {
    ...HEALTHCARE_KPI_DEFINITION_BASELINE_DEFAULTS,
    moduleType: "kpi_definition",
    kpiIdentifier,
    kpiNumber: baselineRecord.kpiNumber,
    domain: baselineRecord.domain,
    kpiDefinitionAuthored: baselineRecord.kpiDefinitionAuthored,
    subTypeApplicability: baselineRecord.subTypeApplicability,
    standardVsVariable: baselineRecord.standardVsVariable,
    hospitalVariantCompetingDefinitions: baselineRecord.hospitalVariantCompetingDefinitions,
    competingDefinitionsSurfaced: baselineRecord.competingDefinitionsSurfaced,
    citationFlag: baselineRecord.citationFlag,
    verificationChecklistFlags: baselineRecord.verificationChecklistFlags,
    reviewerAttestation: buildBlankReviewerAttestation(),
  };
}

export interface BuildHealthcareKpiDefinitionInput extends Partial<IndustryBaseContract> {
  moduleType?: HealthcareKpiDefinitionModuleType;
  kpiIdentifier?: string;
  kpiNumber?: number;
  domain?: HealthcareKpiDomain;
  kpiDefinitionAuthored?: string;
  subTypeApplicability?: HealthcareKpiSubTypeApplicabilityMatrix;
  standardVsVariable?: HealthcareKpiStandardVsVariable;
  hospitalVariantCompetingDefinitions?: boolean;
  competingDefinitionsSurfaced?: boolean;
  citationFlag?: HealthcareKpiCitationFlag;
  reviewerAttestation?: ReviewerAttestation;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  kpiStatus?: HealthcareKpiDefinitionStatus;
  priorVersionReferenceId?: string;
  industryKpiDefinitionComplete?: boolean;
  verificationChecklistFlags?: string[];
  advisacorRecommendedBaseline?: boolean;
  customerConfirmsDefinitionAtImplementation?: boolean;
  customerControllerOwnsAppliedDefinition?: boolean;
}

export interface SyntheticHealthcareKpiDefinition extends IndustryBaseContract {
  moduleType: HealthcareKpiDefinitionModuleType;
  industryKpiDefinitionId: string;
  industryKpiDefinitionKey: string;
  kpiIdentifier: string;
  kpiNumber: number;
  domain: HealthcareKpiDomain;
  kpiDefinitionAuthored: string;
  subTypeApplicability: HealthcareKpiSubTypeApplicabilityMatrix;
  standardVsVariable: HealthcareKpiStandardVsVariable;
  hospitalVariantCompetingDefinitions: boolean;
  competingDefinitionsSurfaced: boolean;
  citationFlag: HealthcareKpiCitationFlag;
  containsCopyrightedText: false;
  reviewerAttestation: ReviewerAttestation;
  isDefinitionNotComputation: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  kpiStatus: HealthcareKpiDefinitionStatus;
  activeRequiresAttestation: true;
  launchScope: "path_b";
  executable: false;
  industryKpiDefinitionComplete: boolean;
  advisacorRecommendedBaseline: boolean;
  customerConfirmsDefinitionAtImplementation: boolean;
  customerControllerOwnsAppliedDefinition: boolean;
  verificationChecklistFlags: string[];
}

export interface BuildHealthcareKpiDefinitionResult {
  industryKpiDefinition: SyntheticHealthcareKpiDefinition | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42N1_HEALTHCARE_KPI_DEFINITION_BLUEPRINT: ReadonlyArray<BuildHealthcareKpiDefinitionInput> =
  HEALTHCARE_KPI_BASELINE_IDENTIFIER_ORDER.map((kpiIdentifier) =>
    buildHealthcareKpiDefinitionBaselineInput(kpiIdentifier),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const HEALTHCARE_INDUSTRY_CLASSIFICATION = "healthcare";
const HEALTHCARE_KPI_DEFINITION_MODULE_TYPE: HealthcareKpiDefinitionModuleType = "kpi_definition";
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

function isHealthcareKpiBaselineIdentifier(
  kpiIdentifier: string,
): kpiIdentifier is HealthcareKpiBaselineIdentifier {
  return (HEALTHCARE_KPI_BASELINE_IDENTIFIER_ORDER as readonly string[]).includes(kpiIdentifier);
}

function getReviewerAttestation(input: BuildHealthcareKpiDefinitionInput): ReviewerAttestation {
  return input.reviewerAttestation ?? buildBlankReviewerAttestation();
}

function hasPrimaryReviewerAttestation(reviewerAttestation: ReviewerAttestation): boolean {
  return (
    hasValue(reviewerAttestation.primaryReviewer.identity) &&
    hasValue(reviewerAttestation.primaryReviewer.reviewDate)
  );
}

function getKpiStatus(
  input: BuildHealthcareKpiDefinitionInput,
  reviewerAttestation: ReviewerAttestation,
): HealthcareKpiDefinitionStatus {
  const requestedStatus = input.kpiStatus ?? "draft";

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

function getSharedBase(input: BuildHealthcareKpiDefinitionInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildHealthcareKpiDefinitionInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.kpiIdentifier)) {
    missing.push("kpiIdentifier");
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

  if (!input.domain) {
    missing.push("domain");
  }

  if (input.kpiNumber === undefined || input.kpiNumber === null) {
    missing.push("kpiNumber");
  }

  if (!input.subTypeApplicability) {
    missing.push("subTypeApplicability");
  }

  if (!input.standardVsVariable) {
    missing.push("standardVsVariable");
  }

  if (!input.citationFlag) {
    missing.push("citationFlag");
  }

  if (input.moduleType && input.moduleType !== HEALTHCARE_KPI_DEFINITION_MODULE_TYPE) {
    missing.push("moduleType must be kpi_definition");
  }

  return missing;
}

function buildHealthcareKpiDefinitionKey(
  input: BuildHealthcareKpiDefinitionInput,
  kpiStatus: HealthcareKpiDefinitionStatus,
  reviewerAttestation: ReviewerAttestation,
): string {
  return stableSnapshotHash({
    moduleType: HEALTHCARE_KPI_DEFINITION_MODULE_TYPE,
    kpiIdentifier: input.kpiIdentifier ?? "",
    kpiNumber: input.kpiNumber ?? 0,
    domain: input.domain ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "",
    standardVsVariable: input.standardVsVariable ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    kpiStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    citationReference: input.citationFlag?.citationReference ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
  });
}

function buildHealthcareKpiDefinitionId(industryKpiDefinitionKey: string): string {
  return `synthetic-healthcare-kpi-definition:${stableSnapshotHash({
    industryKpiDefinitionKey,
    artifactType: "SyntheticHealthcareKpiDefinition",
  })}`;
}

function buildDerivationHash(
  industryKpiDefinitionKey: string,
  kpiStatus: HealthcareKpiDefinitionStatus,
): string {
  return stableSnapshotHash({
    industryKpiDefinitionKey,
    moduleType: HEALTHCARE_KPI_DEFINITION_MODULE_TYPE,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    isDefinitionNotComputation: true,
    containsCopyrightedText: false,
    appendOnlyHistory: true,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
    kpiStatus,
  });
}

function getWarnings(
  input: BuildHealthcareKpiDefinitionInput,
  kpiStatus: HealthcareKpiDefinitionStatus,
  reviewerAttestation: ReviewerAttestation,
): string[] {
  const kpiIdentifier = input.kpiIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...(input.kpiStatus === "active" && kpiStatus === "in_review"
      ? ["KPI definition marked active without primary reviewer identity and reviewDate; forced to in_review"]
      : []),
    ...(!hasValue(input.kpiDefinitionAuthored)
      ? ["kpiDefinitionAuthored is human-authored input; draft structure retained until definition content is supplied"]
      : []),
    ...(!isHealthcareKpiBaselineIdentifier(kpiIdentifier)
      ? [`kpiIdentifier ${kpiIdentifier} is outside the healthcare KPI baseline library`]
      : []),
    ...(input.competingDefinitionsSurfaced
      ? ["competing industry definitions are surfaced verbatim; customer selects applicable formula at implementation"]
      : []),
    ...(input.hospitalVariantCompetingDefinitions
      ? ["hospital-setting gross collection rate variant competes with MGMA physician-practice standardized definition"]
      : []),
    ...(input.advisacorRecommendedBaseline
      ? [
          "advisacor recommended KPI definition remains in_review on Advisacor side; customer controller confirms at implementation",
        ]
      : []),
    ...(kpiStatus !== "active"
      ? ["KPI definition remains draft or in_review until primary reviewer attestation is complete"]
      : []),
    "metadata-only healthcare KPI definition library structure; builder never authors content and computes no metric values — healthcare-KPI-cell-size guard applies at computation/output time, not definition-load time",
  ];
}

export function buildHealthcareKpiDefinition(
  input: BuildHealthcareKpiDefinitionInput,
): BuildHealthcareKpiDefinitionResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryKpiDefinition: null,
      skipped: true,
      warnings: [
        `missing required healthcare KPI definition identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredKpiIdentifier = input.kpiIdentifier as string;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const reviewerAttestation = getReviewerAttestation(input);
  const kpiStatus = getKpiStatus(input, reviewerAttestation);
  const industryKpiDefinitionKey = buildHealthcareKpiDefinitionKey(
    input,
    kpiStatus,
    reviewerAttestation,
  );
  const base = getSharedBase(input);
  const industryKpiDefinition: SyntheticHealthcareKpiDefinition = {
    ...base,
    moduleType: HEALTHCARE_KPI_DEFINITION_MODULE_TYPE,
    industryKpiDefinitionId: buildHealthcareKpiDefinitionId(industryKpiDefinitionKey),
    industryKpiDefinitionKey,
    kpiIdentifier: requiredKpiIdentifier,
    kpiNumber: input.kpiNumber as number,
    domain: input.domain as HealthcareKpiDomain,
    kpiDefinitionAuthored: input.kpiDefinitionAuthored ?? "",
    subTypeApplicability: input.subTypeApplicability as HealthcareKpiSubTypeApplicabilityMatrix,
    standardVsVariable: input.standardVsVariable as HealthcareKpiStandardVsVariable,
    hospitalVariantCompetingDefinitions: input.hospitalVariantCompetingDefinitions === true,
    competingDefinitionsSurfaced: input.competingDefinitionsSurfaced === true,
    citationFlag: input.citationFlag as HealthcareKpiCitationFlag,
    containsCopyrightedText: false,
    reviewerAttestation,
    isDefinitionNotComputation: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    deprecatedFromDate: input.deprecatedFromDate,
    kpiStatus,
    activeRequiresAttestation: true,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
    executable: false,
    derivationHash: buildDerivationHash(industryKpiDefinitionKey, kpiStatus),
    warnings: getWarnings(input, kpiStatus, reviewerAttestation),
    industryKpiDefinitionComplete:
      input.industryKpiDefinitionComplete === true &&
      kpiStatus === "active" &&
      hasPrimaryReviewerAttestation(reviewerAttestation),
    advisacorRecommendedBaseline: input.advisacorRecommendedBaseline ?? false,
    customerConfirmsDefinitionAtImplementation:
      input.customerConfirmsDefinitionAtImplementation ?? false,
    customerControllerOwnsAppliedDefinition:
      input.customerControllerOwnsAppliedDefinition ?? false,
    verificationChecklistFlags: input.verificationChecklistFlags ?? [],
  };

  return {
    industryKpiDefinition,
    skipped: false,
    warnings: industryKpiDefinition.warnings,
  };
}
