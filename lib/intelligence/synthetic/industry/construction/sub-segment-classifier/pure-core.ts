import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import type { ConstructionClassifierInput } from "./types";
import { applyClassifierRules } from "./rules";

export function classifyConstructionSubSegmentPure(input: ConstructionClassifierInput) {
  return applyClassifierRules(input);
}

