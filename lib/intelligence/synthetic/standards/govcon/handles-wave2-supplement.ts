/**
 * executable: true
 * containsVerticalComplianceLogic: true
 * builderNeverAuthorsContent: true
 * isNotReplacementForHuman: true
 * humanWorkerParityDoctrine: true
 * containsGovernmentContractData: true
 *
 * Wave 2 URL-only handles (TINA + subcontract flow-down per Q7/Q8=A — enforcement deferred GC-3).
 */

import type { GovConCitationHandle } from "../../../standards/govcon/__init__/types";

export const GC2_WAVE2_HANDLE_SUPPLEMENT: Record<string, GovConCitationHandle> = {
  TINA_41_USC_3501: {
    handleId: "TINA_41_USC_3501",
    library: "DCAA",
    url: "https://uscode.house.gov/view.xhtml?req=granuleid:USC-prelim-title41-chapter37&num=0&edition=prelim",
  },
  FAR_15_403: {
    handleId: "FAR_15_403",
    library: "FAR_PART_31",
    url: "https://www.acquisition.gov/far/15.403",
  },
  FAR_15_408_TABLE_15_2: {
    handleId: "FAR_15_408_TABLE_15_2",
    library: "FAR_PART_31",
    url: "https://www.acquisition.gov/far/15.408",
  },
  FAR_52_244_2: {
    handleId: "FAR_52_244_2",
    library: "FAR_PART_31",
    url: "https://www.acquisition.gov/far/52.244-2",
  },
  FAR_44_201: {
    handleId: "FAR_44_201",
    library: "FAR_PART_31",
    url: "https://www.acquisition.gov/far/44.201",
  },
  FAR_44_301: {
    handleId: "FAR_44_301",
    library: "FAR_PART_31",
    url: "https://www.acquisition.gov/far/44.301",
  },
};

export function resolveGc2Wave2Handle(handleId: string): GovConCitationHandle | undefined {
  return GC2_WAVE2_HANDLE_SUPPLEMENT[handleId];
}
