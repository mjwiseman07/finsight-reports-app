import type { ExtractedFiling } from "../../../../scripts/external-truth/types";

export const US_GAAP_ASC330 = "US_GAAP_ASC330" as const;
export const IAS2_IFRS = "IAS2_IFRS" as const;

export type ManufacturingInventoryFramework = typeof US_GAAP_ASC330 | typeof IAS2_IFRS;

export interface ManufacturingInventoryEmitterInput {
  extracted: ExtractedFiling;
  framework: ManufacturingInventoryFramework;
}

export const MFG_FOOTING_TOLERANCE_USD = 1_000;

export const FRAMEWORK_SUBSTITUTE_NOTE_COGM_IFRS =
  "GAP-0106 (mfg/ifrs/cogm-rollforward): IAS 2 does not require a cost-of-goods-manufactured rollforward; US GAAP ASC 330 filers present COGM as a supplementary schedule.";

export const FRAMEWORK_SUBSTITUTE_NOTE_NRV_REVERSAL =
  "IAS 2.33 permits reversal of inventory NRV writedowns when criteria are met; ASC 330 does not permit writedown reversal — substantive IFRS-vs-US-GAAP difference.";

export function buildUsgaapAsc330EmitterInput(extracted: ExtractedFiling): ManufacturingInventoryEmitterInput {
  if (extracted.framework !== "us-gaap") {
    throw new Error(`ASC 330 manufacturing emitters require us-gaap framework, got ${extracted.framework}`);
  }
  return { extracted, framework: US_GAAP_ASC330 };
}

export function buildIas2EmitterInput(extracted: ExtractedFiling): ManufacturingInventoryEmitterInput {
  if (extracted.framework !== "ifrs") {
    throw new Error(`IAS 2 manufacturing emitters require ifrs framework, got ${extracted.framework}`);
  }
  return { extracted, framework: IAS2_IFRS };
}

export function hasInventoryDecompositionAsc330Input(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.manufacturing_inventory?.asc330?.decomposition);
}

export function hasCogmRollforwardAsc330Input(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.manufacturing_inventory?.asc330?.cogm_rollforward);
}

export function hasAnyAsc330InventoryInput(extracted: ExtractedFiling): boolean {
  return hasInventoryDecompositionAsc330Input(extracted) || hasCogmRollforwardAsc330Input(extracted);
}

export function hasInventoryDecompositionIas2Input(extracted: ExtractedFiling): boolean {
  return Boolean(extracted.manufacturing_inventory?.ias2?.decomposition);
}

export function hasAnyIas2InventoryInput(extracted: ExtractedFiling): boolean {
  return hasInventoryDecompositionIas2Input(extracted);
}

export function isLifoCostingMethod(method: string | undefined): boolean {
  if (!method) return false;
  const normalized = method.toLowerCase().replace(/[-\s]/g, "_");
  return normalized === "lifo" || normalized.includes("last_in_first_out");
}
