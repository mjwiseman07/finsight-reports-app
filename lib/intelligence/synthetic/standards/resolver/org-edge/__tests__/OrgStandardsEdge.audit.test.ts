import * as fs from "node:fs";
import * as path from "node:path";
import {
  InMemoryAuditLogWriter,
  verifyAuditChain,
} from "../../../audit";
import type { AuditLogWriter } from "../../../audit/types";
import type {
  CallerIdentity,
  OrgEdgeReconciliationEntry,
} from "../../../audit/types";
import {
  validateOrgEdgeReconciliationEntry,
  validateCallerIdentity,
} from "../../../audit/validators";
import { StaticTenantClassifier } from "../../memory";
import { deriveOrgEdgeReconciliationContextPure } from "../deriveOrgEdgeReconciliationContextPure";
import type { ReconciliationInput } from "../deriveOrgEdgeReconciliationContextPure";
import { detectDisagreement } from "../disagreement-detector";
import { reconcileOrgStandards } from "../OrgStandardsEdge";
import { detectDisagreementPure } from "../orgStandardsEdgePure";
import type { CuratedRulesProjection } from "../orgStandardsEdgePure";
import type { AttestedElection, CitationHandle, FrameworkId } from "../types";

const FROZEN_GENERATED_AT = "2026-06-24T00:00:00Z";

const CITATION_BY_FRAMEWORK: Record<FrameworkId, CitationHandle> = {
  US_GAAP: "ASC_105_10_05_1",
  IFRS: "IAS_1_PRESENTATION",
  IFRS_SME: "IFRS_FOR_SMES_S1",
  SEC_REGS_X: "SEC_REG_S_X",
  SEC_FORM_20F: "SEC_FORM_20F_FPI",
};

export interface OrgEdgeAuditCaseRecord {
  readonly id: string;
  readonly decision: string;
  readonly expected: string;
  readonly outcome: string;
  readonly reason: string;
}

export interface OrgEdgeAuditEvidence {
  readonly evidenceVersion: "42.7D.1-audit";
  readonly generatedAt: string;
  readonly totalCases: number;
  readonly passCount: number;
  readonly failCount: number;
  readonly cases: readonly OrgEdgeAuditCaseRecord[];
}

function pushCase(
  cases: OrgEdgeAuditCaseRecord[],
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

function baseCallerIdentity(overrides: Partial<CallerIdentity> = {}): CallerIdentity {
  return Object.freeze({
    personaHandle: "ai-staff-accountant",
    tenantId: "tenant-standard-1",
    tenantClassification: "standard",
    invocationContext: Object.freeze({
      requestId: "req-org-edge-001",
      parentRequestId: null,
      invokedAt: FROZEN_GENERATED_AT,
    }),
    ...overrides,
  });
}

function attestedElection(
  orgId: string,
  framework: FrameworkId,
  overrides: Partial<AttestedElection> = {},
): AttestedElection {
  return Object.freeze({
    orgId,
    framework,
    citationHandle: overrides.citationHandle ?? CITATION_BY_FRAMEWORK[framework],
    attestedBy: "mwiseman@advisacor.com",
    attestedAt: FROZEN_GENERATED_AT,
    attestationVersion: "42.7A.4.1",
    note: "test attestation",
    ...overrides,
  });
}

function staticProjection(
  framework: FrameworkId,
  ruleIds: readonly string[] = ["curated-rule-1"],
): CuratedRulesProjection {
  return {
    computeProjectedFramework: () =>
      Object.freeze({
        framework,
        ruleIds: Object.freeze([...ruleIds]),
      }),
  };
}

function baseReconciliationInput(
  election: AttestedElection | null,
  projectedFramework: FrameworkId,
  overrides: Partial<ReconciliationInput> = {},
): ReconciliationInput {
  return Object.freeze({
    election,
    projection: staticProjection(projectedFramework),
    callerIdentity: baseCallerIdentity(),
    ...overrides,
  });
}

function sampleReconciliationEntry(
  overrides: Partial<OrgEdgeReconciliationEntry> = {},
): OrgEdgeReconciliationEntry {
  return {
    event: "orgEdge.reconciliation",
    version: 1,
    tenantClassification: "standard",
    callerIdentity: baseCallerIdentity(),
    outcome: "agreement",
    diff: { kind: "none" },
    citationHandles: [],
    ...overrides,
  };
}

function standardClassifier(): StaticTenantClassifier {
  return new StaticTenantClassifier({
    phiCoveredTenants: new Set(["tenant-phi-1"]),
    healthcareVerticalTenants: new Set(),
  });
}

function orgEdgePayload(writer: InMemoryAuditLogWriter): Record<string, unknown> | undefined {
  const entry = writer.getEntries().find((row) => row.kind === "orgEdge.reconciliation");
  return entry?.payload as Record<string, unknown> | undefined;
}

function auditOptions(
  writer: AuditLogWriter,
  knownTenantIds: ReadonlySet<string> = new Set(["tenant-standard-1", "tenant-phi-1"]),
) {
  return {
    auditLogWriter: writer,
    tenantClassifier: standardClassifier(),
    knownTenantIds,
  };
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

class OrderingAuditWriter extends InMemoryAuditLogWriter {
  appendCount = 0;
  reconciliationReturned = false;

  append(entry: Parameters<AuditLogWriter["append"]>[0]): void {
    if (this.reconciliationReturned) {
      throw new Error("append-after-reconciliation-return");
    }
    this.appendCount += 1;
    super.append(entry);
  }
}

function executeGroupA(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const writerAgreement = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-agree-1", "US_GAAP"), "US_GAAP"),
    auditOptions(writerAgreement),
  );
  pushCase(cases, counters, {
    id: "A.every-call.01",
    decision: "agreement-logged",
    expected: "orgEdge.reconciliation",
    actual: orgEdgePayload(writerAgreement)?.event === "orgEdge.reconciliation"
      ? "orgEdge.reconciliation"
      : "missing",
    reason: "Agreement path emits orgEdge.reconciliation audit entry.",
  });

  const writerDisagreement = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-disagree-1", "IFRS"), "US_GAAP"),
    auditOptions(writerDisagreement),
  );
  pushCase(cases, counters, {
    id: "A.every-call.02",
    decision: "disagreement-logged",
    expected: "disagreement",
    actual: String(orgEdgePayload(writerDisagreement)?.outcome ?? "missing"),
    reason: "Disagreement path emits audit entry with outcome disagreement.",
  });

  const writerNoElection = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(null, "US_GAAP"),
    auditOptions(writerNoElection),
  );
  pushCase(cases, counters, {
    id: "A.every-call.03",
    decision: "no-election-logged",
    expected: "1",
    actual: String(
      writerNoElection.getEntries().filter((e) => e.kind === "orgEdge.reconciliation").length,
    ),
    reason: "No-election path still emits one audit entry per call.",
  });

  const writerOnce = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-once-1", "US_GAAP"), "US_GAAP"),
    auditOptions(writerOnce),
  );
  pushCase(cases, counters, {
    id: "A.every-call.04",
    decision: "one-entry-per-call",
    expected: "1",
    actual: String(
      writerOnce.getEntries().filter((e) => e.kind === "orgEdge.reconciliation").length,
    ),
    reason: "Single reconcile call produces exactly one orgEdge.reconciliation entry.",
  });

  const writerRepeat = new InMemoryAuditLogWriter();
  const repeatInput = baseReconciliationInput(attestedElection("org-repeat-1", "US_GAAP"), "US_GAAP");
  reconcileOrgStandards(repeatInput, auditOptions(writerRepeat));
  reconcileOrgStandards(repeatInput, auditOptions(writerRepeat));
  pushCase(cases, counters, {
    id: "A.every-call.05",
    decision: "no-deduplication",
    expected: "2",
    actual: String(
      writerRepeat.getEntries().filter((e) => e.kind === "orgEdge.reconciliation").length,
    ),
    reason: "Repeated identical calls produce one entry per call (no dedup).",
  });

  pushCase(cases, counters, {
    id: "A.every-call.06",
    decision: "audit-kind",
    expected: "orgEdge.reconciliation",
    actual: writerAgreement.getEntries()[0]?.kind ?? "missing",
    reason: "Audit envelope kind is orgEdge.reconciliation.",
  });

  pushCase(cases, counters, {
    id: "A.every-call.07",
    decision: "payload-version",
    expected: "1",
    actual: String(orgEdgePayload(writerAgreement)?.version ?? "missing"),
    reason: "Payload version is 1.",
  });

  const writerOverride = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-override-1", "IFRS"), "IFRS"),
    auditOptions(writerOverride),
  );
  pushCase(cases, counters, {
    id: "A.every-call.08",
    decision: "override-agreement-logged",
    expected: "agreement",
    actual: String(orgEdgePayload(writerOverride)?.outcome ?? "missing"),
    reason: "Override-with-agreement path emits audit entry.",
  });
}

function executeGroupB(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const writerAgreement = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-b-agree", "US_GAAP"), "US_GAAP"),
    auditOptions(writerAgreement),
  );
  const agreementPayload = orgEdgePayload(writerAgreement)!;
  pushCase(cases, counters, {
    id: "B.outcome.01",
    decision: "agreement-outcome",
    expected: "agreement",
    actual: String(agreementPayload.outcome ?? "missing"),
    reason: "Matching frameworks produce outcome agreement.",
  });
  pushCase(cases, counters, {
    id: "B.outcome.02",
    decision: "agreement-diff-none",
    expected: "none",
    actual: (agreementPayload.diff as { kind?: string })?.kind ?? "missing",
    reason: "Agreement outcome requires diff.kind none.",
  });

  const writerDisagreement = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-b-disagree", "IFRS"), "US_GAAP"),
    auditOptions(writerDisagreement),
  );
  const disagreementPayload = orgEdgePayload(writerDisagreement)!;
  pushCase(cases, counters, {
    id: "B.outcome.03",
    decision: "disagreement-outcome",
    expected: "disagreement",
    actual: String(disagreementPayload.outcome ?? "missing"),
    reason: "Mismatched frameworks produce outcome disagreement.",
  });
  pushCase(cases, counters, {
    id: "B.outcome.04",
    decision: "disagreement-override-applied",
    expected: "override-applied",
    actual: (disagreementPayload.diff as { kind?: string })?.kind ?? "missing",
    reason: "Disagreement outcome requires diff.kind override-applied.",
  });

  const writerNoElection = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(null, "US_GAAP"),
    auditOptions(writerNoElection),
  );
  pushCase(cases, counters, {
    id: "B.outcome.05",
    decision: "no-election-agreement",
    expected: "agreement",
    actual: String(orgEdgePayload(writerNoElection)?.outcome ?? "missing"),
    reason: "No-election path maps to agreement outcome in audit payload.",
  });

  const writerSec = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-b-sec", "SEC_REGS_X"), "SEC_REGS_X"),
    auditOptions(writerSec),
  );
  pushCase(cases, counters, {
    id: "B.outcome.06",
    decision: "sec-agreement-none",
    expected: "none",
    actual: (orgEdgePayload(writerSec)?.diff as { kind?: string })?.kind ?? "missing",
    reason: "SEC_REGS_X agreement still uses diff.kind none.",
  });
}

function executeGroupC(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const writer = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-c-diff", "IFRS"), "US_GAAP"),
    auditOptions(writer),
  );
  const diff = orgEdgePayload(writer)?.diff as Record<string, unknown> | undefined;

  for (const field of [
    "orgPolicyHandle",
    "panelFrameworkHandle",
    "resolvedFrameworkHandle",
    "attestationChain",
    "resolutionRule",
  ] as const) {
    pushCase(cases, counters, {
      id: `C.diff-payload.${field}`,
      decision: `disagreement-has-${field}`,
      expected: "present",
      actual: diff?.[field] !== undefined && diff[field] !== null ? "present" : "missing",
      reason: `Disagreement diff includes ${field}.`,
    });
  }

  const writerAgreement = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-c-agree", "US_GAAP"), "US_GAAP"),
    auditOptions(writerAgreement),
  );
  const agreementDiff = orgEdgePayload(writerAgreement)?.diff as Record<string, unknown> | undefined;
  const extraFields = agreementDiff
    ? Object.keys(agreementDiff).filter((key) => key !== "kind")
    : ["missing"];
  pushCase(cases, counters, {
    id: "C.diff-payload.agreement-only-none",
    decision: "agreement-no-extra-diff-fields",
    expected: "none-only",
    actual: extraFields.length === 0 ? "none-only" : extraFields.join(","),
    reason: "Agreement diff contains only kind none (no override-applied fields).",
  });
}

function executeGroupD(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const writerAgreement = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-d-agree", "US_GAAP"), "US_GAAP"),
    auditOptions(writerAgreement),
  );
  const agreementIdentity = orgEdgePayload(writerAgreement)?.callerIdentity as
    | CallerIdentity
    | undefined;
  pushCase(cases, counters, {
    id: "D.caller-identity.01",
    decision: "agreement-identity",
    expected: "all-present",
    actual:
      agreementIdentity?.personaHandle &&
      agreementIdentity.tenantId &&
      agreementIdentity.tenantClassification &&
      agreementIdentity.invocationContext?.requestId &&
      agreementIdentity.invocationContext.invokedAt
        ? "all-present"
        : "missing",
    reason: "Agreement audit entry carries full CallerIdentity.",
  });

  const writerDisagreement = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-d-disagree", "IFRS"), "US_GAAP"),
    auditOptions(writerDisagreement),
  );
  const disagreementIdentity = orgEdgePayload(writerDisagreement)?.callerIdentity as
    | CallerIdentity
    | undefined;
  pushCase(cases, counters, {
    id: "D.caller-identity.02",
    decision: "disagreement-identity",
    expected: "all-present",
    actual:
      disagreementIdentity?.personaHandle &&
      disagreementIdentity.tenantId &&
      disagreementIdentity.tenantClassification &&
      disagreementIdentity.invocationContext?.requestId
        ? "all-present"
        : "missing",
    reason: "Disagreement audit entry carries full CallerIdentity.",
  });

  pushCase(cases, counters, {
    id: "D.caller-identity.03",
    decision: "parent-request-id-key",
    expected: "present",
    actual: Object.prototype.hasOwnProperty.call(
      agreementIdentity?.invocationContext ?? {},
      "parentRequestId",
    )
      ? "present"
      : "missing",
    reason: "CallerIdentity includes invocationContext.parentRequestId (nullable).",
  });

  const writerSession = new InMemoryAuditLogWriter();
  const sessionInput = baseReconciliationInput(
    attestedElection("org-d-session", "US_GAAP"),
    "US_GAAP",
    {
      callerIdentity: baseCallerIdentity({
        invocationContext: Object.freeze({
          requestId: "req-session-repeat",
          parentRequestId: "parent-req-1",
          invokedAt: FROZEN_GENERATED_AT,
        }),
      }),
    },
  );
  reconcileOrgStandards(sessionInput, auditOptions(writerSession));
  reconcileOrgStandards(sessionInput, auditOptions(writerSession));
  const requestIds = writerSession
    .getEntries()
    .filter((e) => e.kind === "orgEdge.reconciliation")
    .map((e) => {
      const payload = e.payload;
      if (
        payload &&
        typeof payload === "object" &&
        "callerIdentity" in payload &&
        typeof (payload as { callerIdentity: unknown }).callerIdentity === "object" &&
        (payload as { callerIdentity: { invocationContext?: { requestId?: unknown } } }).callerIdentity
          ?.invocationContext?.requestId
      ) {
        return String(
          (payload as { callerIdentity: { invocationContext: { requestId: string } } }).callerIdentity
            .invocationContext.requestId,
        );
      }
      return "";
    });
  pushCase(cases, counters, {
    id: "D.caller-identity.04",
    decision: "same-request-two-entries",
    expected: "identical",
    actual:
      requestIds.length === 2 && requestIds[0] === requestIds[1] ? "identical" : "different",
    reason: "Two calls with same CallerIdentity produce identical requestId in both entries.",
  });
}

function executeGroupE(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const classifier = standardClassifier();
  const knownTenants = new Set(["tenant-standard-1", "tenant-phi-1"]);

  const writerPhi = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-e-phi", "US_GAAP"), "US_GAAP", {
      callerIdentity: baseCallerIdentity({
        tenantId: "tenant-phi-1",
        tenantClassification: "phi-covered",
      }),
    }),
    {
      auditLogWriter: writerPhi,
      tenantClassifier: classifier,
      knownTenantIds: knownTenants,
    },
  );
  const phiPayload = orgEdgePayload(writerPhi)!;
  pushCase(cases, counters, {
    id: "E.phi.01",
    decision: "phi-root-classification",
    expected: "phi-covered",
    actual: String(phiPayload.tenantClassification ?? ""),
    reason: "PHI tenant produces tenantClassification phi-covered at root.",
  });
  pushCase(cases, counters, {
    id: "E.phi.02",
    decision: "phi-caller-classification",
    expected: "phi-covered",
    actual: String(
      (phiPayload.callerIdentity as CallerIdentity | undefined)?.tenantClassification ?? "",
    ),
    reason: "PHI tenant produces tenantClassification phi-covered in callerIdentity.",
  });
  pushCase(cases, counters, {
    id: "E.phi.03",
    decision: "phi-namespace",
    expected: "phi-covered",
    actual: String(phiPayload.auditNamespace ?? ""),
    reason: "PHI tenant entries routed to phi-covered audit namespace.",
  });

  const writerStd = new InMemoryAuditLogWriter();
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-e-std", "US_GAAP"), "US_GAAP"),
    auditOptions(writerStd, knownTenants),
  );
  pushCase(cases, counters, {
    id: "E.phi.04",
    decision: "standard-classification",
    expected: "standard",
    actual: String(orgEdgePayload(writerStd)?.tenantClassification ?? ""),
    reason: "Standard tenant produces tenantClassification standard.",
  });

  let unknownTenant = "no-throw";
  try {
    reconcileOrgStandards(
      baseReconciliationInput(attestedElection("org-e-unknown", "US_GAAP"), "US_GAAP", {
        callerIdentity: baseCallerIdentity({ tenantId: "unknown-tenant" }),
      }),
      {
        auditLogWriter: new InMemoryAuditLogWriter(),
        tenantClassifier: classifier,
        knownTenantIds: new Set(["tenant-standard-1"]),
      },
    );
    unknownTenant = "no-throw";
  } catch (error) {
    unknownTenant = (error as Error).message.includes("known registry") ? "throws" : "other-error";
  }
  pushCase(cases, counters, {
    id: "E.phi.05",
    decision: "classifier-fail-closed",
    expected: "throws",
    actual: unknownTenant,
    reason: "Unknown tenant fails closed when audit writer is configured.",
  });
}

function executeGroupF(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const writer = new InMemoryAuditLogWriter();
  writer.append({
    kind: "cache.hit",
    actor: { kind: "system", id: "cache-test", via: "direct-api" },
    subject: { orgId: "org-edge-1", tenantId: "tenant-standard-1" },
    payload: { cacheKey: "test-key" },
  });
  reconcileOrgStandards(
    baseReconciliationInput(attestedElection("org-f-chain", "US_GAAP"), "US_GAAP"),
    auditOptions(writer),
  );
  writer.append({
    kind: "cache.miss",
    actor: { kind: "system", id: "cache-test", via: "direct-api" },
    subject: { orgId: "org-edge-1", tenantId: "tenant-standard-1" },
    payload: { cacheKey: "test-key-2" },
  });

  const entries = writer.getEntries();
  const orgEdgeIndex = entries.findIndex((e) => e.kind === "orgEdge.reconciliation");
  pushCase(cases, counters, {
    id: "F.hash-chain.01",
    decision: "prevHash-links",
    expected: "linked",
    actual:
      orgEdgeIndex > 0 && entries[orgEdgeIndex]!.prevHash === entries[orgEdgeIndex - 1]!.entryHash
        ? "linked"
        : "broken",
    reason: "Org-edge entry prevHash references previous entry in chain.",
  });

  pushCase(cases, counters, {
    id: "F.hash-chain.02",
    decision: "mixed-chain-verify",
    expected: "valid",
    actual: verifyAuditChain(entries) ? "valid" : "invalid",
    reason: "Mixed cache + orgEdge chain verifies via verifyAuditChain().",
  });

  const tampered = [...entries];
  if (orgEdgeIndex >= 0) {
    tampered[orgEdgeIndex] = Object.freeze({
      ...tampered[orgEdgeIndex]!,
      prevHash: "TAMPERED",
    });
  }
  pushCase(cases, counters, {
    id: "F.hash-chain.03",
    decision: "tamper-prevHash",
    expected: "invalid",
    actual: verifyAuditChain(tampered) ? "valid" : "invalid",
    reason: "Tampering prevHash invalidates chain.",
  });
}

function executeGroupG(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  let unknownHandle = "no-throw";
  try {
    validateOrgEdgeReconciliationEntry(
      sampleReconciliationEntry({ citationHandles: ["FREE_TEXT_URL"] }),
    );
    unknownHandle = "no-throw";
  } catch {
    unknownHandle = "throws";
  }
  pushCase(cases, counters, {
    id: "G.citation.01",
    decision: "unknown-handle-rejected",
    expected: "throws",
    actual: unknownHandle,
    reason: "Validator rejects citation handle outside locked set.",
  });

  let validHandle = "invalid";
  try {
    validateOrgEdgeReconciliationEntry(
      sampleReconciliationEntry({ citationHandles: ["ASC_105_10_05_1"] }),
    );
    validHandle = "valid";
  } catch {
    validHandle = "invalid";
  }
  pushCase(cases, counters, {
    id: "G.citation.02",
    decision: "locked-handle-accepted",
    expected: "valid",
    actual: validHandle,
    reason: "Validator accepts locked citation handle.",
  });

  let mixedHandles = "no-throw";
  try {
    validateOrgEdgeReconciliationEntry(
      sampleReconciliationEntry({
        citationHandles: ["ASC_105_10_05_1", "NOT_A_REAL_HANDLE"],
      }),
    );
    mixedHandles = "no-throw";
  } catch {
    mixedHandles = "throws";
  }
  pushCase(cases, counters, {
    id: "G.citation.03",
    decision: "one-bad-handle-rejected",
    expected: "throws",
    actual: mixedHandles,
    reason: "One invalid handle in citationHandles array fails validation.",
  });
}

function executeGroupH(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const input = baseReconciliationInput(attestedElection("org-h-fail", "US_GAAP"), "US_GAAP");

  let auditFail = "allowed";
  try {
    reconcileOrgStandards(input, auditOptions(new ThrowingAuditWriter()));
    auditFail = "allowed";
  } catch (error) {
    auditFail = (error as Error).message.includes("audit-write-failure-simulated")
      ? "throws"
      : "other-error";
  }
  pushCase(cases, counters, {
    id: "H.fail-closed.01",
    decision: "append-throws",
    expected: "throws",
    actual: auditFail,
    reason: "AuditLogWriter.append() throwing causes reconcileOrgStandards() to throw.",
  });

  let resultOnFail = "returned";
  try {
    reconcileOrgStandards(input, auditOptions(new ThrowingAuditWriter()));
  } catch {
    resultOnFail = "not-returned";
  }
  pushCase(cases, counters, {
    id: "H.fail-closed.02",
    decision: "no-result-on-fail",
    expected: "not-returned",
    actual: resultOnFail,
    reason: "Caller does NOT receive a reconciliation result when audit write fails.",
  });

  const orderingWriter = new OrderingAuditWriter();
  const orderingResult = reconcileOrgStandards(input, auditOptions(orderingWriter));
  orderingWriter.reconciliationReturned = true;
  pushCase(cases, counters, {
    id: "H.fail-closed.03",
    decision: "audit-before-return",
    expected: "append-first",
    actual:
      orderingWriter.appendCount > 0 && orderingResult.kind === "override"
        ? "append-first"
        : "wrong-order",
    reason: "Audit write happens before reconciliation result is returned.",
  });
}

function executeGroupI(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  let agreementOverride = "no-throw";
  try {
    validateOrgEdgeReconciliationEntry(
      sampleReconciliationEntry({
        outcome: "agreement",
        diff: {
          kind: "override-applied",
          orgPolicyHandle: "org-policy:org-1:IFRS",
          panelFrameworkHandle: "US_GAAP",
          resolvedFrameworkHandle: "IFRS",
          attestationChain: [
            {
              attestedBy: "mwiseman@advisacor.com",
              attestedAt: FROZEN_GENERATED_AT,
              attestationHandle: "IAS_1_PRESENTATION",
            },
          ],
          resolutionRule: "org-election-override-wins",
        },
      }),
    );
    agreementOverride = "no-throw";
  } catch {
    agreementOverride = "throws";
  }
  pushCase(cases, counters, {
    id: "I.schema.01",
    decision: "agreement-plus-override-applied",
    expected: "throws",
    actual: agreementOverride,
    reason: "Agreement outcome with override-applied diff rejected.",
  });

  let disagreementNone = "no-throw";
  try {
    validateOrgEdgeReconciliationEntry(
      sampleReconciliationEntry({
        outcome: "disagreement",
        diff: { kind: "none" },
      }),
    );
    disagreementNone = "no-throw";
  } catch {
    disagreementNone = "throws";
  }
  pushCase(cases, counters, {
    id: "I.schema.02",
    decision: "disagreement-plus-none",
    expected: "throws",
    actual: disagreementNone,
    reason: "Disagreement outcome with diff.kind none rejected.",
  });

  let emptyChain = "no-throw";
  try {
    validateOrgEdgeReconciliationEntry(
      sampleReconciliationEntry({
        outcome: "disagreement",
        diff: {
          kind: "override-applied",
          orgPolicyHandle: "org-policy:org-1:IFRS",
          panelFrameworkHandle: "US_GAAP",
          resolvedFrameworkHandle: "IFRS",
          attestationChain: [],
          resolutionRule: "org-election-override-wins",
        },
      }),
    );
    emptyChain = "no-throw";
  } catch {
    emptyChain = "throws";
  }
  pushCase(cases, counters, {
    id: "I.schema.03",
    decision: "empty-attestation-chain",
    expected: "throws",
    actual: emptyChain,
    reason: "Empty attestationChain on override-applied diff rejected.",
  });
}

function executeGroupJ(
  cases: OrgEdgeAuditCaseRecord[],
  counters: { passCount: number; failCount: number },
): void {
  const pureCorePath = path.join(__dirname, "../orgStandardsEdgePure.ts");
  pushCase(cases, counters, {
    id: "J.regression.01",
    decision: "orgStandardsEdgePure-exists",
    expected: "exists",
    actual: fs.existsSync(pureCorePath) ? "exists" : "missing",
    reason: "orgStandardsEdgePure.ts pure core module exists.",
  });

  const verifierPath = path.join(
    path.resolve(__dirname, "../../../../../../../"),
    "scripts",
    "verify-phase-42-7d-1-audit.js",
  );
  pushCase(cases, counters, {
    id: "J.regression.02",
    decision: "audit-verifier-script",
    expected: "exists",
    actual: fs.existsSync(verifierPath) ? "exists" : "missing",
    reason: "verify-phase-42-7d-1-audit.js phase verifier exists.",
  });

  const parityFixtures: Array<{
    id: string;
    election: AttestedElection | null;
    projected: FrameworkId;
  }> = [
    { id: "J.parity.01", election: null, projected: "US_GAAP" },
    {
      id: "J.parity.02",
      election: attestedElection("org-parity-1", "US_GAAP"),
      projected: "US_GAAP",
    },
    {
      id: "J.parity.03",
      election: attestedElection("org-parity-2", "IFRS"),
      projected: "US_GAAP",
    },
    {
      id: "J.parity.04",
      election: attestedElection("org-parity-3", "SEC_FORM_20F"),
      projected: "IFRS_SME",
    },
  ];

  for (const fixture of parityFixtures) {
    const projection = staticProjection(fixture.projected);
    const wrapped = detectDisagreement(fixture.election, projection);
    const pure = detectDisagreementPure(fixture.election, projection);
    pushCase(cases, counters, {
      id: fixture.id,
      decision: "detectDisagreement-vs-pure",
      expected: "identical",
      actual: JSON.stringify(wrapped) === JSON.stringify(pure) ? "identical" : "different",
      reason: "detectDisagreement export is byte-identical to detectDisagreementPure.",
    });
  }

  const input = baseReconciliationInput(
    attestedElection("org-j-derive", "IFRS"),
    "US_GAAP",
  );
  const pureResult = detectDisagreementPure(input.election, input.projection);
  const derived = deriveOrgEdgeReconciliationContextPure(input, pureResult);
  let derivedValid = "invalid";
  try {
    validateOrgEdgeReconciliationEntry(derived);
    validateCallerIdentity(derived.callerIdentity);
    derivedValid = "valid";
  } catch {
    derivedValid = "invalid";
  }
  pushCase(cases, counters, {
    id: "J.regression.03",
    decision: "derive-context-validates",
    expected: "valid",
    actual: derivedValid,
    reason: "deriveOrgEdgeReconciliationContextPure output passes validators without audit writer.",
  });
}

export function runOrgEdgeAuditTests(): OrgEdgeAuditEvidence {
  const cases: OrgEdgeAuditCaseRecord[] = [];
  const counters = { passCount: 0, failCount: 0 };

  executeGroupA(cases, counters);
  executeGroupB(cases, counters);
  executeGroupC(cases, counters);
  executeGroupD(cases, counters);
  executeGroupE(cases, counters);
  executeGroupF(cases, counters);
  executeGroupG(cases, counters);
  executeGroupH(cases, counters);
  executeGroupI(cases, counters);
  executeGroupJ(cases, counters);

  if (cases.length < 40) {
    pushCase(cases, counters, {
      id: "J.coverage.floor",
      decision: "minimum-case-count",
      expected: "gte-40",
      actual: `lt-40:${cases.length}`,
      reason: `Only ${cases.length} cases generated; spec requires >= 40.`,
    });
  }

  return Object.freeze({
    evidenceVersion: "42.7D.1-audit" as const,
    generatedAt: FROZEN_GENERATED_AT,
    totalCases: cases.length,
    passCount: counters.passCount,
    failCount: counters.failCount,
    cases: Object.freeze(cases),
  });
}

if (require.main === module) {
  const result = runOrgEdgeAuditTests();
  console.log(
    `org-edge-audit: ${result.passCount}/${result.totalCases} passed, ${result.failCount} failed`,
  );
  process.exit(result.failCount === 0 ? 0 : 1);
}
