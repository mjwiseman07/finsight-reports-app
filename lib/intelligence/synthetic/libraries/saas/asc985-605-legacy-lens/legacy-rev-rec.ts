import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";
import { resolveSaasCitationHandle } from "../handles";

export function referenceLegacyRevRec() {
  return resolveSaasCitationHandle("ASC.985-20-25-2");
}

