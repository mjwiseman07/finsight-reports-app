import { validateOrgEdgeReconciliationEntry } from "../../../../lib/intelligence/synthetic/standards/audit/validators";
import { deriveOrgEdgeReconciliationContextPure } from "../../../../lib/intelligence/synthetic/standards/resolver/org-edge/deriveOrgEdgeReconciliationContextPure";
import {
  detectDisagreementPure,
  type CuratedRulesProjection,
} from "../../../../lib/intelligence/synthetic/standards/resolver/org-edge/orgStandardsEdgePure";
import type { AttestedElection } from "../../../../lib/intelligence/synthetic/standards/resolver/org-edge/types";
import type { IntegrationScenario, ScenarioContext } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

function reconcileAndAudit(
  ctx: ScenarioContext,
  election: AttestedElection,
  projection: CuratedRulesProjection,
): void {
  const pureResult = detectDisagreementPure(election, projection);
  const callerIdentity = Object.freeze({
    personaHandle: "ai-controller-helper",
    tenantId: election.orgId,
    tenantClassification: "standard" as const,
    invocationContext: Object.freeze({
      requestId: "req-c6-2",
      parentRequestId: null,
      invokedAt: ctx.clock.nowISO(),
    }),
  });
  const auditPayload = deriveOrgEdgeReconciliationContextPure(
    Object.freeze({ election, projection, callerIdentity }),
    pureResult,
  );
  validateOrgEdgeReconciliationEntry(auditPayload);
  ctx.auditBus.appendCore({
    kind: "orgEdge.reconciliation",
    actor: Object.freeze({
      kind: "system",
      id: "org-standards-edge-reconcile",
      via: "org-edge",
    }),
    subject: Object.freeze({
      orgId: election.orgId,
      tenantId: election.orgId,
      framework: election.framework,
    }),
    payload: Object.freeze({ ...auditPayload, auditNamespace: "standard" }),
  });
  ctx.state.outcome = auditPayload.outcome;
  ctx.state.diffKind = auditPayload.diff.kind;
  ctx.state.resolvedFramework =
    auditPayload.diff.kind === "override-applied" ? auditPayload.diff.resolvedFrameworkHandle : null;
}

export const scenario: IntegrationScenario = {
  id: "C6-2",
  category: "org-standards",
  title: "Org preference overrides structural framework projection",
  dependencies: [],
  execute(ctx) {
    ctx.participation.recordFramework("IFRS");
    ctx.participation.recordFramework("US_GAAP");

    const election: AttestedElection = Object.freeze({
      orgId: "org-standards-2",
      framework: "IFRS",
      citationHandle: "IAS_1_PRESENTATION",
      attestedBy: "controller@org.test",
      attestedAt: ctx.clock.nowISO(),
      attestationVersion: "1.0.0",
      note: "org attested IFRS",
    });

    const projection: CuratedRulesProjection = Object.freeze({
      computeProjectedFramework() {
        return Object.freeze({ framework: "US_GAAP" as const, ruleIds: Object.freeze(["US-GAAP-STRUCTURAL"]) });
      },
    });

    reconcileAndAudit(ctx, election, projection);
    ctx.participation.recordControlLayer("org-standards-edge");
  },
  assertions: [
    assertion("C6-2-disagreement-outcome", "Reconciliation outcome is disagreement", (ctx) => {
      assertTrue(ctx.state.outcome === "disagreement", "disagreement");
    }),
    assertion("C6-2-override-applied", "Diff records override-applied with org election winning", (ctx) => {
      assertTrue(ctx.state.diffKind === "override-applied", "override-applied");
      assertTrue(ctx.state.resolvedFramework === "IFRS", "IFRS wins");
    }),
    assertion("C6-2-audit-preference", "Audit trail captures preference application", (ctx) => {
      const entries = ctx.auditBus.writer
        .getEntries()
        .filter((row) => row.kind === "orgEdge.reconciliation");
      assertTrue(entries.length === 1, "one entry");
      const diff = entries[0]?.payload.diff as { kind?: string; resolutionRule?: string };
      assertTrue(diff.kind === "override-applied", "override in payload");
      assertTrue(diff.resolutionRule === "org-election-override-wins", "resolution rule");
    }),
  ],
};
