import type { AIPersonaId, EffectiveJobDescription, WorkItem } from "../types";
import type { Phase38Transports } from "../../phase38/transports";
import type { RoutingDecision } from "../routing/routing-types";

export interface RoleBuilderFactory {
  build(personaId: AIPersonaId, capabilityId: string): Promise<{ dispatch: () => Promise<void> }> | null;
}

export interface ExecutionContext {
  readonly workItem: WorkItem;
  readonly decision: Extract<RoutingDecision, { kind: "execute" }>;
  readonly effectiveJD: EffectiveJobDescription;
  readonly transports: Phase38Transports;
  readonly roleBuilderFactory: RoleBuilderFactory;
}
