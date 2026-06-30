import type { ExternalTruthVertical } from "../../../scripts/external-truth/types";
import type { CrossoverContext, CrossoverValidatorResult } from "./types";

export type CrossoverPairCode =
  | "hc-npo"
  | "re-hos"
  | "bank-ins"
  | "fa-ins"
  | "hc-edu"
  | "mfg-rtl"
  | "con-re";

export interface CrossoverPairDescriptor {
  code: CrossoverPairCode;
  primary: ExternalTruthVertical;
  secondary: ExternalTruthVertical;
  displayName: string;
  patentNamed: boolean;
}

export interface PairFixtureEntity {
  entityId: string;
  primaryVertical: ExternalTruthVertical;
  secondaryVertical: ExternalTruthVertical;
  primaryFramework: string;
  secondaryFramework: string;
  charityCareThresholdMet?: boolean;
  nfpFunctionalExpenseAllocated?: boolean;
  reit90DistributionMet?: boolean;
  hotelADR?: number;
  hotelRevPAR?: number;
  hasLessorDuality?: boolean;
  ceclScopeFull?: boolean;
  ceclScopeNarrow?: boolean;
  ffiec051Filed?: boolean;
  ifrs17Lane?: "BBA" | "PAA" | "VFA" | null;
  rbcReported?: boolean;
  baselReported?: boolean;
  navReported?: number;
  reservesReported?: number;
  ilsContractBoundaryDocumented?: boolean;
}

export interface PairCrossoverContext extends CrossoverContext {
  pair: CrossoverPairDescriptor;
  pairEntities: PairFixtureEntity[];
}

export type PairCrossoverValidator = (ctx: PairCrossoverContext) => CrossoverValidatorResult;

export const ALL_PAIRS: readonly CrossoverPairDescriptor[] = [
  { code: "hc-npo", primary: "hc", secondary: "npo", displayName: "Healthcare × Nonprofit", patentNamed: true },
  { code: "re-hos", primary: "re", secondary: "hos", displayName: "Real Estate × Hospitality", patentNamed: true },
  { code: "bank-ins", primary: "bank", secondary: "ins", displayName: "Banking × Insurance", patentNamed: true },
  { code: "fa-ins", primary: "fa", secondary: "ins", displayName: "Fund Accounting × Insurance", patentNamed: true },
  { code: "hc-edu", primary: "hc", secondary: "edu", displayName: "Healthcare × Education", patentNamed: false },
  { code: "mfg-rtl", primary: "mfg", secondary: "rtl", displayName: "Manufacturing × Retail (DTC)", patentNamed: false },
  { code: "con-re", primary: "con", secondary: "re", displayName: "Construction × Real Estate", patentNamed: false },
] as const;
