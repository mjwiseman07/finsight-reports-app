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
  HEALTHCARE_BENCHMARK_BASELINE_IDENTIFIER_ORDER,
  getHealthcareBenchmarkBaselineRecord,
  getHealthcareBenchmarkLibraryHeaderContent,
  type HealthcareBenchmarkBaselineIdentifier,
  type HealthcareBenchmarkCitationFlag,
  type HealthcareBenchmarkRangeBySubClassification,
} from "./loadHealthcareBenchmarkBaseline";

export const PHASE_42P_HEALTHCARE_BENCHMARK_LIBRARY_HEADER =
  getHealthcareBenchmarkLibraryHeaderContent();

export type HealthcareReasonablenessBenchmarkModuleType = "reasonableness_benchmark";
export type HealthcareReasonablenessBenchmarkStatus = IndustryTreatmentStatus;

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

const HEALTHCARE_REASONABLENESS_BENCHMARK_BASELINE_DEFAULTS = {
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
  benchmarkStatus: "in_review",
  advisacorRecommendedBaseline: true,
  customerCalibratesToEntityContext: true,
  customerControllerInterpretsOutOfRange: true,
  benchmarkNotTarget: true,
  feedsHumanReviewFlaggingOnly: true,
  notPassFailThreshold: true,
  surfacesForHumanInterpretation: true,
  neverAutoScores: true,
  neverAutoFails: true,
  priorVersionReferenceId: "",
  industryReasonablenessBenchmarkComplete: false,
} as const satisfies Partial<BuildHealthcareReasonablenessBenchmarkInput>;

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

function buildHealthcareReasonablenessBenchmarkBaselineInput(
  benchmarkIdentifier: HealthcareBenchmarkBaselineIdentifier,
): BuildHealthcareReasonablenessBenchmarkInput {
  const baselineRecord = getHealthcareBenchmarkBaselineRecord(benchmarkIdentifier);

  return {
    ...HEALTHCARE_REASONABLENESS_BENCHMARK_BASELINE_DEFAULTS,
    moduleType: "reasonableness_benchmark",
    benchmarkIdentifier,
    benchmarkNumber: baselineRecord.benchmarkNumber,
    linksToKpiIdentifier: baselineRecord.linksToKpiIdentifier,
    benchmarkAuthored: baselineRecord.benchmarkAuthored,
    cautionNote: baselineRecord.cautionNote,
    rangesBySubClassification: baselineRecord.rangesBySubClassification,
    rangesSectionAuthored: baselineRecord.rangesSectionAuthored,
    sources: baselineRecord.sources,
    dataYear: baselineRecord.dataYear,
    citationFlag: baselineRecord.citationFlag,
    verificationChecklistFlags: baselineRecord.verificationChecklistFlags,
    reviewerAttestation: buildBlankReviewerAttestation(),
  };
}

export interface BuildHealthcareReasonablenessBenchmarkInput extends Partial<IndustryBaseContract> {
  moduleType?: HealthcareReasonablenessBenchmarkModuleType;
  benchmarkIdentifier?: string;
  benchmarkNumber?: number;
  linksToKpiIdentifier?: string;
  benchmarkAuthored?: string;
  cautionNote?: string;
  rangesBySubClassification?: HealthcareBenchmarkRangeBySubClassification[];
  rangesSectionAuthored?: string;
  sources?: string;
  dataYear?: string;
  citationFlag?: HealthcareBenchmarkCitationFlag;
  reviewerAttestation?: ReviewerAttestation;
  version?: string;
  effectiveFromDate?: string;
  deprecatedFromDate?: string;
  benchmarkStatus?: HealthcareReasonablenessBenchmarkStatus;
  priorVersionReferenceId?: string;
  industryReasonablenessBenchmarkComplete?: boolean;
  verificationChecklistFlags?: string[];
  advisacorRecommendedBaseline?: boolean;
  customerCalibratesToEntityContext?: boolean;
  customerControllerInterpretsOutOfRange?: boolean;
  benchmarkNotTarget?: true;
  feedsHumanReviewFlaggingOnly?: true;
  notPassFailThreshold?: true;
  surfacesForHumanInterpretation?: true;
  neverAutoScores?: true;
  neverAutoFails?: true;
}

export interface SyntheticHealthcareReasonablenessBenchmark extends IndustryBaseContract {
  moduleType: HealthcareReasonablenessBenchmarkModuleType;
  industryReasonablenessBenchmarkId: string;
  industryReasonablenessBenchmarkKey: string;
  benchmarkIdentifier: string;
  benchmarkNumber: number;
  linksToKpiIdentifier: string;
  benchmarkAuthored: string;
  cautionNote: string;
  rangesBySubClassification: HealthcareBenchmarkRangeBySubClassification[];
  rangesSectionAuthored: string;
  sources: string;
  dataYear: string;
  citationFlag: HealthcareBenchmarkCitationFlag;
  containsCopyrightedText: false;
  reviewerAttestation: ReviewerAttestation;
  isReferenceNotScoring: true;
  builderNeverAuthorsContent: true;
  appendOnlyHistory: true;
  version: string;
  effectiveFromDate: string;
  deprecatedFromDate?: string;
  benchmarkStatus: HealthcareReasonablenessBenchmarkStatus;
  activeRequiresAttestation: true;
  launchScope: "path_b";
  executable: false;
  industryReasonablenessBenchmarkComplete: boolean;
  advisacorRecommendedBaseline: boolean;
  customerCalibratesToEntityContext: boolean;
  customerControllerInterpretsOutOfRange: boolean;
  benchmarkNotTarget: true;
  feedsHumanReviewFlaggingOnly: true;
  notPassFailThreshold: true;
  surfacesForHumanInterpretation: true;
  neverAutoScores: true;
  neverAutoFails: true;
  verificationChecklistFlags: string[];
}

export interface BuildHealthcareReasonablenessBenchmarkResult {
  industryReasonablenessBenchmark: SyntheticHealthcareReasonablenessBenchmark | null;
  skipped: boolean;
  warnings: string[];
}

export const PHASE_42P_HEALTHCARE_REASONABLENESS_BENCHMARK_BLUEPRINT: ReadonlyArray<BuildHealthcareReasonablenessBenchmarkInput> =
  HEALTHCARE_BENCHMARK_BASELINE_IDENTIFIER_ORDER.map((benchmarkIdentifier) =>
    buildHealthcareReasonablenessBenchmarkBaselineInput(benchmarkIdentifier),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const HEALTHCARE_INDUSTRY_CLASSIFICATION = "healthcare";
const HEALTHCARE_REASONABLENESS_BENCHMARK_MODULE_TYPE: HealthcareReasonablenessBenchmarkModuleType =
  "reasonableness_benchmark";
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

function isHealthcareBenchmarkBaselineIdentifier(
  benchmarkIdentifier: string,
): benchmarkIdentifier is HealthcareBenchmarkBaselineIdentifier {
  return (HEALTHCARE_BENCHMARK_BASELINE_IDENTIFIER_ORDER as readonly string[]).includes(
    benchmarkIdentifier,
  );
}

function getReviewerAttestation(input: BuildHealthcareReasonablenessBenchmarkInput): ReviewerAttestation {
  return input.reviewerAttestation ?? buildBlankReviewerAttestation();
}

function hasPrimaryReviewerAttestation(reviewerAttestation: ReviewerAttestation): boolean {
  return (
    hasValue(reviewerAttestation.primaryReviewer.identity) &&
    hasValue(reviewerAttestation.primaryReviewer.reviewDate)
  );
}

function getBenchmarkStatus(
  input: BuildHealthcareReasonablenessBenchmarkInput,
  reviewerAttestation: ReviewerAttestation,
): HealthcareReasonablenessBenchmarkStatus {
  const requestedStatus = input.benchmarkStatus ?? "draft";

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

function getSharedBase(input: BuildHealthcareReasonablenessBenchmarkInput): IndustryBaseContract {
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

function collectMissingRequiredIdentifiers(input: BuildHealthcareReasonablenessBenchmarkInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.benchmarkIdentifier)) {
    missing.push("benchmarkIdentifier");
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

  if (input.benchmarkNumber === undefined || input.benchmarkNumber === null) {
    missing.push("benchmarkNumber");
  }

  if (!hasValue(input.linksToKpiIdentifier)) {
    missing.push("linksToKpiIdentifier");
  }

  if (!hasValue(input.cautionNote)) {
    missing.push("cautionNote");
  }

  if (!input.rangesBySubClassification || input.rangesBySubClassification.length === 0) {
    if (!hasValue(input.rangesSectionAuthored)) {
      missing.push("rangesBySubClassification or rangesSectionAuthored");
    }
  }

  if (!hasValue(input.sources)) {
    missing.push("sources");
  }

  if (!hasValue(input.dataYear)) {
    missing.push("dataYear");
  }

  if (!input.citationFlag) {
    missing.push("citationFlag");
  }

  if (input.moduleType && input.moduleType !== HEALTHCARE_REASONABLENESS_BENCHMARK_MODULE_TYPE) {
    missing.push("moduleType must be reasonableness_benchmark");
  }

  if (input.benchmarkNotTarget !== true) {
    missing.push("benchmarkNotTarget must be true");
  }

  if (input.feedsHumanReviewFlaggingOnly !== true) {
    missing.push("feedsHumanReviewFlaggingOnly must be true");
  }

  if (input.notPassFailThreshold !== true) {
    missing.push("notPassFailThreshold must be true");
  }

  if (input.surfacesForHumanInterpretation !== true) {
    missing.push("surfacesForHumanInterpretation must be true");
  }

  if (input.neverAutoScores !== true) {
    missing.push("neverAutoScores must be true");
  }

  if (input.neverAutoFails !== true) {
    missing.push("neverAutoFails must be true");
  }

  return missing;
}

function buildHealthcareReasonablenessBenchmarkKey(
  input: BuildHealthcareReasonablenessBenchmarkInput,
  benchmarkStatus: HealthcareReasonablenessBenchmarkStatus,
  reviewerAttestation: ReviewerAttestation,
): string {
  return stableSnapshotHash({
    moduleType: HEALTHCARE_REASONABLENESS_BENCHMARK_MODULE_TYPE,
    benchmarkIdentifier: input.benchmarkIdentifier ?? "",
    benchmarkNumber: input.benchmarkNumber ?? 0,
    linksToKpiIdentifier: input.linksToKpiIdentifier ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "",
    dataYear: input.dataYear ?? "",
    version: input.version ?? "",
    effectiveFromDate: input.effectiveFromDate ?? "",
    benchmarkStatus,
    priorVersionReferenceId: input.priorVersionReferenceId ?? "",
    primaryReviewerIdentity: reviewerAttestation.primaryReviewer.identity,
    primaryReviewerReviewDate: reviewerAttestation.primaryReviewer.reviewDate,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
  });
}

function buildHealthcareReasonablenessBenchmarkId(
  industryReasonablenessBenchmarkKey: string,
): string {
  return `synthetic-healthcare-reasonableness-benchmark:${stableSnapshotHash({
    industryReasonablenessBenchmarkKey,
    artifactType: "SyntheticHealthcareReasonablenessBenchmark",
  })}`;
}

function buildDerivationHash(
  industryReasonablenessBenchmarkKey: string,
  benchmarkStatus: HealthcareReasonablenessBenchmarkStatus,
): string {
  return stableSnapshotHash({
    industryReasonablenessBenchmarkKey,
    moduleType: HEALTHCARE_REASONABLENESS_BENCHMARK_MODULE_TYPE,
    activeRequiresAttestation: true,
    builderNeverAuthorsContent: true,
    isReferenceNotScoring: true,
    containsCopyrightedText: false,
    appendOnlyHistory: true,
    benchmarkNotTarget: true,
    feedsHumanReviewFlaggingOnly: true,
    notPassFailThreshold: true,
    surfacesForHumanInterpretation: true,
    neverAutoScores: true,
    neverAutoFails: true,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
    benchmarkStatus,
  });
}

function getWarnings(
  input: BuildHealthcareReasonablenessBenchmarkInput,
  benchmarkStatus: HealthcareReasonablenessBenchmarkStatus,
): string[] {
  const benchmarkIdentifier = input.benchmarkIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...(input.benchmarkStatus === "active" && benchmarkStatus === "in_review"
      ? [
          "benchmark marked active without primary reviewer identity and reviewDate; forced to in_review",
        ]
      : []),
    ...(!hasValue(input.benchmarkAuthored)
      ? ["benchmarkAuthored is human-authored input; draft structure retained until benchmark content is supplied"]
      : []),
    ...(!isHealthcareBenchmarkBaselineIdentifier(benchmarkIdentifier)
      ? [`benchmarkIdentifier ${benchmarkIdentifier} is outside the healthcare benchmark baseline library`]
      : []),
    ...(input.advisacorRecommendedBaseline
      ? [
          "advisacor recommended benchmark remains in_review on Advisacor side; customer controller calibrates and interprets out-of-range results at implementation",
        ]
      : []),
    ...(hasValue(input.cautionNote)
      ? ["cautionNote must travel with every surfaced range; never display a range without its caveat"]
      : []),
    ...(benchmarkStatus !== "active"
      ? ["benchmark remains draft or in_review until primary reviewer attestation is complete"]
      : []),
    "metadata-only healthcare reasonableness benchmark reference library; builder never authors content and performs no flagging, scoring, or comparison — out-of-range surfaces for human review only",
  ];
}

export function buildHealthcareReasonablenessBenchmark(
  input: BuildHealthcareReasonablenessBenchmarkInput,
): BuildHealthcareReasonablenessBenchmarkResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      industryReasonablenessBenchmark: null,
      skipped: true,
      warnings: [
        `missing required healthcare reasonableness benchmark identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const requiredBenchmarkIdentifier = input.benchmarkIdentifier as string;
  const requiredVersion = input.version as string;
  const requiredEffectiveFromDate = input.effectiveFromDate as string;
  const reviewerAttestation = getReviewerAttestation(input);
  const benchmarkStatus = getBenchmarkStatus(input, reviewerAttestation);
  const industryReasonablenessBenchmarkKey = buildHealthcareReasonablenessBenchmarkKey(
    input,
    benchmarkStatus,
    reviewerAttestation,
  );
  const base = getSharedBase(input);
  const industryReasonablenessBenchmark: SyntheticHealthcareReasonablenessBenchmark = {
    ...base,
    moduleType: HEALTHCARE_REASONABLENESS_BENCHMARK_MODULE_TYPE,
    industryReasonablenessBenchmarkId: buildHealthcareReasonablenessBenchmarkId(
      industryReasonablenessBenchmarkKey,
    ),
    industryReasonablenessBenchmarkKey,
    benchmarkIdentifier: requiredBenchmarkIdentifier,
    benchmarkNumber: input.benchmarkNumber as number,
    linksToKpiIdentifier: input.linksToKpiIdentifier as string,
    benchmarkAuthored: input.benchmarkAuthored ?? "",
    cautionNote: input.cautionNote as string,
    rangesBySubClassification: input.rangesBySubClassification ?? [],
    rangesSectionAuthored: input.rangesSectionAuthored ?? "",
    sources: input.sources as string,
    dataYear: input.dataYear as string,
    citationFlag: input.citationFlag as HealthcareBenchmarkCitationFlag,
    containsCopyrightedText: false,
    reviewerAttestation,
    isReferenceNotScoring: true,
    builderNeverAuthorsContent: true,
    appendOnlyHistory: true,
    version: requiredVersion,
    effectiveFromDate: requiredEffectiveFromDate,
    deprecatedFromDate: input.deprecatedFromDate,
    benchmarkStatus,
    activeRequiresAttestation: true,
    launchScope: HEALTHCARE_BASELINE_LAUNCH_SCOPE,
    executable: false,
    derivationHash: buildDerivationHash(industryReasonablenessBenchmarkKey, benchmarkStatus),
    warnings: getWarnings(input, benchmarkStatus),
    industryReasonablenessBenchmarkComplete:
      input.industryReasonablenessBenchmarkComplete === true &&
      benchmarkStatus === "active" &&
      hasPrimaryReviewerAttestation(reviewerAttestation),
    advisacorRecommendedBaseline: input.advisacorRecommendedBaseline ?? false,
    customerCalibratesToEntityContext: input.customerCalibratesToEntityContext ?? false,
    customerControllerInterpretsOutOfRange: input.customerControllerInterpretsOutOfRange ?? false,
    benchmarkNotTarget: true,
    feedsHumanReviewFlaggingOnly: true,
    notPassFailThreshold: true,
    surfacesForHumanInterpretation: true,
    neverAutoScores: true,
    neverAutoFails: true,
    verificationChecklistFlags: input.verificationChecklistFlags ?? [],
  };

  return {
    industryReasonablenessBenchmark,
    skipped: false,
    warnings: industryReasonablenessBenchmark.warnings,
  };
}
