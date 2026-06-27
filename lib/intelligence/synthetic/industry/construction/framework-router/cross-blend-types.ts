import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";


export type ConstructionFramework = "US_GAAP" | "IFRS";

export interface ConstructionCrossBlendBasisType {
  framework: ConstructionFramework;
  basisType: string;
  handleId: string;
}

export const CON_CROSS_BLEND_BASIS_TYPES: ConstructionCrossBlendBasisType[] = [
  { framework: "US_GAAP", basisType: "over-time-criteria", handleId: "ASC.606-10-25-27" },
  { framework: "IFRS", basisType: "over-time-criteria", handleId: "IFRS15.Para35-37" },
  { framework: "US_GAAP", basisType: "progress-method", handleId: "ASC.606-10-25-33" },
  { framework: "IFRS", basisType: "progress-method", handleId: "IFRS15.B14-B19" },
  { framework: "US_GAAP", basisType: "uninstalled-materials", handleId: "ASC.606-10-25-23B" },
  { framework: "IFRS", basisType: "uninstalled-materials", handleId: "IFRS15.B14-B19" },
  { framework: "US_GAAP", basisType: "lease-scope", handleId: "ASC.842-10-15-3" },
  { framework: "IFRS", basisType: "lease-scope", handleId: "IFRS16.Page" },
  { framework: "US_GAAP", basisType: "jv-proportionate", handleId: "ASC.810-30-45-1" },
  { framework: "IFRS", basisType: "jv-proportionate", handleId: "IFRIC12.Page" },
];

