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
      requestId: "req-c6-1",
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
}

export const scenario: IntegrationScenario = {
  id: "C6-1",
  category: "org-standards",
  title: "Org preference agrees with structural framework projection",
  dependencies: [],
  execute(ctx) {
    ctx.participation.recordFramework("US_GAAP");

    const election: AttestedElection = Object.freeze({
      orgId: "org-standards-1",
      framework: "US_GAAP",
      citationHandle: "ASC_105_10_05_1",
      attestedBy: "controller@org.test",
      attestedAt: ctx.clock.nowISO(),
      attestationVersion: "1.0.0",
      note: "org attested US GAAP",
    });

    const projection: CuratedRulesProjection = Object.freeze({
      computeProjectedFramework() {
        return Object.freeze({ framework: "US_GAAP" as const, ruleIds: Object.freeze(["US-GAAP-DEFAULT"]) });
      },
    });

    reconcileAndAudit(ctx, election, projection);
    ctx.participation.recordControlLayer("org-standards-edge");
  },
  assertions: [
    assertion("C6-1-agreement-outcome", "Reconciliation outcome is agreement", (ctx) => {
      assertTrue(ctx.state.outcome === "agreement", "agreement");
    }),
    assertion("C6-1-no-diff", "Diff kind is none when preference matches projection", (ctx) => {
      assertTrue(ctx.state.diffKind === "none", "none diff");
    }),
    assertion("C6-1-audit-logged", "Org-edge reconciliation logged to core audit", (ctx) => {
      const entries = ctx.auditBus.writer
        .getEntries()
        .filter((row) => row.kind === "orgEdge.reconciliation");
      assertTrue(entries.length === 1, "one reconciliation entry");
      assertTrue(entries[0]?.payload.outcome === "agreement", "payload agreement");
    }),
  ],
};
