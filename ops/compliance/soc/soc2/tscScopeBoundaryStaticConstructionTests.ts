import {
  assertTscBoundaryAligned,
  getDeclaredTscScope,
  type TscBoundaryAssertionResult,
  type TscBoundaryInput,
} from "./tscScopeBoundary";
import { getDeclaredBoundary as getSoc1DeclaredBoundary } from "../soc1/socScopeBoundary";

export interface TscScopeBoundaryStaticConstructionCase {
  caseId: string;
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): TscBoundaryAssertionResult;
}

export interface TscScopeBoundaryStaticConstructionCaseResult {
  caseId: string;
  description: string;
  passed: boolean;
  decision: string;
  reason: string;
  details: Record<string, unknown>;
}

const VALID_NAMESPACES: ReadonlyArray<string> = [
  "ops/control-spine/",
  "ops/compliance/overlays/hipaa/",
  "ops/compliance/soc/",
  "ops/compliance/operational/",
];

function baseInput(overrides: Partial<TscBoundaryInput> = {}): TscBoundaryInput {
  return {
    scopeId: "soc2-tsc-scope-static-test",
    criteriaInScope: ["security", "availability", "confidentiality"],
    namespacesInScope: [...VALID_NAMESPACES],
    namespacesOutOfScope: ["lib/intelligence/synthetic/industry/"],
    ...overrides,
  };
}

export const TSC_SCOPE_BOUNDARY_STATIC_CONSTRUCTION_CASES: TscScopeBoundaryStaticConstructionCase[] = [
  {
    caseId: "SC-01-THREE-TSC-ALLOW",
    description: "Security + Availability + Confidentiality with aligned namespaces → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertTscBoundaryAligned(baseInput());
    },
  },
  {
    caseId: "SC-02-SECURITY-ONLY-ALLOW",
    description: "Security only with aligned namespaces → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertTscBoundaryAligned(
        baseInput({
          criteriaInScope: ["security"],
          namespacesInScope: ["ops/control-spine/"],
        }),
      );
    },
  },
  {
    caseId: "SC-03-EMPTY-CRITERIA-DENY",
    description: "Empty criteriaInScope → DENY",
    expectedDecision: "DENY",
    run() {
      return assertTscBoundaryAligned(baseInput({ criteriaInScope: [] }));
    },
  },
  {
    caseId: "SC-04-AVAILABILITY-ONLY-DENY",
    description: "Availability without Security → DENY",
    expectedDecision: "DENY",
    run() {
      return assertTscBoundaryAligned(
        baseInput({
          criteriaInScope: ["availability"],
          namespacesInScope: ["ops/control-spine/"],
        }),
      );
    },
  },
  {
    caseId: "SC-05-PROCESSING-INTEGRITY-DENY",
    description: "Processing Integrity in criteriaInScope → DENY (Q2 deferred)",
    expectedDecision: "DENY",
    run() {
      return assertTscBoundaryAligned(
        baseInput({ criteriaInScope: ["security", "processing-integrity"] }),
      );
    },
  },
  {
    caseId: "SC-06-PRIVACY-DENY",
    description: "Privacy in criteriaInScope → DENY (Q2 deferred)",
    expectedDecision: "DENY",
    run() {
      return assertTscBoundaryAligned(baseInput({ criteriaInScope: ["security", "privacy"] }));
    },
  },
  {
    caseId: "SC-07-NAMESPACE-OUTSIDE-SOC1-DENY",
    description: "Namespace outside SOC 1 + readiness extensions → DENY with namespace listed",
    expectedDecision: "DENY",
    run() {
      const result = assertTscBoundaryAligned(
        baseInput({
          namespacesInScope: [
            "ops/control-spine/",
            "lib/intelligence/synthetic/industry/",
          ],
        }),
      );
      return result;
    },
  },
  {
    caseId: "SC-08-DECLARED-TSC-SCOPE",
    description: "getDeclaredTscScope returns Security/Availability/Confidentiality; PI + Privacy deferred",
    expectedDecision: "ALLOW",
    run() {
      const scope = getDeclaredTscScope();
      const ok =
        scope.criteriaInScope.includes("security") &&
        scope.criteriaInScope.includes("availability") &&
        scope.criteriaInScope.includes("confidentiality") &&
        scope.criteriaDeferred.some((entry) => entry.criterion === "processing-integrity") &&
        scope.criteriaDeferred.some((entry) => entry.criterion === "privacy") &&
        scope.criteriaDeferred.every((entry) => entry.decisionGate === "LOCK-42.6.1");
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "declared_tsc_scope_matches_lock_42_5_3" : "declared_tsc_scope_mismatch",
        evidence: {
          scopeId: "declared-tsc-scope-check",
          soc1DeclaredBoundary: getSoc1DeclaredBoundary(),
          namespacesOutsideSoc1: [],
        },
      };
    },
  },
  {
    caseId: "SC-09-MALFORMED-INPUT-DENY",
    description: "Malformed input (missing scopeId) → DENY",
    expectedDecision: "DENY",
    run() {
      return assertTscBoundaryAligned({
        scopeId: "",
        criteriaInScope: ["security"],
        namespacesInScope: ["ops/control-spine/"],
        namespacesOutOfScope: [],
      });
    },
  },
  {
    caseId: "SC-10-SOC1-BOUNDARY-DRIFT-DENY",
    description: "Namespace outside live SOC 1 boundary prefixes → DENY (drift-resistant via getDeclaredBoundary)",
    expectedDecision: "DENY",
    run() {
      return assertTscBoundaryAligned(
        baseInput({
          namespacesInScope: ["ops/control-spine/", "ops/vendor-risk/"],
        }),
      );
    },
  },
];

export function executeTscScopeBoundaryStaticConstructionTests(): {
  pass: boolean;
  results: TscScopeBoundaryStaticConstructionCaseResult[];
} {
  const results = TSC_SCOPE_BOUNDARY_STATIC_CONSTRUCTION_CASES.map((testCase) => {
    const outcome = testCase.run();
    const passed = outcome.decision === testCase.expectedDecision;
    return {
      caseId: testCase.caseId,
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
