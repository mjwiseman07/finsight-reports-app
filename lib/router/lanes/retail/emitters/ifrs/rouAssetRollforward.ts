import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import { IFRS16RoURollforwardError } from "../../errors";
import { assertIfrsRtlLeaseOutputNonComingling } from "../../forbidden";
import { FOOTING_TOLERANCE_UNITS, IFRS_16, type RetailLeaseEmitterInput } from "../../types";

export const EMITTER_PATH = "lib/router/lanes/retail/emitters/ifrs/rouAssetRollforward.ts";

const CITATION: EmitterCitation = {
  standard: "IFRS 16",
  paragraphs: ["53(j)"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertIfrsCitationNonComingling(CITATION_RESOLVED);

function assertFramework(input: RetailLeaseEmitterInput): void {
  if (input.framework !== IFRS_16) {
    throw new IFRS16RoURollforwardError("framework gate");
  }
}

function footClassRow(
  className: string,
  row: {
    opening: number;
    additions: number;
    depreciation: number;
    impairment_losses: number;
    impairment_reversals: number;
    disposals: number;
    fx_translation: number;
    other_movements: number;
    closing: number;
  },
): void {
  const computed =
    row.opening +
    row.additions -
    row.depreciation -
    row.impairment_losses +
    row.impairment_reversals -
    row.disposals +
    row.fx_translation +
    row.other_movements;
  if (Math.abs(computed - row.closing) > FOOTING_TOLERANCE_UNITS) {
    throw new IFRS16RoURollforwardError(`${className} rollforward footing`);
  }
}

export function emitRouAssetRollforward(input: RetailLeaseEmitterInput): EmitterResult {
  assertFramework(input);
  const rollforward = input.extracted.leases?.ifrs16?.rou_rollforward;
  if (!rollforward?.classes?.length) {
    throw new IFRS16RoURollforwardError("leases.ifrs16.rou_rollforward");
  }
  if (rollforward.classes.length < 2) {
    throw new IFRS16RoURollforwardError("minimum two distinct RoU asset classes required");
  }
  const classNames = rollforward.classes.map((c) => c.class_name.trim().toLowerCase());
  if (new Set(classNames).size !== classNames.length) {
    throw new IFRS16RoURollforwardError("RoU asset classes must be distinct");
  }

  let totalClosing = 0;
  const classSummaries: string[] = [];
  for (const row of rollforward.classes) {
    footClassRow(row.class_name, row);
    totalClosing += row.closing;
    classSummaries.push(
      `${row.class_name}: opening ${row.opening.toLocaleString("en-US")}, additions ${row.additions.toLocaleString("en-US")}, ` +
        `depreciation ${row.depreciation.toLocaleString("en-US")}, impairment ${row.impairment_losses.toLocaleString("en-US")}, ` +
        `reversals ${row.impairment_reversals.toLocaleString("en-US")}, disposals ${row.disposals.toLocaleString("en-US")}, ` +
        `FX ${row.fx_translation.toLocaleString("en-US")}, other ${row.other_movements.toLocaleString("en-US")}, ` +
        `closing ${row.closing.toLocaleString("en-US")}`,
    );
  }

  const diff = Math.abs(totalClosing - rollforward.balance_sheet_rou_total);
  if (diff > FOOTING_TOLERANCE_UNITS) {
    throw new IFRS16RoURollforwardError(
      `balance sheet RoU reconciliation diff ${diff.toLocaleString("en-US")}`,
    );
  }

  const currency = rollforward.presentation_currency ?? "units";
  const text =
    `IFRS 16.53(j) right-of-use asset rollforward by class (${currency}): ${classSummaries.join(". ")}. ` +
    `Total closing RoU assets ${totalClosing.toLocaleString("en-US")} reconciled to balance sheet ${rollforward.balance_sheet_rou_total.toLocaleString("en-US")} per ${CITATION_RESOLVED}.`;
  assertIfrsRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "rou-asset-rollforward",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
