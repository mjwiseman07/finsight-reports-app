import type { USGAAPDisclosurePackage } from "../types";

export function routeRegSkDisclosures(input: {
  segmentCount: number;
  lifoUsed: boolean;
  conflictMineralsRequired: boolean;
}): USGAAPDisclosurePackage {
  return {
    basis: "US_GAAP",
    regSkItems: ["101", "103", "105", "301", "303"],
    item101SegmentDisclosureBinding: true,
    lifoReserveDisclosed: input.lifoUsed,
    conflictMineralsFormSdRequired: input.conflictMineralsRequired,
    conflictMineralsDeMinimisPct: 0,
    rcoiInquiryDepth: "STANDARD",
    climateRuleStatus: "STAYED",
  };
}
