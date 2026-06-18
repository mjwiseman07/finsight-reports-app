const verifier = require("./verify-si-standards-intelligence");

const {
  resolveRetrievalOutcome,
  classifyMemoryCategory,
  filterRetrievableArtifacts,
  canRetrieveArtifact,
  simulateTreatmentActiveGate,
  evaluateContainsCopyrightedTextViolation,
  evaluateExecutableTrueViolation,
  evaluateRoleAdapterPhase39Violation,
  evaluateFrameworkSelectabilityViolation,
} = verifier;

const CUSTOMER_A = "customer-probe-1";
const CUSTOMER_B = "customer-probe-2";

function runPoisonCase(name, expectedReject, evaluatePoison) {
  const caught = evaluatePoison();
  const verdict = caught ? "PASS" : "LEAK";
  const actual = caught ? "REJECTED" : "ACCEPTED";

  return {
    name,
    expectedReject,
    actual,
    verdict,
    caught,
  };
}

const poisonCases = [
  runPoisonCase(
    "seg-01 cross-framework us_gaap artifact in ifrs_iasb scope",
    "cross_framework_blocked or empty retrieval",
    () => {
      const outcome = resolveRetrievalOutcome({
        memoryCategory: "revenue_recognition",
        requestedFrameworks: ["ifrs_iasb"],
        artifactFramework: "us_gaap",
        retrievedReferenceIds: ["poison-us-gaap"],
      });
      return (
        outcome.retrievalStatus === "fail_closed" &&
        outcome.failClosedReason === "cross_framework_blocked" &&
        outcome.retrievedReferenceIds.length === 0
      );
    },
  ),
  runPoisonCase(
    "seg-02 treatment-scoped retrieval without framework returns scoped memory",
    "framework_unspecified fail_closed",
    () => {
      const outcome = resolveRetrievalOutcome({
        memoryCategory: "revenue_recognition",
        requestedFrameworks: [],
        artifactFramework: "us_gaap",
        retrievedReferenceIds: ["poison-treatment-scoped"],
      });
      return (
        outcome.retrievalStatus === "fail_closed" &&
        outcome.failClosedReason === "framework_unspecified" &&
        outcome.retrievedReferenceIds.length === 0
      );
    },
  ),
  runPoisonCase(
    "seg-03 silent substitution to active framework when unpopulated requested",
    "no cross-framework artifacts retained for unpopulated request",
    () => {
      const retained = filterRetrievableArtifacts(
        [{ id: "poison-us-gaap", framework: "us_gaap", category: "revenue_recognition" }],
        { requestedFrameworks: ["ifrs_eu"] },
      );
      return retained.length === 0;
    },
  ),
  runPoisonCase(
    "seg-04 unknown category resolves shared or scoped instead of category_unknown",
    "category_unknown fail_closed",
    () => {
      const outcome = resolveRetrievalOutcome({
        memoryCategory: "poison_unknown_category",
        requestedFrameworks: ["us_gaap"],
        artifactFramework: "us_gaap",
        retrievedReferenceIds: ["poison-unknown"],
      });
      return (
        outcome.retrievalStatus === "fail_closed" &&
        outcome.failClosedReason === "category_unknown" &&
        outcome.retrievedReferenceIds.length === 0
      );
    },
  ),
  runPoisonCase(
    "top-05 Entity A us_gaap memory retrievable for Entity B ifrs_for_smes",
    "cross-entity cross-framework blocked",
    () => {
      const artifact = {
        id: "entity-A-us-gaap",
        customerId: CUSTOMER_A,
        framework: "us_gaap",
        category: "revenue_recognition",
        book: "primary",
      };
      return !canRetrieveArtifact(artifact, {
        customerId: CUSTOMER_A,
        requestedFrameworks: ["ifrs_for_smes"],
        book: "primary",
      });
    },
  ),
  runPoisonCase(
    "top-06 Entity C primary us_gaap memory visible in secondary ifrs_iasb book",
    "intra-entity dual-book segregation",
    () => {
      const artifact = {
        id: "entity-C-primary",
        customerId: CUSTOMER_A,
        framework: "us_gaap",
        category: "inventory_measurement",
        book: "primary",
      };
      return !canRetrieveArtifact(artifact, {
        customerId: CUSTOMER_A,
        requestedFrameworks: ["us_gaap"],
        book: "secondary",
      });
    },
  ),
  runPoisonCase(
    "top-07 artifact crosses customerIsolation with matching framework",
    "customerIsolation boundary enforced",
    () => {
      const artifact = {
        id: "other-customer-us-gaap",
        customerId: CUSTOMER_B,
        framework: "us_gaap",
        category: "revenue_recognition",
        book: "primary",
      };
      return !canRetrieveArtifact(artifact, {
        customerId: CUSTOMER_A,
        requestedFrameworks: ["us_gaap"],
        book: "primary",
      });
    },
  ),
  runPoisonCase(
    "top-08 framework-agnostic memory wrongly blocked across same-customer entities",
    "fraud_detection remains shared across entities",
    () => {
      const artifact = {
        id: "agnostic-fraud",
        customerId: CUSTOMER_A,
        framework: "",
        category: "fraud_detection",
        book: "shared",
      };
      const classification = classifyMemoryCategory("fraud_detection");
      const outcome = resolveRetrievalOutcome({
        memoryCategory: "fraud_detection",
        requestedFrameworks: [],
        retrievedReferenceIds: [artifact.id],
      });
      const propagates = canRetrieveArtifact(artifact, {
        customerId: CUSTOMER_A,
        requestedFrameworks: [],
        book: "shared",
      });
      return (
        classification?.memoryCategoryClass === "framework_agnostic" &&
        outcome.retrievalStatus === "shared" &&
        propagates
      );
    },
  ),
  runPoisonCase(
    "guard-09 treatment containsCopyrightedText true",
    "containsCopyrightedText violation detected",
    () => evaluateContainsCopyrightedTextViolation("containsCopyrightedText: true"),
  ),
  runPoisonCase(
    "guard-10 treatment active without reviewerIdentity or reviewDate",
    "active gate downgrades to in_review",
    () => {
      const status = simulateTreatmentActiveGate({
        treatmentStatus: "active",
        isHumanReviewed: true,
        reviewerIdentity: "",
        reviewDate: "",
        reviewAttestationReferenceId: "",
      });
      return status !== "active";
    },
  ),
  runPoisonCase(
    "guard-11 artifact executable true",
    "executable true violation detected",
    () => evaluateExecutableTrueViolation("executable: true"),
  ),
  runPoisonCase(
    "guard-12 role-adapter imports Phase 39 roles namespace directly",
    "Phase 39 namespace reach violation detected",
    () => {
      const poisonSource = [
        'import { buildRole } from "../../roles/buildRole";',
        "export const adapter = { doesNotModifyPhase39Namespace: true };",
      ].join("\n");
      return evaluateRoleAdapterPhase39Violation(poisonSource).length > 0;
    },
  ),
  runPoisonCase(
    "guard-13 non-active framework marked selectable",
    "non-active framework selectability violation detected",
    () => evaluateFrameworkSelectabilityViolation("recognized_unpopulated", true).length > 0,
  ),
];

console.log("Phase 41.5 Standards Intelligence Verifier Red-Team Probe");
console.log("Uses exported verifier logic from scripts/verify-si-standards-intelligence.js");
console.log("");

for (const poisonCase of poisonCases) {
  console.log(
    `${poisonCase.name} | expected: ${poisonCase.expectedReject} | actual: ${poisonCase.actual} | ${poisonCase.verdict}`,
  );
}

console.log("");
console.log("Summary");
console.log("case | expected | actual | verdict");
for (const poisonCase of poisonCases) {
  console.log(`${poisonCase.name} | REJECT | ${poisonCase.actual} | ${poisonCase.verdict}`);
}

const leaks = poisonCases.filter((poisonCase) => poisonCase.verdict === "LEAK");

console.log("");
if (leaks.length > 0) {
  console.error(`PROBE FAIL: ${leaks.length} poison case(s) leaked through verifier logic`);
  for (const leak of leaks) {
    console.error(`- LEAK: ${leak.name}`);
  }
  process.exit(1);
}

console.log(`PROBE PASS: all ${poisonCases.length} poison cases correctly rejected by verifier logic`);
console.log("PROBE_EXIT:0");
process.exit(0);
