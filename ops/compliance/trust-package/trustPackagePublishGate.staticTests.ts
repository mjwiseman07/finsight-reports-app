import {
  assertArtifactsIntegrityBatch,
  assertDraftIntegrity,
  getDeclaredArtifacts,
  type TrustPackageArtifactRef,
  type TrustPackagePublishAssertionResult,
} from "./trustPackagePublishGate";

export interface TrustPackagePublishGateStaticCase {
  caseId: string;
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): TrustPackagePublishAssertionResult | { decision: "DENY" | "ALLOW"; reason: string };
}

export interface TrustPackagePublishGateStaticCaseResult {
  caseId: string;
  description: string;
  passed: boolean;
  decision: string;
  reason: string;
  details: Record<string, unknown>;
}

const VALID_D0 = "ops/compliance/soc/soc1/D0_EVIDENCE.json";

function baseArtifact(overrides: Partial<TrustPackageArtifactRef> = {}): TrustPackageArtifactRef {
  return {
    artifactId: "trust-static-test-artifact",
    draftPath: "docs/trust/public-drafts/TRUST_PAGE_DRAFT.md",
    citedD0EvidencePaths: [VALID_D0],
    benchmarkClaimsCount: 0,
    publishReadyFlag: false,
    ...overrides,
  };
}

export const TRUST_PACKAGE_PUBLISH_GATE_STATIC_CASES: TrustPackagePublishGateStaticCase[] = [
  {
    caseId: "TPSS-01-HAPPY-PATH",
    description: "Well-formed artifact under public-drafts with resolvable D0 paths → ALLOW",
    expectedDecision: "ALLOW",
    run() {
      return assertDraftIntegrity(baseArtifact());
    },
  },
  {
    caseId: "TPSS-02-PATH-NAMESPACE-PUBLIC",
    description: "draftPath under docs/trust/public/ → DENY path-namespace-violation",
    expectedDecision: "DENY",
    run() {
      return assertDraftIntegrity(
        baseArtifact({ draftPath: "docs/trust/public/sig-lite.md", artifactId: "bad-public-path" }),
      );
    },
  },
  {
    caseId: "TPSS-03-PATH-NAMESPACE-ROOT",
    description: "draftPath at public/trust.html → DENY",
    expectedDecision: "DENY",
    run() {
      return assertDraftIntegrity(
        baseArtifact({ draftPath: "public/trust.html", artifactId: "bad-root-path" }),
      );
    },
  },
  {
    caseId: "TPSS-04-PUBLISH-READY-TRUTHY-NUMBER",
    description: "publishReadyFlag: 1 → DENY publish-ready-flag-detected",
    expectedDecision: "DENY",
    run() {
      return assertDraftIntegrity({
        ...baseArtifact({ artifactId: "publish-ready-number" }),
        publishReadyFlag: 1 as unknown as false,
      });
    },
  },
  {
    caseId: "TPSS-05-UNRESOLVED-D0",
    description: "Unresolved D0 path → DENY with path listed",
    expectedDecision: "DENY",
    run() {
      return assertDraftIntegrity(
        baseArtifact({
          artifactId: "unresolved-d0",
          citedD0EvidencePaths: ["ops/compliance/nonexistent/D0.json"],
        }),
      );
    },
  },
  {
    caseId: "TPSS-06-DUPLICATE-ARTIFACT-ID",
    description: "Duplicate artifactId in batch → DENY",
    expectedDecision: "DENY",
    run() {
      const row = baseArtifact({ artifactId: "duplicate-id" });
      return assertArtifactsIntegrityBatch([row, { ...row }]);
    },
  },
  {
    caseId: "TPSS-07-FROZEN-DECLARED-ARTIFACTS",
    description: "getDeclaredArtifacts returns frozen array; mutation rejected",
    expectedDecision: "ALLOW",
    run() {
      const artifacts = getDeclaredArtifacts();
      const mutationRejected = !Reflect.set(artifacts, 0, artifacts[0]);
      const ok = Object.isFrozen(artifacts) && mutationRejected && artifacts.length >= 6;
      return {
        decision: ok ? "ALLOW" : "DENY",
        reason: ok ? "declared_artifacts_frozen" : "declared_artifacts_mutation_allowed",
      };
    },
  },
  {
    caseId: "TPSS-08-MIXED-BATCH-FAIL-CLOSED",
    description: "Batch with one invalid artifact → whole batch DENY",
    expectedDecision: "DENY",
    run() {
      return assertArtifactsIntegrityBatch([
        baseArtifact({ artifactId: "batch-valid" }),
        baseArtifact({
          artifactId: "batch-invalid",
          draftPath: "docs/trust/public/bad.md",
        }),
      ]);
    },
  },
];

export function executeTrustPackagePublishGateStaticConstructionTests(): {
  pass: boolean;
  results: TrustPackagePublishGateStaticCaseResult[];
} {
  const results = TRUST_PACKAGE_PUBLISH_GATE_STATIC_CASES.map((testCase) => {
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
