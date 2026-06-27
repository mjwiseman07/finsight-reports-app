import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { resolveProfServicesCitationHandle } from "../handles";
export const IFRS15_PS_HANDLES = ["IFRS15.Page", "IFRS15.Para35-37", "IFRS15.Para56-58", "IFRS15.B14-B19", "IFRS15.AgentPrincipal", "IFRS15.VariableConsideration"] as const;
export function resolveIfrs15ProfServicesHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return IFRS15_PS_HANDLES.map((h) => resolveProfServicesCitationHandle(h));
}
export * from "./ifrs15";
