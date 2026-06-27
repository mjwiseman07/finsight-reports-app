import { resolveConstructionCitationHandle } from "../handles";
export const IFRS_MODULE_HANDLES = ["IFRS15.Page","IFRS15.Para35-37","IFRS15.B14-B19"];
export function resolveIfrsConstructionHandles() {
  return IFRS_MODULE_HANDLES.map((h) => resolveConstructionCitationHandle(h));
}
export * from "./ifrs15";
