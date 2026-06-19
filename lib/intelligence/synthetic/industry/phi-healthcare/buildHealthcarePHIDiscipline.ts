import { stableSnapshotHash } from "../../../core/hash";
import type {
  IndustryBaseContract,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";

export const HEALTHCARE_SUB_CLASSIFICATIONS = [
  "healthcare.acute_care_hospital",
  "healthcare.ambulatory_surgery_center",
  "healthcare.skilled_nursing_facility",
  "healthcare.physician_practice",
  "healthcare.home_health_or_hospice",
  "healthcare.other",
] as const;

export const HEALTHCARE_DATA_FLOW_IDENTIFIERS = [
  "patient_identifying_transaction_fields",
  "patient_identifying_ar_aging",
  "patient_identifying_invoice_or_claim_details",
  "aggregated_metrics_meeting_safe_harbor",
  "aggregated_metrics_meeting_expert_determination",
  "aggregated_metrics_below_minimum_cell_size",
  "statistical_analyses_on_deidentified_data",
] as const;

export const HEALTHCARE_PHI_LAUNCH_FRAMEWORKS = ["us_gaap"] as const;

export type HealthcareSubClassification = (typeof HEALTHCARE_SUB_CLASSIFICATIONS)[number];
export type HealthcareDataFlowIdentifier = (typeof HEALTHCARE_DATA_FLOW_IDENTIFIERS)[number];
export type HealthcarePhiLaunchFramework = (typeof HEALTHCARE_PHI_LAUNCH_FRAMEWORKS)[number];

export type HealthcarePhiTriggeringCharacteristic =
  | "patient_identifier_field"
  | "healthcare_claim_or_code_field"
  | "phi_declared_connector_source"
  | "free_text_phi_pattern_match"
  | "none";

export interface HealthcarePhiTriggerMappingEntry {
  healthcareDataFlow: string;
  triggeringCharacteristic: HealthcarePhiTriggeringCharacteristic;
  resultingContainsPHI: boolean;
  resultingPhiDerivationStatus: PhiDerivationStatus;
}

export interface HipaaIntegrationPoints {
  auditLoggingEventInterfaceReferenceId: string;
  breachDetectionSignalInterfaceReferenceId: string;
  baaScopeDeclarationForPhase40_5ConnectorsReferenceId: string;
  encryptionRequirementDeclarationReferenceId: string;
  hipaaCompliantAuditStoreInterfaceReferenceId: string;
}

export interface BuildHealthcarePHIDisciplineInput extends Partial<IndustryBaseContract> {
  dataFlowIdentifier?: string;
  phiTriggerMapping?: HealthcarePhiTriggerMappingEntry[];
  hipaaIntegrationPoints?: Partial<HipaaIntegrationPoints>;
  healthcarePhiDisciplineComplete?: boolean;
}

export interface SyntheticHealthcarePHIDiscipline extends IndustryBaseContract {
  healthcarePhiDisciplineId: string;
  healthcarePhiDisciplineKey: string;
  dataFlowIdentifier: string;
  consumesPhase42HDataCharacteristicTrigger: true;
  tagTriggeredByDataCharacteristicsNotIndustryLabel: true;
  phiTriggerMapping: HealthcarePhiTriggerMappingEntry[];
  neverCrossesCustomerIsolation: true;
  neverAppearsInNonHealthcareAwareRetrieval: true;
  auditTrailEntriesInheritPhiTag: true;
  routesToHipaaCompliantAuditStore: true;
  conservativeDefaultTagWhenUncertain: true;
  hipaaIntegrationPoints: HipaaIntegrationPoints;
  hipaaControlsImplementedByPhase42_5NotHere: true;
  emitsSignalsTagsDataDeclaresInterfacesOnly: true;
  healthcarePhiDisciplineComplete: boolean;
}

export interface BuildHealthcarePHIDisciplineResult {
  healthcarePhiDiscipline: SyntheticHealthcarePHIDiscipline | null;
  skipped: boolean;
  warnings: string[];
}

const DEFAULT_MAPPING_BY_FLOW: Record<HealthcareDataFlowIdentifier, HealthcarePhiTriggerMappingEntry> = {
  patient_identifying_transaction_fields: {
    healthcareDataFlow: "patient_identifying_transaction_fields",
    triggeringCharacteristic: "patient_identifier_field",
    resultingContainsPHI: true,
    resultingPhiDerivationStatus: "containsPHI",
  },
  patient_identifying_ar_aging: {
    healthcareDataFlow: "patient_identifying_ar_aging",
    triggeringCharacteristic: "patient_identifier_field",
    resultingContainsPHI: true,
    resultingPhiDerivationStatus: "containsPHI",
  },
  patient_identifying_invoice_or_claim_details: {
    healthcareDataFlow: "patient_identifying_invoice_or_claim_details",
    triggeringCharacteristic: "healthcare_claim_or_code_field",
    resultingContainsPHI: true,
    resultingPhiDerivationStatus: "containsPHI",
  },
  aggregated_metrics_meeting_safe_harbor: {
    healthcareDataFlow: "aggregated_metrics_meeting_safe_harbor",
    triggeringCharacteristic: "none",
    resultingContainsPHI: false,
    resultingPhiDerivationStatus: "derivedFromPHIThroughSafeHarbor",
  },
  aggregated_metrics_meeting_expert_determination: {
    healthcareDataFlow: "aggregated_metrics_meeting_expert_determination",
    triggeringCharacteristic: "none",
    resultingContainsPHI: false,
    resultingPhiDerivationStatus: "derivedFromPHIThroughExpertDetermination",
  },
  aggregated_metrics_below_minimum_cell_size: {
    healthcareDataFlow: "aggregated_metrics_below_minimum_cell_size",
    triggeringCharacteristic: "none",
    resultingContainsPHI: true,
    resultingPhiDerivationStatus: "containsPHI",
  },
  statistical_analyses_on_deidentified_data: {
    healthcareDataFlow: "statistical_analyses_on_deidentified_data",
    triggeringCharacteristic: "none",
    resultingContainsPHI: false,
    resultingPhiDerivationStatus: "derivedFromPHIThroughSafeHarbor",
  },
};

export const PHASE_42Q_HEALTHCARE_PHI_DISCIPLINE_BLUEPRINT: ReadonlyArray<BuildHealthcarePHIDisciplineInput> =
  HEALTHCARE_DATA_FLOW_IDENTIFIERS.flatMap((dataFlowIdentifier) =>
    HEALTHCARE_SUB_CLASSIFICATIONS.map((industrySubClassification) => ({
      dataFlowIdentifier,
      reportingFramework: "us_gaap" as HealthcarePhiLaunchFramework,
      industryClassification: "healthcare",
      industrySubClassification,
      phiTriggerMapping: [DEFAULT_MAPPING_BY_FLOW[dataFlowIdentifier]],
      hipaaIntegrationPoints: {
        auditLoggingEventInterfaceReferenceId: "",
        breachDetectionSignalInterfaceReferenceId: "",
        baaScopeDeclarationForPhase40_5ConnectorsReferenceId: "",
        encryptionRequirementDeclarationReferenceId: "",
        hipaaCompliantAuditStoreInterfaceReferenceId: "",
      },
    })),
  );

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";
const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";
const HEALTHCARE_INDUSTRY_CLASSIFICATION = "healthcare";

const PHI_DERIVATION_RESTRICTIVENESS_ORDER: readonly PhiDerivationStatus[] = [
  "containsPHI",
  "derivedFromPHIThroughExpertDetermination",
  "derivedFromPHIThroughSafeHarbor",
  "containsNoPHI",
];

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function isHealthcareDataFlow(dataFlowIdentifier: string): dataFlowIdentifier is HealthcareDataFlowIdentifier {
  return (HEALTHCARE_DATA_FLOW_IDENTIFIERS as readonly string[]).includes(dataFlowIdentifier);
}

function isHealthcareSubClassification(
  industrySubClassification: string,
): industrySubClassification is HealthcareSubClassification {
  return (HEALTHCARE_SUB_CLASSIFICATIONS as readonly string[]).includes(industrySubClassification);
}

function isHealthcarePhiLaunchFramework(
  reportingFramework: IndustryBaseContract["reportingFramework"],
): reportingFramework is HealthcarePhiLaunchFramework {
  return (HEALTHCARE_PHI_LAUNCH_FRAMEWORKS as readonly string[]).includes(reportingFramework);
}

function getMostRestrictivePhiDerivationStatus(
  ...statuses: (PhiDerivationStatus | undefined)[]
): PhiDerivationStatus {
  const presentStatuses = statuses.filter((status): status is PhiDerivationStatus => hasValue(status));

  for (const status of PHI_DERIVATION_RESTRICTIVENESS_ORDER) {
    if (presentStatuses.includes(status)) {
      return status;
    }
  }

  return DEFAULT_PHI_DERIVATION_STATUS;
}

function getPhiTriggerMapping(
  input: BuildHealthcarePHIDisciplineInput,
  dataFlowIdentifier: string,
): HealthcarePhiTriggerMappingEntry[] {
  if (input.phiTriggerMapping && input.phiTriggerMapping.length > 0) {
    return input.phiTriggerMapping;
  }

  if (isHealthcareDataFlow(dataFlowIdentifier)) {
    return [DEFAULT_MAPPING_BY_FLOW[dataFlowIdentifier]];
  }

  return [];
}

function getHipaaIntegrationPoints(input: BuildHealthcarePHIDisciplineInput): HipaaIntegrationPoints {
  return {
    auditLoggingEventInterfaceReferenceId:
      input.hipaaIntegrationPoints?.auditLoggingEventInterfaceReferenceId ?? "",
    breachDetectionSignalInterfaceReferenceId:
      input.hipaaIntegrationPoints?.breachDetectionSignalInterfaceReferenceId ?? "",
    baaScopeDeclarationForPhase40_5ConnectorsReferenceId:
      input.hipaaIntegrationPoints?.baaScopeDeclarationForPhase40_5ConnectorsReferenceId ?? "",
    encryptionRequirementDeclarationReferenceId:
      input.hipaaIntegrationPoints?.encryptionRequirementDeclarationReferenceId ?? "",
    hipaaCompliantAuditStoreInterfaceReferenceId:
      input.hipaaIntegrationPoints?.hipaaCompliantAuditStoreInterfaceReferenceId ?? "",
  };
}

function validatePhiTriggerMappingEntry(
  entry: HealthcarePhiTriggerMappingEntry,
  dataFlowIdentifier: string,
): string[] {
  const failures: string[] = [];

  if (entry.triggeringCharacteristic !== "none" && entry.resultingContainsPHI !== true) {
    failures.push(
      `mapping for ${entry.healthcareDataFlow} pairs triggering characteristic ${entry.triggeringCharacteristic} with containsPHI false`,
    );
  }

  if (entry.triggeringCharacteristic !== "none" && entry.resultingPhiDerivationStatus === "containsNoPHI") {
    failures.push(
      `mapping for ${entry.healthcareDataFlow} pairs triggering characteristic with phiDerivationStatus containsNoPHI`,
    );
  }

  if (
    (dataFlowIdentifier === "aggregated_metrics_below_minimum_cell_size" ||
      entry.healthcareDataFlow === "aggregated_metrics_below_minimum_cell_size") &&
    entry.resultingContainsPHI !== true
  ) {
    failures.push("aggregated_metrics_below_minimum_cell_size must map to containsPHI true");
  }

  return failures;
}

function validatePhiTriggerMapping(
  phiTriggerMapping: HealthcarePhiTriggerMappingEntry[],
  dataFlowIdentifier: string,
): string[] {
  if (phiTriggerMapping.length === 0) {
    return ["phiTriggerMapping is required"];
  }

  return phiTriggerMapping.flatMap((entry) => validatePhiTriggerMappingEntry(entry, dataFlowIdentifier));
}

function resolveArtifactPhiTagging(phiTriggerMapping: HealthcarePhiTriggerMappingEntry[]): {
  containsPHI: boolean;
  phiDerivationStatus: PhiDerivationStatus;
} {
  const containsPHI = phiTriggerMapping.some((entry) => entry.resultingContainsPHI === true);
  const phiDerivationStatus = getMostRestrictivePhiDerivationStatus(
    ...phiTriggerMapping.map((entry) => entry.resultingPhiDerivationStatus),
    containsPHI ? DEFAULT_PHI_DERIVATION_STATUS : "containsNoPHI",
  );

  return {
    containsPHI: containsPHI || phiDerivationStatus === "containsPHI",
    phiDerivationStatus,
  };
}

function getSharedBase(
  input: BuildHealthcarePHIDisciplineInput,
  containsPHI: boolean,
  phiDerivationStatus: PhiDerivationStatus,
): IndustryBaseContract {
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
    reportingFramework: (input.reportingFramework ?? "us_gaap") as IndustryBaseContract["reportingFramework"],
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification as string,
    industryStatus: input.industryStatus ?? "active",
    containsPHI,
    phiDerivationStatus,
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

function collectMissingRequiredIdentifiers(input: BuildHealthcarePHIDisciplineInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.dataFlowIdentifier)) {
    missing.push("dataFlowIdentifier");
  }

  if (!hasValue(input.industrySubClassification)) {
    missing.push("industrySubClassification");
  }

  if (
    hasValue(input.industryClassification) &&
    input.industryClassification !== HEALTHCARE_INDUSTRY_CLASSIFICATION
  ) {
    missing.push("industryClassification must be healthcare");
  }

  if (
    hasValue(input.industrySubClassification) &&
    !isHealthcareSubClassification(input.industrySubClassification as string)
  ) {
    missing.push("industrySubClassification must be a declared healthcare sub-classification");
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

  return missing;
}

function collectValidationFailures(
  input: BuildHealthcarePHIDisciplineInput,
  phiTriggerMapping: HealthcarePhiTriggerMappingEntry[],
): string[] {
  const failures: string[] = [];
  const dataFlowIdentifier = input.dataFlowIdentifier ?? "";

  if (input.reportingFramework && !isHealthcarePhiLaunchFramework(input.reportingFramework)) {
    failures.push("reportingFramework must be us_gaap for healthcare PHI discipline scope");
  }

  if (hasValue(dataFlowIdentifier) && !isHealthcareDataFlow(dataFlowIdentifier)) {
    failures.push(`dataFlowIdentifier ${dataFlowIdentifier} is outside declared healthcare PHI data flows`);
  }

  failures.push(...validatePhiTriggerMapping(phiTriggerMapping, dataFlowIdentifier));

  return failures;
}

function buildHealthcarePHIDisciplineKey(
  input: BuildHealthcarePHIDisciplineInput,
  phiTriggerMapping: HealthcarePhiTriggerMappingEntry[],
  hipaaIntegrationPoints: HipaaIntegrationPoints,
): string {
  return stableSnapshotHash({
    dataFlowIdentifier: input.dataFlowIdentifier ?? "",
    industryClassification: HEALTHCARE_INDUSTRY_CLASSIFICATION,
    industrySubClassification: input.industrySubClassification ?? "",
    reportingFramework: input.reportingFramework ?? "us_gaap",
    phiTriggerMapping,
    hipaaIntegrationPoints,
    consumesPhase42HDataCharacteristicTrigger: true,
    tagTriggeredByDataCharacteristicsNotIndustryLabel: true,
  });
}

function buildHealthcarePHIDisciplineId(healthcarePhiDisciplineKey: string): string {
  return `synthetic-healthcare-phi-discipline:${stableSnapshotHash({
    healthcarePhiDisciplineKey,
    artifactType: "SyntheticHealthcarePHIDiscipline",
  })}`;
}

function buildDerivationHash(healthcarePhiDisciplineKey: string): string {
  return stableSnapshotHash({
    healthcarePhiDisciplineKey,
    consumesPhase42HDataCharacteristicTrigger: true,
    tagTriggeredByDataCharacteristicsNotIndustryLabel: true,
    neverCrossesCustomerIsolation: true,
    neverAppearsInNonHealthcareAwareRetrieval: true,
    auditTrailEntriesInheritPhiTag: true,
    routesToHipaaCompliantAuditStore: true,
    conservativeDefaultTagWhenUncertain: true,
    hipaaControlsImplementedByPhase42_5NotHere: true,
    emitsSignalsTagsDataDeclaresInterfacesOnly: true,
  });
}

function getWarnings(
  input: BuildHealthcarePHIDisciplineInput,
  phiTriggerMapping: HealthcarePhiTriggerMappingEntry[],
  hipaaIntegrationPoints: HipaaIntegrationPoints,
  validationFailures: string[],
): string[] {
  const dataFlowIdentifier = input.dataFlowIdentifier ?? "";

  return [
    ...getInputArray(input.warnings),
    ...validationFailures.map((failure) => `healthcare PHI discipline failed closed: ${failure}`),
    ...(!isHealthcareDataFlow(dataFlowIdentifier)
      ? [`dataFlowIdentifier ${dataFlowIdentifier} is outside declared healthcare PHI data flows`]
      : []),
    ...(dataFlowIdentifier === "statistical_analyses_on_deidentified_data"
      ? ["statistical_analyses_on_deidentified_data inherits source phiDerivationStatus unless re-attested"]
      : []),
    ...(dataFlowIdentifier === "aggregated_metrics_below_minimum_cell_size"
      ? ["aggregated_metrics_below_minimum_cell_size remains containsPHI true regardless of aggregation level"]
      : []),
    ...(!hasValue(hipaaIntegrationPoints.auditLoggingEventInterfaceReferenceId)
      ? ["auditLoggingEventInterfaceReferenceId declares the Phase 42.5 audit logging event interface"]
      : []),
    ...(!hasValue(hipaaIntegrationPoints.breachDetectionSignalInterfaceReferenceId)
      ? ["breachDetectionSignalInterfaceReferenceId declares the Phase 42.5 breach detection signal interface"]
      : []),
    ...(!hasValue(hipaaIntegrationPoints.baaScopeDeclarationForPhase40_5ConnectorsReferenceId)
      ? ["baaScopeDeclarationForPhase40_5ConnectorsReferenceId declares BAA scope for Phase 40.5 connectors that may receive PHI"]
      : []),
    ...(!hasValue(hipaaIntegrationPoints.encryptionRequirementDeclarationReferenceId)
      ? ["encryptionRequirementDeclarationReferenceId declares encryption requirements for Phase 42.5"]
      : []),
    ...(!hasValue(hipaaIntegrationPoints.hipaaCompliantAuditStoreInterfaceReferenceId)
      ? ["hipaaCompliantAuditStoreInterfaceReferenceId declares the HIPAA-compliant audit store interface for Phase 42.5"]
      : []),
    "consumes Phase 42H data-characteristic trigger discipline; PHI tagging is never driven by healthcare industry label alone",
    "HIPAA controls (encryption, access, breach detection, BAA management, audit store) are implemented by Phase 42.5, not here",
    "metadata-only healthcare PHI discipline; performs no live PHI detection and implements no HIPAA control — detection accuracy and segregation under real healthcare data are on the real-data test register",
    ...phiTriggerMapping.map(
      (entry) =>
        `phiTriggerMapping: ${entry.healthcareDataFlow} → ${entry.triggeringCharacteristic} → containsPHI ${entry.resultingContainsPHI}, ${entry.resultingPhiDerivationStatus}`,
    ),
  ];
}

export function buildHealthcarePHIDiscipline(
  input: BuildHealthcarePHIDisciplineInput,
): BuildHealthcarePHIDisciplineResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      healthcarePhiDiscipline: null,
      skipped: true,
      warnings: [
        `missing required healthcare PHI discipline identifiers: ${missingRequiredIdentifiers.join(", ")}`,
      ],
    };
  }

  const dataFlowIdentifier = input.dataFlowIdentifier as string;
  const phiTriggerMapping = getPhiTriggerMapping(input, dataFlowIdentifier);
  const validationFailures = collectValidationFailures(input, phiTriggerMapping);

  if (validationFailures.length > 0) {
    return {
      healthcarePhiDiscipline: null,
      skipped: true,
      warnings: getWarnings(
        input,
        phiTriggerMapping,
        getHipaaIntegrationPoints(input),
        validationFailures,
      ),
    };
  }

  const hipaaIntegrationPoints = getHipaaIntegrationPoints(input);
  const { containsPHI, phiDerivationStatus } = resolveArtifactPhiTagging(phiTriggerMapping);
  const healthcarePhiDisciplineKey = buildHealthcarePHIDisciplineKey(
    input,
    phiTriggerMapping,
    hipaaIntegrationPoints,
  );
  const base = getSharedBase(input, containsPHI, phiDerivationStatus);
  const healthcarePhiDiscipline: SyntheticHealthcarePHIDiscipline = {
    ...base,
    healthcarePhiDisciplineId: buildHealthcarePHIDisciplineId(healthcarePhiDisciplineKey),
    healthcarePhiDisciplineKey,
    dataFlowIdentifier,
    consumesPhase42HDataCharacteristicTrigger: true,
    tagTriggeredByDataCharacteristicsNotIndustryLabel: true,
    phiTriggerMapping,
    neverCrossesCustomerIsolation: true,
    neverAppearsInNonHealthcareAwareRetrieval: true,
    auditTrailEntriesInheritPhiTag: true,
    routesToHipaaCompliantAuditStore: true,
    conservativeDefaultTagWhenUncertain: true,
    hipaaIntegrationPoints,
    hipaaControlsImplementedByPhase42_5NotHere: true,
    emitsSignalsTagsDataDeclaresInterfacesOnly: true,
    executable: false,
    derivationHash: buildDerivationHash(healthcarePhiDisciplineKey),
    warnings: getWarnings(input, phiTriggerMapping, hipaaIntegrationPoints, []),
    healthcarePhiDisciplineComplete: input.healthcarePhiDisciplineComplete === true,
  };

  return {
    healthcarePhiDiscipline,
    skipped: false,
    warnings: healthcarePhiDiscipline.warnings,
  };
}
