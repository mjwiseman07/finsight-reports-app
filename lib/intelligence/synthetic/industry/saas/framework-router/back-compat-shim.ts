import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import type { SaaSFramework } from "./cross-blend-types";

export function defaultFramework(input?: {
  framework?: SaaSFramework;
  containsSaaSARRData?: boolean;
}): SaaSFramework {
  return input?.framework ?? "US_GAAP";
}

