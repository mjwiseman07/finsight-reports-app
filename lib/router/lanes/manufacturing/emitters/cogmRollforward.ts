import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../types";
import { COGMRollforwardIncompleteError } from "../errors";
import { assertUsgaapMfgInventoryOutputNonComingling } from "../forbidden";
import {
  MFG_FOOTING_TOLERANCE_USD,
  US_GAAP_ASC330,
  type ManufacturingInventoryEmitterInput,
} from "../types";

export const EMITTER_PATH = "lib/router/lanes/manufacturing/emitters/cogmRollforward.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 330",
  paragraphs: ["COGM supplementary schedule"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: ManufacturingInventoryEmitterInput): void {
  if (input.framework !== US_GAAP_ASC330) {
    throw new COGMRollforwardIncompleteError("framework gate");
  }
}

export function emitCogmRollforward(input: ManufacturingInventoryEmitterInput): EmitterResult {
  assertFramework(input);
  const roll = input.extracted.manufacturing_inventory?.asc330?.cogm_rollforward;
  if (!roll) {
    throw new COGMRollforwardIncompleteError("manufacturing_inventory.asc330.cogm_rollforward");
  }

  const required = [
    "beginning_raw_materials",
    "raw_materials_purchased",
    "ending_raw_materials",
    "direct_labor",
    "manufacturing_overhead",
    "beginning_wip",
    "ending_wip",
    "beginning_finished_goods",
    "ending_finished_goods",
    "income_statement_cogs",
  ] as const;
  for (const field of required) {
    if (roll[field] === undefined) {
      throw new COGMRollforwardIncompleteError(`missing rollforward line: ${field}`);
    }
  }

  const rawMaterialsUsed =
    roll.beginning_raw_materials + roll.raw_materials_purchased - roll.ending_raw_materials;
  const totalManufacturingCosts = rawMaterialsUsed + roll.direct_labor + roll.manufacturing_overhead;
  const cogm = totalManufacturingCosts + roll.beginning_wip - roll.ending_wip;
  const computedCogs = cogm + roll.beginning_finished_goods - roll.ending_finished_goods;

  if (Math.abs(computedCogs - roll.income_statement_cogs) > MFG_FOOTING_TOLERANCE_USD) {
    throw new COGMRollforwardIncompleteError(
      `COGS reconciliation mismatch: rollforward ${computedCogs} vs income statement ${roll.income_statement_cogs}`,
    );
  }

  const text =
    `Cost of goods manufactured rollforward per ${CITATION_RESOLVED}: beginning raw materials $${roll.beginning_raw_materials.toLocaleString("en-US")}, ` +
    `purchases $${roll.raw_materials_purchased.toLocaleString("en-US")}, ending raw materials $${roll.ending_raw_materials.toLocaleString("en-US")}, ` +
    `raw materials used $${rawMaterialsUsed.toLocaleString("en-US")}; direct labor $${roll.direct_labor.toLocaleString("en-US")}, ` +
    `manufacturing overhead $${roll.manufacturing_overhead.toLocaleString("en-US")}, total manufacturing costs $${totalManufacturingCosts.toLocaleString("en-US")}; ` +
    `beginning WIP $${roll.beginning_wip.toLocaleString("en-US")}, ending WIP $${roll.ending_wip.toLocaleString("en-US")}, cost of goods manufactured $${cogm.toLocaleString("en-US")}; ` +
    `beginning finished goods $${roll.beginning_finished_goods.toLocaleString("en-US")}, ending finished goods $${roll.ending_finished_goods.toLocaleString("en-US")}, ` +
    `cost of goods sold $${computedCogs.toLocaleString("en-US")} reconciled to income statement COGS.`;
  assertUsgaapMfgInventoryOutputNonComingling(text);

  return {
    emitterId: "cogm-rollforward",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "cogm-rollforward", citation: CITATION, text }],
  };
}
