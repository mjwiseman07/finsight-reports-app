import {
  assertPackScopeAligned,
  getDeclaredPackScope,
  type HipaaPackScopeAssertionResult,
  type HipaaPackScopeInput,
} from "./hipaaPackScopeBoundary";

export interface HipaaPackScopeBoundaryStaticCase {
  caseId: string;
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): HipaaPackScopeAssertionResult | { decision: "DENY" | "ALLOW"; reason: string };
}

export interface HipaaPackScopeBoundaryStaticCaseResult {
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
  "ops/compliance/overlays/hipaa/pack/",
];

function baseInput(overrides: Partial<HipaaPackScopeInput> = {}): HipaaPackScopeInput {
  return {
    packScopeId: "hipaa-pack-scope-static-test",
    subpartsInScope: ["A", "C", "D-incident-only"],
    subpartsExplicitlyOutOfScope: ["B", "D-full", "E"],
    safeguardCategoriesInScope: [
      "administrative-164.308",
      "physical-164.310",
      "technical-164.312",
      "organizational-164.314",
      "documentation-164.316",
    ],
    namespacesInScope: [...VALID_NAMESPACES],
    excludesNprmAnticipation: true,
    ...overrides,
  };
}

export const HIPAA_PACK_SCOPE_BOUNDARY_STATIC_CASES: HipaaPackScopeBoundaryStaticCase[] = [
  {
    caseId: "HPSS-01-HAPPY-PATH",
    description: "Valid Subpart A+C scope with all safeguard categories and aligned namespaces → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertPackScopeAligned(baseInput());
    },
  },
  {
    caseId: "HPSS-02-SUBPART-B-LEAK",
    description: "Subpart B in subpartsInScope → DENY mentioning Subpart B",
    expectedDecision: "DENY",
    run() {
      return assertPackScopeAligned(
        baseInput({
          subpartsInScope: ["A", "C", "B"] as HipaaPackScopeInput["subpartsInScope"],
        }),
      );
    },
  },
  {
    caseId: "HPSS-03-SUBPART-E-LEAK",
    description: "Subpart E in subpartsInScope → DENY mentioning Subpart E",
    expectedDecision: "DENY",
    run() {
      return assertPackScopeAligned(
        baseInput({
          subpartsInScope: ["A", "C", "E"] as HipaaPackScopeInput["subpartsInScope"],
        }),
      );
    },
  },
  {
    caseId: "HPSS-04-MISSING-B-DISCLAIMER",
    description: "subpartsExplicitlyOutOfScope missing B → DENY",
    expectedDecision: "DENY",
    run() {
      return assertPackScopeAligned(
        baseInput({
          subpartsExplicitlyOutOfScope: ["D-full", "E"],
        }),
      );
    },
  },
  {
    caseId: "HPSS-05-NAMESPACE-OUTSIDE-SOC1",
    description: "Namespace lib/intelligence/clinical/ in scope → DENY with namespace listed",
    expectedDecision: "DENY",
    run() {
      return assertPackScopeAligned(
        baseInput({
          namespacesInScope: ["ops/control-spine/", "lib/intelligence/clinical/"],
        }),
      );
    },
  },
  {
    caseId: "HPSS-06-NPRM-KEYWORD",
    description: "Scope metadata contains NPRM keyword → DENY with nprmAnticipationDetected true",
    expectedDecision: "DENY",
    run() {
      return assertPackScopeAligned(
        baseInput({
          packScopeId: "hipaa-pack-scope-with-NPRM-metadata",
        }),
      );
    },
  },
  {
    caseId: "HPSS-07-EXCLUDES-NPRM-NOT-LITERAL-TRUE",
    description: "excludesNprmAnticipation truthy but not literal true → DENY",
    expectedDecision: "DENY",
    run() {
      return assertPackScopeAligned({
        ...baseInput(),
        excludesNprmAnticipation: 1 as unknown as true,
      });
    },
  },
  {
    caseId: "HPSS-08-FROZEN-COUNSEL-REVIEW-STATUS",
    description: "getDeclaredPackScope returns frozen object; mutation rejected in strict mode",
    expectedDecision: "ALLOW",
    run() {
      const scope = getDeclaredPackScope();
      const mutationRejected = !Reflect.set(scope, "counselReviewStatus", "executed");
      const ok =
        scope.counselReviewStatus === "pending-42.6E" &&
        Object.isFrozen(scope) &&
        mutationRejected;
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "declared_pack_scope_frozen" : "declared_pack_scope_mutation_allowed",
      };
    },
  },
];

export function executeHipaaPackScopeBoundaryStaticConstructionTests(): {
  pass: boolean;
  results: HipaaPackScopeBoundaryStaticCaseResult[];
} {
  const results = HIPAA_PACK_SCOPE_BOUNDARY_STATIC_CASES.map((testCase) => {
    const outcome = testCase.run();
    const passed = outcome.decision === testCase.expectedDecision;
    const evidence =
      "evidence" in outcome
        ? outcome.evidence
        : { nprmAnticipationDetected: false };
    return {
      caseId: testCase.caseId,
      description: testCase.description,
      passed,
      decision: outcome.decision,
      reason: outcome.reason,
      details: { evidence },
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}
