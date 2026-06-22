import {
  assertPhiFlagged,
  getDeclaredBoundary,
  SOC_BOUNDARY_TAXONOMY_TAGS,
  type BoundaryDiagramInput,
  type BoundaryAssertionResult,
} from "./socScopeBoundary";

export interface SocScopeBoundaryStaticConstructionCase {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): BoundaryAssertionResult;
}

export interface SocScopeBoundaryStaticConstructionCaseResult {
  caseId: string;
  poisonCaseIds: string[];
  description: string;
  passed: boolean;
  decision: string;
  reason: string;
  details: Record<string, unknown>;
}

function baseDiagram(overrides: Partial<BoundaryDiagramInput> = {}): BoundaryDiagramInput {
  return {
    diagramId: "diagram:static-test",
    nodes: [],
    ...overrides,
  };
}

export const SOC_SCOPE_BOUNDARY_STATIC_CONSTRUCTION_CASES: SocScopeBoundaryStaticConstructionCase[] = [
  {
    caseId: "SC-01-PHI-FLAGGED-ALLOW",
    poisonCaseIds: [],
    description: "Node with PHI field + socScopeFlagged: true → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertPhiFlagged(
        baseDiagram({
          nodes: [
            {
              nodeId: "node:hipaa-integration",
              namespace: "ops/compliance/overlays/hipaa/integration",
              dataTags: [{ taxonomy: "patient-identifier", phi: true, socScopeFlagged: true }],
            },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-02-PHI-UNFLAGGED-DENY",
    poisonCaseIds: ["PC-15"],
    description: "Node with PHI field + socScopeFlagged: false → DENY",
    expectedDecision: "DENY",
    run() {
      return assertPhiFlagged(
        baseDiagram({
          nodes: [
            {
              nodeId: "node:hipaa-unflagged",
              namespace: "ops/compliance/overlays/hipaa/safeguards",
              dataTags: [{ taxonomy: "patient-identifier", phi: true, socScopeFlagged: false }],
            },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-03-NON-PHI-NO-FLAG-ALLOW",
    poisonCaseIds: [],
    description: "Node with non-PHI field + socScopeFlagged: false → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertPhiFlagged(
        baseDiagram({
          nodes: [
            {
              nodeId: "node:spine-isolation",
              namespace: "ops/control-spine/isolation",
              dataTags: [{ taxonomy: "financial-summary", phi: false, socScopeFlagged: false }],
            },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-04-MIXED-UNFLAGGED-LIST",
    poisonCaseIds: ["PC-15"],
    description: "Multiple nodes mixed → DENY with full unflagged list",
    expectedDecision: "DENY",
    run() {
      const result = assertPhiFlagged(
        baseDiagram({
          nodes: [
            {
              nodeId: "node:flagged",
              namespace: "ops/compliance/overlays/hipaa/contracts",
              dataTags: [{ taxonomy: "electronic-phi-marker", phi: true, socScopeFlagged: true }],
            },
            {
              nodeId: "node:unflagged-a",
              namespace: "ops/compliance/overlays/hipaa/integration",
              dataTags: [{ taxonomy: "patient-identifier", phi: true, socScopeFlagged: false }],
            },
            {
              nodeId: "node:unflagged-b",
              namespace: "ops/compliance/overlays/hipaa/safeguards",
              dataTags: [{ taxonomy: "electronic-phi-marker", phi: true, socScopeFlagged: false }],
            },
          ],
        }),
      );
      return result;
    },
  },
  {
    caseId: "SC-05-MISSING-DATATAGS",
    poisonCaseIds: [],
    description: "Missing dataTags → DENY",
    expectedDecision: "DENY",
    run() {
      return assertPhiFlagged(
        baseDiagram({
          nodes: [
            {
              nodeId: "node:missing-tags",
              namespace: "ops/control-spine/audit",
              dataTags: undefined as unknown as BoundaryDiagramInput["nodes"][number]["dataTags"],
            },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-06-EMPTY-NODES",
    poisonCaseIds: [],
    description: "Empty nodes array → DENY",
    expectedDecision: "DENY",
    run() {
      return assertPhiFlagged(baseDiagram({ nodes: [] }));
    },
  },
  {
    caseId: "SC-07-UNKNOWN-TAXONOMY",
    poisonCaseIds: [],
    description: "Unknown taxonomy → DENY",
    expectedDecision: "DENY",
    run() {
      return assertPhiFlagged(
        baseDiagram({
          nodes: [
            {
              nodeId: "node:unknown-taxonomy",
              namespace: "ops/control-spine/rbac",
              dataTags: [{ taxonomy: "unknown-taxonomy-tag", phi: false, socScopeFlagged: false }],
            },
          ],
        }),
      );
    },
  },
  {
    caseId: "SC-08-DECLARED-BOUNDARY",
    poisonCaseIds: [],
    description: "getDeclaredBoundary returns spine + overlay namespaces matching repo",
    expectedDecision: "ALLOW",
    run() {
      const boundary = getDeclaredBoundary();
      const ok =
        boundary.spineNamespaces.includes("ops/control-spine/") &&
        boundary.overlayNamespaces.includes("ops/compliance/overlays/hipaa/") &&
        boundary.outOfScopeNamespaces.includes("lib/intelligence/synthetic/industry/");
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "declared_boundary_matches_repo" : "declared_boundary_mismatch",
        evidence: { diagramId: "declared-boundary-check", unflaggedPhiNodes: [] },
      };
    },
  },
  {
    caseId: "SC-09-TAXONOMY-ENUMERATION",
    poisonCaseIds: [],
    description: "Taxonomy enumeration includes probe-aligned patient-identifier tag",
    expectedDecision: "ALLOW",
    run() {
      const ok = SOC_BOUNDARY_TAXONOMY_TAGS.includes("patient-identifier");
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "taxonomy_enumeration_present" : "taxonomy_enumeration_drift",
        evidence: { diagramId: "taxonomy-enumeration", unflaggedPhiNodes: [] },
      };
    },
  },
  {
    caseId: "SC-10-MALFORMED-INPUT-DENY",
    poisonCaseIds: [],
    description: "Malformed input (missing diagramId) → DENY",
    expectedDecision: "DENY",
    run() {
      return assertPhiFlagged({ diagramId: "", nodes: [{ nodeId: "n", namespace: "ops/control-spine/", dataTags: [] }] });
    },
  },
];

export function executeSocScopeBoundaryStaticConstructionTests(): {
  pass: boolean;
  results: SocScopeBoundaryStaticConstructionCaseResult[];
} {
  const results = SOC_SCOPE_BOUNDARY_STATIC_CONSTRUCTION_CASES.map((testCase) => {
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
