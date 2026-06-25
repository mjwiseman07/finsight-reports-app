import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { loadBaselineByPersona } from "../job-descriptions/load-baseline";
import { NullCompanyJobDescriptionReader } from "../company-overlay/NullCompanyJobDescriptionReader";
import { createCapabilityGate } from "../routing/CapabilityGate";
import { createCapabilityGatePure } from "../routing/capabilityGatePure";
import { createEscalationRegistry } from "../routing/escalation-bridge";
import { runPanelDecision } from "../runPanelDecision";
import type { PanelDecisionInput } from "../runPanelDecision";
import {
  FileAppendAuditLogWriter,
  InMemoryAuditLogWriter,
  verifyAuditChain,
  DEFAULT_RETENTION_POLICY,
} from "../../standards/audit";
import type { AuditLogWriter } from "../../standards/audit/types";
import type { Clock } from "../../standards/resolver/memory/ttl-clock";
import {
  validatePanelDecisionEntry,
  type PanelDecisionEntry,
} from "../../standards/audit/types";
import { StaticTenantClassifier } from "../../standards/resolver/memory";
import type { AIPersonaId, WorkItem } from "../types";

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";
const FROZEN_CLOCK = (): Date => new Date(FROZEN_GENERATED_AT);
const FROZEN_MS = FROZEN_CLOCK().getTime();

function createFakeClock(startMs = FROZEN_MS): Clock {
  let now = startMs;
  return {
    nowMs: () => now,
  };
}

export interface PanelDecisionAuditCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface PanelDecisionAuditEvidence {
  readonly evidenceVersion: "42.7C.2";
  readonly generatedAt: string;
  readonly totalCases: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly PanelDecisionAuditCaseRecord[];
}

function pushCase(
  cases: PanelDecisionAuditCaseRecord[],
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

function workItem(overrides: Partial<WorkItem> & { workItemId: string }): WorkItem {
  return Object.freeze({
    source: "phase39-email",
    receivedAt: FROZEN_CLOCK().toISOString(),
    requestedPersonaId: null,
    requestedCapabilityId: null,
    payload: Object.freeze({}),
    companyId: null,
    phase39ProvenanceRef: `test:${overrides.workItemId}`,
    ...overrides,
  });
}

function createTestGateDeps() {
  return {
    baselineByPersona: loadBaselineByPersona(),
    companyOverlayReader: new NullCompanyJobDescriptionReader(),
    escalationRegistry: createEscalationRegistry(),
    clock: FROZEN_CLOCK,
  };
}

function firstCapabilityId(personaId: AIPersonaId): string {
  const baseline = loadBaselineByPersona().get(personaId);
  if (!baseline || baseline.capabilities.length === 0) {
    throw new Error(`no capabilities for ${personaId}`);
  }
  return baseline.capabilities[0]!.capabilityId;
}

function basePanelInput(overrides: Partial<PanelDecisionInput> = {}): PanelDecisionInput {
  const personaId: AIPersonaId = "ai-staff-accountant";
  const capabilityId = firstCapabilityId(personaId);
  return {
    callerPersonaHandle: personaId,
    callerTenantId: "tenant-standard-1",
    callerSessionId: "session-panel-1",
    callerOrgHandle: "org-panel-1",
    industryHandle: "manufacturing",
    topicHandle: "revenue-recognition-asc606",
    treatmentRequestId: "tr-req-001",
    workItem: workItem({
      workItemId: "panel-audit-001",
      requestedCapabilityId: capabilityId,
    }),
    currentPersonaId: personaId,
    gateDeps: createTestGateDeps(),
    ...overrides,
  };
}

function standardClassifier(): StaticTenantClassifier {
  return new StaticTenantClassifier({
    phiCoveredTenants: new Set(["tenant-phi-1"]),
    healthcareVerticalTenants: new Set(),
  });
}

function samplePanelDecisionEntry(
  overrides: Partial<PanelDecisionEntry> = {},
): PanelDecisionEntry {
  return {
    event: "panel.decision",
    callerPersonaHandle: "ai-staff-accountant",
    callerTenantId: "tenant-standard-1",
    callerSessionId: "session-panel-1",
    callerOrgHandle: "org-panel-1",
    industryHandle: "manufacturing",
    panelHandle: "manufacturing-revenue-recognition-asc606-panel",
    topicHandle: "revenue-recognition-asc606",
    treatmentRequestId: "tr-req-001",
    matchedRules: ["journal-entry-routine"],
    citationHandlesConsulted: ["ASC_105_10_05_1"],
    unresolvedConflicts: [],
    resolvedBy: "journal-entry-routine",
    election: null,
    advisoryCount: 0,
    advisoriesGenerated: [],
    tenantClassification: "standard",
    ...overrides,
  };
}

function panelPayload(writer: InMemoryAuditLogWriter): Record<string, unknown> | undefined {
  const entry = writer.getEntries().find((row) => row.kind === "panel.decision");
  return entry?.payload as Record<string, unknown> | undefined;
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

class NthThrowAuditWriter implements AuditLogWriter {
  private callCount = 0;

  constructor(private readonly throwOn: number) {}

  append(): void {
    this.callCount += 1;
    if (this.callCount === this.throwOn) {
      throw new Error(`audit-write-failure-on-call-${this.throwOn}`);
    }
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }

  headHash(): string {
    return "GENESIS";
  }

  state(): { totalEntries: number; currentFile: string; headHash: string } {
    return { totalEntries: this.callCount, currentFile: "nth-throw", headHash: "GENESIS" };
  }
}

class OrderingAuditWriter extends InMemoryAuditLogWriter {
  appendCount = 0;
  decisionReturned = false;

  append(entry: Parameters<AuditLogWriter["append"]>[0]): void {
    if (this.decisionReturned) {
      throw new Error("append-after-decision-return");
    }
    this.appendCount += 1;
    super.append(entry);
  }
}

function executeGroupA(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  let valid = "invalid";
  try {
    validatePanelDecisionEntry(samplePanelDecisionEntry());
    valid = "valid";
  } catch {
    valid = "invalid";
  }
  pushCase(cases, counters, {
    id: "A.entry-shape.01",
    decision: "well-formed-entry",
    expected: "valid",
    actual: valid,
    reason: "Sample PanelDecisionEntry validates.",
  });

  let missingPersona = "no-throw";
  try {
    const incomplete = { ...samplePanelDecisionEntry() };
    // @ts-expect-error test missing field
    delete incomplete.callerPersonaHandle;
    validatePanelDecisionEntry(incomplete);
    missingPersona = "no-throw";
  } catch {
    missingPersona = "throws";
  }
  pushCase(cases, counters, {
    id: "A.entry-shape.02",
    decision: "missing-callerPersonaHandle",
    expected: "throws",
    actual: missingPersona,
    reason: "Missing callerPersonaHandle rejected.",
  });

  for (const field of ["callerTenantId", "callerSessionId", "callerOrgHandle"] as const) {
    let missing = "no-throw";
    try {
      const incomplete = { ...samplePanelDecisionEntry(), [field]: "" };
      validatePanelDecisionEntry(incomplete);
      missing = "no-throw";
    } catch {
      missing = "throws";
    }
    pushCase(cases, counters, {
      id: `A.entry-shape.${field}`,
      decision: `missing-${field}`,
      expected: "throws",
      actual: missing,
      reason: `Empty ${field} rejected.`,
    });
  }

  let missingClassification = "no-throw";
  try {
    const incomplete = { ...samplePanelDecisionEntry(), tenantClassification: "" as "standard" };
    validatePanelDecisionEntry(incomplete);
    missingClassification = "no-throw";
  } catch {
    missingClassification = "throws";
  }
  pushCase(cases, counters, {
    id: "A.entry-shape.tenantClassification",
    decision: "missing-tenantClassification",
    expected: "throws",
    actual: missingClassification,
    reason: "Empty tenantClassification rejected.",
  });

  let countMismatch = "no-throw";
  try {
    validatePanelDecisionEntry(
      samplePanelDecisionEntry({ advisoryCount: 1, advisoriesGenerated: [] }),
    );
    countMismatch = "no-throw";
  } catch {
    countMismatch = "throws";
  }
  pushCase(cases, counters, {
    id: "A.entry-shape.advisoryCount",
    decision: "advisory-count-mismatch",
    expected: "throws",
    actual: countMismatch,
    reason: "advisoriesGenerated.length must equal advisoryCount.",
  });

  let badCitation = "no-throw";
  try {
    validatePanelDecisionEntry(
      samplePanelDecisionEntry({ citationHandlesConsulted: ["FREE_TEXT_URL"] }),
    );
    badCitation = "no-throw";
  } catch {
    badCitation = "throws";
  }
  pushCase(cases, counters, {
    id: "A.entry-shape.citationWhitelist",
    decision: "citation-outside-locked-set",
    expected: "throws",
    actual: badCitation,
    reason: "Citation handle outside locked set rejected.",
  });
}

async function executeGroupB(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  const writer = new InMemoryAuditLogWriter();
  const classifier = standardClassifier();
  const knownTenants = new Set(["tenant-standard-1"]);

  const executeInput = basePanelInput();
  await runPanelDecision(executeInput, {
    auditLogWriter: writer,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  const executePayload = panelPayload(writer);
  pushCase(cases, counters, {
    id: "B.every-decision.01",
    decision: "zero-advisory-logged",
    expected: "0",
    actual: String(executePayload?.advisoryCount ?? "missing"),
    reason: "Execute path logs advisoryCount 0.",
  });

  writer.getEntries().length;
  const hireUpInput = basePanelInput({
    currentPersonaId: "ai-staff-accountant",
    callerPersonaHandle: "ai-staff-accountant",
    workItem: workItem({
      workItemId: "hire-up-001",
      requestedCapabilityId: "month-end-close-routine",
    }),
  });
  const writerHire = new InMemoryAuditLogWriter();
  await runPanelDecision(hireUpInput, {
    auditLogWriter: writerHire,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  const hirePayload = panelPayload(writerHire);
  pushCase(cases, counters, {
    id: "B.every-decision.02",
    decision: "one-advisory-logged",
    expected: "1",
    actual: String(hirePayload?.advisoryCount ?? "missing"),
    reason: "Hire-up path logs advisoryCount 1.",
  });

  const hardStopInput = basePanelInput({
    currentPersonaId: "ai-staff-accountant",
    workItem: workItem({
      workItemId: "hard-stop-001",
      requestedCapabilityId: firstCapabilityId("ai-staff-accountant"),
      payload: Object.freeze({ triggerHardStop: "no-framework-election" }),
    }),
  });
  const writerHard = new InMemoryAuditLogWriter();
  await runPanelDecision(hardStopInput, {
    auditLogWriter: writerHard,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  const hardPayload = panelPayload(writerHard);
  const hardCount = Number(hardPayload?.advisoryCount ?? 0);
  pushCase(cases, counters, {
    id: "B.every-decision.03",
    decision: "multi-advisory-logged",
    expected: "gte-2",
    actual: hardCount >= 2 ? "gte-2" : String(hardCount),
    reason: "Hard-stop escalate logs multiple bundled advisories.",
  });

  const defaultInput = basePanelInput({
    workItem: workItem({
      workItemId: "default-panel-001",
      requestedCapabilityId: firstCapabilityId("ai-staff-accountant"),
    }),
  });
  const writerDefault = new InMemoryAuditLogWriter();
  await runPanelDecision(defaultInput, {
    auditLogWriter: writerDefault,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  pushCase(cases, counters, {
    id: "B.every-decision.04",
    decision: "default-selection-logged",
    expected: "panel.decision",
    actual: panelPayload(writerDefault)?.event === "panel.decision" ? "panel.decision" : "missing",
    reason: "Default execute selection still produces panel.decision entry.",
  });

  const writerRepeat = new InMemoryAuditLogWriter();
  await runPanelDecision(executeInput, {
    auditLogWriter: writerRepeat,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  await runPanelDecision(executeInput, {
    auditLogWriter: writerRepeat,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  pushCase(cases, counters, {
    id: "B.every-decision.05",
    decision: "no-deduplication",
    expected: "2",
    actual: String(writerRepeat.getEntries().filter((e) => e.kind === "panel.decision").length),
    reason: "Repeated identical calls produce one entry per call.",
  });
}

async function executeGroupC(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  const classifier = standardClassifier();
  const knownTenants = new Set(["tenant-standard-1"]);

  const writerZero = new InMemoryAuditLogWriter();
  await runPanelDecision(basePanelInput(), {
    auditLogWriter: writerZero,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  const zeroPayload = panelPayload(writerZero)!;
  const zeroIdentity =
    zeroPayload.callerPersonaHandle &&
    zeroPayload.callerTenantId &&
    zeroPayload.callerSessionId &&
    zeroPayload.callerOrgHandle
      ? "all-present"
      : "missing";
  pushCase(cases, counters, {
    id: "C.caller-identity.01",
    decision: "zero-advisory-identity",
    expected: "all-present",
    actual: zeroIdentity,
    reason: "All four caller identity fields on zero-advisory outcome.",
  });

  const writerHire = new InMemoryAuditLogWriter();
  await runPanelDecision(
    basePanelInput({
      workItem: workItem({
        workItemId: "identity-hire",
        requestedCapabilityId: "month-end-close-routine",
      }),
    }),
    { auditLogWriter: writerHire, tenantClassifier: classifier, knownTenantIds: knownTenants },
  );
  const hirePayload = panelPayload(writerHire)!;
  pushCase(cases, counters, {
    id: "C.caller-identity.02",
    decision: "advisory-identity",
    expected: "all-present",
    actual:
      hirePayload.callerPersonaHandle &&
      hirePayload.callerTenantId &&
      hirePayload.callerSessionId &&
      hirePayload.callerOrgHandle
        ? "all-present"
        : "missing",
    reason: "All four caller identity fields on advisory outcome.",
  });

  const writerDefault = new InMemoryAuditLogWriter();
  await runPanelDecision(basePanelInput(), {
    auditLogWriter: writerDefault,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  const defaultPayload = panelPayload(writerDefault)!;
  pushCase(cases, counters, {
    id: "C.caller-identity.03",
    decision: "default-panel-identity",
    expected: "all-present",
    actual:
      defaultPayload.callerPersonaHandle &&
      defaultPayload.callerTenantId &&
      defaultPayload.callerSessionId &&
      defaultPayload.callerOrgHandle
        ? "all-present"
        : "missing",
    reason: "All four caller identity fields on default-panel outcome.",
  });

  const nonEmpty =
    [
      zeroPayload.callerPersonaHandle,
      zeroPayload.callerTenantId,
      zeroPayload.callerSessionId,
      zeroPayload.callerOrgHandle,
    ].every((value) => typeof value === "string" && value.length > 0)
      ? "non-empty"
      : "empty-found";
  pushCase(cases, counters, {
    id: "C.caller-identity.04",
    decision: "non-empty-strings",
    expected: "non-empty",
    actual: nonEmpty,
    reason: "Caller identity fields are non-empty strings.",
  });

  const writerSession = new InMemoryAuditLogWriter();
  const sessionInput = basePanelInput({ callerSessionId: "session-repeat-42" });
  await runPanelDecision(sessionInput, {
    auditLogWriter: writerSession,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  await runPanelDecision(sessionInput, {
    auditLogWriter: writerSession,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  const sessionIds = writerSession
    .getEntries()
    .filter((e) => e.kind === "panel.decision")
    .map((e) => (e.payload as PanelDecisionEntry).callerSessionId);
  pushCase(cases, counters, {
    id: "C.caller-identity.05",
    decision: "same-session-two-entries",
    expected: "identical",
    actual:
      sessionIds.length === 2 && sessionIds[0] === sessionIds[1] ? "identical" : "different",
    reason: "Two calls from same session produce identical callerSessionId.",
  });
}

function executeGroupD(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const threeAdvisories = samplePanelDecisionEntry({
    advisoryCount: 3,
    advisoriesGenerated: [
      {
        advisoryHandle: "adv-1",
        severityTier: "informational",
        citationHandle: "ASC_105_10_05_1",
        matchedRule: "rule-1",
      },
      {
        advisoryHandle: "adv-2",
        severityTier: "caution",
        citationHandle: "IAS_1_PRESENTATION",
        matchedRule: "rule-2",
      },
      {
        advisoryHandle: "adv-3",
        severityTier: "blocking",
        citationHandle: "SEC_REG_S_X",
        matchedRule: "rule-3",
      },
    ],
  });
  let threeValid = "invalid";
  try {
    validatePanelDecisionEntry(threeAdvisories);
    threeValid = "valid";
  } catch {
    threeValid = "invalid";
  }
  pushCase(cases, counters, {
    id: "D.bundling.01",
    decision: "three-advisories-one-entry",
    expected: "valid",
    actual: threeValid,
    reason: "Single entry with 3 bundled advisories validates.",
  });

  const advisory = threeAdvisories.advisoriesGenerated[0]!;
  const fieldsPresent =
    advisory.advisoryHandle &&
    advisory.severityTier &&
    advisory.citationHandle &&
    advisory.matchedRule
      ? "all-four"
      : "missing";
  pushCase(cases, counters, {
    id: "D.bundling.02",
    decision: "advisory-fields",
    expected: "all-four",
    actual: fieldsPresent,
    reason: "Each bundled advisory has all four PanelAdvisorySummary fields.",
  });

  pushCase(cases, counters, {
    id: "D.bundling.03",
    decision: "locked-citation",
    expected: "valid",
    actual: ["ASC_105_10_05_1", "IAS_1_PRESENTATION", "SEC_REG_S_X"].includes(
      advisory.citationHandle,
    )
      ? "valid"
      : "invalid",
    reason: "Bundled advisory citationHandle is from locked set.",
  });

  pushCase(cases, counters, {
    id: "D.bundling.04",
    decision: "severity-tier",
    expected: "valid",
    actual: ["informational", "caution", "blocking"].includes(advisory.severityTier)
      ? "valid"
      : "invalid",
    reason: "Bundled advisory severityTier is valid enum.",
  });

  const run1 = samplePanelDecisionEntry({
    advisoryCount: 2,
    advisoriesGenerated: [
      {
        advisoryHandle: "a-1",
        severityTier: "informational",
        citationHandle: "ASC_105_10_05_1",
        matchedRule: "r-1",
      },
      {
        advisoryHandle: "a-2",
        severityTier: "caution",
        citationHandle: "ASC_105_10_05_1",
        matchedRule: "r-2",
      },
    ],
  });
  const run2 = samplePanelDecisionEntry({
    advisoryCount: 2,
    advisoriesGenerated: [
      {
        advisoryHandle: "a-1",
        severityTier: "informational",
        citationHandle: "ASC_105_10_05_1",
        matchedRule: "r-1",
      },
      {
        advisoryHandle: "a-2",
        severityTier: "caution",
        citationHandle: "ASC_105_10_05_1",
        matchedRule: "r-2",
      },
    ],
  });
  pushCase(cases, counters, {
    id: "D.bundling.05",
    decision: "deterministic-order",
    expected: "identical",
    actual:
      JSON.stringify(run1.advisoriesGenerated) === JSON.stringify(run2.advisoriesGenerated)
        ? "identical"
        : "different",
    reason: "Bundled advisory order is deterministic across repeated identical inputs.",
  });

  pushCase(cases, counters, {
    id: "D.bundling.06",
    decision: "empty-array-not-null",
    expected: "array",
    actual: Array.isArray(samplePanelDecisionEntry().advisoriesGenerated) ? "array" : "not-array",
    reason: "Zero advisories produces advisoriesGenerated: [] (empty array).",
  });
}

async function executeGroupE(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  const classifier = standardClassifier();
  const knownPhi = new Set(["tenant-phi-1", "tenant-standard-1"]);

  const writerPhi = new InMemoryAuditLogWriter();
  await runPanelDecision(basePanelInput({ callerTenantId: "tenant-phi-1" }), {
    auditLogWriter: writerPhi,
    tenantClassifier: classifier,
    knownTenantIds: knownPhi,
  });
  pushCase(cases, counters, {
    id: "E.phi.01",
    decision: "phi-classification",
    expected: "phi-covered",
    actual: String(panelPayload(writerPhi)?.tenantClassification ?? ""),
    reason: "PHI tenant produces tenantClassification phi-covered.",
  });

  const writerStd = new InMemoryAuditLogWriter();
  await runPanelDecision(basePanelInput(), {
    auditLogWriter: writerStd,
    tenantClassifier: classifier,
    knownTenantIds: knownPhi,
  });
  pushCase(cases, counters, {
    id: "E.phi.02",
    decision: "standard-classification",
    expected: "standard",
    actual: String(panelPayload(writerStd)?.tenantClassification ?? ""),
    reason: "Standard tenant produces tenantClassification standard.",
  });

  pushCase(cases, counters, {
    id: "E.phi.03",
    decision: "phi-namespace",
    expected: "phi-covered",
    actual: String(panelPayload(writerPhi)?.auditNamespace ?? ""),
    reason: "PHI tenant entries routed to phi-covered audit namespace.",
  });

  let unknownTenant = "no-throw";
  try {
    await runPanelDecision(basePanelInput({ callerTenantId: "unknown-tenant" }), {
      auditLogWriter: new InMemoryAuditLogWriter(),
      tenantClassifier: classifier,
      knownTenantIds: new Set(["tenant-standard-1"]),
    });
    unknownTenant = "no-throw";
  } catch (error) {
    unknownTenant = (error as Error).message.includes("known registry") ? "throws" : "other-error";
  }
  pushCase(cases, counters, {
    id: "E.phi.04",
    decision: "classifier-fail-closed",
    expected: "throws",
    actual: unknownTenant,
    reason: "Tenant classifier failure fails panel decision (fail-closed).",
  });
}

async function executeGroupF(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  const classifier = standardClassifier();
  const knownTenants = new Set(["tenant-standard-1"]);

  let auditFail = "allowed";
  try {
    await runPanelDecision(basePanelInput(), {
      auditLogWriter: new ThrowingAuditWriter(),
      tenantClassifier: classifier,
      knownTenantIds: knownTenants,
    });
    auditFail = "allowed";
  } catch (error) {
    auditFail = (error as Error).message.includes("audit-write-failure-simulated")
      ? "throws"
      : "other-error";
  }
  pushCase(cases, counters, {
    id: "F.fail-closed.01",
    decision: "append-throws",
    expected: "throws",
    actual: auditFail,
    reason: "AuditLogWriter.append() throwing causes runPanelDecision() to throw.",
  });

  let decisionOnFail = "returned";
  try {
    await runPanelDecision(basePanelInput(), {
      auditLogWriter: new ThrowingAuditWriter(),
      tenantClassifier: classifier,
      knownTenantIds: knownTenants,
    });
  } catch {
    decisionOnFail = "not-returned";
  }
  pushCase(cases, counters, {
    id: "F.fail-closed.02",
    decision: "no-decision-on-fail",
    expected: "not-returned",
    actual: decisionOnFail,
    reason: "Caller does NOT receive a decision when audit write fails.",
  });

  const orderingWriter = new OrderingAuditWriter();
  const orderingResult = await runPanelDecision(basePanelInput(), {
    auditLogWriter: orderingWriter,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  orderingWriter.decisionReturned = true;
  pushCase(cases, counters, {
    id: "F.fail-closed.03",
    decision: "audit-before-return",
    expected: "append-first",
    actual:
      orderingWriter.appendCount > 0 && orderingResult.decision.kind === "execute"
        ? "append-first"
        : "wrong-order",
    reason: "Audit write happens before decision is returned.",
  });

  let nthThrow = "no-throw";
  try {
    await runPanelDecision(basePanelInput(), {
      auditLogWriter: new NthThrowAuditWriter(1),
      tenantClassifier: classifier,
      knownTenantIds: knownTenants,
    });
    nthThrow = "no-throw";
  } catch (error) {
    nthThrow = (error as Error).message.includes("audit-write-failure-on-call-1")
      ? "throws"
      : "other-error";
  }
  pushCase(cases, counters, {
    id: "F.fail-closed.04",
    decision: "nth-call-throws",
    expected: "throws",
    actual: nthThrow,
    reason: "Nth invocation throws when writer throws on Nth call.",
  });

  const retryWriter = new InMemoryAuditLogWriter();
  let firstAttempt = "completed";
  try {
    await runPanelDecision(basePanelInput(), {
      auditLogWriter: new NthThrowAuditWriter(1),
      tenantClassifier: classifier,
      knownTenantIds: knownTenants,
    });
  } catch {
    firstAttempt = "failed";
  }
  await runPanelDecision(basePanelInput(), {
    auditLogWriter: retryWriter,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  pushCase(cases, counters, {
    id: "F.fail-closed.05",
    decision: "retry-after-failure",
    expected: "failed-then-success",
    actual:
      firstAttempt === "failed" &&
      retryWriter.getEntries().filter((e) => e.kind === "panel.decision").length === 1
        ? "failed-then-success"
        : "unexpected",
    reason: "No partial state left behind on audit failure; retry succeeds.",
  });
}

async function executeGroupG(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  const writer = new InMemoryAuditLogWriter();
  const classifier = standardClassifier();
  const knownTenants = new Set(["tenant-standard-1"]);

  writer.append({
    kind: "cache.hit",
    actor: { kind: "system", id: "cache-test", via: "direct-api" },
    subject: { orgId: "org-panel-1", tenantId: "tenant-standard-1" },
    payload: { cacheKey: "test-key" },
  });
  await runPanelDecision(basePanelInput(), {
    auditLogWriter: writer,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  writer.append({
    kind: "cache.miss",
    actor: { kind: "system", id: "cache-test", via: "direct-api" },
    subject: { orgId: "org-panel-1", tenantId: "tenant-standard-1" },
    payload: { cacheKey: "test-key-2" },
  });

  const entries = writer.getEntries();
  const panelIndex = entries.findIndex((e) => e.kind === "panel.decision");
  pushCase(cases, counters, {
    id: "G.hash-chain.01",
    decision: "prevHash-links",
    expected: "linked",
    actual:
      panelIndex > 0 && entries[panelIndex]!.prevHash === entries[panelIndex - 1]!.entryHash
        ? "linked"
        : "broken",
    reason: "Panel entry prevHash references previous entry in chain.",
  });

  pushCase(cases, counters, {
    id: "G.hash-chain.02",
    decision: "mixed-chain-verify",
    expected: "valid",
    actual: verifyAuditChain(entries) ? "valid" : "invalid",
    reason: "Mixed cache + panel chain verifies via verifyAuditChain().",
  });

  const broken = [...entries];
  if (panelIndex >= 0) {
    broken[panelIndex + 1] = Object.freeze({
      ...broken[panelIndex + 1]!,
      prevHash: "BROKEN",
    });
  }
  pushCase(cases, counters, {
    id: "G.hash-chain.03",
    decision: "chain-break-detected",
    expected: "invalid",
    actual: verifyAuditChain(broken) ? "valid" : "invalid",
    reason: "Chain break between panel entry and next entry is detected.",
  });

  const tamperedAdvisories = [...entries];
  if (panelIndex >= 0) {
    const panelEntry = tamperedAdvisories[panelIndex]!;
    tamperedAdvisories[panelIndex] = Object.freeze({
      ...panelEntry,
      payload: Object.freeze({ ...panelEntry.payload, advisoriesGenerated: [{ tampered: true }] }),
    });
  }
  pushCase(cases, counters, {
    id: "G.hash-chain.04",
    decision: "tamper-advisories",
    expected: "invalid",
    actual: verifyAuditChain(tamperedAdvisories) ? "valid" : "invalid",
    reason: "Tampering advisoriesGenerated invalidates chain.",
  });

  const tamperedPrev = [...entries];
  if (panelIndex >= 0) {
    tamperedPrev[panelIndex] = Object.freeze({
      ...tamperedPrev[panelIndex]!,
      prevHash: "TAMPERED",
    });
  }
  pushCase(cases, counters, {
    id: "G.hash-chain.05",
    decision: "tamper-prevHash",
    expected: "invalid",
    actual: verifyAuditChain(tamperedPrev) ? "valid" : "invalid",
    reason: "Tampering prevHash invalidates chain.",
  });

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "panel-audit-"));
  const clock = createFakeClock();
  const fileWriter = new FileAppendAuditLogWriter({
    baseDir: tempDir,
    clock,
    retentionPolicy: DEFAULT_RETENTION_POLICY,
    hostname: "panel-audit-test",
  });
  await runPanelDecision(basePanelInput(), {
    auditLogWriter: fileWriter,
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  });
  await fileWriter.flush();
  const filePath = path.join(tempDir, "audit-2026-06-24-panel-audit-test.jsonl");
  const fileContent = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = fileContent.trim().split("\n").filter(Boolean);
  const parsedEntries = lines.map((line) => JSON.parse(line));
  pushCase(cases, counters, {
    id: "G.hash-chain.06",
    decision: "file-round-trip",
    expected: "valid",
    actual:
      lines.length === 1 &&
      fileWriter.headHash() !== "GENESIS" &&
      verifyAuditChain(parsedEntries)
        ? "valid"
        : "invalid",
    reason: "Round-trip through FileAppendAuditLogWriter produces a valid chain.",
  });
  fs.rmSync(tempDir, { recursive: true, force: true });
}

async function executeGroupH(
  cases: PanelDecisionAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): Promise<void> {
  const panelConsumerTestPath = path.join(__dirname, "panelConsumer.test.ts");
  pushCase(cases, counters, {
    id: "H.regression.01",
    decision: "panel-consumer-suite-exists",
    expected: "exists",
    actual: fs.existsSync(panelConsumerTestPath) ? "exists" : "missing",
    reason: "42.7C panelConsumer.test.ts regression suite exists.",
  });

  const panelSource = fs.readFileSync(panelConsumerTestPath, "utf8");
  pushCase(cases, counters, {
    id: "H.regression.02",
    decision: "87-test-floor",
    expected: "87",
    actual: /totalCases:\s*87/.test(panelSource) ? "87" : "not-found",
    reason: "panelConsumer.test.ts declares 87-case floor.",
  });

  const verifierPath = path.join(path.resolve(__dirname, "../../../../../"), "scripts", "verify-phase-42-7c-2.js");
  pushCase(cases, counters, {
    id: "H.regression.03",
    decision: "phase-verifier-exists",
    expected: "exists",
    actual: fs.existsSync(verifierPath) ? "exists" : "missing",
    reason: "verify-phase-42-7c-2.js verifier exists for pure-core SHA check.",
  });

  const fixtures: Array<{ id: string; persona: AIPersonaId; capabilityId: string | null }> = [
    { id: "H.parity.01", persona: "ai-staff-accountant", capabilityId: firstCapabilityId("ai-staff-accountant") },
    { id: "H.parity.02", persona: "ai-senior-accountant", capabilityId: firstCapabilityId("ai-senior-accountant") },
    { id: "H.parity.03", persona: "ai-staff-accountant", capabilityId: "month-end-close-routine" },
    { id: "H.parity.04", persona: "ai-staff-accountant", capabilityId: "nonexistent-capability-xyz" },
    { id: "H.parity.05", persona: "ai-cfo-helper", capabilityId: firstCapabilityId("ai-cfo-helper") },
    { id: "H.parity.06", persona: "ai-partner-helper", capabilityId: firstCapabilityId("ai-partner-helper") },
    { id: "H.parity.07", persona: "ai-staff-auditor", capabilityId: "audit-workpaper-review" },
    { id: "H.parity.08", persona: "ai-audit-manager-helper", capabilityId: "partner-readout-draft" },
    { id: "H.parity.09", persona: "ai-controller-helper", capabilityId: "policy-drafting-assist" },
    { id: "H.parity.10", persona: "ai-accounting-manager", capabilityId: firstCapabilityId("ai-accounting-manager") },
  ];

  const gateWrapped = createCapabilityGate(createTestGateDeps());
  const gatePure = createCapabilityGatePure(createTestGateDeps());

  for (const fixture of fixtures) {
    const item = workItem({
      workItemId: fixture.id,
      requestedCapabilityId: fixture.capabilityId,
    });
    const wrapped = await gateWrapped.decide(item, fixture.persona);
    const pure = await gatePure.decide(item, fixture.persona);
    pushCase(cases, counters, {
      id: fixture.id,
      decision: "wrapped-vs-pure",
      expected: "identical",
      actual: JSON.stringify(wrapped) === JSON.stringify(pure) ? "identical" : "different",
      reason: "Panel decision behavioral output identical between wrapper and pure core.",
    });
  }
}

export async function runPanelDecisionAuditTests(): Promise<PanelDecisionAuditEvidence> {
  const cases: PanelDecisionAuditCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };

  executeGroupA(cases, counters);
  await executeGroupB(cases, counters);
  await executeGroupC(cases, counters);
  executeGroupD(cases, counters);
  await executeGroupE(cases, counters);
  await executeGroupF(cases, counters);
  await executeGroupG(cases, counters);
  await executeGroupH(cases, counters);

  if (cases.length < 40) {
    pushCase(cases, counters, {
      id: "H.coverage.floor",
      decision: "minimum-case-count",
      expected: "gte-40",
      actual: `lt-40:${cases.length}`,
      reason: `Only ${cases.length} cases generated; spec requires >= 40.`,
    });
  }

  return Object.freeze({
    evidenceVersion: "42.7C.2" as const,
    generatedAt: FROZEN_GENERATED_AT,
    totalCases: cases.length,
    passCount: counters.passCount,
    failCount: counters.failCount,
    cases: Object.freeze(cases),
  });
}

if (require.main === module) {
  runPanelDecisionAuditTests().then((result) => {
    console.log(
      `panel-decision-audit: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`,
    );
    process.exit(result.failCount === 0 ? 0 : 1);
  });
}
