import { assertContainsSaaSARRData } from "../../../standards/doctrine/containsSaaSARRData";


export type SaaSFramework = "US_GAAP" | "IFRS";

export interface SaaSCrossBlendBasisType {
  framework: SaaSFramework;
  basisType: string;
  handleId: string;
  switchPointId: "SP-1" | "SP-2" | "SP-3" | "SP-4" | "SP-5";
}

export const SAAS_CROSS_BLEND_BASIS_TYPES: SaaSCrossBlendBasisType[] = [
  { framework: "US_GAAP", basisType: "over-time-recognition", handleId: "ASC.606-10-25-27", switchPointId: "SP-1" },
  { framework: "IFRS", basisType: "over-time-recognition", handleId: "IFRS15.Para35-37", switchPointId: "SP-1" },
  { framework: "US_GAAP", basisType: "hosting-license-bifurcation", handleId: "ASC.606-10-25-19", switchPointId: "SP-2" },
  { framework: "IFRS", basisType: "hosting-license-bifurcation", handleId: "IFRS15.Para35-37", switchPointId: "SP-2" },
  { framework: "US_GAAP", basisType: "customer-impl-cost", handleId: "ASC.350-40-25-1", switchPointId: "SP-3" },
  { framework: "IFRS", basisType: "customer-impl-cost", handleId: "IAS38.Page", switchPointId: "SP-3" },
  { framework: "US_GAAP", basisType: "config-customization", handleId: "ASC.985-20-25-2", switchPointId: "SP-4" },
  { framework: "IFRS", basisType: "config-customization", handleId: "IFRIC.Apr2021.SaaS", switchPointId: "SP-4" },
  { framework: "US_GAAP", basisType: "cloud-arrangement-classification", handleId: "ASC.606-10-25-1", switchPointId: "SP-5" },
  { framework: "IFRS", basisType: "cloud-arrangement-classification", handleId: "IFRIC.Apr2021.SaaS", switchPointId: "SP-5" },
];

