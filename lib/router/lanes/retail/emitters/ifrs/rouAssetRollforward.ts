import {
  assertIfrsCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../../../types";
import { IFRS16RoURollforwardError } from "../../errors";
import { assertIfrsRtlLeaseOutputNonComingling } from "../../forbidden";
import { FOOTING_TOLERANCE_UNITS, IFRS_16, type RetailLeaseEmitterInput } from "../../types";
import {
  EMITTER_CURRENCY_FALLBACK,
  formatAmountForEmitter,
} from "../../../format-amount";

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

  const currency = rollforward.presentation_currency;
  let totalClosing = 0;
  const classSummaries: string[] = [];
  for (const row of rollforward.classes) {
    footClassRow(row.class_name, row);
    totalClosing += row.closing;
    classSummaries.push(
      `${row.class_name}: opening ${formatAmountForEmitter(row.opening, currency)}, additions ${formatAmountForEmitter(row.additions, currency)}, ` +
        `depreciation ${formatAmountForEmitter(row.depreciation, currency)}, impairment ${formatAmountForEmitter(row.impairment_losses, currency)}, ` +
        `reversals ${formatAmountForEmitter(row.impairment_reversals, currency)}, disposals ${formatAmountForEmitter(row.disposals, currency)}, ` +
        `FX ${formatAmountForEmitter(row.fx_translation, currency)}, other ${formatAmountForEmitter(row.other_movements, currency)}, ` +
        `closing ${formatAmountForEmitter(row.closing, currency)}`,
    );
  }

  const diff = Math.abs(totalClosing - rollforward.balance_sheet_rou_total);
  if (diff > FOOTING_TOLERANCE_UNITS) {
    throw new IFRS16RoURollforwardError(
      `balance sheet RoU reconciliation diff ${formatAmountForEmitter(diff, currency)}`,
    );
  }

  const currencyLabel = currency?.toUpperCase() ?? EMITTER_CURRENCY_FALLBACK;
  const text =
    `IFRS 16.53(j) right-of-use asset rollforward by class (${currencyLabel}): ${classSummaries.join(". ")}. ` +
    `Total closing RoU assets ${formatAmountForEmitter(totalClosing, currency)} reconciled to balance sheet ${formatAmountForEmitter(rollforward.balance_sheet_rou_total, currency)} per ${CITATION_RESOLVED}.`;
  assertIfrsRtlLeaseOutputNonComingling(text);

  return {
    emitterId: "rou-asset-rollforward",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "lease-obligations", citation: CITATION, text }],
  };
}
