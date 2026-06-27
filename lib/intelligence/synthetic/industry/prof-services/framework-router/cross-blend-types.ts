import { assertContainsProfessionalEngagementData } from "../../../standards/doctrine/containsProfessionalEngagementData";


export type ProfServicesFramework = "US_GAAP" | "IFRS";

export interface ProfServicesCrossBlendBasisType {
  framework: ProfServicesFramework;
  basisType: string;
  handleId: string;
}

export const PS_CROSS_BLEND_BASIS_TYPES: ProfServicesCrossBlendBasisType[] = [
  { framework: "US_GAAP", basisType: "over-time-criteria", handleId: "ASC.606-10-25-27" },
  { framework: "IFRS", basisType: "over-time-criteria", handleId: "IFRS15.Para35-37" },
  { framework: "US_GAAP", basisType: "variable-consideration-constraint", handleId: "ASC.606-10-32-6" },
  { framework: "IFRS", basisType: "variable-consideration-constraint", handleId: "IFRS15.Para56-58" },
  { framework: "US_GAAP", basisType: "ssp-hierarchy", handleId: "ASC.606-10-32-33" },
  { framework: "IFRS", basisType: "ssp-hierarchy", handleId: "IFRS15.78-79" },
  { framework: "US_GAAP", basisType: "lease-scope", handleId: "ASC.842-10-15-3" },
  { framework: "IFRS", basisType: "lease-scope", handleId: "IFRS16.Page" },
  { framework: "US_GAAP", basisType: "ias38-capitalization", handleId: "ASC.340-40-25-1" },
  { framework: "IFRS", basisType: "ias38-capitalization", handleId: "IAS38.Page" },
];

