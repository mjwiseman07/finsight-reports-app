import type { Phase38Transports } from "../../phase38/transports";
import type { ExecutionOutcome, WorkItem } from "../types";
import type { RoutingDecision } from "../routing/routing-types";
import type { RoleBuilderFactory } from "./execution-types";

function parityDisclosureForCapability(
  decision: Extract<RoutingDecision, { kind: "execute" }>,
): string | null {
  const capability = decision.effectiveJD.capabilities.find(
    (entry) => entry.capabilityId === decision.capabilityId,
  );
  if (!capability?.humanParity.humanOnlyForNow) {
    return null;
  }
  const gapReason = capability.humanParity.gapReason ?? "unspecified gap";
  const roadmapPointer = capability.humanParity.roadmapPointer ?? "roadmap TBD";
  return `Capability '${decision.capabilityId}' is humanOnlyForNow: ${gapReason}. Roadmap: ${roadmapPointer}.`;
}

function transportAvailable(
  externalIO: "none" | "phase38-only",
  transports: Phase38Transports,
): boolean {
  if (externalIO === "none") {
    return true;
  }
  return transports.emailSend !== null || transports.fileFetch !== null || transports.apiCall !== null;
}

export async function executeWithinCapability(input: {
  workItem: WorkItem;
  decision: RoutingDecision;
  transports: Phase38Transports;
  roleBuilderFactory: RoleBuilderFactory;
}): Promise<ExecutionOutcome> {
  const { workItem, decision, transports, roleBuilderFactory } = input;

  if (decision.kind === "hire-up") {
    return Object.freeze({
      workItemId: workItem.workItemId,
      decision,
      outcome: "hire-up-emitted",
      reason: "Hire-up recommendation emitted",
      externalIOInvoked: "none",
      parityDisclosure: null,
    });
  }

  if (decision.kind === "escalate") {
    return Object.freeze({
      workItemId: workItem.workItemId,
      decision,
      outcome: "escalated",
      reason: decision.escalationTicket.reason,
      externalIOInvoked: "none",
      parityDisclosure: null,
    });
  }

  const capability = decision.effectiveJD.capabilities.find(
    (entry) => entry.capabilityId === decision.capabilityId,
  );
  if (!capability) {
    return Object.freeze({
      workItemId: workItem.workItemId,
      decision,
      outcome: "failed-closed",
      reason: "capability-not-found-on-effective-jd",
      externalIOInvoked: "none",
      parityDisclosure: null,
    });
  }

  if (!transportAvailable(capability.externalIO, transports)) {
    return Object.freeze({
      workItemId: workItem.workItemId,
      decision,
      outcome: "failed-closed",
      reason: "phase38-transport-unavailable",
      externalIOInvoked: "none",
      parityDisclosure: parityDisclosureForCapability(decision),
    });
  }

  const builder = await roleBuilderFactory.build(decision.personaId, decision.capabilityId);
  if (!builder) {
    return Object.freeze({
      workItemId: workItem.workItemId,
      decision,
      outcome: "failed-closed",
      reason: "role-builder-unavailable",
      externalIOInvoked: "none",
      parityDisclosure: parityDisclosureForCapability(decision),
    });
  }

  if (capability.externalIO === "phase38-only") {
    if (transports.emailSend) {
      await transports.emailSend({ workItemId: workItem.workItemId, capabilityId: decision.capabilityId });
    } else if (transports.fileFetch) {
      await transports.fileFetch(workItem.workItemId);
    } else if (transports.apiCall) {
      await transports.apiCall("panel-consumer.execute", { workItemId: workItem.workItemId });
    }
  }

  await builder.dispatch();

  return Object.freeze({
    workItemId: workItem.workItemId,
    decision,
    outcome: "completed",
    reason: "executed-within-capability",
    externalIOInvoked: capability.externalIO === "phase38-only" ? "phase38" : "none",
    parityDisclosure: parityDisclosureForCapability(decision),
  });
}
