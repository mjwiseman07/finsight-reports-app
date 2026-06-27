import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import type { ProfServicesFramework } from "./cross-blend-types";

export function defaultFramework(input?: {
  framework?: ProfServicesFramework;
  containsProfessionalEngagementData?: boolean;
}): ProfServicesFramework {
  return input?.framework ?? "US_GAAP";
}

