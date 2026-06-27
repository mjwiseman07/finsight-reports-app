import { assertContainsConstructionContractData } from "../../../standards/doctrine/containsConstructionContractData";
import type { ConstructionClassifierInput, ConstructionSubSegment } from "./types";

export function applyClassifierRules(input: ConstructionClassifierInput): ConstructionSubSegment {
  const naics = input.naicsCode;
  if (/^236115|^236117/.test(naics)) return "R";
  if (/^237/.test(naics)) return "H";
  if (/^238/.test(naics)) return "S";
  if (/^541330/.test(naics) && input.designBuildEngagement) return "D";
  if (/^236220/.test(naics)) {
    return (input.backlogUsd ?? 0) >= 50_000_000 ? "C" : "G";
  }
  return "G";
}

