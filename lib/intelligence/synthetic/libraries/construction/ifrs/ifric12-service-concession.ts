import { resolveConstructionCitationHandle } from "../handles";
export const IFRS_MODULE_HANDLES = ["IFRIC12.Page"];
export function resolveIfrsConstructionHandles() {
  return IFRS_MODULE_HANDLES.map((h) => resolveConstructionCitationHandle(h));
}
export * from "./ifric12";
