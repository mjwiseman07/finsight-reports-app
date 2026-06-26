/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 */

/** DS-2 (educational institutions) — handle stub only; enforcement deferred to GC-3 per Q6=A */
import { resolveGovConCitationHandle } from "../../../standards/govcon/handles";

export function getDs2HandleUrl(): string {
  return resolveGovConCitationHandle("CASB_DS_2_FORM").url;
}
