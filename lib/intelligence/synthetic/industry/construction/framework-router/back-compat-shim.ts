import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import type { ConstructionFramework } from "./cross-blend-types";

export function defaultFramework(input?: { framework?: ConstructionFramework }): ConstructionFramework {
  return input?.framework ?? "US_GAAP";
}

