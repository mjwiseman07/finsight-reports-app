import { buildDefaultVerticalContext } from "../../../../lib/intelligence/synthetic/standards/audit/vertical-decision-discriminators";
import {
  validatePanelDecisionEntry,
  type PanelDecisionEntry,
} from "../../../../lib/intelligence/synthetic/standards/audit/types";
import {
  derivePanelAdvisoriesPure,
  extractPanelDecisionMetadata,
} from "../../../../lib/intelligence/synthetic/panel-consumer/derivePanelDecisionContextPure";
import type { RoutingDecision } from "../../../../lib/intelligence/synthetic/panel-consumer/types";
import type { IntegrationScenario, ScenarioContext } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

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
    callerSessionId: "session-c4-2",
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
    tenantClassification: "phi-covered",
    verticalContext: buildDefaultVerticalContext(input.industryHandle, {
      vertical: "healthcare",
      reportingBasis: "US_GAAP",
      provider340BStatus: true,
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
    payload: Object.freeze({ ...entry, auditNamespace: "phi-covered" }),
  });
}

export const scenario: IntegrationScenario = {
  id: "C4-2",
  category: "panel-decision",
  title: "HC and SaaS panel hire-up advisory audit",
  dependencies: ["kv-hc", "kv-saas"],
  execute(ctx) {
    ctx.participation.recordVertical("HC");
    ctx.participation.recordVertical("SAAS");

    const decision: RoutingDecision = Object.freeze({
      kind: "hire-up",
      recommendation: Object.freeze({
        recommendationId: "hire-up-hc-saas-001",
        currentPersonaId: "ai-staff-accountant",
        recommendedPersonaId: "ai-senior-accountant",
        capabilityId: "revenue-recognition-complex",
        rationale: "Healthcare SaaS revenue pattern requires senior review",
        citationHandles: Object.freeze(["ASC_105_10_05_1"]),
        humanFallbackAvailable: true,
        revenuePathway: Object.freeze({
          suggestedTier: "professional",
          note: "integration hire-up fixture",
        }),
      }),
    });

    appendPanelDecisionAudit(ctx, decision, {
      industryHandle: "healthcare",
      topicHandle: "saas-revenue-recognition",
      treatmentRequestId: "tr-c4-2",
      tenantId: "tenant-phi-hc",
      orgHandle: "org-hc-saas",
    });

    ctx.state.advisories = derivePanelAdvisoriesPure(decision);
    ctx.state.unresolved = extractPanelDecisionMetadata(decision).unresolvedConflicts;
  },
  assertions: [
    assertion("C4-2-hire-up-advisory", "Hire-up emits exactly one caution advisory", (ctx) => {
      const advisories = ctx.state.advisories as ReturnType<typeof derivePanelAdvisoriesPure>;
      assertTrue(advisories.length === 1, "one advisory");
      assertTrue(advisories[0]?.severityTier === "caution", "caution tier");
    }),
    assertion("C4-2-unresolved-conflict", "Hire-up records unresolved capability conflict", (ctx) => {
      const unresolved = ctx.state.unresolved as readonly string[];
      assertTrue(unresolved.length === 1, "one conflict");
      assertTrue(unresolved[0] === "revenue-recognition-complex", "capability conflict");
    }),
    assertion("C4-2-core-audit", "Panel hire-up logged with panel.decision kind", (ctx) => {
      const entries = ctx.auditBus.writer.getEntries().filter((row) => row.kind === "panel.decision");
      assertTrue(entries.length === 1, "one entry");
      assertTrue(entries[0]?.payload.advisoryCount === 1, "advisoryCount 1");
    }),
  ],
};
