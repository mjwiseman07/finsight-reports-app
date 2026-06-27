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
    callerSessionId: "session-c4-3",
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
      vertical: "nonprofit",
      reportingBasis: "US_GAAP",
      restrictionType: "Unrestricted",
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
  id: "C4-3",
  category: "panel-decision",
  title: "NPO panel escalate decision audit",
  dependencies: ["kv-npo"],
  execute(ctx) {
    ctx.participation.recordVertical("NPO");
    ctx.participation.recordFramework("US_GAAP");

    const decision: RoutingDecision = Object.freeze({
      kind: "escalate",
      escalationTicket: Object.freeze({
        registryEntryId: "npo-restricted-net-asset-001",
        reason: "Hard-stop: restricted net asset reclassification requires founder review",
        targetScope: "universal",
        humanFallback: Object.freeze({ email: "mwiseman@advisacor.com", available: true }),
      }),
    });

    appendPanelDecisionAudit(ctx, decision, {
      industryHandle: "nonprofit",
      topicHandle: "restricted-net-assets",
      treatmentRequestId: "tr-c4-3",
      tenantId: "tenant-npo-1",
      orgHandle: "org-npo-1",
    });

    ctx.state.advisories = derivePanelAdvisoriesPure(decision);
    ctx.state.resolvedBy = extractPanelDecisionMetadata(decision).resolvedBy;
  },
  assertions: [
    assertion("C4-3-escalate-advisories", "Escalate with hard-stop emits two advisories", (ctx) => {
      const advisories = ctx.state.advisories as ReturnType<typeof derivePanelAdvisoriesPure>;
      assertTrue(advisories.length === 2, "two advisories");
      assertTrue(advisories.some((item) => item.severityTier === "blocking"), "blocking present");
    }),
    assertion("C4-3-no-resolution", "Escalate leaves resolvedBy null", (ctx) => {
      assertTrue(ctx.state.resolvedBy === null, "resolvedBy null");
    }),
    assertion("C4-3-core-audit", "Panel escalate logged to core audit bus", (ctx) => {
      const entries = ctx.auditBus.writer.getEntries().filter((row) => row.kind === "panel.decision");
      assertTrue(entries.length === 1, "one entry");
      assertTrue(entries[0]?.payload.advisoryCount === 2, "advisoryCount 2");
    }),
  ],
};
