import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import type { ProfServicesClassifierInput } from "./types";
import { applyClassifierRules } from "./rules";

export function classifyProfServicesSubSegmentPure(input: ProfServicesClassifierInput) {
  return applyClassifierRules(input);
}

