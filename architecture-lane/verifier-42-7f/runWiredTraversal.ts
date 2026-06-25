/**
 * Phase 42.7F — Cross-Phase Wiring Verifier
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { evaluateEscalation } from "../../lib/intelligence/synthetic/role-adapter/evaluateEscalation";
import type { EscalationEvaluationInput } from "../../lib/intelligence/synthetic/role-adapter/evaluateEscalationPure";
import type { RoleEnvelope, RoleHandle, TreatmentResolution } from "../../lib/intelligence/synthetic/role-adapter/types";
import { loadBaselineByPersona } from "../../lib/intelligence/synthetic/panel-consumer/job-descriptions/load-baseline";
import { NullCompanyJobDescriptionReader } from "../../lib/intelligence/synthetic/panel-consumer/company-overlay/NullCompanyJobDescriptionReader";
import { createEscalationRegistry } from "../../lib/intelligence/synthetic/panel-consumer/routing/escalation-bridge";
import { runPanelDecision } from "../../lib/intelligence/synthetic/panel-consumer/runPanelDecision";
import type { AIPersonaId } from "../../lib/intelligence/synthetic/panel-consumer/types";
import {
  FileAppendAuditLogWriter,
  verifyAuditChain,
  DEFAULT_RETENTION_POLICY,
} from "../../lib/intelligence/synthetic/standards/audit";
import type { AuditEntry, AuditEventKind, AuditLogWriter } from "../../lib/intelligence/synthetic/standards/audit/types";
import { validateCallerIdentity } from "../../lib/intelligence/synthetic/standards/audit/validators";
import { isLockedCitationHandle } from "../../lib/intelligence/synthetic/panel-consumer/locked-citation-handles";
import { reconcileOrgStandards } from "../../lib/intelligence/synthetic/standards/resolver/org-edge/OrgStandardsEdge";
import type { ReconciliationInput } from "../../lib/intelligence/synthetic/standards/resolver/org-edge/deriveOrgEdgeReconciliationContextPure";
import type { AttestedElection, FrameworkId } from "../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import { StaticTenantClassifier } from "../../lib/intelligence/synthetic/standards/resolver/memory";
import type { ExpectedHop } from "./expectedHopManifest";
import { ThrowingAuditLogWriter } from "./ThrowingAuditLogWriter";

const FROZEN_MS = Date.parse("2026-06-24T00:00:00Z");
const FROZEN_ISO = "2026-06-24T00:00:00.000Z";

export type OrgElectionState = "no-election" | "agreement-with-panel" | "override-applied";
export type EscalationOutcomeClass =
  | "escalated"
  | "no-escalation"
  | "gate-blocked"
  | "degraded-confidence";
export type FailClosedHop = "escalation" | "panel" | "org-edge";

export interface TraversalInput {
  readonly caseId: string;
  readonly persona: RoleHandle;
  readonly tenantClassification: "standard" | "phi-covered";
  readonly tenantId: string;
  readonly orgId: string;
  readonly industry: string;
  readonly orgElectionState: OrgElectionState;
  readonly escalationOutcome: EscalationOutcomeClass;
  readonly failClosedHop?: FailClosedHop;
}

export interface WiringVerifierCase {
  readonly id: string;
  readonly input: TraversalInput;
  readonly expectedHops: readonly ExpectedHop[];
  readonly expectedOutcome: {
    readonly resolutionReturned: boolean;
    readonly chainValid: boolean;
  };
  readonly isFailClosed?: boolean;
}

export interface TraversalEvidence {
  readonly caseId: string;
  readonly entries: readonly AuditEntry[];
  readonly chainValid: boolean;
  readonly resolutionReturned: boolean;
  readonly errorMessage: string | null;
  readonly hopMismatch: string | null;
}

function createFakeClock(startMs = FROZEN_MS) {
  let now = startMs;
  return { nowMs: () => now };
}

function readJsonlEntries(filePath: string): AuditEntry[] {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n").filter(Boolean);
  return lines.map((line) => JSON.parse(line) as AuditEntry);
}

function mkResolution(outcome: EscalationOutcomeClass): TreatmentResolution {
  if (outcome === "no-escalation") {
    return {
      chosenFramework: "US_GAAP",
      applicableBasisRef: "basisOf:US_GAAP",
      precedenceReasoning: "RULE-001 selected at weight 900.",
      matchedRules: ["RULE-001"],
      unresolvedConflicts: [],
      citationHandlesConsulted: ["ASC_105_10_05_1"],
    } as unknown as TreatmentResolution;
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
    } as unknown as TreatmentResolution;
  }
  return {
    chosenFramework: null,
    applicableBasisRef: "basisOf:OUT_OF_SCOPE",
    precedenceReasoning: "Out of scope for role envelope.",
    matchedRules: ["RULE-OOS"],
    unresolvedConflicts: [],
    citationHandlesConsulted: ["ASC_105_10_05_1"],
  } as unknown as TreatmentResolution;
}

function mapEscalationExpectedOutcome(outcome: EscalationOutcomeClass): string {
  switch (outcome) {
    case "no-escalation":
      return "no-escalation";
    case "escalated":
      return "escalate-tier-up";
    case "gate-blocked":
      return "decline-out-of-scope";
    case "degraded-confidence":
      return "escalate-to-founder";
    default:
      return "no-escalation";
  }
}

function electionForState(
  state: OrgElectionState,
  orgId: string,
): { election: AttestedElection | null; projected: FrameworkId } {
  if (state === "no-election") {
    return { election: null, projected: "US_GAAP" };
  }
  const election: AttestedElection = Object.freeze({
    orgId,
    framework: state === "agreement-with-panel" ? "US_GAAP" : "IFRS",
    citationHandle: state === "agreement-with-panel" ? "ASC_105_10_05_1" : "IAS_1_PRESENTATION",
    attestedBy: "mwiseman@advisacor.com",
    attestedAt: FROZEN_ISO,
    attestationVersion: "1.0.0",
    note: "wiring-verifier fixture election",
  });
  return {
    election,
    projected: "US_GAAP",
  };
}

function firstCapabilityForPersona(persona: AIPersonaId): string {
  const baseline = loadBaselineByPersona().get(persona);
  if (!baseline?.capabilities[0]) {
    throw new Error(`no capability for persona ${persona}`);
  }
  return baseline.capabilities[0]!.capabilityId;
}

function validateProducedEntries(entries: readonly AuditEntry[]): string | null {
  for (const entry of entries) {
    const payload = entry.payload;
    const tenantClass = payload.tenantClassification;
    if (tenantClass !== "standard" && tenantClass !== "phi-covered") {
      return `entry ${entry.kind} missing tenantClassification`;
    }
    if (payload.callerIdentity) {
      try {
        validateCallerIdentity(payload.callerIdentity as Parameters<typeof validateCallerIdentity>[0]);
      } catch (error) {
        return `callerIdentity invalid on ${entry.kind}: ${(error as Error).message}`;
      }
      const nested = (payload.callerIdentity as { tenantClassification?: string }).tenantClassification;
      if (nested !== tenantClass) {
        return `callerIdentity.tenantClassification mismatch on ${entry.kind}`;
      }
    }
    const citations = payload.citationHandles;
    if (Array.isArray(citations)) {
      for (const handle of citations) {
        if (typeof handle === "string" && !isLockedCitationHandle(handle)) {
          return `citation handle outside locked set on ${entry.kind}: ${handle}`;
        }
      }
    }
    if (Array.isArray(payload.advisoriesGenerated)) {
      for (const advisory of payload.advisoriesGenerated as Array<{ citationHandle?: string }>) {
        if (advisory.citationHandle && !isLockedCitationHandle(advisory.citationHandle)) {
          return `advisory citation outside locked set on ${entry.kind}`;
        }
      }
    }
  }
  return null;
}

function wrapWriter(
  baseWriter: AuditLogWriter,
  failClosedHop?: FailClosedHop,
): AuditLogWriter {
  if (!failClosedHop) {
    return baseWriter;
  }
  const kindMap: Record<FailClosedHop, AuditEventKind> = {
    escalation: "escalation.evaluated",
    panel: "panel.decision",
    "org-edge": "orgEdge.reconciliation",
  };
  return new ThrowingAuditLogWriter(kindMap[failClosedHop], baseWriter);
}

export async function runWiredTraversal(
  wiringCase: WiringVerifierCase,
): Promise<TraversalEvidence> {
  const input = wiringCase.input;
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "wiring-verifier-"));
  const clock = createFakeClock();
  const fileWriter = new FileAppendAuditLogWriter({
    baseDir: tempDir,
    clock,
    retentionPolicy: DEFAULT_RETENTION_POLICY,
    hostname: "wiring-verifier",
  });
  const writer = wrapWriter(fileWriter, input.failClosedHop);
  const classifier = new StaticTenantClassifier({
    phiCoveredTenants: new Set(
      input.tenantClassification === "phi-covered" ? [input.tenantId] : [],
    ),
    healthcareVerticalTenants: new Set(
      input.industry === "healthcare" && input.tenantClassification === "phi-covered"
        ? [input.tenantId]
        : [],
    ),
  });
  const knownTenants = new Set([input.tenantId]);
  const sharedOptions = {
    tenantClassifier: classifier,
    knownTenantIds: knownTenants,
  };

  let resolutionReturned = false;
  let errorMessage: string | null = null;

  try {
    writer.append({
      kind: "cache.miss",
      actor: { kind: "system", id: "wiring-verifier", via: "direct-api" },
      subject: { orgId: input.orgId, tenantId: input.tenantId },
      payload: {
        tenantClassification: input.tenantClassification,
        cacheKey: `wv:${input.caseId}`,
      },
    });

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
      resolution: mkResolution(input.escalationOutcome),
      envelope,
    };
    evaluateEscalation(escalationInput, { auditLogWriter: writer, ...sharedOptions });

    const personaId = input.persona as AIPersonaId;
    await runPanelDecision(
      {
        callerPersonaHandle: input.persona,
        callerTenantId: input.tenantId,
        callerSessionId: `session-${input.caseId}`,
        callerOrgHandle: input.orgId,
        industryHandle: input.industry,
        topicHandle: "revenue-recognition",
        treatmentRequestId: `tr-${input.caseId}`,
        workItem: Object.freeze({
          workItemId: `wi-${input.caseId}`,
          source: "phase39-email",
          receivedAt: FROZEN_ISO,
          requestedPersonaId: null,
          requestedCapabilityId: firstCapabilityForPersona(personaId),
          payload: Object.freeze({}),
          companyId: input.orgId,
          phase39ProvenanceRef: `wv:${input.caseId}`,
        }),
        currentPersonaId: personaId,
        gateDeps: {
          baselineByPersona: loadBaselineByPersona(),
          companyOverlayReader: new NullCompanyJobDescriptionReader(),
          escalationRegistry: createEscalationRegistry(),
          clock: () => new Date(FROZEN_MS),
        },
      },
      { auditLogWriter: writer, ...sharedOptions },
    );

    const { election, projected } = electionForState(input.orgElectionState, input.orgId);
    const reconciliationInput: ReconciliationInput = {
      election,
      projection: {
        computeProjectedFramework: () => ({
          framework: projected,
          ruleIds: ["RULE-001"],
        }),
      },
      callerIdentity: Object.freeze({
        personaHandle: input.persona,
        tenantId: input.tenantId,
        tenantClassification: input.tenantClassification,
        invocationContext: Object.freeze({
          requestId: `req-${input.caseId}`,
          parentRequestId: `tr-${input.caseId}`,
          invokedAt: FROZEN_ISO,
        }),
      }),
    };
    reconcileOrgStandards(reconciliationInput, { auditLogWriter: writer, ...sharedOptions });

    writer.append({
      kind: "cache.write",
      actor: { kind: "system", id: "wiring-verifier", via: "direct-api" },
      subject: { orgId: input.orgId, tenantId: input.tenantId },
      payload: {
        tenantClassification: input.tenantClassification,
        cacheKey: `wv:${input.caseId}`,
      },
    });

    resolutionReturned = true;
    await fileWriter.flush();
  } catch (error) {
    errorMessage = (error as Error).message;
    resolutionReturned = false;
    try {
      await fileWriter.flush();
    } catch {
      // ignore flush errors after fail-closed
    }
  }

  const filePath = path.join(tempDir, "audit-2026-06-24-wiring-verifier.jsonl");
  const entries = readJsonlEntries(filePath);
  const chainValid = entries.length > 0 ? verifyAuditChain(entries) : !wiringCase.expectedOutcome.chainValid;
  const validationError = validateProducedEntries(entries);

  fs.rmSync(tempDir, { recursive: true, force: true });

  return Object.freeze({
    caseId: input.caseId,
    entries: Object.freeze(entries),
    chainValid: chainValid && validationError === null,
    resolutionReturned,
    errorMessage,
    hopMismatch: validationError,
  });
}
