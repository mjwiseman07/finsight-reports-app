import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";
import { resolveProfServicesCitationHandle } from "../handles";
export const IFRS16_OFFICE_HANDLES = ["IFRS16.Page", "EUR-Lex.2017R1986.IFRS16", "IFRS16.LesseeAccounting"] as const;
export function resolveIfrs16OfficeLeaseHandles(ctx: { containsProfessionalEngagementData?: boolean }) {
  assertContainsProfessionalEngagementData(ctx);

  return IFRS16_OFFICE_HANDLES.map((h) => resolveProfServicesCitationHandle(h));
}
export * from "./ifrs16";
