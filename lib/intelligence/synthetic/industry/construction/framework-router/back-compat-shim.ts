import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import type { ConstructionFramework } from "./cross-blend-types";

export function defaultFramework(input?: {
  framework?: ConstructionFramework;
  containsConstructionContractData?: boolean;
}): ConstructionFramework {
  return input?.framework ?? "US_GAAP";
}

