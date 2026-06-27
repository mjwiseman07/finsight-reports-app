import type { RegistryElectionEntry } from "../../harness/registry-snapshot";
import type { IntegrationScenario } from "../../types";
import { assertion, assertTrue } from "../_helpers/assertions";

interface RegistryChangeRecord {
  readonly entityId: string;
  readonly priorFramework: string;
  readonly newFramework: string;
  readonly changedAt: string;
}

export const scenario: IntegrationScenario = {
  id: "C7-1",
  category: "registry-change-mgmt",
  title: "IFRS first-time adoption registry change with panel re-run flag",
  dependencies: [],
  execute(ctx) {
    ctx.participation.recordFramework("US_GAAP");
    ctx.participation.recordFramework("IFRS");

    const orgId = "org-fta-1";
    const entityId = "subsidiary-a";
    const initial: RegistryElectionEntry = ctx.mocks.toRegistryEntry(
      ctx.mocks.entity({
        orgId,
        entityId,
        vertical: "HC",
        framework: "US_GAAP",
      }),
    );
    ctx.registry.setElection(initial);

    ctx.clock.advance(5000);

    const revised: RegistryElectionEntry = Object.freeze({
      ...initial,
      framework: "IFRS",
      electionEvidenceRef: `evidence://${orgId}/${entityId}/ifrs-fta`,
    });
    ctx.registry.setElection(revised);

    const change: RegistryChangeRecord = Object.freeze({
      entityId,
      priorFramework: initial.framework,
      newFramework: revised.framework,
      changedAt: ctx.clock.nowISO(),
    });

    ctx.auditBus.appendChannel("registry-change", {
      orgId,
      entityId,
      changeType: "ifrs-first-time-adoption",
      priorFramework: change.priorFramework,
      newFramework: change.newFramework,
      changedAt: change.changedAt,
    });
    ctx.participation.recordChannel("registry-change");

    ctx.state.change = change;
    ctx.state.panelRerunRequired = true;
    ctx.state.resolvedFramework = ctx.registry.getFramework(orgId, entityId);
  },
  assertions: [
    assertion("C7-1-framework-updated", "Registry reflects IFRS after first-time adoption", (ctx) => {
      assertTrue(ctx.state.resolvedFramework === "IFRS", "IFRS in registry");
    }),
    assertion("C7-1-audit-trail", "Registry change emits audit channel event", (ctx) => {
      const events = ctx.auditBus.eventsForChannel("registry-change");
      assertTrue(events.length === 1, "one change event");
      assertTrue(events[0]?.payload.changeType === "ifrs-first-time-adoption", "FTA change type");
      assertTrue(events[0]?.payload.priorFramework === "US_GAAP", "prior US_GAAP");
    }),
    assertion("C7-1-panel-rerun-flag", "Panel re-run required after registry election change", (ctx) => {
      assertTrue(ctx.state.panelRerunRequired === true, "panel rerun flagged");
    }),
  ],
};
