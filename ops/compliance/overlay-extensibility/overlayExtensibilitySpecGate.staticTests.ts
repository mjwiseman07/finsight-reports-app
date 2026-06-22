import {
  assertAttachmentSpecValid,
  assertSecondOverlayFm2Gate,
  getDeclaredOverlayCatalog,
  type OverlayAttachmentSpecDescriptor,
  type OverlayExtensibilityAssertionResult,
} from "./overlayExtensibilitySpecGate";

export interface OverlayExtensibilitySpecGateStaticCase {
  caseId: string;
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): OverlayExtensibilityAssertionResult | { decision: "DENY" | "ALLOW"; reason: string };
}

export interface OverlayExtensibilitySpecGateStaticCaseResult {
  caseId: string;
  description: string;
  passed: boolean;
  decision: string;
  reason: string;
  details: Record<string, unknown>;
}

function baseSpec(overrides: Partial<OverlayAttachmentSpecDescriptor> = {}): OverlayAttachmentSpecDescriptor {
  return {
    overlayRegistryKey: "overlay:test:static",
    targetSlotReferenceId: "slot:audit_logging_event_interface",
    activationScopeReferenceId: "scope:test:activation",
    regulatoryScopeStatementReferenceId: "scope-statement:test",
    precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
    overlayNamespace: "ops/compliance/overlays/test/",
    spineModificationAttempted: false,
    verticalComplianceLogicInSpine: false,
    citedD0EvidencePaths: ["ops/control-spine/verification/panel-data-paths/D0_EVIDENCE.json"],
    illustrationStatus: "spec_only",
    ...overrides,
  };
}

export const OVERLAY_EXTENSIBILITY_SPEC_GATE_STATIC_CASES: OverlayExtensibilitySpecGateStaticCase[] = [
  {
    caseId: "OESS-01-HAPPY-PATH",
    description: "Well-formed overlay spec under ops/compliance/overlays/ with resolvable D0 → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertAttachmentSpecValid(baseSpec());
    },
  },
  {
    caseId: "OESS-02-SPINE-MODIFICATION",
    description: "spineModificationAttempted true → DENY spine-modification-forbidden",
    expectedDecision: "DENY",
    run() {
      return assertAttachmentSpecValid(baseSpec({ spineModificationAttempted: true }));
    },
  },
  {
    caseId: "OESS-03-VERTICAL-LOGIC-IN-SPINE",
    description: "verticalComplianceLogicInSpine true → DENY",
    expectedDecision: "DENY",
    run() {
      return assertAttachmentSpecValid(baseSpec({ verticalComplianceLogicInSpine: true }));
    },
  },
  {
    caseId: "OESS-04-NAMESPACE-VIOLATION",
    description: "overlayNamespace outside ops/compliance/overlays/ → DENY",
    expectedDecision: "DENY",
    run() {
      return assertAttachmentSpecValid(baseSpec({ overlayNamespace: "ops/control-spine/overlays/" }));
    },
  },
  {
    caseId: "OESS-05-UNRESOLVED-D0",
    description: "Unresolved D0 evidence path → DENY",
    expectedDecision: "DENY",
    run() {
      return assertAttachmentSpecValid(
        baseSpec({ citedD0EvidencePaths: ["ops/compliance/nonexistent/D0.json"] }),
      );
    },
  },
  {
    caseId: "OESS-06-SECOND-OVERLAY-NO-FM2",
    description: "Second overlay without FM-2 precedence gate → DENY",
    expectedDecision: "DENY",
    run() {
      const proposed = baseSpec({
        overlayRegistryKey: "overlay:pci-dss:illustration-42.5Y",
        overlayNamespace: "ops/compliance/overlays/pci-dss/",
      });
      return assertSecondOverlayFm2Gate({
        activeOverlayRegistryKeys: ["overlay:hipaa:42.5J"],
        proposedOverlay: proposed,
        fm2PrecedenceGateDeclared: false,
        precedencePolicy: "most_restrictive_wins",
      });
    },
  },
  {
    caseId: "OESS-07-SECOND-OVERLAY-FM2-ALLOW",
    description: "Second overlay with FM-2 gate declared + most-restrictive precedence → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      const proposed = baseSpec({
        overlayRegistryKey: "overlay:pci-dss:illustration-42.5Y",
        overlayNamespace: "ops/compliance/overlays/pci-dss/",
        precedenceConfigurationReferenceId: "scope:precedence:default-most-restrictive",
      });
      return assertSecondOverlayFm2Gate({
        activeOverlayRegistryKeys: ["overlay:hipaa:42.5J"],
        proposedOverlay: proposed,
        fm2PrecedenceGateDeclared: true,
        precedencePolicy: "most_restrictive_wins",
      });
    },
  },
  {
    caseId: "OESS-08-PCI-SPEC-ONLY",
    description: "PCI-DSS illustration marked spec_only in declared catalog",
    expectedDecision: "ALLOW",
    run() {
      const catalog = getDeclaredOverlayCatalog();
      const pci = catalog.find((entry) => entry.overlayRegistryKey.includes("pci-dss"));
      const ok = pci?.illustrationStatus === "spec_only";
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "pci_spec_only_illustration" : "pci_not_spec_only",
      };
    },
  },
  {
    caseId: "OESS-09-FROZEN-CATALOG",
    description: "getDeclaredOverlayCatalog returns frozen array; mutation rejected",
    expectedDecision: "ALLOW",
    run() {
      const catalog = getDeclaredOverlayCatalog();
      const mutationRejected = !Reflect.set(catalog, 0, catalog[0]);
      const ok = Object.isFrozen(catalog) && mutationRejected && catalog.length >= 2;
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "declared_catalog_frozen" : "declared_catalog_mutation_allowed",
      };
    },
  },
];

export function executeOverlayExtensibilitySpecGateStaticConstructionTests(): {
  pass: boolean;
  results: OverlayExtensibilitySpecGateStaticCaseResult[];
} {
  const results = OVERLAY_EXTENSIBILITY_SPEC_GATE_STATIC_CASES.map((testCase) => {
    const outcome = testCase.run();
    const passed = outcome.decision === testCase.expectedDecision;
    return {
      caseId: testCase.caseId,
      description: testCase.description,
      passed,
      decision: outcome.decision,
      reason: outcome.reason,
      details: { evidence: "evidence" in outcome ? outcome.evidence : {} },
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}
