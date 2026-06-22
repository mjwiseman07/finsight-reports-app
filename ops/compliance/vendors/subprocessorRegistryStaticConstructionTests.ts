import {
  assertBaaOnFile,
  evaluateBaaAssertionForRecord,
  listPhiAuthorizedSubprocessors,
  proveOutboundPhiBoundary,
  validateInventoryLlmRule,
  SUBPROCESSOR_REGISTRY_REFERENCE_DATE_ISO,
  type SubprocessorAssertionResult,
  type SubprocessorRecord,
} from "./subprocessorRegistry";

export interface SubprocessorRegistryStaticConstructionCase {
  caseId: string;
  description: string;
  expectedDecision: "DENY" | "ALLOW";
  run(): SubprocessorAssertionResult | { decision: "DENY" | "ALLOW"; pass: boolean };
}

export interface SubprocessorRegistryStaticConstructionCaseResult {
  caseId: string;
  description: string;
  passed: boolean;
  decision: string;
  details: Record<string, unknown>;
}

const HIPAA_TENANT = "tenant:hipaa-overlay";
const PHI_TAG = [{ taxonomy: "patient-identifier", phi: true }];
const NON_PHI_TAG = [{ taxonomy: "financial-summary", phi: false }];

function syntheticRecord(overrides: Partial<SubprocessorRecord>): SubprocessorRecord {
  return {
    subprocessorId: "synthetic-test",
    vendorName: "Synthetic Test Vendor",
    category: "other",
    dataAccessScope: "phi-possible",
    baaStatus: "baa-pending",
    baaExecutedDate: null,
    baaExpirationDate: null,
    baaDocumentReference: null,
    socReportOnFile: false,
    socReportCadence: "none",
    spineEnforcedNonPhiPath: false,
    spineEnforcedNonPhiPathProofReference: null,
    notes: "static test fixture",
    reviewCadence: "annual",
    lastReviewedDate: null,
    ...overrides,
  };
}

export const SUBPROCESSOR_REGISTRY_STATIC_CONSTRUCTION_CASES: SubprocessorRegistryStaticConstructionCase[] =
  [
    {
      caseId: "SC-01-BAA-ON-FILE-PHI-ALLOW",
      description: "BAA on file + PHI in payload → ALLOW",
      expectedDecision: "ALLOW",
      run() {
        return evaluateBaaAssertionForRecord(
          syntheticRecord({ subprocessorId: "test-baa-on-file", baaStatus: "baa-on-file" }),
          {
            subprocessorId: "test-baa-on-file",
            tenantId: HIPAA_TENANT,
            overlayActive: ["hipaa"],
            payloadTags: PHI_TAG,
          },
        );
      },
    },
    {
      caseId: "SC-02-BAA-PENDING-PHI-DENY",
      description: "BAA pending + PHI in payload → DENY",
      expectedDecision: "DENY",
      run() {
        return assertBaaOnFile({
          subprocessorId: "openai-api",
          tenantId: HIPAA_TENANT,
          overlayActive: ["hipaa"],
          payloadTags: PHI_TAG,
        });
      },
    },
    {
      caseId: "SC-03-BAA-EXPIRED-DENY",
      description: "BAA on file but expired → DENY",
      expectedDecision: "DENY",
      run() {
        return assertBaaOnFile({
          subprocessorId: "synthetic-probe-expired-baa",
          tenantId: HIPAA_TENANT,
          overlayActive: ["hipaa"],
          payloadTags: PHI_TAG,
        });
      },
    },
    {
      caseId: "SC-04-BAA-ON-FILE-NO-PHI-ALLOW",
      description: "BAA pending + no PHI in payload → ALLOW",
      expectedDecision: "ALLOW",
      run() {
        return assertBaaOnFile({
          subprocessorId: "openai-api",
          tenantId: HIPAA_TENANT,
          overlayActive: ["hipaa"],
          payloadTags: NON_PHI_TAG,
        });
      },
    },
    {
      caseId: "SC-05-BAA-REQUIRED-NO-BAA-DENY",
      description: "baa-required-no-baa status + PHI → DENY (PC-12 explicit case)",
      expectedDecision: "DENY",
      run() {
        return evaluateBaaAssertionForRecord(
          syntheticRecord({
            subprocessorId: "test-no-baa",
            baaStatus: "baa-required-no-baa",
            category: "llm-ai-endpoint",
          }),
          {
            subprocessorId: "test-no-baa",
            tenantId: HIPAA_TENANT,
            overlayActive: ["hipaa"],
            payloadTags: PHI_TAG,
          },
        );
      },
    },
    {
      caseId: "SC-06-SPINE-ENFORCED-NON-PHI-ALLOW",
      description: "spine-enforced-non-phi + no PHI + valid proof → ALLOW",
      expectedDecision: "ALLOW",
      run() {
        return assertBaaOnFile({
          subprocessorId: "anthropic-api",
          tenantId: HIPAA_TENANT,
          overlayActive: ["hipaa"],
          payloadTags: NON_PHI_TAG,
        });
      },
    },
    {
      caseId: "SC-07-SPINE-ENFORCED-PHI-DENY",
      description: "spine-enforced-non-phi + PHI detected upstream → DENY",
      expectedDecision: "DENY",
      run() {
        return assertBaaOnFile({
          subprocessorId: "anthropic-api",
          tenantId: HIPAA_TENANT,
          overlayActive: ["hipaa"],
          payloadTags: PHI_TAG,
        });
      },
    },
    {
      caseId: "SC-08-NOT-IN-INVENTORY-DENY",
      description: "Subprocessor not in inventory → DENY",
      expectedDecision: "DENY",
      run() {
        return assertBaaOnFile({
          subprocessorId: "unknown-vendor-xyz",
          tenantId: HIPAA_TENANT,
          overlayActive: ["hipaa"],
          payloadTags: PHI_TAG,
        });
      },
    },
    {
      caseId: "SC-09-BAA-N-A-DATA-FLOW-DENY",
      description: "baa-not-applicable + data flow detected → DENY",
      expectedDecision: "DENY",
      run() {
        return assertBaaOnFile({
          subprocessorId: "github-source-hosting",
          tenantId: "tenant:non-healthcare",
          overlayActive: [],
          payloadTags: NON_PHI_TAG,
        });
      },
    },
    {
      caseId: "SC-10-INVALID-LLM-INVENTORY-DENY",
      description: "Invalid LLM inventory config (phi-possible + baa-not-applicable) fails validation",
      expectedDecision: "DENY",
      run() {
        const invalid = validateInventoryLlmRule([
          syntheticRecord({
            subprocessorId: "invalid-llm",
            category: "llm-ai-endpoint",
            dataAccessScope: "phi-possible",
            baaStatus: "baa-not-applicable",
          }),
        ]);
        return { decision: invalid.pass ? "ALLOW" : "DENY", pass: !invalid.pass };
      },
    },
    {
      caseId: "SC-11-PROVE-BOUNDARY-MIXED-FAIL",
      description: "proveOutboundPhiBoundary with invalid PHI flow returns pass:false",
      expectedDecision: "DENY",
      run() {
        const result = proveOutboundPhiBoundary([
          {
            flowId: "flow:invalid-phi-openai",
            subprocessorId: "openai-api",
            tenantId: HIPAA_TENANT,
            overlayActive: ["hipaa"],
            payloadTags: PHI_TAG,
          },
        ]);
        return { decision: result.pass ? "ALLOW" : "DENY", pass: !result.pass };
      },
    },
    {
      caseId: "SC-12-LIST-PHI-AUTHORIZED",
      description: "listPhiAuthorizedSubprocessors returns only baa-on-file non-expired entries",
      expectedDecision: "ALLOW",
      run() {
        const authorized = listPhiAuthorizedSubprocessors();
        const ok =
          authorized.every((entry) => entry.baaStatus === "baa-on-file") &&
          authorized.every(
            (entry) =>
              !entry.baaExpirationDate ||
              entry.baaExpirationDate >= SUBPROCESSOR_REGISTRY_REFERENCE_DATE_ISO,
          );
        return {
          decision: ok ? "ALLOW" : "DENY",
          reason: ok ? "phi_authorized_list_valid" : "phi_authorized_list_invalid",
          evidence: {
            subprocessorId: "list-phi-authorized-check",
            baaStatus: "unknown",
            phiInPayload: false,
            spineEnforcedNonPhiPath: false,
          },
        };
      },
    },
  ];

export function executeSubprocessorRegistryStaticConstructionTests(): {
  pass: boolean;
  results: SubprocessorRegistryStaticConstructionCaseResult[];
} {
  const results = SUBPROCESSOR_REGISTRY_STATIC_CONSTRUCTION_CASES.map((testCase) => {
    const outcome = testCase.run();
    const decision = "decision" in outcome ? outcome.decision : "DENY";
    const passed =
      "pass" in outcome && typeof outcome.pass === "boolean"
        ? outcome.pass
        : decision === testCase.expectedDecision;
    return {
      caseId: testCase.caseId,
      description: testCase.description,
      passed,
      decision,
      details: { outcome },
    };
  });

  return {
    pass: results.every((result) => result.passed),
    results,
  };
}
