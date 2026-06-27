import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";


export type ConstructionSubSegment = "G" | "S" | "R" | "C" | "H" | "D";

export interface ConstructionClassifierInput {
  naicsCode: string;
  backlogUsd?: number;
  designBuildEngagement?: boolean;
  containsConstructionContractData?: boolean;
}

