import { buildLeaseIntelligenceObservation } from "../../../audit/lease-intelligence/buildLeaseIntelligenceObservation";
import { authorizeRetailPanelRead } from "./authorizeRetailPanelRead";
import type { RetailSpineDependencies, RetailSpineSession } from "./types";

export function createRetailSpineDependencies(
  session: RetailSpineSession,
  dataBindings: Pick<RetailSpineDependencies, "readPerformanceInputs" | "buildPrioritizationPackage"> &
    Partial<
      Omit<
        RetailSpineDependencies,
        "session" | "readPerformanceInputs" | "buildPrioritizationPackage"
      >
    >,
): RetailSpineDependencies {
  return {
    session,
    authorizePanelRead: authorizeRetailPanelRead,
    buildLeaseObservation: buildLeaseIntelligenceObservation,
    ...dataBindings,
  };
}
