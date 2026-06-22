import type { OverlayAttachmentContract } from "../../contracts";
import {
  buildOverlayAttachmentContract,
  type OverlayAttachmentAttemptDescriptor,
} from "../../../compliance/overlay-discipline";
import {
  appendOverlayActivationRecord,
  buildOverlayActivationRecord,
  createOverlayActivationRegistry,
  type OverlayActivationRegistry,
  type OverlayTenantActivationScope,
} from "../../../compliance/overlay-attachment";
import { PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY } from "../../phi-ingestion-gate";
import {
  buildActivationScopeFromTenantId,
  createPanelDataPathHarness,
  type PanelDataPathInput,
  type PanelAssertionResult,
} from "./panelDataPathHarness";

export interface PanelDataPathStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): PanelAssertionResult;
}

export interface PanelDataPathStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  decision: string;
  reason: string;
  details: Record<string, unknown>;
}

const STATIC_EVALUATION_TIMESTAMP = "2026-06-18T21:00:00.000Z";
const STATIC_RETENTION_REFERENCE = "retention:spine-default";

function buildHipaaAttachmentContract(input: {
  customerTenantId: string;
  firmTenantId: string;
  clientTenantId: string;
  activationScopeReferenceId: string;
}): OverlayAttachmentContract {
  return buildOverlayAttachmentContract({
    overlayRegistryKey: PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY,
    overlayAttachmentReferenceId: `attachment:${PHI_INGESTION_HIPAA_OVERLAY_REGISTRY_KEY}`,
    activationScopeReferenceId: input.activationScopeReferenceId,
    regulatoryScopeStatementReferenceId: "scope:regulatory-statement:opaque",
    precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
    overlayInterfaceSlotReferenceIds: [
      "slot:audit_logging_event_interface",
      "slot:regulated_compliant_audit_store_interface",
    ],
    customerTenantId: input.customerTenantId,
    firmTenantId: input.firmTenantId,
    clientTenantId: input.clientTenantId,
  });
}

function buildDisciplinedAttempt(
  contract: OverlayAttachmentContract,
  attemptReferenceId: string,
): OverlayAttachmentAttemptDescriptor {
  return {
    overlayAttachmentAttemptReferenceId: attemptReferenceId,
    attachmentContract: contract,
    attemptedActionKind: "configure_opaque_through_slot",
    targetSlotReferenceId: "slot:audit_logging_event_interface",
    actionScopeBoundaryReferenceId: contract.activationScopeReferenceId,
    actionDescriptorParseable: true,
  };
}

function buildActiveHipaaRegistry(tenantId: string): {
  registry: OverlayActivationRegistry;
  scope: OverlayTenantActivationScope;
} {
  const scope = buildActivationScopeFromTenantId(tenantId);
  const contract = buildHipaaAttachmentContract({
    customerTenantId: scope.customerTenantId,
    firmTenantId: scope.firmTenantId,
    clientTenantId: scope.clientTenantId,
    activationScopeReferenceId: scope.activationScopeReferenceId,
  });
  const attempt = buildDisciplinedAttempt(contract, "overlay-attempt:panel-path-hipaa-active");
  const buildResult = buildOverlayActivationRecord({
    actorReferenceId: "actor:panel-path-static",
    attachmentAttempt: attempt,
    tenantActivationScope: scope,
    evaluationTimestampIso: STATIC_EVALUATION_TIMESTAMP,
    retentionConfigurationReferenceId: STATIC_RETENTION_REFERENCE,
  });

  return {
    registry: appendOverlayActivationRecord(
      createOverlayActivationRegistry("registry:panel-path-hipaa-active"),
      buildResult.activationRecord,
    ),
    scope,
  };
}

const TENANT_A = "tenant-a-panel-proof";
const TENANT_B = "tenant-b-panel-proof";

function baseInput(overrides: Partial<PanelDataPathInput> = {}): PanelDataPathInput {
  return {
    panelId: "panel:command-center:healthcare-ppd",
    tenantId: TENANT_A,
    persona: "firm-staff",
    overlayActive: [],
    fieldTaxonomy: [],
    ...overrides,
  };
}

const emptyHarness = createPanelDataPathHarness();
const { registry: hipaaRegistry } = buildActiveHipaaRegistry(TENANT_A);
const hipaaHarness = createPanelDataPathHarness(hipaaRegistry);

export const PANEL_DATA_PATH_STATIC_CONSTRUCTION_CASES: PanelDataPathStaticConstructionCase[] = [
  {
    caseId: "SC-01-PHI-NO-OVERLAY",
    poisonCaseIds: ["PC-02"],
    description: "PHI field + no HIPAA overlay → assertNoPhiOutsideOverlay returns DENY",
    expectedDecision: "DENY",
    run() {
      return emptyHarness.assertNoPhiOutsideOverlay(
        baseInput({
          overlayActive: [],
          fieldTaxonomy: [
            { taxonomy: "patient-identifier", phi: true, sourceTenantId: TENANT_A },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-02-PHI-HIPAA-ALLOW",
    poisonCaseIds: [],
    description: "PHI field + HIPAA overlay active + tenant scope match → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return hipaaHarness.assertNoPhiOutsideOverlay(
        baseInput({
          overlayActive: ["hipaa"],
          fieldTaxonomy: [
            { taxonomy: "patient-identifier", phi: true, sourceTenantId: TENANT_A },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-03-PHI-PERSONA-MISMATCH",
    poisonCaseIds: ["PC-08"],
    description: "PHI field + HIPAA overlay active + persona mismatch → DENY",
    expectedDecision: "DENY",
    run() {
      return hipaaHarness.assertPanelOverlayScope({
        ...baseInput({
          overlayActive: ["hipaa"],
          persona: "client-side",
          fieldTaxonomy: [
            { taxonomy: "firm-internal-note", phi: true, sourceTenantId: TENANT_A },
          ],
        }),
        phi: true,
      });
    },
  },
  {
    caseId: "SC-04-CROSS-TENANT-NON-PHI",
    poisonCaseIds: ["PC-19"],
    description: "Non-PHI field + cross-tenant source → assertTenantScope returns DENY",
    expectedDecision: "DENY",
    run() {
      return emptyHarness.assertTenantScope({
        ...baseInput({
          tenantId: TENANT_B,
          fieldTaxonomy: [
            { taxonomy: "financial-summary", phi: false, sourceTenantId: TENANT_A },
          ],
        }),
        phi: false,
      });
    },
  },
  {
    caseId: "SC-05-SAME-TENANT-NON-PHI",
    poisonCaseIds: [],
    description: "Non-PHI field + same-tenant source → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return emptyHarness.assertTenantScope({
        ...baseInput({
          fieldTaxonomy: [
            { taxonomy: "financial-summary", phi: false, sourceTenantId: TENANT_A },
          ],
        }),
        phi: false,
      });
    },
  },
  {
    caseId: "SC-06-PHI-PANEL-NO-OVERLAY",
    poisonCaseIds: ["PC-08"],
    description: "PHI field + Command Center panel + no HIPAA overlay → assertPanelOverlayScope returns DENY",
    expectedDecision: "DENY",
    run() {
      return emptyHarness.assertPanelOverlayScope({
        ...baseInput({
          panelId: "panel:command-center:healthcare-ppd",
          overlayActive: [],
          fieldTaxonomy: [
            { taxonomy: "patient-identifier", phi: true, sourceTenantId: TENANT_A },
          ],
        }),
        phi: true,
      });
    },
  },
  {
    caseId: "SC-07-UNKNOWN-TAXONOMY",
    poisonCaseIds: [],
    description: "Unknown taxonomy → DENY",
    expectedDecision: "DENY",
    run() {
      return emptyHarness.assertNoPhiOutsideOverlay(
        baseInput({
          fieldTaxonomy: [{ taxonomy: "unknown-taxonomy-tag", phi: false, sourceTenantId: TENANT_A }],
        }),
      );
    },
  },
  {
    caseId: "SC-08-EMPTY-OVERLAY-PHI",
    poisonCaseIds: ["PC-02"],
    description: "Empty overlay list with PHI field → DENY (fail-closed default)",
    expectedDecision: "DENY",
    run() {
      return emptyHarness.assertNoPhiOutsideOverlay(
        baseInput({
          overlayActive: [],
          fieldTaxonomy: [
            { taxonomy: "electronic-phi-marker", phi: true, sourceTenantId: TENANT_A },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-09-MISSING-FIELD-TAXONOMY",
    poisonCaseIds: [],
    description: "Missing fieldTaxonomy → DENY",
    expectedDecision: "DENY",
    run() {
      return emptyHarness.assertNoPhiOutsideOverlay(
        baseInput({
          fieldTaxonomy: undefined as unknown as PanelDataPathInput["fieldTaxonomy"],
        }),
      );
    },
  },
  {
    caseId: "SC-10-PROVE-RENDERED-MIXED",
    poisonCaseIds: [],
    description: "proveRenderedPanelBoundary with mixed valid + invalid fields returns pass:false",
    expectedDecision: "DENY",
    run() {
      const proof = emptyHarness.proveRenderedPanelBoundary({
        panelId: "panel:command-center:mixed",
        tenantId: TENANT_B,
        persona: "firm-staff",
        overlayActive: [],
        renderedFields: [
          {
            fieldId: "field:valid",
            taxonomy: "financial-summary",
            phi: false,
            sourceTenantId: TENANT_B,
          },
          {
            fieldId: "field:leak",
            taxonomy: "financial-summary",
            phi: false,
            sourceTenantId: TENANT_A,
          },
        ],
      });
      return {
        decision: proof.pass ? "ALLOW" : "DENY",
        reason: proof.pass ? "no_violations" : proof.violations.map((v) => v.rule).join(","),
        evidence: { panelId: "panel:command-center:mixed", deniedFields: proof.violations.map((v) => v.fieldId) },
      };
    },
  },
];

export function executePanelDataPathStaticConstructionTests(): {
  pass: boolean;
  results: PanelDataPathStaticConstructionCaseResult[];
} {
  const results = PANEL_DATA_PATH_STATIC_CONSTRUCTION_CASES.map((testCase) => {
    const outcome = testCase.run();
    const passed = outcome.decision === testCase.expectedDecision;
    return {
      caseId: testCase.caseId,
      poisonCaseIds: testCase.poisonCaseIds,
      description: testCase.description,
      passed,
      decision: outcome.decision,
      reason: outcome.reason,
      details: { evidence: outcome.evidence },
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}
