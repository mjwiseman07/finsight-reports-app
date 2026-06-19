import { stableSnapshotHash } from "../../../core/hash";
import type {
  IndustryBaseContract,
  PhiDerivationStatus,
  RecommendationOutputClassification,
} from "../contracts";

export type PhiTriggeringCharacteristic =
  | "patient_identifier_field"
  | "healthcare_claim_or_code_field"
  | "phi_declared_connector_source"
  | "free_text_phi_pattern_match"
  | "none";

export interface PhiDerivedLearningBrightLine {
  mayEnterOwnCustomerScopedLearning: true;
  mayNotEnterCrossCustomerSharedIntelligence: true;
  crossCustomerRequiresExpertDeterminationDeidentification: true;
  safeHarborIsDefaultPath: true;
  aggregatesBelowMinimumCellSizeNotAutoDeidentified: true;
}

export interface BuildPHITagInput extends Partial<IndustryBaseContract> {
  artifactReferenceId?: string;
  triggeringCharacteristics?: PhiTriggeringCharacteristic[];
  redactionMetadataReferenceId?: string;
  hipaaCompliantAuditStoreInterfaceReferenceId?: string;
  minimumCellSizeThresholdApplies?: boolean;
  phiTagComplete?: boolean;
}

export interface SyntheticPHITag extends IndustryBaseContract {
  phiTagId: string;
  phiTagKey: string;
  artifactReferenceId: string;
  taggedAtCreationNotRetroactively: true;
  triggeredByDataCharacteristicsNotIndustryLabelAlone: true;
  triggeringCharacteristics: PhiTriggeringCharacteristic[];
  industryClassificationDoesNotControlPhiTagging: true;
  industryControlsTreatmentSelectionNotPhiTagging: true;
  genericClassifiedEntityCanStillCarryPhi: true;
  neverCrossesCustomerIsolation: true;
  neverAppearsInNonHealthcareAwareRetrieval: true;
  carriesRedactionMetadata: true;
  redactionMetadataReferenceId: string;
  auditTrailEntriesInheritPhiTag: true;
  routesToHipaaCompliantAuditStore: true;
  hipaaCompliantAuditStoreInterfaceReferenceId: string;
  generalAuditLogMustNotContainPhi: true;
  conservativeDefaultTagWhenUncertain: true;
  untaggingRequiresExplicitAttestedDeclaration: true;
  minimumCellSizeThresholdApplies: boolean;
  belowMinimumCellSizeRemainsPhi: true;
  phiDerivedLearningBrightLine: PhiDerivedLearningBrightLine;
  misclassificationProducesFailClosedSignal: true;
  hipaaControlsOwnedByPhase42_5: true;
  phiTagComplete: boolean;
}

export interface BuildPHITagResult {
  phiTag: SyntheticPHITag | null;
  skipped: boolean;
  warnings: string[];
}

const OUTPUT_CLASSIFICATION: RecommendationOutputClassification = "recommendation_for_human_review";

const DEFAULT_PHI_DERIVATION_STATUS: PhiDerivationStatus = "containsPHI";

const PHI_DERIVATION_RESTRICTIVENESS_ORDER: readonly PhiDerivationStatus[] = [
  "containsPHI",
  "derivedFromPHIThroughExpertDetermination",
  "derivedFromPHIThroughSafeHarbor",
  "containsNoPHI",
];

const PHI_DERIVED_LEARNING_BRIGHT_LINE: PhiDerivedLearningBrightLine = {
  mayEnterOwnCustomerScopedLearning: true,
  mayNotEnterCrossCustomerSharedIntelligence: true,
  crossCustomerRequiresExpertDeterminationDeidentification: true,
  safeHarborIsDefaultPath: true,
  aggregatesBelowMinimumCellSizeNotAutoDeidentified: true,
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function getInputArray<T>(values: T[] | undefined): T[] {
  return values ?? [];
}

function hasPhiTriggeringCharacteristics(characteristics: PhiTriggeringCharacteristic[]): boolean {
  return characteristics.some((characteristic) => characteristic !== "none");
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

function resolveTriggeringCharacteristics(input: BuildPHITagInput): PhiTriggeringCharacteristic[] {
  const characteristics = getInputArray(input.triggeringCharacteristics);

  if (characteristics.length === 0) {
    return ["none"];
  }

  return characteristics;
}

function resolvePhiTagging(input: BuildPHITagInput): {
  containsPHI: boolean;
  phiDerivationStatus: PhiDerivationStatus;
  validationFailures: string[];
} {
  const triggeringCharacteristics = resolveTriggeringCharacteristics(input);
  const hasPhiTrigger = hasPhiTriggeringCharacteristics(triggeringCharacteristics);
  const validationFailures: string[] = [];

  if (hasPhiTrigger) {
    if (input.containsPHI === false) {
      validationFailures.push(
        "triggeringCharacteristics contains a PHI signal but containsPHI is false; tagging fails closed",
      );
    }

    if (input.phiDerivationStatus === "containsNoPHI") {
      validationFailures.push(
        "triggeringCharacteristics present; phiDerivationStatus cannot be containsNoPHI",
      );
    }

    const phiDerivationStatus = getMostRestrictivePhiDerivationStatus(
      input.phiDerivationStatus,
      DEFAULT_PHI_DERIVATION_STATUS,
    );

    return {
      containsPHI: true,
      phiDerivationStatus,
      validationFailures,
    };
  }

  if (input.containsPHI === false && input.phiDerivationStatus === undefined) {
    return {
      containsPHI: false,
      phiDerivationStatus: "containsNoPHI",
      validationFailures,
    };
  }

  if (input.containsPHI === false && input.phiDerivationStatus && input.phiDerivationStatus !== "containsNoPHI") {
    validationFailures.push("containsPHI false requires phiDerivationStatus containsNoPHI when no triggers are present");
  }

  const uncertain =
    input.containsPHI === undefined &&
    input.phiDerivationStatus === undefined &&
    (!hasValue(input.triggeringCharacteristics) || triggeringCharacteristics.every((c) => c === "none"));

  if (uncertain) {
    return {
      containsPHI: true,
      phiDerivationStatus: DEFAULT_PHI_DERIVATION_STATUS,
      validationFailures,
    };
  }

  const containsPHI = input.containsPHI ?? true;
  const phiDerivationStatus =
    input.phiDerivationStatus ?? (containsPHI ? DEFAULT_PHI_DERIVATION_STATUS : "containsNoPHI");

  return {
    containsPHI,
    phiDerivationStatus,
    validationFailures,
  };
}

function getSharedBase(
  input: BuildPHITagInput,
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
    reportingFramework: input.reportingFramework ?? "us_gaap",
    industryClassification: input.industryClassification ?? "",
    industrySubClassification: input.industrySubClassification ?? "",
    industryStatus: input.industryStatus ?? "recognized_unpopulated",
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

function collectMissingRequiredIdentifiers(input: BuildPHITagInput): string[] {
  const missing: string[] = [];

  if (!hasValue(input.artifactReferenceId)) {
    missing.push("artifactReferenceId");
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

function buildPHITagKey(
  input: BuildPHITagInput,
  triggeringCharacteristics: PhiTriggeringCharacteristic[],
  containsPHI: boolean,
  phiDerivationStatus: PhiDerivationStatus,
): string {
  return stableSnapshotHash({
    artifactReferenceId: input.artifactReferenceId ?? "",
    containsPHI,
    phiDerivationStatus,
    triggeringCharacteristics,
    industryClassification: input.industryClassification ?? "",
    redactionMetadataReferenceId: input.redactionMetadataReferenceId ?? "",
    hipaaCompliantAuditStoreInterfaceReferenceId: input.hipaaCompliantAuditStoreInterfaceReferenceId ?? "",
    minimumCellSizeThresholdApplies: input.minimumCellSizeThresholdApplies === true,
  });
}

function buildPHITagId(input: BuildPHITagInput, phiTagKey: string): string {
  return `synthetic-phi-tag:${stableSnapshotHash({
    phiTagKey,
    artifactType: "SyntheticPHITag",
  })}`;
}

function buildDerivationHash(
  input: BuildPHITagInput,
  phiTagKey: string,
  containsPHI: boolean,
  phiDerivationStatus: PhiDerivationStatus,
): string {
  return stableSnapshotHash({
    phiTagKey,
    taggedAtCreationNotRetroactively: true,
    triggeredByDataCharacteristicsNotIndustryLabelAlone: true,
    industryClassificationDoesNotControlPhiTagging: true,
    neverCrossesCustomerIsolation: true,
    neverAppearsInNonHealthcareAwareRetrieval: true,
    conservativeDefaultTagWhenUncertain: true,
    hipaaControlsOwnedByPhase42_5: true,
    containsPHI,
    phiDerivationStatus,
  });
}

function getWarnings(
  input: BuildPHITagInput,
  triggeringCharacteristics: PhiTriggeringCharacteristic[],
  containsPHI: boolean,
  validationFailures: string[],
): string[] {
  const genericClassifiedWithPhi =
    input.industryClassification === "generic" &&
    containsPHI &&
    hasPhiTriggeringCharacteristics(triggeringCharacteristics);

  return [
    ...getInputArray(input.warnings),
    ...validationFailures,
    ...(genericClassifiedWithPhi
      ? [
          "generic-classified entity produced PHI-tagged artifact; misclassification produces fail-closed signal for governed reclassification",
        ]
      : []),
    ...(containsPHI
      ? ["PHI-tagged artifacts never appear in non-Healthcare-aware retrieval and never cross customerIsolation"]
      : []),
    ...(containsPHI
      ? ["audit-trail entries referencing PHI-tagged artifacts inherit the PHI tag and route to the HIPAA-compliant audit store interface"]
      : []),
    "metadata-only PHI tagging contract; live PHI detection and HIPAA controls are deferred to real-data validation and Phase 42.5",
  ];
}

export function buildPHITag(input: BuildPHITagInput): BuildPHITagResult {
  const missingRequiredIdentifiers = collectMissingRequiredIdentifiers(input);

  if (missingRequiredIdentifiers.length > 0) {
    return {
      phiTag: null,
      skipped: true,
      warnings: [`missing required PHI tag identifiers: ${missingRequiredIdentifiers.join(", ")}`],
    };
  }

  const triggeringCharacteristics = resolveTriggeringCharacteristics(input);
  const { containsPHI, phiDerivationStatus, validationFailures } = resolvePhiTagging(input);

  if (validationFailures.length > 0) {
    return {
      phiTag: null,
      skipped: true,
      warnings: getWarnings(input, triggeringCharacteristics, containsPHI, validationFailures),
    };
  }

  const requiredArtifactReferenceId = input.artifactReferenceId as string;
  const phiTagKey = buildPHITagKey(input, triggeringCharacteristics, containsPHI, phiDerivationStatus);
  const base = getSharedBase(input, containsPHI, phiDerivationStatus);
  const phiTag: SyntheticPHITag = {
    ...base,
    phiTagId: buildPHITagId(input, phiTagKey),
    phiTagKey,
    artifactReferenceId: requiredArtifactReferenceId,
    taggedAtCreationNotRetroactively: true,
    triggeredByDataCharacteristicsNotIndustryLabelAlone: true,
    triggeringCharacteristics,
    industryClassificationDoesNotControlPhiTagging: true,
    industryControlsTreatmentSelectionNotPhiTagging: true,
    genericClassifiedEntityCanStillCarryPhi: true,
    neverCrossesCustomerIsolation: true,
    neverAppearsInNonHealthcareAwareRetrieval: true,
    carriesRedactionMetadata: true,
    redactionMetadataReferenceId: input.redactionMetadataReferenceId ?? "",
    auditTrailEntriesInheritPhiTag: true,
    routesToHipaaCompliantAuditStore: true,
    hipaaCompliantAuditStoreInterfaceReferenceId:
      input.hipaaCompliantAuditStoreInterfaceReferenceId ?? "phase-42-5-hipaa-compliant-audit-store-interface",
    generalAuditLogMustNotContainPhi: true,
    conservativeDefaultTagWhenUncertain: true,
    untaggingRequiresExplicitAttestedDeclaration: true,
    minimumCellSizeThresholdApplies: input.minimumCellSizeThresholdApplies === true,
    belowMinimumCellSizeRemainsPhi: true,
    phiDerivedLearningBrightLine: PHI_DERIVED_LEARNING_BRIGHT_LINE,
    misclassificationProducesFailClosedSignal: true,
    hipaaControlsOwnedByPhase42_5: true,
    executable: false,
    derivationHash: buildDerivationHash(input, phiTagKey, containsPHI, phiDerivationStatus),
    warnings: getWarnings(input, triggeringCharacteristics, containsPHI, []),
    phiTagComplete: input.phiTagComplete === true,
  };

  return {
    phiTag,
    skipped: false,
    warnings: phiTag.warnings,
  };
}
