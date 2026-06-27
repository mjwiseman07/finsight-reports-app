import {
  buildDefaultVerticalContext,
} from "../../../../lib/intelligence/synthetic/standards/audit/vertical-decision-discriminators";
import {
  validatePanelDecisionEntry,
  type PanelDecisionEntry,
} from "../../../../lib/intelligence/synthetic/standards/audit/types";
import {
  derivePanelAdvisoriesPure,
  extractPanelDecisionMetadata,
} from "../../../../lib/intelligence/synthetic/panel-consumer/derivePanelDecisionContextPure";
import type {
  AIPersonaId,
  EffectiveJobDescription,
  RoutingDecision,
} from "../../../../lib/intelligence/synthetic/panel-consumer/types";
import type { IntegrationScenario, ScenarioContext } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

function minimalEffectiveJD(
  personaId: AIPersonaId,
  capabilityId: string,
  attestedAt: string,
): EffectiveJobDescription {
  return Object.freeze({
    personaId,
    source: "baseline-only",
    companyId: null,
    capabilities: Object.freeze([
      Object.freeze({
        capabilityId,
        summary: "integration execute capability",
        phase39ModuleRefs: Object.freeze([39]),
        citationHandles: Object.freeze(["ASC_105_10_05_1"]),
        humanParity: Object.freeze({
          parityClaim: "integration parity",
          humanOnlyForNow: false,
          competencyFrameworkRef: "AICPA-CGMA",
        }),
        externalIO: "none",
      }),
    ]),
    restrictions: Object.freeze([]),
    escalationTriggers: Object.freeze([]),
    attestation: Object.freeze({
      attestedBy: "integration-harness",
      attestedAt,
      attestationVersion: "1.0.0",
      governanceNote: "G3 panel execute fixture",
    }),
  });
}

function appendPanelDecisionAudit(
  ctx: ScenarioContext,
  decision: RoutingDecision,
  input: {
    industryHandle: string;
    topicHandle: string;
    treatmentRequestId: string;
    tenantId: string;
    orgHandle: string;
  },
): void {
  const metadata = extractPanelDecisionMetadata(decision);
  const advisories = derivePanelAdvisoriesPure(decision);
  const entry: PanelDecisionEntry = Object.freeze({
    event: "panel.decision",
    callerPersonaHandle: "ai-staff-accountant",
    callerTenantId: input.tenantId,
    callerSessionId: "session-c4-1",
    callerOrgHandle: input.orgHandle,
    industryHandle: input.industryHandle,
    panelHandle: `${input.industryHandle}-${input.topicHandle}-panel`,
    topicHandle: input.topicHandle,
    treatmentRequestId: input.treatmentRequestId,
    matchedRules: Object.freeze([...metadata.matchedRules]),
    citationHandlesConsulted: Object.freeze([...metadata.citationHandlesConsulted]),
    unresolvedConflicts: Object.freeze([...metadata.unresolvedConflicts]),
    resolvedBy: metadata.resolvedBy,
    election: metadata.election,
    advisoryCount: advisories.length,
    advisoriesGenerated: Object.freeze([...advisories]),
    tenantClassification: "standard",
    verticalContext: buildDefaultVerticalContext(input.industryHandle, {
      vertical: "professional-services",
      reportingBasis: "US_GAAP",
    }),
  });
  validatePanelDecisionEntry(entry);
  ctx.auditBus.appendCore({
    kind: "panel.decision",
    actor: Object.freeze({
      kind: "system",
      id: "panel-consumer-run-panel-decision",
      via: "panel-consumer",
    }),
    subject: Object.freeze({
      orgId: input.orgHandle,
      tenantId: input.tenantId,
    }),
    payload: Object.freeze({ ...entry, auditNamespace: "standard" }),
  });
}

export const scenario: IntegrationScenario = {
  id: "C4-1",
  category: "panel-decision",
  title: "PS and SaaS panel execute decision audit",
  dependencies: ["kv-ps", "kv-saas"],
  execute(ctx) {
    ctx.participation.recordVertical("PS");
    ctx.participation.recordVertical("SAAS");

    const capabilityId = "journal-entry-routine";
    const decision: RoutingDecision = Object.freeze({
      kind: "execute",
      personaId: "ai-staff-accountant",
      capabilityId,
      effectiveJD: minimalEffectiveJD("ai-staff-accountant", capabilityId, ctx.clock.nowISO()),
    });

    appendPanelDecisionAudit(ctx, decision, {
      industryHandle: "professional-services",
      topicHandle: "engagement-revenue",
      treatmentRequestId: "tr-c4-1",
      tenantId: "tenant-ps-1",
      orgHandle: "org-ps-saas",
    });

    ctx.state.decisionKind = decision.kind;
    ctx.state.advisoryCount = derivePanelAdvisoriesPure(decision).length;
  },
  assertions: [
    assertion("C4-1-execute-kind", "Panel decision is execute", (ctx) => {
      assertTrue(ctx.state.decisionKind === "execute", "execute kind");
    }),
    assertion("C4-1-zero-advisories", "Execute path emits zero advisories", (ctx) => {
      assertTrue(ctx.state.advisoryCount === 0, "zero advisories");
    }),
    assertion("C4-1-core-audit", "Panel decision logged to core audit bus", (ctx) => {
      const entries = ctx.auditBus.writer.getEntries().filter((row) => row.kind === "panel.decision");
      assertTrue(entries.length === 1, "one panel entry");
      assertTrue(entries[0]?.payload.event === "panel.decision", "panel.decision event");
    }),
  ],
};
