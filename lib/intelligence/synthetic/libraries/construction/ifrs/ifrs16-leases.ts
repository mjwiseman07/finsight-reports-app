import { resolveConstructionCitationHandle } from "../handles";
export const IFRS_MODULE_HANDLES = ["IFRS16.Page","EUR-Lex.2017R1986.IFRS16"];
export function resolveIfrsConstructionHandles() {
  return IFRS_MODULE_HANDLES.map((h) => resolveConstructionCitationHandle(h));
}
export * from "./ifrs16";
