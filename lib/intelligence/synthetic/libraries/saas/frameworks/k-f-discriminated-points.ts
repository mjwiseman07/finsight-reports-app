/**
 * @audit-channel arr-mrr-audit
 * @framework us-gaap | ifrs
 * @sub-segments P | H | U | F | V
 * @last-verified 2026-06-27
 * @spec Phase_SAAS_1_Recon_Spec.md v1.0
 */
import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";

export const SAAS_KF_DISCRIMINATED_POINTS = [
  { pointId: "KF-1", usGaapHandle: "ASC.606-10-25-27", ifrsHandle: "IFRS15.Page", topic: "over-time" },
  { pointId: "KF-2", usGaapHandle: "ASC.606-10-32-6", ifrsHandle: "IFRS15.Para56-58", topic: "variable-consideration" },
  { pointId: "KF-3", usGaapHandle: "ASC.606-10-32-32", ifrsHandle: "IFRS15.B34-B35", topic: "ssp-material-right" },
  { pointId: "KF-4", usGaapHandle: "ASC.340-40-35-1", ifrsHandle: "IFRS15.Page", topic: "commission-amort" },
  { pointId: "KF-5", usGaapHandle: "ASC.985-20-25-2", ifrsHandle: "IFRIC.Apr2021.SaaS", topic: "hosting-license" },
] as const;
