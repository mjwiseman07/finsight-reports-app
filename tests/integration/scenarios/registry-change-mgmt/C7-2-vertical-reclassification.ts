import type { RegistryElectionEntry } from "../../harness/registry-snapshot";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface VerticalReclassRecord {
  readonly entityId: string;
  readonly priorVertical: string;
  readonly newVertical: string;
  readonly changedAt: string;
}

export const scenario: IntegrationScenario = {
  id: "C7-2",
  category: "registry-change-mgmt",
  title: "Vertical reclassification with audit trail and panel re-run",
  dependencies: [],
  execute(ctx) {
    ctx.participation.recordVertical("MFG");
    ctx.participation.recordVertical("RTL");

    const orgId = "org-reclass-1";
    const entityId = "operating-unit-7";
    const initial: RegistryElectionEntry = ctx.mocks.toRegistryEntry(
      ctx.mocks.entity({
        orgId,
        entityId,
        vertical: "MFG",
        framework: "US_GAAP",
      }),
    );
    ctx.registry.setElection(initial);

    ctx.clock.advance(3000);

    const revised: RegistryElectionEntry = Object.freeze({
      ...initial,
      vertical: "RTL",
      electionEvidenceRef: `evidence://${orgId}/${entityId}/vertical-reclass`,
    });
    ctx.registry.setElection(revised);

    const change: VerticalReclassRecord = Object.freeze({
      entityId,
      priorVertical: initial.vertical,
      newVertical: revised.vertical,
      changedAt: ctx.clock.nowISO(),
    });

    ctx.auditBus.appendChannel("registry-change", {
      orgId,
      entityId,
      changeType: "vertical-reclassification",
      priorVertical: change.priorVertical,
      newVertical: change.newVertical,
      changedAt: change.changedAt,
    });
    ctx.participation.recordChannel("registry-change");

    ctx.state.change = change;
    ctx.state.panelRerunRequired = true;
    ctx.state.currentElection = ctx.registry.elections.find((entry) => entry.entityId === entityId) ?? null;
  },
  assertions: [
    assertion("C7-2-vertical-updated", "Registry election reflects RTL vertical", (ctx) => {
      const election = ctx.state.currentElection as RegistryElectionEntry | null;
      assertTrue(election?.vertical === "RTL", "RTL vertical");
    }),
    assertion("C7-2-audit-trail", "Vertical reclassification logged to registry-change channel", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("registry-change");
      assertTrue(events.length === 1, "one event");
      assertTrue(events[0]?.payload.changeType === "vertical-reclassification", "reclass type");
      assertTrue(events[0]?.payload.priorVertical === "MFG", "prior MFG");
    }),
    assertion("C7-2-panel-rerun-flag", "Panel re-run required after vertical reclassification", (ctx) => {
      assertTrue(ctx.state.panelRerunRequired === true, "panel rerun flagged");
    }),
  ],
};
