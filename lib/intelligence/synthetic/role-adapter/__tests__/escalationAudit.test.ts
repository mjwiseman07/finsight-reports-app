import * as fs from "node:fs";
import * as path from "node:path";
import { evaluateEscalation } from "../evaluateEscalation";
import {
  evaluateEscalationPure,
  type EscalationEvaluationInput,
} from "../evaluateEscalationPure";
import {
  InMemoryAuditLogWriter,
  verifyAuditChain,
} from "../../standards/audit";
import type { AuditLogWriter } from "../../standards/audit/types";
import {
  validateEscalationEvaluatedEntry,
  type EscalationEvaluatedEntry,
} from "../../standards/audit/types";
import { StaticTenantClassifier } from "../../standards/resolver/memory";
import type { RoleEnvelope, RoleHandle, TreatmentResolution } from "../types";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const escalationRegistry = require("../escalationRegistry") as typeof import("../escalationRegistry");

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";

const BASE_ENVELOPE: RoleEnvelope = {
  role: "ai-staff-accountant",
  companyId: "co-escalation-1",
  taskId: "task-esc-1",
  requestedAt: FROZEN_GENERATED_AT,
};

export interface EscalationAuditCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface EscalationAuditEvidence {
  readonly evidenceVersion: "42.7B.1";
  readonly generatedAt: string;
  readonly totalCases: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly EscalationAuditCaseRecord[];
}

function pushCase(
  cases: EscalationAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
  input: {
    id: string;
    decision: string;
    expected: string;
    actual: string;
    reason: string;
  },
): void {
  if (input.actual !== input.expected) {
    counters.failCount += 1;
  } else {
    counters.passCount += 1;
  }
  cases.push(
    Object.freeze({
      id: input.id,
      decision: input.decision,
      expected: input.expected,
      outcome: input.actual,
      reason: input.reason,
    }),
  );
}

function mkResolvedResolution(): TreatmentResolution {
  return {
    chosenFramework: "US_GAAP",
    applicableBasisRef: "basisOf:US_GAAP",
    precedenceReasoning: "RULE-001 selected at weight 900.",
    matchedRules: ["RULE-001"],
    unresolvedConflicts: [],
  } as unknown as TreatmentResolution;
}

function mkUnresolvedResolution(): TreatmentResolution {
  return {
    chosenFramework: null,
    applicableBasisRef: "basisOf:UNRESOLVED",
    precedenceReasoning: "RULE-006 (US_GAAP w300) tied with RULE-010 (IFRS w300).",
    matchedRules: ["RULE-006", "RULE-010"],
    citationHandlesConsulted: ["SEC_REG_S_X", "IAS_1_PRESENTATION"],
    unresolvedConflicts: [
      { ruleId: "RULE-006", producedFramework: "US_GAAP", citationRef: "SEC_REG_S_X" },
      { ruleId: "RULE-010", producedFramework: "IFRS", citationRef: "IAS_1_PRESENTATION" },
    ],
  } as unknown as TreatmentResolution;
}

function baseEscalationInput(
  overrides: Partial<EscalationEvaluationInput> = {},
): EscalationEvaluationInput {
  return {
    callerPersonaHandle: "ai-staff-accountant",
    callerTenantId: "tenant-standard-1",
    callerSessionId: "session-esc-1",
    callerOrgHandle: "org-esc-1",
    materialityTier: "medium",
    complexityTier: "moderate",
    topicHandle: "framework-disambiguation",
    industryHandle: "MANUFACTURING",
    jurisdictionCountry: "US",
    resolution: mkResolvedResolution(),
    envelope: BASE_ENVELOPE,
    ...overrides,
  };
}

function withMockEscalationTarget(
  mock: typeof escalationRegistry.selectEscalationTarget,
  fn: () => void,
): void {
  const original = escalationRegistry.selectEscalationTarget;
  escalationRegistry.selectEscalationTarget = mock;
  try {
    fn();
  } finally {
    escalationRegistry.selectEscalationTarget = original;
  }
}

class ThrowingAuditWriter implements AuditLogWriter {
  append(): void {
    throw new Error("audit-write-failure-simulated");
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }

  headHash(): string {
    return "GENESIS";
  }

  state(): { totalEntries: number; currentFile: string; headHash: string } {
    return { totalEntries: 0, currentFile: "throwing", headHash: "GENESIS" };
  }
}

function sampleEscalationEntry(
  overrides: Partial<EscalationEvaluatedEntry> = {},
): EscalationEvaluatedEntry {
  return {
    event: "escalation-evaluated",
    callerPersonaHandle: "ai-staff-accountant",
    callerTenantId: "tenant-standard-1",
    callerSessionId: "session-esc-1",
    callerOrgHandle: "org-esc-1",
    materialityTier: "medium",
    complexityTier: "moderate",
    topicHandle: "framework-disambiguation",
    industryHandle: "MANUFACTURING",
    decisionOutcome: "no-escalation",
    targetPersonaHandle: null,
    citationHandlesConsulted: ["RULE-001"],
    matchedRules: ["RULE-001"],
    unresolvedConflicts: [],
    tenantClassification: "standard",
    ...overrides,
  };
}

function executeGroupA(
  cases: EscalationAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const resolved = evaluateEscalationPure(baseEscalationInput());
  pushCase(cases, counters, {
    id: "A.resolved-no-escalation.01",
    decision: "resolved-resolution",
    expected: "no-escalation",
    actual: resolved.decisionOutcome,
    reason: "Resolved treatment yields no-escalation.",
  });
  pushCase(cases, counters, {
    id: "A.resolved-no-escalation.02",
    decision: "target-null",
    expected: "null",
    actual: resolved.targetPersonaHandle === null ? "null" : String(resolved.targetPersonaHandle),
    reason: "No-escalation leaves targetPersonaHandle null.",
  });

  const unresolved = evaluateEscalationPure(
    baseEscalationInput({ resolution: mkUnresolvedResolution() }),
  );
  pushCase(cases, counters, {
    id: "A.unresolved-founder.01",
    decision: "unresolved-resolution",
    expected: "escalate-to-founder",
    actual: unresolved.decisionOutcome,
    reason: "Unresolved with founder fallback escalates to founder tier.",
  });
  pushCase(cases, counters, {
    id: "A.unresolved-founder.02",
    decision: "founder-contact",
    expected: "mwiseman@advisacor.com",
    actual:
      unresolved.adapterResult.outcome === "unresolved"
        ? unresolved.adapterResult.escalationTarget.contactRef
        : "missing",
    reason: "Founder fallback contactRef is mwiseman@advisacor.com.",
  });
  pushCase(cases, counters, {
    id: "A.unresolved-founder.03",
    decision: "target-persona",
    expected: "ai-partner-helper",
    actual: unresolved.targetPersonaHandle ?? "missing",
    reason: "Founder escalation routes to ai-partner-helper.",
  });

  withMockEscalationTarget(() => null, () => {
    const failClosed = evaluateEscalationPure(
      baseEscalationInput({ resolution: mkUnresolvedResolution() }),
    );
    pushCase(cases, counters, {
      id: "A.fail-closed-decline.01",
      decision: "fail-closed-adapter",
      expected: "decline-out-of-scope",
      actual: failClosed.decisionOutcome,
      reason: "fail_closed adapter outcome maps to decline-out-of-scope.",
    });
    pushCase(cases, counters, {
      id: "A.fail-closed-decline.02",
      decision: "adapter-outcome",
      expected: "fail_closed",
      actual: failClosed.adapterResult.outcome,
      reason: "Registry miss yields fail_closed adapter outcome.",
    });
  });

  withMockEscalationTarget(
    () => ({
      attestedBy: "controller@test.com",
      attestedAt: FROZEN_GENERATED_AT,
      role: "controller",
      scope: "company",
      contactRef: "controller@test.com",
      citationHandle: null,
    }),
    () => {
      const tierUp = evaluateEscalationPure(
        baseEscalationInput({
          materialityTier: "high",
          resolution: mkUnresolvedResolution(),
        }),
      );
      pushCase(cases, counters, {
        id: "A.high-materiality-tier-up.01",
        decision: "high-materiality-unresolved",
        expected: "escalate-tier-up",
        actual: tierUp.decisionOutcome,
        reason: "High materiality with non-founder target escalates tier-up.",
      });
      pushCase(cases, counters, {
        id: "A.high-materiality-tier-up.02",
        decision: "tier-up-target",
        expected: "ai-senior-accountant",
        actual: tierUp.targetPersonaHandle ?? "missing",
        reason: "ai-staff-accountant tier-up target is ai-senior-accountant.",
      });
    },
  );

  withMockEscalationTarget(
    () => ({
      attestedBy: "controller@test.com",
      attestedAt: FROZEN_GENERATED_AT,
      role: "controller",
      scope: "company",
      contactRef: "controller@test.com",
      citationHandle: null,
    }),
    () => {
      const critical = evaluateEscalationPure(
        baseEscalationInput({
          materialityTier: "critical",
          callerPersonaHandle: "ai-staff-auditor",
          envelope: { ...BASE_ENVELOPE, role: "ai-staff-auditor" },
          resolution: mkUnresolvedResolution(),
        }),
      );
      pushCase(cases, counters, {
        id: "A.critical-auditor-tier-up.01",
        decision: "critical-materiality",
        expected: "escalate-tier-up",
        actual: critical.decisionOutcome,
        reason: "Critical materiality with auditor persona tier-up.",
      });
      pushCase(cases, counters, {
        id: "A.critical-auditor-tier-up.02",
        decision: "auditor-target",
        expected: "ai-senior-auditor",
        actual: critical.targetPersonaHandle ?? "missing",
        reason: "ai-staff-auditor tier-up target is ai-senior-auditor.",
      });
    },
  );

  const propagated = evaluateEscalationPure(baseEscalationInput());
  pushCase(cases, counters, {
    id: "A.propagation.01",
    decision: "matched-rules",
    expected: "RULE-001",
    actual: propagated.matchedRules.includes("RULE-001") ? "RULE-001" : "missing",
    reason: "matchedRules propagate from resolution.",
  });
  pushCase(cases, counters, {
    id: "A.propagation.02",
    decision: "citation-handles",
    expected: "present",
    actual: propagated.citationHandlesConsulted.length > 0 ? "present" : "empty",
    reason: "citationHandlesConsulted populated on resolved path.",
  });
}

function executeGroupB(
  cases: EscalationAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const writer = new InMemoryAuditLogWriter();
  const classifier = new StaticTenantClassifier({
    phiCoveredTenants: new Set(),
    healthcareVerticalTenants: new Set(),
  });
  evaluateEscalation(baseEscalationInput(), {
    auditLogWriter: writer,
    tenantClassifier: classifier,
    knownTenantIds: new Set(["tenant-standard-1"]),
  });
  pushCase(cases, counters, {
    id: "B.audit-wrapper.01",
    decision: "audit-entry-written",
    expected: "1",
    actual: String(writer.getEntries().length),
    reason: "evaluateEscalation appends one audit entry when writer configured.",
  });
  pushCase(cases, counters, {
    id: "B.audit-wrapper.02",
    decision: "audit-kind",
    expected: "escalation.evaluated",
    actual: writer.getEntries()[0]?.kind ?? "missing",
    reason: "Audit kind is escalation.evaluated.",
  });

  const payload = writer.getEntries()[0]?.payload as Record<string, unknown>;
  let shapeValid = "invalid";
  try {
    validateEscalationEvaluatedEntry(payload as EscalationEvaluatedEntry);
    shapeValid = "valid";
  } catch {
    shapeValid = "invalid";
  }
  pushCase(cases, counters, {
    id: "B.audit-wrapper.03",
    decision: "payload-validates",
    expected: "valid",
    actual: shapeValid,
    reason: "Audit payload passes validateEscalationEvaluatedEntry.",
  });

  const phiWriter = new InMemoryAuditLogWriter();
  const phiClassifier = new StaticTenantClassifier({
    phiCoveredTenants: new Set(["tenant-phi-1"]),
    healthcareVerticalTenants: new Set(),
  });
  evaluateEscalation(
    baseEscalationInput({
      callerTenantId: "tenant-phi-1",
      resolution: mkUnresolvedResolution(),
    }),
    {
      auditLogWriter: phiWriter,
      tenantClassifier: phiClassifier,
      knownTenantIds: new Set(["tenant-phi-1"]),
    },
  );
  const phiPayload = phiWriter.getEntries()[0]?.payload as Record<string, unknown>;
  pushCase(cases, counters, {
    id: "B.phi-tenant.01",
    decision: "tenant-classification",
    expected: "phi-covered",
    actual: String(phiPayload?.tenantClassification ?? ""),
    reason: "PHI tenant classified as phi-covered in audit payload.",
  });
  pushCase(cases, counters, {
    id: "B.phi-tenant.02",
    decision: "audit-namespace",
    expected: "phi-covered",
    actual: String(phiPayload?.auditNamespace ?? ""),
    reason: "PHI tenant auditNamespace is phi-covered.",
  });

  const stdPayload = payload;
  pushCase(cases, counters, {
    id: "B.standard-tenant.01",
    decision: "tenant-classification",
    expected: "standard",
    actual: String(stdPayload?.tenantClassification ?? ""),
    reason: "Standard tenant classified as standard.",
  });
  pushCase(cases, counters, {
    id: "B.standard-tenant.02",
    decision: "audit-namespace",
    expected: "standard",
    actual: String(stdPayload?.auditNamespace ?? ""),
    reason: "Standard tenant auditNamespace is standard.",
  });

  let classifierRequired = "no-throw";
  try {
    evaluateEscalation(baseEscalationInput(), {
      auditLogWriter: new InMemoryAuditLogWriter(),
    });
    classifierRequired = "no-throw";
  } catch {
    classifierRequired = "throws";
  }
  pushCase(cases, counters, {
    id: "B.audit-wrapper.04",
    decision: "tenant-classifier-required",
    expected: "throws",
    actual: classifierRequired,
    reason: "tenantClassifier required when auditLogWriter configured.",
  });

  let unknownTenant = "no-throw";
  try {
    evaluateEscalation(baseEscalationInput({ callerTenantId: "unknown-tenant" }), {
      auditLogWriter: new InMemoryAuditLogWriter(),
      tenantClassifier: classifier,
      knownTenantIds: new Set(["tenant-standard-1"]),
    });
    unknownTenant = "no-throw";
  } catch (error) {
    unknownTenant = (error as Error).message.includes("known registry") ? "throws" : "other-error";
  }
  pushCase(cases, counters, {
    id: "B.audit-wrapper.05",
    decision: "known-tenant-registry",
    expected: "throws",
    actual: unknownTenant,
    reason: "Unknown tenant in knownTenantIds guard throws.",
  });

  let auditFail = "allowed";
  try {
    evaluateEscalation(baseEscalationInput(), {
      auditLogWriter: new ThrowingAuditWriter(),
      tenantClassifier: classifier,
      knownTenantIds: new Set(["tenant-standard-1"]),
    });
    auditFail = "allowed";
  } catch (error) {
    auditFail = (error as Error).message.includes("audit-write-failure-simulated")
      ? "throws"
      : "other-error";
  }
  pushCase(cases, counters, {
    id: "B.fail-closed-audit.01",
    decision: "audit-write-failure",
    expected: "throws",
    actual: auditFail,
    reason: "Mock audit writer that throws causes evaluateEscalation to throw.",
  });

  const pureOnly = evaluateEscalationPure(baseEscalationInput());
  const wrappedNoAudit = evaluateEscalation(baseEscalationInput());
  pushCase(cases, counters, {
    id: "B.audit-wrapper.06",
    decision: "no-audit-delegates-pure",
    expected: pureOnly.decisionOutcome,
    actual: wrappedNoAudit.decisionOutcome,
    reason: "Without auditLogWriter, wrapper delegates to pure core.",
  });
}

function executeGroupC(
  cases: EscalationAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  let valid = "invalid";
  try {
    validateEscalationEvaluatedEntry(sampleEscalationEntry());
    valid = "valid";
  } catch {
    valid = "invalid";
  }
  pushCase(cases, counters, {
    id: "C.entry-shape.01",
    decision: "well-formed-entry",
    expected: "valid",
    actual: valid,
    reason: "Sample EscalationEvaluatedEntry validates.",
  });

  let badEvent = "no-throw";
  try {
    validateEscalationEvaluatedEntry(sampleEscalationEntry({ event: "wrong-event" as "escalation-evaluated" }));
    badEvent = "no-throw";
  } catch {
    badEvent = "throws";
  }
  pushCase(cases, counters, {
    id: "C.entry-shape.02",
    decision: "invalid-event",
    expected: "throws",
    actual: badEvent,
    reason: "Invalid event rejected by validator.",
  });

  let badOutcome = "no-throw";
  try {
    validateEscalationEvaluatedEntry(
      sampleEscalationEntry({ decisionOutcome: "invalid-outcome" as "no-escalation" }),
    );
    badOutcome = "no-throw";
  } catch {
    badOutcome = "throws";
  }
  pushCase(cases, counters, {
    id: "C.entry-shape.03",
    decision: "invalid-decision-outcome",
    expected: "throws",
    actual: badOutcome,
    reason: "Invalid decisionOutcome rejected.",
  });

  let missingField = "no-throw";
  try {
    const incomplete = { ...sampleEscalationEntry() } as Record<string, unknown>;
    delete incomplete.callerTenantId;
    validateEscalationEvaluatedEntry(incomplete as EscalationEvaluatedEntry);
    missingField = "no-throw";
  } catch {
    missingField = "throws";
  }
  pushCase(cases, counters, {
    id: "C.entry-shape.04",
    decision: "missing-required-field",
    expected: "throws",
    actual: missingField,
    reason: "Missing callerTenantId rejected.",
  });

  const outcomes: EscalationEvaluatedEntry["decisionOutcome"][] = [
    "no-escalation",
    "escalate-tier-up",
    "escalate-to-founder",
    "decline-out-of-scope",
  ];
  const allValid = outcomes.every((decisionOutcome) => {
    try {
      validateEscalationEvaluatedEntry(sampleEscalationEntry({ decisionOutcome }));
      return true;
    } catch {
      return false;
    }
  });
  pushCase(cases, counters, {
    id: "C.entry-shape.05",
    decision: "all-outcomes-valid",
    expected: "valid",
    actual: allValid ? "valid" : "invalid",
    reason: "All four decisionOutcome enum values validate.",
  });

  pushCase(cases, counters, {
    id: "C.entry-shape.06",
    decision: "target-null-allowed",
    expected: "valid",
    actual: (() => {
      try {
        validateEscalationEvaluatedEntry(sampleEscalationEntry({ targetPersonaHandle: null }));
        return "valid";
      } catch {
        return "invalid";
      }
    })(),
    reason: "targetPersonaHandle null is allowed for no-escalation.",
  });
}

function executeGroupD(
  cases: EscalationAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const writer = new InMemoryAuditLogWriter();
  const classifier = new StaticTenantClassifier({
    phiCoveredTenants: new Set(),
    healthcareVerticalTenants: new Set(),
  });

  writer.append({
    kind: "cache.hit",
    actor: { kind: "system", id: "cache-test", via: "direct-api" },
    subject: { orgId: "org-esc-1", tenantId: "tenant-standard-1" },
    payload: { cacheKey: "test-key" },
  });
  writer.append({
    kind: "cache.miss",
    actor: { kind: "system", id: "cache-test", via: "direct-api" },
    subject: { orgId: "org-esc-1", tenantId: "tenant-standard-1" },
    payload: { cacheKey: "test-key-2" },
  });
  evaluateEscalation(baseEscalationInput({ resolution: mkUnresolvedResolution() }), {
    auditLogWriter: writer,
    tenantClassifier: classifier,
    knownTenantIds: new Set(["tenant-standard-1"]),
  });

  const entries = writer.getEntries();
  pushCase(cases, counters, {
    id: "D.mixed-chain.01",
    decision: "entry-count",
    expected: "3",
    actual: String(entries.length),
    reason: "Mixed chain has cache + escalation entries.",
  });
  pushCase(cases, counters, {
    id: "D.mixed-chain.02",
    decision: "verify-chain",
    expected: "valid",
    actual: verifyAuditChain(entries) ? "valid" : "invalid",
    reason: "Mixed cache + escalation chain verifies with verifyAuditChain.",
  });
  pushCase(cases, counters, {
    id: "D.mixed-chain.03",
    decision: "genesis-first",
    expected: "GENESIS",
    actual: entries[0]?.prevHash ?? "missing",
    reason: "First entry prevHash is GENESIS.",
  });
  pushCase(cases, counters, {
    id: "D.mixed-chain.04",
    decision: "escalation-kind-present",
    expected: "escalation.evaluated",
    actual: entries.find((entry) => entry.kind === "escalation.evaluated")?.kind ?? "missing",
    reason: "Escalation entry present in mixed chain.",
  });

  const tampered = [...entries];
  tampered[2] = Object.freeze({
    ...tampered[2]!,
    payload: Object.freeze({ tampered: true }),
  });
  pushCase(cases, counters, {
    id: "D.mixed-chain.05",
    decision: "tampered-entry",
    expected: "invalid",
    actual: verifyAuditChain(tampered) ? "valid" : "invalid",
    reason: "Tampered escalation entry fails chain verification.",
  });

  const reordered = [entries[1]!, entries[0]!, entries[2]!];
  pushCase(cases, counters, {
    id: "D.mixed-chain.06",
    decision: "reordered-entries",
    expected: "invalid",
    actual: verifyAuditChain(reordered) ? "valid" : "invalid",
    reason: "Reordered mixed chain fails verification.",
  });
}

function executeGroupE(
  cases: EscalationAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  pushCase(cases, counters, {
    id: "E.pure-core.01",
    decision: "evaluateEscalationPure-exists",
    expected: "function",
    actual: typeof evaluateEscalationPure === "function" ? "function" : "missing",
    reason: "evaluateEscalationPure export exists.",
  });

  const pureSource = fs.readFileSync(
    path.join(__dirname, "..", "evaluateEscalationPure.ts"),
    "utf8",
  );
  pushCase(cases, counters, {
    id: "E.pure-core.02",
    decision: "no-audit-imports",
    expected: "zero-references",
    actual: /standards\/audit/.test(pureSource) ? "found-references" : "zero-references",
    reason: "evaluateEscalationPure must not import audit module.",
  });

  const wrapperSource = fs.readFileSync(
    path.join(__dirname, "..", "evaluateEscalation.ts"),
    "utf8",
  );
  pushCase(cases, counters, {
    id: "E.wrapper.01",
    decision: "delegates-to-pure",
    expected: "present",
    actual: wrapperSource.includes("evaluateEscalationPure") ? "present" : "missing",
    reason: "evaluateEscalation delegates to evaluateEscalationPure.",
  });
  pushCase(cases, counters, {
    id: "E.wrapper.02",
    decision: "doctrine-header",
    expected: "Phase 42.7B.1",
    actual: wrapperSource.includes("Phase 42.7B.1") ? "Phase 42.7B.1" : "missing",
    reason: "evaluateEscalation.ts carries Phase 42.7B.1 doctrine header.",
  });

  const adapterSource = fs.readFileSync(
    path.join(__dirname, "..", "treatmentRoleAdapter.ts"),
    "utf8",
  );
  pushCase(cases, counters, {
    id: "E.wrapper.03",
    decision: "treatment-adapter-doctrine",
    expected: "Phase 42.7B.1",
    actual: adapterSource.includes("Phase 42.7B.1") ? "Phase 42.7B.1" : "missing",
    reason: "treatmentRoleAdapter.ts carries Phase 42.7B.1 doctrine header.",
  });
}

function executeGroupF(
  cases: EscalationAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const personas: RoleHandle[] = [
    "ai-staff-accountant",
    "ai-senior-accountant",
    "ai-accounting-manager",
    "ai-controller-helper",
    "ai-cfo-helper",
  ];
  for (let index = 0; index < personas.length; index += 1) {
    const persona = personas[index]!;
    const result = evaluateEscalationPure(
      baseEscalationInput({
        callerPersonaHandle: persona,
        envelope: { ...BASE_ENVELOPE, role: persona },
        resolution: mkResolvedResolution(),
      }),
    );
    pushCase(cases, counters, {
      id: `F.persona-coverage.0${index + 1}`,
      decision: "resolved-no-escalation",
      expected: "no-escalation",
      actual: result.decisionOutcome,
      reason: `${persona} resolved path yields no-escalation.`,
    });
  }

  const runA = evaluateEscalationPure(
    baseEscalationInput({ resolution: mkUnresolvedResolution(), materialityTier: "low" }),
  );
  const runB = evaluateEscalationPure(
    baseEscalationInput({ resolution: mkUnresolvedResolution(), materialityTier: "low" }),
  );
  pushCase(cases, counters, {
    id: "F.determinism.01",
    decision: "pure-repeatable",
    expected: "identical",
    actual: JSON.stringify(runA) === JSON.stringify(runB) ? "identical" : "different",
    reason: "Repeated pure evaluations produce identical results.",
  });
}

function buildAllCases(): EscalationAuditCaseRecord[] {
  const cases: EscalationAuditCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };
  executeGroupA(cases, counters);
  executeGroupB(cases, counters);
  executeGroupC(cases, counters);
  executeGroupD(cases, counters);
  executeGroupE(cases, counters);
  executeGroupF(cases, counters);
  return cases;
}

export function runEscalationAuditTests(): EscalationAuditEvidence {
  const cases: EscalationAuditCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };

  executeGroupA(cases, counters);
  executeGroupB(cases, counters);
  executeGroupC(cases, counters);
  executeGroupD(cases, counters);
  executeGroupE(cases, counters);
  executeGroupF(cases, counters);

  const firstPass = JSON.stringify(cases);
  const secondPass = JSON.stringify(buildAllCases());
  pushCase(cases, counters, {
    id: "F.determinism.02",
    decision: "evidence-byte-identical",
    expected: "identical",
    actual: firstPass === secondPass ? "identical" : "different",
    reason: "Two consecutive runs produce byte-identical case records.",
  });

  if (cases.length < 30) {
    pushCase(cases, counters, {
      id: "F.coverage.01",
      decision: "minimum-case-count",
      expected: "gte-30",
      actual: "lt-30",
      reason: `Only ${cases.length} cases generated; spec requires >= 30.`,
    });
  }

  return Object.freeze({
    evidenceVersion: "42.7B.1" as const,
    generatedAt: FROZEN_GENERATED_AT,
    totalCases: cases.length,
    passCount: counters.passCount,
    failCount: counters.failCount,
    cases: Object.freeze(cases),
  });
}

if (require.main === module) {
  const result = runEscalationAuditTests();
  console.log(
    `escalation-audit: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`,
  );
  process.exit(result.failCount === 0 ? 0 : 1);
}
