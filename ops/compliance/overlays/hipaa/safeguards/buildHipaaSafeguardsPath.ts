import type {
  ControlSpineIsolationDimension,
  OverlayAttachmentContract,
} from "../../../../control-spine/contracts";
import type {
  HipaaCurrentRuleSafeguardCitationKey,
  HipaaPhiDataClassReferenceContract,
  HipaaRegulatoryBasisStatus,
  HipaaSafeguardCategoryKey,
  HipaaSafeguardContract,
  HipaaSafeguardReferenceContract,
} from "../contracts";

/** Q7a honesty marker — field list awaits Janice domain input; do not invent fields. */
export const PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A = "PENDING_Q7A_JANICE_INPUT" as const;

export type PhiAdjacentFieldClassificationPendingMarker =
  typeof PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A;

export type HipaaPhiAdjacentFieldClassificationStatus = "pending_q7a";

export type HipaaPhiAdjacentFieldTag = "phi_adjacent" | "not_phi_adjacent" | "phi_derived";

export interface HipaaPhiAdjacentFieldClassificationEntryShape {
  fieldReferenceId: string;
  fieldTag: HipaaPhiAdjacentFieldTag;
  phiDataClassReferenceId: string | null;
  classificationEvidenceReferenceId: string | null;
}

export interface HipaaSafeguardPathBuildInput {
  safeguardPathBuildKey: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  phiDataClassReferences: readonly Pick<
    HipaaPhiDataClassReferenceContract,
    "phiDataClassReferenceId" | "phiDataClassKey"
  >[];
  /** Opaque 42.5A slot binding — overlay attaches through declared interface slots only. */
  overlayAttachmentSlotBinding: Pick<
    OverlayAttachmentContract,
    "overlayInterfaceSlotReferenceIds" | "overlayAttachmentReferenceId"
  >;
}

export interface HipaaSafeguardContractBundleBuildResult {
  hipaaSafeguardContractBundleBuildResultId: string;
  hipaaSafeguardContractBundleBuildResultKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  buildTrace: string[];
  safeguardContract: HipaaSafeguardContract;
  administrative: HipaaSafeguardCategoryBuildResult;
  physical: HipaaSafeguardCategoryBuildResult;
  technical: HipaaSafeguardCategoryBuildResult;
}

export interface HipaaSafeguardPathRecord {
  hipaaSafeguardPathRecordId: string;
  hipaaSafeguardPathRecordKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  safeguardCategory: HipaaSafeguardCategoryKey;
  currentRuleCitation: HipaaCurrentRuleSafeguardCitationKey;
  safeguardHookReferenceId: string;
  sourceSafeguardReferenceContractId: string;
  customerIsolation: ControlSpineIsolationDimension;
  firmIsolation: ControlSpineIsolationDimension;
  clientIsolation: ControlSpineIsolationDimension;
  phiDataClassReferenceIds: string[];
  /** Reference shapes only — no field-to-class mapping until Q7a completes. */
  fieldToClassMappingDeferred: true;
  implementationStatus: "safeguard_path_built";
  buildTrace: string[];
}

export interface HipaaSafeguardCategoryBuildResult {
  hipaaSafeguardCategoryBuildResultId: string;
  hipaaSafeguardCategoryBuildResultKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  safeguardCategory: HipaaSafeguardCategoryKey;
  currentRuleCitation: HipaaCurrentRuleSafeguardCitationKey;
  buildTrace: string[];
  safeguardPathRecords: HipaaSafeguardPathRecord[];
  safeguardReferenceContracts: HipaaSafeguardReferenceContract[];
}

export interface HipaaPhiAdjacentFieldClassificationBuildResult {
  hipaaPhiAdjacentFieldClassificationBuildResultId: string;
  hipaaPhiAdjacentFieldClassificationBuildResultKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  classificationStatus: HipaaPhiAdjacentFieldClassificationStatus;
  pendingInputMarker: PhiAdjacentFieldClassificationPendingMarker;
  assertsFieldClassificationComplete: false;
  /** Structure only — intentionally empty until Janice Q7a input. */
  fieldClassificationEntries: readonly HipaaPhiAdjacentFieldClassificationEntryShape[];
  fieldClassificationStructureReferenceId: string;
  phiDataClassReferenceIds: string[];
  buildTrace: string[];
}

export interface HipaaCompensatingControlTemplate {
  hipaaCompensatingControlTemplateId: string;
  hipaaCompensatingControlTemplateKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  workforceSizeBasis: "two_owner_shop_q7";
  safeguardGapReferenceId: string;
  compensatingControlDescriptionReferenceId: string;
  /** Current-rule documentation retention floor — 164.316 (6 years). Not NPRM-as-law. */
  documentationRetentionFloorYears: 6;
  documentationRetentionCitation: "45_cfr_164_316";
  buildTrace: string[];
}

export interface HipaaCompensatingControlTemplateBuildResult {
  hipaaCompensatingControlTemplateBuildResultId: string;
  hipaaCompensatingControlTemplateBuildResultKey: string;
  overlayContract: true;
  containsVerticalComplianceLogic: true;
  executable: false;
  regulatoryBasisStatus: HipaaRegulatoryBasisStatus;
  buildTrace: string[];
  compensatingControlTemplates: HipaaCompensatingControlTemplate[];
}

function buildDeterministicId(prefix: string, parts: string[]): string {
  return `${prefix}:${parts.filter(Boolean).join(":")}`;
}

function extractPhiDataClassReferenceIds(
  phiDataClassReferences: HipaaSafeguardPathBuildInput["phiDataClassReferences"],
): string[] {
  return phiDataClassReferences.map((reference) => reference.phiDataClassReferenceId);
}

function buildSafeguardReferenceContract(input: {
  safeguardPathBuildKey: string;
  safeguardCategory: HipaaSafeguardCategoryKey;
  currentRuleCitation: HipaaCurrentRuleSafeguardCitationKey;
  safeguardHookReferenceId: string;
}): HipaaSafeguardReferenceContract {
  return {
    hipaaSafeguardReferenceContractId: buildDeterministicId("hipaa-safeguard-ref", [
      input.safeguardPathBuildKey,
      input.safeguardHookReferenceId,
    ]),
    hipaaSafeguardReferenceContractKey: `hipaa-safeguard-ref:${input.safeguardHookReferenceId}`,
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    safeguardCategory: input.safeguardCategory,
    currentRuleCitation: input.currentRuleCitation,
    safeguardHookReferenceId: input.safeguardHookReferenceId,
    implementationStatus: "type_reference_only",
    implementationConsumerModule: "42.5K",
  };
}

function buildSafeguardPathRecord(
  input: HipaaSafeguardPathBuildInput,
  hook: {
    safeguardCategory: HipaaSafeguardCategoryKey;
    currentRuleCitation: HipaaCurrentRuleSafeguardCitationKey;
    safeguardHookReferenceId: string;
  },
): HipaaSafeguardPathRecord {
  const sourceSafeguardReferenceContract = buildSafeguardReferenceContract({
    safeguardPathBuildKey: input.safeguardPathBuildKey,
    safeguardCategory: hook.safeguardCategory,
    currentRuleCitation: hook.currentRuleCitation,
    safeguardHookReferenceId: hook.safeguardHookReferenceId,
  });

  return {
    hipaaSafeguardPathRecordId: buildDeterministicId("hipaa-safeguard-path", [
      input.safeguardPathBuildKey,
      hook.safeguardHookReferenceId,
    ]),
    hipaaSafeguardPathRecordKey: `hipaa-safeguard-path:${hook.safeguardHookReferenceId}`,
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    safeguardCategory: hook.safeguardCategory,
    currentRuleCitation: hook.currentRuleCitation,
    safeguardHookReferenceId: hook.safeguardHookReferenceId,
    sourceSafeguardReferenceContractId: sourceSafeguardReferenceContract.hipaaSafeguardReferenceContractId,
    customerIsolation: input.customerIsolation,
    firmIsolation: input.firmIsolation,
    clientIsolation: input.clientIsolation,
    phiDataClassReferenceIds: extractPhiDataClassReferenceIds(input.phiDataClassReferences),
    fieldToClassMappingDeferred: true,
    implementationStatus: "safeguard_path_built",
    buildTrace: [
      `safeguard_hook:${hook.safeguardHookReferenceId}`,
      `citation:${hook.currentRuleCitation}`,
      "field_to_class_mapping:deferred_pending_q7a",
    ],
  };
}

function buildSafeguardCategoryResult(
  input: HipaaSafeguardPathBuildInput,
  hooks: Array<{
    safeguardCategory: HipaaSafeguardCategoryKey;
    currentRuleCitation: HipaaCurrentRuleSafeguardCitationKey;
    safeguardHookReferenceId: string;
  }>,
): HipaaSafeguardCategoryBuildResult {
  const safeguardPathRecords = hooks.map((hook) => buildSafeguardPathRecord(input, hook));
  const safeguardReferenceContracts = safeguardPathRecords.map((record) =>
    buildSafeguardReferenceContract({
      safeguardPathBuildKey: input.safeguardPathBuildKey,
      safeguardCategory: record.safeguardCategory,
      currentRuleCitation: record.currentRuleCitation,
      safeguardHookReferenceId: record.safeguardHookReferenceId,
    }),
  );

  const buildTrace = [
    "buildSafeguardCategory:start",
    "regulatory_basis:current_final_rule",
    "nprm:not_asserted_as_law",
    ...safeguardPathRecords.flatMap((record) => record.buildTrace),
  ];

  return {
    hipaaSafeguardCategoryBuildResultId: buildDeterministicId("hipaa-safeguard-category-build", [
      input.safeguardPathBuildKey,
      hooks[0]?.currentRuleCitation ?? "unknown",
    ]),
    hipaaSafeguardCategoryBuildResultKey: `hipaa-safeguard-category:${hooks[0]?.currentRuleCitation ?? "unknown"}`,
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    safeguardCategory: hooks[0]?.safeguardCategory ?? "administrative",
    currentRuleCitation: hooks[0]?.currentRuleCitation ?? "45_cfr_164_308",
    buildTrace,
    safeguardPathRecords,
    safeguardReferenceContracts,
  };
}

/** Administrative safeguard path — 45 CFR 164.308 hook references from 42.5J. */
export function buildAdministrativeSafeguards(
  input: HipaaSafeguardPathBuildInput,
): HipaaSafeguardCategoryBuildResult {
  return buildSafeguardCategoryResult(input, [
    {
      safeguardCategory: "administrative",
      currentRuleCitation: "45_cfr_164_308",
      safeguardHookReferenceId: "safeguard-hook:164.308:security-management-process",
    },
    {
      safeguardCategory: "administrative",
      currentRuleCitation: "45_cfr_164_308",
      safeguardHookReferenceId: "safeguard-hook:164.308:workforce-security",
    },
    {
      safeguardCategory: "administrative",
      currentRuleCitation: "45_cfr_164_308",
      safeguardHookReferenceId: "safeguard-hook:164.308:information-access-management",
    },
    {
      safeguardCategory: "administrative",
      currentRuleCitation: "45_cfr_164_308",
      safeguardHookReferenceId: "safeguard-hook:164.308:security-awareness-training",
    },
  ]);
}

/** Physical safeguard path — 45 CFR 164.310 hook references from 42.5J. */
export function buildPhysicalSafeguards(
  input: HipaaSafeguardPathBuildInput,
): HipaaSafeguardCategoryBuildResult {
  return buildSafeguardCategoryResult(input, [
    {
      safeguardCategory: "physical",
      currentRuleCitation: "45_cfr_164_310",
      safeguardHookReferenceId: "safeguard-hook:164.310:facility-access-controls",
    },
    {
      safeguardCategory: "physical",
      currentRuleCitation: "45_cfr_164_310",
      safeguardHookReferenceId: "safeguard-hook:164.310:workstation-use",
    },
    {
      safeguardCategory: "physical",
      currentRuleCitation: "45_cfr_164_310",
      safeguardHookReferenceId: "safeguard-hook:164.310:device-and-media-controls",
    },
  ]);
}

/** Technical safeguard path — 45 CFR 164.312 hook references from 42.5J. */
export function buildTechnicalSafeguards(
  input: HipaaSafeguardPathBuildInput,
): HipaaSafeguardCategoryBuildResult {
  return buildSafeguardCategoryResult(input, [
    {
      safeguardCategory: "technical",
      currentRuleCitation: "45_cfr_164_312",
      safeguardHookReferenceId: "safeguard-hook:164.312:access-control",
    },
    {
      safeguardCategory: "technical",
      currentRuleCitation: "45_cfr_164_312",
      safeguardHookReferenceId: "safeguard-hook:164.312:audit-controls",
    },
    {
      safeguardCategory: "technical",
      currentRuleCitation: "45_cfr_164_312",
      safeguardHookReferenceId: "safeguard-hook:164.312:integrity",
    },
    {
      safeguardCategory: "technical",
      currentRuleCitation: "45_cfr_164_312",
      safeguardHookReferenceId: "safeguard-hook:164.312:transmission-security",
    },
  ]);
}

/** Aggregates 42.5J HipaaSafeguardContract bundle from admin/physical/technical paths. */
export function buildHipaaSafeguardContractBundle(
  input: HipaaSafeguardPathBuildInput,
): HipaaSafeguardContractBundleBuildResult {
  const administrative = buildAdministrativeSafeguards(input);
  const physical = buildPhysicalSafeguards(input);
  const technical = buildTechnicalSafeguards(input);

  const safeguardContract: HipaaSafeguardContract = {
    hipaaSafeguardContractId: buildDeterministicId("hipaa-safeguard-contract", [
      input.safeguardPathBuildKey,
    ]),
    hipaaSafeguardContractKey: `hipaa-safeguard-contract:${input.safeguardPathBuildKey}`,
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    administrativeSafeguardReferenceIds: administrative.safeguardPathRecords.map(
      (record) => record.hipaaSafeguardPathRecordId,
    ),
    physicalSafeguardReferenceIds: physical.safeguardPathRecords.map(
      (record) => record.hipaaSafeguardPathRecordId,
    ),
    technicalSafeguardReferenceIds: technical.safeguardPathRecords.map(
      (record) => record.hipaaSafeguardPathRecordId,
    ),
    organizationalSafeguardReferenceIds: [],
    documentationSafeguardReferenceIds: [],
  };

  const buildTrace = [
    "buildHipaaSafeguardContractBundle:start",
    `overlay_attachment_ref:${input.overlayAttachmentSlotBinding.overlayAttachmentReferenceId}`,
    `overlay_slots:${input.overlayAttachmentSlotBinding.overlayInterfaceSlotReferenceIds.join(",")}`,
    "regulatory_basis:current_final_rule",
    ...administrative.buildTrace,
    ...physical.buildTrace,
    ...technical.buildTrace,
  ];

  return {
    hipaaSafeguardContractBundleBuildResultId: buildDeterministicId("hipaa-safeguard-contract-build", [
      input.safeguardPathBuildKey,
    ]),
    hipaaSafeguardContractBundleBuildResultKey: `hipaa-safeguard-contract-build:${input.safeguardPathBuildKey}`,
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    buildTrace,
    safeguardContract,
    administrative,
    physical,
    technical,
  };
}

/**
 * Q7a-pending PHI-adjacent field classification slot.
 * Structure only — field list intentionally empty until Janice input arrives.
 */
export function buildPhiAdjacentFieldClassification(input: {
  classificationBuildKey: string;
  phiDataClassReferences: readonly Pick<
    HipaaPhiDataClassReferenceContract,
    "phiDataClassReferenceId" | "phiDataClassKey"
  >[];
}): HipaaPhiAdjacentFieldClassificationBuildResult {
  const buildTrace = [
    "buildPhiAdjacentFieldClassification:start",
    "classificationStatus:pending_q7a",
    `pendingInputMarker:${PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A}`,
    "assertsFieldClassificationComplete:false",
    "fieldClassificationEntries:empty_by_design",
    "regulatory_basis:current_final_rule",
    "nprm:not_asserted_as_law",
  ];

  return {
    hipaaPhiAdjacentFieldClassificationBuildResultId: buildDeterministicId(
      "hipaa-phi-adjacent-field-classification",
      [input.classificationBuildKey, "pending_q7a"],
    ),
    hipaaPhiAdjacentFieldClassificationBuildResultKey:
      "hipaa-phi-adjacent-field-classification:pending_q7a",
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    classificationStatus: "pending_q7a",
    pendingInputMarker: PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A,
    assertsFieldClassificationComplete: false,
    fieldClassificationEntries: [],
    fieldClassificationStructureReferenceId: buildDeterministicId(
      "hipaa-phi-adjacent-field-classification-structure",
      [input.classificationBuildKey],
    ),
    phiDataClassReferenceIds: input.phiDataClassReferences.map(
      (reference) => reference.phiDataClassReferenceId,
    ),
    buildTrace,
  };
}

/** Two-owner compensating-control documentation templates — current-rule gaps only. */
export function buildCompensatingControlTemplates(input: {
  templateBuildKey: string;
}): HipaaCompensatingControlTemplateBuildResult {
  const templates: HipaaCompensatingControlTemplate[] = [
    {
      hipaaCompensatingControlTemplateId: buildDeterministicId("hipaa-compensating-control", [
        input.templateBuildKey,
        "segregation-of-duties",
      ]),
      hipaaCompensatingControlTemplateKey: "hipaa-compensating-control:segregation-of-duties",
      overlayContract: true,
      containsVerticalComplianceLogic: true,
      executable: false,
      regulatoryBasisStatus: "current_final_rule",
      workforceSizeBasis: "two_owner_shop_q7",
      safeguardGapReferenceId: "safeguard-gap:164.308:segregation-of-duties",
      compensatingControlDescriptionReferenceId:
        "compensating-control-doc:two-owner-segregation-of-duties",
      documentationRetentionFloorYears: 6,
      documentationRetentionCitation: "45_cfr_164_316",
      buildTrace: ["template:segregation_of_duties", "retention_floor:6y_164_316"],
    },
    {
      hipaaCompensatingControlTemplateId: buildDeterministicId("hipaa-compensating-control", [
        input.templateBuildKey,
        "workforce-training-growth-trigger",
      ]),
      hipaaCompensatingControlTemplateKey: "hipaa-compensating-control:workforce-training-growth-trigger",
      overlayContract: true,
      containsVerticalComplianceLogic: true,
      executable: false,
      regulatoryBasisStatus: "current_final_rule",
      workforceSizeBasis: "two_owner_shop_q7",
      safeguardGapReferenceId: "safeguard-gap:164.308:security-awareness-training",
      compensatingControlDescriptionReferenceId:
        "compensating-control-doc:two-owner-training-growth-trigger",
      documentationRetentionFloorYears: 6,
      documentationRetentionCitation: "45_cfr_164_316",
      buildTrace: ["template:training_growth_trigger", "retention_floor:6y_164_316"],
    },
  ];

  return {
    hipaaCompensatingControlTemplateBuildResultId: buildDeterministicId(
      "hipaa-compensating-control-build",
      [input.templateBuildKey],
    ),
    hipaaCompensatingControlTemplateBuildResultKey: "hipaa-compensating-control-build:two-owner-q7",
    overlayContract: true,
    containsVerticalComplianceLogic: true,
    executable: false,
    regulatoryBasisStatus: "current_final_rule",
    buildTrace: [
      "buildCompensatingControlTemplates:start",
      "workforceSizeBasis:two_owner_shop_q7",
      "regulatory_basis:current_final_rule",
      "nprm:not_asserted_as_law",
    ],
    compensatingControlTemplates: templates,
  };
}

export function buildDefaultPhiDataClassReferences(): Array<
  Pick<HipaaPhiDataClassReferenceContract, "phiDataClassReferenceId" | "phiDataClassKey">
> {
  return [
    {
      phiDataClassReferenceId: "phi-data-class-ref:phi",
      phiDataClassKey: "phi",
    },
    {
      phiDataClassReferenceId: "phi-data-class-ref:electronic_phi",
      phiDataClassKey: "electronic_phi",
    },
    {
      phiDataClassReferenceId: "phi-data-class-ref:phi_derived_learning_boundary",
      phiDataClassKey: "phi_derived_learning_boundary",
    },
  ];
}
