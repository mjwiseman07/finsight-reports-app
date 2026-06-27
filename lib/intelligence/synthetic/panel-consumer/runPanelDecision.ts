/**
 * Phase 42.7C.2 — Panel Decision Audit Retrofit
 * Doctrine:
 *  - builderNeverAuthorsContent: true (no business content authored by builder)
 *  - isNotReplacementForHuman: true (panel selections support, not replace, controller judgment)
 *  - humanWorkerParityDoctrine: true (panel authority modeled on AICPA CGMA framework)
 *  - failClosedOnAuditWriteFailure: true (inherited from 42.7E E7)
 *  - pureInnerCoreUntouched: true (panel-consumer deterministic logic byte-identical to c8bddc8)
 *  - complianceClass: SOC1 + SOC2-T2 + HIPAA
 *  - advisoryBundlingDoctrine: true (one panel call = one audit entry; advisories bundled)
 */
import type { ActorRef } from "../standards/audit/types";
import {
  validatePanelDecisionEntry,
  type PanelDecisionEntry,
} from "../standards/audit/types";
import {
  buildDefaultVerticalContext,
  type VerticalContext,
} from "../standards/audit/vertical-decision-discriminators";
import type { TenantClassification } from "../standards/resolver/memory/types";
import {
  derivePanelAdvisoriesPure,
  extractPanelDecisionMetadata,
} from "./derivePanelDecisionContextPure";
import type { CapabilityGateDeps } from "./routing/capabilityGatePure";
import { createCapabilityGatePure } from "./routing/capabilityGatePure";
import type { AIPersonaId, PanelConsumerOptions, RoutingDecision, WorkItem } from "./types";

const SYSTEM_ACTOR: ActorRef = {
  kind: "system",
  id: "panel-consumer-run-panel-decision",
  via: "panel-consumer",
};

export interface PanelDecisionInput {
  readonly callerPersonaHandle: string;
  readonly callerTenantId: string;
  readonly callerSessionId: string;
  readonly callerOrgHandle: string;
  readonly industryHandle: string;
  readonly topicHandle: string;
  readonly treatmentRequestId: string;
  readonly workItem: WorkItem;
  readonly currentPersonaId: AIPersonaId;
  readonly gateDeps: CapabilityGateDeps;
  readonly verticalContext?: Partial<VerticalContext>;
}

export interface PanelDecisionResult {
  readonly decision: RoutingDecision;
}

function resolveTenantClassification(
  input: PanelDecisionInput,
  options: PanelConsumerOptions,
): TenantClassification {
  if (!options.tenantClassifier) {
    throw new Error("tenantClassifier required when auditLogWriter is configured");
  }
  if (options.knownTenantIds && !options.knownTenantIds.has(input.callerTenantId)) {
    throw new Error(`tenant not in known registry: ${input.callerTenantId}`);
  }
  return options.tenantClassifier.classify(input.callerTenantId);
}

function buildPanelHandle(industryHandle: string, topicHandle: string): string {
  return `${industryHandle}-${topicHandle}-panel`;
}

function buildAuditPayload(
  input: PanelDecisionInput,
  decision: RoutingDecision,
  tenantClassification: TenantClassification,
): PanelDecisionEntry {
  const metadata = extractPanelDecisionMetadata(decision);
  const advisories = derivePanelAdvisoriesPure(decision);
  const entry: PanelDecisionEntry = {
    event: "panel.decision",
    callerPersonaHandle: input.callerPersonaHandle,
    callerTenantId: input.callerTenantId,
    callerSessionId: input.callerSessionId,
    callerOrgHandle: input.callerOrgHandle,
    industryHandle: input.industryHandle,
    panelHandle: buildPanelHandle(input.industryHandle, input.topicHandle),
    topicHandle: input.topicHandle,
    treatmentRequestId: input.treatmentRequestId,
    matchedRules: [...metadata.matchedRules],
    citationHandlesConsulted: [...metadata.citationHandlesConsulted],
    unresolvedConflicts: [...metadata.unresolvedConflicts],
    resolvedBy: metadata.resolvedBy,
    election: metadata.election,
    advisoryCount: advisories.length,
    advisoriesGenerated: [...advisories],
    tenantClassification,
    verticalContext: buildDefaultVerticalContext(
      input.industryHandle,
      input.verticalContext,
    ),
  };
  validatePanelDecisionEntry(entry);
  return entry;
}

export async function runPanelDecision(
  input: PanelDecisionInput,
  options: PanelConsumerOptions = {},
): Promise<PanelDecisionResult> {
  const gate = createCapabilityGatePure(input.gateDeps);
  const decision = await gate.decide(input.workItem, input.currentPersonaId);

  if (!options.auditLogWriter) {
    return { decision };
  }

  const tenantClassification = resolveTenantClassification(input, options);
  const auditPayload = buildAuditPayload(input, decision, tenantClassification);

  options.auditLogWriter.append({
    kind: "panel.decision",
    actor: SYSTEM_ACTOR,
    subject: {
      orgId: input.callerOrgHandle,
      tenantId: input.callerTenantId,
    },
    payload: {
      ...auditPayload,
      auditNamespace:
        tenantClassification === "phi-covered" ? "phi-covered" : "standard",
    },
  });

  return { decision };
}
