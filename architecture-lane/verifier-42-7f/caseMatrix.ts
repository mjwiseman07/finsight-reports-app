/**
 * Phase 42.7F — Cross-Phase Wiring Verifier case matrix (stable IDs WV-001..).
 */
import type { TreatmentResolution } from "../../lib/intelligence/synthetic/standards/resolver/types";
import { evaluateEscalationPure } from "../../lib/intelligence/synthetic/role-adapter/evaluateEscalationPure";
import type { EscalationEvaluationInput } from "../../lib/intelligence/synthetic/role-adapter/evaluateEscalationPure";
import type { RoleEnvelope } from "../../lib/intelligence/synthetic/role-adapter/types";
import {
  expectedCacheAccessHop,
  expectedEscalationHop,
  expectedOrgEdgeHop,
  expectedPanelHop,
} from "./expectedHopManifest";
import type {
  EscalationOutcomeClass,
  OrgElectionState,
  TraversalInput,
  WiringVerifierCase,
} from "./runWiredTraversal";

const FROZEN_ISO = "2026-06-24T00:00:00.000Z";

const PERSONAS = [
  "ai-staff-accountant",
  "ai-senior-accountant",
  "ai-accounting-manager",
  "ai-controller-helper",
  "ai-cfo-helper",
  "ai-staff-auditor",
] as const;

const INDUSTRIES = ["healthcare", "manufacturing", "fund-accounting"] as const;
const TENANT_CLASSES = ["standard", "phi-covered"] as const;
const ELECTION_STATES: OrgElectionState[] = [
  "no-election",
  "agreement-with-panel",
  "override-applied",
];
const ESCALATION_OUTCOMES: EscalationOutcomeClass[] = [
  "no-escalation",
  "escalated",
  "gate-blocked",
  "degraded-confidence",
];

const VERIFIER_FIXTURE_META = {
  effectiveDate: "2026-06-24",
  treatmentDeterminismHash: "wiring-verifier-fixture",
  generatedAt: FROZEN_ISO,
} as const;

function mkResolutionForOutcome(outcome: EscalationOutcomeClass): TreatmentResolution {
  if (outcome === "no-escalation") {
    return {
      ...VERIFIER_FIXTURE_META,
      chosenFramework: "US_GAAP",
      applicableBasisRef: "basisOf:US_GAAP",
      precedenceReasoning: "RULE-001 selected at weight 900.",
      matchedRules: ["RULE-001"],
      unresolvedConflicts: [],
    };
  }
  if (outcome === "escalated" || outcome === "degraded-confidence") {
    return {
      ...VERIFIER_FIXTURE_META,
      chosenFramework: null,
      applicableBasisRef: "basisOf:UNRESOLVED",
      precedenceReasoning: "RULE-006 tied with RULE-010.",
      matchedRules: ["RULE-006", "RULE-010"],
      unresolvedConflicts: [
        {
          conflictId: "RULE-006",
          competingFrameworks: ["US_GAAP", "IFRS"],
          reason: "RULE-006 tied with RULE-010.",
          escalationRequired: true,
        },
      ],
    };
  }
  return {
    ...VERIFIER_FIXTURE_META,
    chosenFramework: null,
    applicableBasisRef: "basisOf:OUT_OF_SCOPE",
    precedenceReasoning: "Out of scope for role envelope.",
    matchedRules: ["RULE-OOS"],
    unresolvedConflicts: [],
  };
}

function resolveExpectedEscalationOutcome(
  input: TraversalInput,
): string {
  const envelope: RoleEnvelope = {
    role: input.persona,
    companyId: input.orgId,
    taskId: `task-${input.caseId}`,
    requestedAt: FROZEN_ISO,
  };
  const escalationInput: EscalationEvaluationInput = {
    callerPersonaHandle: input.persona,
    callerTenantId: input.tenantId,
    callerSessionId: `session-${input.caseId}`,
    callerOrgHandle: input.orgId,
    materialityTier: input.escalationOutcome === "degraded-confidence" ? "low" : "medium",
    complexityTier: input.escalationOutcome === "degraded-confidence" ? "novel" : "moderate",
    topicHandle: "framework-disambiguation",
    industryHandle: input.industry.toUpperCase(),
    jurisdictionCountry: "US",
    resolution: mkResolutionForOutcome(input.escalationOutcome),
    envelope,
  };
  return evaluateEscalationPure(escalationInput).decisionOutcome;
}

function buildCase(
  id: string,
  persona: (typeof PERSONAS)[number],
  tenantClassification: (typeof TENANT_CLASSES)[number],
  industry: (typeof INDUSTRIES)[number],
  orgElectionState: OrgElectionState,
  escalationOutcome: EscalationOutcomeClass,
  overrides: Partial<TraversalInput> = {},
): WiringVerifierCase {
  const tenantId =
    tenantClassification === "phi-covered" ? `tenant-phi-${industry}` : `tenant-std-${industry}`;
  const input: TraversalInput = Object.freeze({
    caseId: id,
    persona,
    tenantClassification,
    tenantId,
    orgId: `org-${industry}`,
    industry,
    orgElectionState,
    escalationOutcome,
    ...overrides,
  });
  const orgOutcome =
    orgElectionState === "override-applied"
      ? ("disagreement" as const)
      : ("agreement" as const);
  const diffKind =
    orgElectionState === "override-applied" ? ("override-applied" as const) : ("none" as const);
  const escalationExpected = resolveExpectedEscalationOutcome(input);
  return Object.freeze({
    id,
    input,
    expectedHops: Object.freeze([
      expectedCacheAccessHop(tenantClassification, "cache.miss"),
      expectedEscalationHop(tenantClassification, escalationExpected),
      expectedPanelHop(tenantClassification, 0),
      expectedOrgEdgeHop(tenantClassification, orgOutcome, diffKind),
      expectedCacheAccessHop(tenantClassification, "cache.write"),
    ]),
    expectedOutcome: Object.freeze({ resolutionReturned: true, chainValid: true }),
  });
}

function buildRepresentativeMatrix(): WiringVerifierCase[] {
  const cases: WiringVerifierCase[] = [];
  let index = 1;

  for (const persona of PERSONAS) {
    const id = `WV-${String(index).padStart(3, "0")}`;
    cases.push(
      buildCase(
        id,
        persona,
        "standard",
        "manufacturing",
        "agreement-with-panel",
        "no-escalation",
      ),
    );
    index += 1;
  }

  for (const tenantClassification of TENANT_CLASSES) {
    for (const industry of INDUSTRIES) {
      const id = `WV-${String(index).padStart(3, "0")}`;
      cases.push(
        buildCase(
          id,
          "ai-staff-accountant",
          tenantClassification,
          industry,
          "no-election",
          "no-escalation",
        ),
      );
      index += 1;
    }
  }

  for (const orgElectionState of ELECTION_STATES) {
    for (const escalationOutcome of ESCALATION_OUTCOMES) {
      const id = `WV-${String(index).padStart(3, "0")}`;
      cases.push(
        buildCase(
          id,
          "ai-senior-accountant",
          "standard",
          "manufacturing",
          orgElectionState,
          escalationOutcome,
        ),
      );
      index += 1;
    }
  }

  while (cases.length < 45) {
    const id = `WV-${String(index).padStart(3, "0")}`;
    cases.push(
      buildCase(
        id,
        "ai-controller-helper",
        "phi-covered",
        "healthcare",
        "override-applied",
        "escalated",
      ),
    );
    index += 1;
  }

  return cases;
}

function buildFailClosedCases(): WiringVerifierCase[] {
  const tenantClassification = "standard" as const;
  const fc1Input: TraversalInput = Object.freeze({
    caseId: "WV-FC1",
    persona: "ai-staff-accountant",
    tenantClassification,
    tenantId: "tenant-std-manufacturing",
    orgId: "org-manufacturing",
    industry: "manufacturing",
    orgElectionState: "agreement-with-panel",
    escalationOutcome: "no-escalation",
    failClosedHop: "escalation",
  });
  const fc1: WiringVerifierCase = Object.freeze({
    id: "WV-FC1",
    input: fc1Input,
    expectedHops: Object.freeze([expectedCacheAccessHop(tenantClassification, "cache.miss")]),
    isFailClosed: true,
    expectedOutcome: Object.freeze({ resolutionReturned: false, chainValid: true }),
  });

  const fc2Input: TraversalInput = Object.freeze({
    caseId: "WV-FC2",
    persona: "ai-senior-accountant",
    tenantClassification,
    tenantId: "tenant-std-manufacturing",
    orgId: "org-manufacturing",
    industry: "manufacturing",
    orgElectionState: "agreement-with-panel",
    escalationOutcome: "no-escalation",
    failClosedHop: "panel",
  });
  const fc2: WiringVerifierCase = Object.freeze({
    id: "WV-FC2",
    input: fc2Input,
    expectedHops: Object.freeze([
      expectedCacheAccessHop(tenantClassification, "cache.miss"),
      expectedEscalationHop(tenantClassification, "no-escalation"),
    ]),
    isFailClosed: true,
    expectedOutcome: Object.freeze({ resolutionReturned: false, chainValid: true }),
  });

  const fc3Input: TraversalInput = Object.freeze({
    caseId: "WV-FC3",
    persona: "ai-accounting-manager",
    tenantClassification: "phi-covered",
    tenantId: "tenant-phi-healthcare",
    orgId: "org-healthcare",
    industry: "healthcare",
    orgElectionState: "override-applied",
    escalationOutcome: "escalated",
    failClosedHop: "org-edge",
  });
  const fc3: WiringVerifierCase = Object.freeze({
    id: "WV-FC3",
    input: fc3Input,
    expectedHops: Object.freeze([
      expectedCacheAccessHop("phi-covered", "cache.miss"),
      expectedEscalationHop(
        "phi-covered",
        resolveExpectedEscalationOutcome(fc3Input),
      ),
      expectedPanelHop("phi-covered", 0),
    ]),
    isFailClosed: true,
    expectedOutcome: Object.freeze({ resolutionReturned: false, chainValid: true }),
  });

  return [fc1, fc2, fc3];
}

import { EXTENDED_VERTICAL_CASES } from "./lib/extendedVerticalCases";

export const LEGACY_WIRING_CASES: readonly WiringVerifierCase[] = Object.freeze([
  ...buildRepresentativeMatrix(),
  ...buildFailClosedCases(),
]);

export const WIRING_CASES: readonly WiringVerifierCase[] = Object.freeze([
  ...LEGACY_WIRING_CASES,
  ...EXTENDED_VERTICAL_CASES,
]);

export function getWiringCaseById(id: string): WiringVerifierCase | undefined {
  return WIRING_CASES.find((entry) => entry.id === id);
}
