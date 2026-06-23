import { buildLeaseIntelligenceObservation } from "../../../audit/lease-intelligence/buildLeaseIntelligenceObservation";
import { authorizeManufacturingPanelRead } from "./authorizeManufacturingPanelRead";
import type { ManufacturingSpineDependencies, ManufacturingSpineSession } from "./types";

export function createManufacturingSpineDependencies(
  session: ManufacturingSpineSession,
  dataBindings: Pick<ManufacturingSpineDependencies, "readVarianceInputs" | "buildPrioritizationPackage"> &
    Partial<
      Omit<
        ManufacturingSpineDependencies,
        "session" | "readVarianceInputs" | "buildPrioritizationPackage"
      >
    >,
): ManufacturingSpineDependencies {
  return {
    session,
    authorizePanelRead: authorizeManufacturingPanelRead,
    buildLeaseObservation: buildLeaseIntelligenceObservation,
    ...dataBindings,
  };
}
