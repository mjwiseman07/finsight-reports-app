import type { ControlSpineIsolationDimension } from "../../../../control-spine/contracts";
import {
  buildAdministrativeSafeguards,
  buildCompensatingControlTemplates,
  buildDefaultPhiDataClassReferences,
  buildPhiAdjacentFieldClassification,
  buildPhysicalSafeguards,
  buildTechnicalSafeguards,
  PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A,
  type HipaaSafeguardPathBuildInput,
} from "./buildHipaaSafeguardsPath";

export interface HipaaSafeguardsStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
}

export interface HipaaSafeguardsStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  buildTrace: string[];
  details: Record<string, unknown>;
}

function dimension(
  tenantScopeKey: string,
  referenceSuffix: string,
): ControlSpineIsolationDimension {
  return {
    isolationDimensionReferenceId: `dim-ref:${referenceSuffix}`,
    tenantScopeKey,
    boundaryReferenceIds: [`boundary:${referenceSuffix}`],
  };
}

function buildSafeguardPathInput(): HipaaSafeguardPathBuildInput {
  return {
    safeguardPathBuildKey: "safeguard-path:healthcare-overlay-tenant",
    customerIsolation: dimension("tenant-healthcare", "customer:healthcare"),
    firmIsolation: dimension("firm-healthcare", "firm:healthcare"),
    clientIsolation: dimension("client-healthcare", "client:healthcare"),
    phiDataClassReferences: buildDefaultPhiDataClassReferences(),
    overlayAttachmentSlotBinding: {
      overlayAttachmentReferenceId: "overlay-attachment-ref:hipaa-healthcare",
      overlayInterfaceSlotReferenceIds: [
        "slot:audit_logging_event_interface",
        "slot:regulated_compliant_audit_store_interface",
      ],
    },
  };
}

/** Heuristic guard — artifacts must not embed literal PHI-like values. */
function containsLiteralPhiLikeValues(value: unknown): boolean {
  const serialized = JSON.stringify(value);

  const forbiddenPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/,
    /\bpatient[_-]?name\b/i,
    /\bmedical record number\b/i,
    /\bMRN\b/,
    /\bSSN\b/,
    /\bdate of birth\b/i,
  ];

  return forbiddenPatterns.some((pattern) => pattern.test(serialized));
}

export const HIPAA_SAFEGUARDS_STATIC_CONSTRUCTION_CASES: HipaaSafeguardsStaticConstructionCase[] = [
  {
    caseId: "SC-SAFEGUARD-164-308-310-312",
    poisonCaseIds: [],
    description: "Administrative/physical/technical safeguard records build against 164.308/310/312 refs",
  },
  {
    caseId: "SC-Q7A-PENDING-EMPTY-FIELDS",
    poisonCaseIds: [],
    description: "PHI-adjacent field classification pending_q7a with empty field list",
  },
  {
    caseId: "SC-CURRENT-RULE-NO-NPRM",
    poisonCaseIds: [],
    description: "Safeguard artifacts assert current_final_rule basis only",
  },
  {
    caseId: "SC-NO-PHI-VALUES",
    poisonCaseIds: [],
    description: "Artifacts carry reference shapes only — no actual PHI values",
  },
  {
    caseId: "SC-OVERLAY-SIDE-NO-SPINE-IMPORT",
    poisonCaseIds: [],
    description: "Artifacts are overlay-side (overlayContract true)",
  },
];

function runCase(
  caseDefinition: HipaaSafeguardsStaticConstructionCase,
): HipaaSafeguardsStaticConstructionCaseResult {
  const input = buildSafeguardPathInput();

  switch (caseDefinition.caseId) {
    case "SC-SAFEGUARD-164-308-310-312": {
      const admin = buildAdministrativeSafeguards(input);
      const physical = buildPhysicalSafeguards(input);
      const technical = buildTechnicalSafeguards(input);

      const passed =
        admin.currentRuleCitation === "45_cfr_164_308" &&
        physical.currentRuleCitation === "45_cfr_164_310" &&
        technical.currentRuleCitation === "45_cfr_164_312" &&
        admin.safeguardPathRecords.every((record) => record.implementationStatus === "safeguard_path_built") &&
        admin.safeguardReferenceContracts.every(
          (reference) => reference.implementationConsumerModule === "42.5K",
        ) &&
        admin.safeguardPathRecords.some((record) =>
          record.safeguardHookReferenceId.includes("164.308"),
        ) &&
        physical.safeguardPathRecords.some((record) =>
          record.safeguardHookReferenceId.includes("164.310"),
        ) &&
        technical.safeguardPathRecords.some((record) =>
          record.safeguardHookReferenceId.includes("164.312"),
        );

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: [...admin.buildTrace, ...physical.buildTrace, ...technical.buildTrace],
        details: {
          adminHookCount: admin.safeguardPathRecords.length,
          physicalHookCount: physical.safeguardPathRecords.length,
          technicalHookCount: technical.safeguardPathRecords.length,
        },
      };
    }

    case "SC-Q7A-PENDING-EMPTY-FIELDS": {
      const classification = buildPhiAdjacentFieldClassification({
        classificationBuildKey: "phi-adjacent-fields:healthcare-overlay",
        phiDataClassReferences: buildDefaultPhiDataClassReferences(),
      });

      const passed =
        classification.classificationStatus === "pending_q7a" &&
        classification.pendingInputMarker === PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A &&
        classification.assertsFieldClassificationComplete === false &&
        classification.fieldClassificationEntries.length === 0 &&
        classification.buildTrace.includes(`pendingInputMarker:${PHI_ADJACENT_FIELD_CLASSIFICATION_PENDING_Q7A}`);

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: classification.buildTrace,
        details: {
          fieldCount: classification.fieldClassificationEntries.length,
          classificationStatus: classification.classificationStatus,
        },
      };
    }

    case "SC-CURRENT-RULE-NO-NPRM": {
      const admin = buildAdministrativeSafeguards(input);
      const compensating = buildCompensatingControlTemplates({
        templateBuildKey: "compensating-controls:two-owner",
      });
      const serialized = JSON.stringify({ admin, compensating });

      const passed =
        admin.regulatoryBasisStatus === "current_final_rule" &&
        compensating.regulatoryBasisStatus === "current_final_rule" &&
        admin.buildTrace.includes("nprm:not_asserted_as_law") &&
        compensating.buildTrace.includes("nprm:not_asserted_as_law") &&
        !serialized.includes("nprm_pending_not_current_rule") &&
        !serialized.includes("RIN_0945_AA22");

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: admin.buildTrace,
        details: {
          adminRegulatoryBasis: admin.regulatoryBasisStatus,
        },
      };
    }

    case "SC-NO-PHI-VALUES": {
      const admin = buildAdministrativeSafeguards(input);
      const classification = buildPhiAdjacentFieldClassification({
        classificationBuildKey: "phi-adjacent-fields:no-phi-check",
        phiDataClassReferences: buildDefaultPhiDataClassReferences(),
      });
      const payload = { admin, classification };

      const passed =
        !containsLiteralPhiLikeValues(payload) &&
        classification.fieldClassificationEntries.length === 0 &&
        admin.safeguardPathRecords.every((record) => record.phiDataClassReferenceIds.every((id) => id.includes("ref")));

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: classification.buildTrace,
        details: {
          fieldCount: classification.fieldClassificationEntries.length,
        },
      };
    }

    case "SC-OVERLAY-SIDE-NO-SPINE-IMPORT": {
      const admin = buildAdministrativeSafeguards(input);
      const physical = buildPhysicalSafeguards(input);
      const technical = buildTechnicalSafeguards(input);
      const classification = buildPhiAdjacentFieldClassification({
        classificationBuildKey: "phi-adjacent-fields:overlay-check",
        phiDataClassReferences: buildDefaultPhiDataClassReferences(),
      });
      const compensating = buildCompensatingControlTemplates({
        templateBuildKey: "compensating-controls:overlay-check",
      });

      const artifacts = [
        admin,
        physical,
        technical,
        classification,
        compensating,
        ...admin.safeguardPathRecords,
        ...compensating.compensatingControlTemplates,
      ];

      const passed = artifacts.every(
        (artifact) =>
          artifact.overlayContract === true &&
          artifact.containsVerticalComplianceLogic === true &&
          artifact.executable === false,
      );

      return {
        caseId: caseDefinition.caseId,
        poisonCaseIds: caseDefinition.poisonCaseIds,
        description: caseDefinition.description,
        passed,
        buildTrace: admin.buildTrace,
        details: {
          artifactCount: artifacts.length,
        },
      };
    }

    default:
      throw new Error(`Unknown HIPAA safeguards static construction case: ${caseDefinition.caseId}`);
  }
}

export function executeHipaaSafeguardsStaticConstructionTests(): {
  pass: boolean;
  results: HipaaSafeguardsStaticConstructionCaseResult[];
} {
  const results = HIPAA_SAFEGUARDS_STATIC_CONSTRUCTION_CASES.map(runCase);

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}

export function executeHipaaSafeguardsBuildArtifactSmokeTest(): boolean {
  const input = buildSafeguardPathInput();
  const admin = buildAdministrativeSafeguards(input);
  const classification = buildPhiAdjacentFieldClassification({
    classificationBuildKey: "phi-adjacent-fields:smoke",
    phiDataClassReferences: buildDefaultPhiDataClassReferences(),
  });

  return (
    admin.safeguardPathRecords.length > 0 &&
    classification.classificationStatus === "pending_q7a" &&
    classification.fieldClassificationEntries.length === 0
  );
}
