/**
 * VC-5a — matrix cases for 6 verticals not in the original 42.7F scope.
 * Original 48 cases (WV-001..WV-045 + WV-FC1..3) are unchanged in caseMatrix.ts.
 */
import { evaluateEscalationPure } from "../../../lib/intelligence/synthetic/role-adapter/evaluateEscalationPure";
import type { EscalationEvaluationInput } from "../../../lib/intelligence/synthetic/role-adapter/evaluateEscalationPure";
import type { RoleEnvelope } from "../../../lib/intelligence/synthetic/role-adapter/types";
import {
  expectedCacheAccessHop,
  expectedEscalationHop,
  expectedOrgEdgeHop,
  expectedPanelHop,
} from "../expectedHopManifest";
import type {
  EscalationOutcomeClass,
  OrgElectionState,
  TraversalInput,
  WiringVerifierCase,
} from "../runWiredTraversal";
import {
  EXTENDED_CASES_PER_VERTICAL,
  EXTENDED_VERIFIER_VERTICALS,
  type VerifierVertical,
} from "./vertical-registry";

const FROZEN_ISO = "2026-06-24T00:00:00.000Z";

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

function mkResolutionForOutcome(outcome: EscalationOutcomeClass) {
  if (outcome === "no-escalation") {
    return {
      chosenFramework: "US_GAAP",
      applicableBasisRef: "basisOf:US_GAAP",
      precedenceReasoning: "RULE-001 selected at weight 900.",
      matchedRules: ["RULE-001"],
      unresolvedConflicts: [],
      citationHandlesConsulted: ["ASC_105_10_05_1"],
    };
  }
  if (outcome === "escalated" || outcome === "degraded-confidence") {
    return {
      chosenFramework: null,
      applicableBasisRef: "basisOf:UNRESOLVED",
      precedenceReasoning: "RULE-006 tied with RULE-010.",
      matchedRules: ["RULE-006", "RULE-010"],
      citationHandlesConsulted: ["SEC_REG_S_X", "IAS_1_PRESENTATION"],
      unresolvedConflicts: [
        { ruleId: "RULE-006", producedFramework: "US_GAAP", citationRef: "SEC_REG_S_X" },
        { ruleId: "RULE-010", producedFramework: "IFRS", citationRef: "IAS_1_PRESENTATION" },
      ],
    };
  }
  return {
    chosenFramework: null,
    applicableBasisRef: "basisOf:OUT_OF_SCOPE",
    precedenceReasoning: "Out of scope for role envelope.",
    matchedRules: ["RULE-OOS"],
    unresolvedConflicts: [],
    citationHandlesConsulted: ["ASC_105_10_05_1"],
  };
}

function resolveExpectedEscalationOutcome(input: TraversalInput): string {
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
    resolution: mkResolutionForOutcome(input.escalationOutcome) as EscalationEvaluationInput["resolution"],
    envelope,
  };
  return evaluateEscalationPure(escalationInput).decisionOutcome;
}

function buildCase(
  id: string,
  persona: TraversalInput["persona"],
  tenantClassification: (typeof TENANT_CLASSES)[number],
  industry: VerifierVertical,
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

function buildExtendedCasesForVertical(
  industry: VerifierVertical,
  startIndex: number,
): { cases: WiringVerifierCase[]; nextIndex: number } {
  const cases: WiringVerifierCase[] = [];
  let index = startIndex;

  for (const tenantClassification of TENANT_CLASSES) {
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

  for (const orgElectionState of ELECTION_STATES) {
    for (const escalationOutcome of ESCALATION_OUTCOMES) {
      const id = `WV-${String(index).padStart(3, "0")}`;
      cases.push(
        buildCase(
          id,
          "ai-senior-accountant",
          "standard",
          industry,
          orgElectionState,
          escalationOutcome,
        ),
      );
      index += 1;
    }
  }

  const personaCases: Array<{
    persona: TraversalInput["persona"];
    tenantClassification: (typeof TENANT_CLASSES)[number];
    orgElectionState: OrgElectionState;
    escalationOutcome: EscalationOutcomeClass;
  }> = [
    {
      persona: "ai-controller-helper",
      tenantClassification: "standard",
      orgElectionState: "agreement-with-panel",
      escalationOutcome: "no-escalation",
    },
    {
      persona: "ai-cfo-helper",
      tenantClassification: "phi-covered",
      orgElectionState: "override-applied",
      escalationOutcome: "escalated",
    },
  ];

  for (const personaCase of personaCases) {
    const id = `WV-${String(index).padStart(3, "0")}`;
    cases.push(
      buildCase(
        id,
        personaCase.persona,
        personaCase.tenantClassification,
        industry,
        personaCase.orgElectionState,
        personaCase.escalationOutcome,
      ),
    );
    index += 1;
  }

  if (cases.length !== EXTENDED_CASES_PER_VERTICAL) {
    throw new Error(
      `extended case builder for ${industry}: expected ${EXTENDED_CASES_PER_VERTICAL}, got ${cases.length}`,
    );
  }

  return { cases, nextIndex: index };
}

export function buildExtendedVerticalMatrix(): WiringVerifierCase[] {
  const allCases: WiringVerifierCase[] = [];
  let index = 49;

  for (const industry of EXTENDED_VERIFIER_VERTICALS) {
    const { cases, nextIndex } = buildExtendedCasesForVertical(industry, index);
    allCases.push(...cases);
    index = nextIndex;
  }

  return allCases;
}

export const EXTENDED_VERTICAL_CASES: readonly WiringVerifierCase[] = Object.freeze(
  buildExtendedVerticalMatrix(),
);

export const EXTENDED_CASE_COUNT_BY_VERTICAL: Readonly<Record<VerifierVertical, number>> =
  Object.freeze(
    EXTENDED_VERIFIER_VERTICALS.reduce(
      (acc, vertical) => {
        acc[vertical] = EXTENDED_CASES_PER_VERTICAL;
        return acc;
      },
      {} as Record<VerifierVertical, number>,
    ),
  );

export const LEGACY_CASE_COUNT = 48 as const;
export const EXTENDED_CASE_COUNT = EXTENDED_VERTICAL_CASES.length;
export const TOTAL_CASE_COUNT = LEGACY_CASE_COUNT + EXTENDED_CASE_COUNT;
