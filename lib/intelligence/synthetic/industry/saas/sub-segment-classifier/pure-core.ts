import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import type { SaaSSubSegmentClassifierInput } from "./types";
import { applyClassifierRules } from "./rules";

export function classifySaaSSubSegmentPure(input: SaaSSubSegmentClassifierInput) {
  return applyClassifierRules(input);
}

