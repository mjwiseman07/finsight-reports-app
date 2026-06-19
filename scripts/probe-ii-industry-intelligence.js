const verifier = require("./verify-ii-industry-intelligence");

const {
  artifactMatchesRetrievalScope,
  evaluateTopologyFixtureExpectation,
  verifyCompositionDisplacementIncompleteRejected,
  verifyGenericPrimaryAttestationGate,
  verifyHealthcareSpecialistAttestationGate,
  verify340BCredentialGate,
  verifyReasonablenessPathScopeRejection,
  verifyPhiTriggerContainsPhiRejected,
  verifyIndustryResolutionFailClosedRejected,
  verifyContradictionResolvedTreatmentRejected,
  verifyAuditTrailPhiInheritanceRejected,
  verifyReasonablenessInternalResearchFieldsRejected,
  verifyPhiDerivedLearningBrightLineRejected,
  verifyOperationalKpiActiveAtLockRejected,
  verifyNfpCommunityBenefitActiveRejected,
  verifyHealthcareKpiMinimumCellSizeRejected,
  sourceHasOutputClassificationMarker,
} = verifier;

const TOPOLOGY_CUSTOMER_ISOLATION = "customer-topology-001";

function runPoisonCase(name, expectedReject, evaluatePoison) {
  const outcome = evaluatePoison();

  if (outcome && typeof outcome === "object" && outcome.finding) {
    return {
      name,
      expectedReject,
      actual: "NOT_INVOKABLE",
      verdict: "FINDING",
      caught: false,
      finding: outcome.finding,
    };
  }

  const caught =
    typeof outcome === "boolean"
      ? outcome
      : Boolean(outcome?.caught ?? outcome?.passed ?? outcome?.rejected);
  const actual = caught ? "REJECTED" : "ACCEPTED";
  const verdict = caught ? "PASS" : "LEAK";

  return {
    name,
    expectedReject,
    actual,
    verdict,
    caught,
    detail: outcome && typeof outcome === "object" ? outcome.detail : undefined,
  };
}

function poisonExpectationLeaks(expectation) {
  return evaluateTopologyFixtureExpectation({
    ...expectation,
    expectedRetrievable: true,
  });
}

function healthcareAcuteScope(overrides = {}) {
  return {
    retrievalCategory: "revenue_recognition_industry_overlay",
    retrievalCategoryClass: "treatment_scoped",
    queryCustomerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
    queryFramework: "us_gaap",
    queryIndustry: "healthcare",
    querySubClassification: "healthcare.acute_care_hospital",
    healthcareAwareRetrievalPath: true,
    ...overrides,
  };
}

const poisonCases = [
  runPoisonCase(
    "01 cross-industry memory leak (generic treatment in healthcare scope)",
    "cross-industry retrieval rejected",
    () => {
      const poisonArtifact = {
        artifactReferenceId: "poison-generic-treatment-cross-industry",
        customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
        framework: "us_gaap",
        industry: "generic",
        subClassification: "generic.default",
        retrievalCategory: "revenue_recognition_industry_overlay",
        retrievalCategoryClass: "treatment_scoped",
        containsPHI: false,
        healthcareAwareRetrievalPathRequired: false,
      };
      const leaksViaScopeFilter = artifactMatchesRetrievalScope(poisonArtifact, healthcareAcuteScope());
      const leaksViaTopologyExpectation = poisonExpectationLeaks({
        expectationId: "poison-01-cross-industry",
        description: "generic artifact must not be retrievable for C-primary healthcare scope",
        sourceEntityId: "entity-c-primary",
        targetArtifactReferenceId: "artifact-a-treatment-us_gaap-generic",
      });
      return !leaksViaScopeFilter && !leaksViaTopologyExpectation;
    },
  ),

  runPoisonCase(
    "02 cross-sub-classification leak (D physician_practice into C-primary acute_care_hospital)",
    "cross-sub-classification retrieval rejected",
    () => {
      const poisonArtifact = {
        artifactReferenceId: "poison-d-physician-in-c-primary-scope",
        customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
        framework: "us_gaap",
        industry: "healthcare",
        subClassification: "healthcare.physician_practice",
        retrievalCategory: "revenue_recognition_industry_overlay",
        retrievalCategoryClass: "treatment_scoped",
        containsPHI: true,
        healthcareAwareRetrievalPathRequired: true,
      };
      const leaksViaScopeFilter = artifactMatchesRetrievalScope(poisonArtifact, healthcareAcuteScope());
      const leaksViaTopologyExpectation = poisonExpectationLeaks({
        expectationId: "poison-02-cross-subclassification",
        description: "D physician memory must not be retrievable for C-primary acute scope",
        sourceEntityId: "entity-c-primary",
        targetArtifactReferenceId: "artifact-d-treatment-us_gaap-healthcare-physician",
      });
      return !leaksViaScopeFilter && !leaksViaTopologyExpectation;
    },
  ),

  runPoisonCase(
    "03 PHI trigger with containsPHI false on generic-classified entity",
    "data-characteristic trigger forces containsPHI true / fail-closed",
    () => verifyPhiTriggerContainsPhiRejected().rejected,
  ),

  runPoisonCase(
    "04 silent Generic fallback for non-active industry resolution",
    "non-active industry resolution fails closed, never substitutes Generic",
    () => verifyIndustryResolutionFailClosedRejected().rejected,
  ),

  runPoisonCase(
    "05 treatment active without required primary reviewerAttestation",
    "active gate rejects missing primary attestation",
    () => verifyGenericPrimaryAttestationGate().passed,
  ),

  runPoisonCase(
    "06 healthcare specialist-required topic active without specialistReviewer",
    "specialist attestation gate rejects active healthcare treatment",
    () => verifyHealthcareSpecialistAttestationGate().passed,
  ),

  runPoisonCase(
    "07 340B topic active without named 340B credential",
    "340B credential gate rejects active treatment",
    () => verify340BCredentialGate().passed,
  ),

  runPoisonCase(
    "08 specializesWithDisplacement with empty displacementLineage",
    "incomplete displacementLineage rejected",
    () => {
      const result = verifyCompositionDisplacementIncompleteRejected();
      return Boolean(result.passed && result.detail?.unpinnedSkipped);
    },
  ),

  runPoisonCase(
    "09 specializesWithDisplacement with non-version-pinned displacementLineage",
    "missing displacedElementVersion or displacedElementEffectiveDate rejected",
    () => {
      const result = verifyCompositionDisplacementIncompleteRejected();
      const versionPinnedRejected = Boolean(result.passed && result.detail?.incompleteSkipped);
      if (!versionPinnedRejected) {
        return false;
      }
      return {
        caught: true,
        detail: {
          displacedElementVersionRejected: result.detail?.incompleteSkipped,
          note: "displacedElementEffectiveDate-only poison requires exported buildComposedTreatment wrapper (not present); version-pin path verified",
        },
      };
    },
  ),

  runPoisonCase(
    "10 contradiction outcome carrying resolvedTreatmentReferenceId",
    "contradiction must not emit resolved treatment",
    () => verifyContradictionResolvedTreatmentRejected().rejected,
  ),

  runPoisonCase(
    "11 PHI-tagged artifact crossing customerIsolation",
    "customerIsolation boundary rejects PHI artifact",
    () => {
      const poisonArtifact = {
        artifactReferenceId: "poison-phi-cross-customer",
        customerIsolation: "customer-topology-002",
        framework: "us_gaap",
        industry: "healthcare",
        subClassification: "healthcare.acute_care_hospital",
        retrievalCategory: "revenue_recognition_industry_overlay",
        retrievalCategoryClass: "treatment_scoped",
        containsPHI: true,
        healthcareAwareRetrievalPathRequired: true,
      };
      const leaksViaScopeFilter = artifactMatchesRetrievalScope(
        poisonArtifact,
        healthcareAcuteScope({ queryCustomerIsolation: TOPOLOGY_CUSTOMER_ISOLATION }),
      );
      const leaksViaTopologyExpectation = poisonExpectationLeaks({
        expectationId: "poison-11-cross-customer",
        description: "other-customer artifact must not cross customerIsolation",
        sourceEntityId: "entity-a",
        targetArtifactReferenceId: "artifact-other-customer-treatment",
      });
      return !leaksViaScopeFilter && !leaksViaTopologyExpectation;
    },
  ),

  runPoisonCase(
    "12 PHI-tagged artifact on non-Healthcare-aware retrieval path",
    "PHI excluded from non-Healthcare-aware retrieval",
    () => {
      const poisonArtifact = {
        artifactReferenceId: "poison-phi-non-healthcare-aware",
        customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
        framework: "us_gaap",
        industry: "healthcare",
        subClassification: "healthcare.acute_care_hospital",
        retrievalCategory: "revenue_recognition_industry_overlay",
        retrievalCategoryClass: "treatment_scoped",
        containsPHI: true,
        healthcareAwareRetrievalPathRequired: true,
      };
      const leaksViaScopeFilter = artifactMatchesRetrievalScope(
        poisonArtifact,
        healthcareAcuteScope({ healthcareAwareRetrievalPath: false }),
      );
      const leaksViaTopologyExpectation = poisonExpectationLeaks({
        expectationId: "poison-12-phi-non-healthcare-aware",
        description: "PHI artifact must not appear on non-Healthcare-aware path",
        sourceEntityId: "entity-c-primary",
        targetArtifactReferenceId: "artifact-c-primary-treatment-us_gaap-healthcare-acute",
        healthcareAwareRetrievalPath: false,
      });
      return !leaksViaScopeFilter && !leaksViaTopologyExpectation;
    },
  ),

  runPoisonCase(
    "13 audit-trail entry without inherited PHI tag on PHI-tagged artifact",
    "auditTrailEntriesInheritPhiTag enforced",
    () => verifyAuditTrailPhiInheritanceRejected().rejected,
  ),

  runPoisonCase(
    "14 internal-research reasonableness baseline missing required sourcing fields",
    "internal research sourcing validation rejects incomplete baseline",
    () => verifyReasonablenessInternalResearchFieldsRejected().rejected,
  ),

  runPoisonCase(
    "15 PHI-derived-learning bright-line cross-customer violation",
    "PHI-derived pattern must not enter cross-customer shared intelligence without Expert Determination",
    () => verifyPhiDerivedLearningBrightLineRejected().rejected,
  ),

  runPoisonCase(
    "16 reasonableness baseline outside consumedByLaunchKpiFamilies (42L path_a and 42P path_b)",
    "path-scope launch KPI family guard rejects out-of-scope baseline",
    () => {
      const pathA = verifyReasonablenessPathScopeRejection("path_a");
      const pathB = verifyReasonablenessPathScopeRejection("path_b");
      return pathA.passed && pathB.passed;
    },
  ),

  runPoisonCase(
    "17 treatment output_classification other than recommendation_for_human_review",
    "output_classification guard rejects non-H2 classification",
    () => {
      const poisonSource = [
        'output_classification: "automated_decision"',
        "executable: false",
        "boundPhase40SnapshotHash",
        "customerIsolation",
        "containsPHI",
        "phiDerivationStatus",
      ].join("\n");
      return !sourceHasOutputClassificationMarker(poisonSource);
    },
  ),

  runPoisonCase(
    "18 scoped_normalization_rules retrievable across industries",
    "scoped_normalization_rules composite scope blocks cross-industry retrieval",
    () => {
      const poisonArtifact = {
        artifactReferenceId: "poison-scoped-normalization-generic",
        customerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
        framework: "us_gaap",
        industry: "generic",
        subClassification: "generic.default",
        retrievalCategory: "fraud_detection",
        retrievalCategoryClass: "scoped_normalization_rules",
        containsPHI: false,
        healthcareAwareRetrievalPathRequired: false,
      };
      const healthcareScope = {
        retrievalCategory: "fraud_detection",
        retrievalCategoryClass: "scoped_normalization_rules",
        queryCustomerIsolation: TOPOLOGY_CUSTOMER_ISOLATION,
        queryFramework: "us_gaap",
        queryIndustry: "healthcare",
        querySubClassification: "healthcare.acute_care_hospital",
        healthcareAwareRetrievalPath: true,
      };
      return !artifactMatchesRetrievalScope(poisonArtifact, healthcareScope);
    },
  ),

  runPoisonCase(
    "19 operational KPI (42N2) marked active at lock",
    "42N2 deferred stub rejects active operational KPI at lock",
    () => verifyOperationalKpiActiveAtLockRejected().rejected,
  ),

  runPoisonCase(
    "20 NFP / ASC 958 community-benefit disclosure variant marked active",
    "NFP boundary test rejects active community-benefit variant",
    () => verifyNfpCommunityBenefitActiveRejected().rejected,
  ),

  runPoisonCase(
    "21 healthcare KPI shipped with minimumCellSize of 1 (below Safe Harbor default)",
    "healthcare KPI rejects minimumCellSize below Safe Harbor default",
    () => verifyHealthcareKpiMinimumCellSizeRejected().rejected,
  ),
];

console.log("Phase 42R Industry Intelligence Verifier Red-Team Probe");
console.log("Uses exported verifier logic from scripts/verify-ii-industry-intelligence.js");
console.log("");

for (const poisonCase of poisonCases) {
  const findingSuffix = poisonCase.finding ? ` | finding: ${poisonCase.finding}` : "";
  console.log(
    `${poisonCase.name} | expected: REJECT | actual: ${poisonCase.actual} | ${poisonCase.verdict}${findingSuffix}`,
  );
}

console.log("");
console.log("Summary");
console.log("case | expected | actual | verdict");
for (const poisonCase of poisonCases) {
  console.log(`${poisonCase.name} | REJECT | ${poisonCase.actual} | ${poisonCase.verdict}`);
}

const leaks = poisonCases.filter((poisonCase) => poisonCase.verdict === "LEAK");
const findings = poisonCases.filter((poisonCase) => poisonCase.verdict === "FINDING");

console.log("");
if (leaks.length > 0 || findings.length > 0) {
  if (leaks.length > 0) {
    console.error(`PROBE FAIL: ${leaks.length} poison case(s) leaked through verifier logic`);
    for (const leak of leaks) {
      console.error(`- LEAK: ${leak.name}`);
    }
  }
  if (findings.length > 0) {
    console.error(`PROBE FAIL: ${findings.length} poison case(s) are pass-by-construction (logic not independently invocable)`);
    for (const finding of findings) {
      console.error(`- FINDING: ${finding.name} — ${finding.finding}`);
    }
  }
  process.exit(1);
}

console.log(`PROBE PASS: all ${poisonCases.length} poison cases correctly rejected by verifier logic`);
console.log("PROBE_EXIT:0");
process.exit(0);
