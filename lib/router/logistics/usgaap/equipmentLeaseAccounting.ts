import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { hasTerminalLeasesInput, type LogisticsEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/logistics/usgaap/equipmentLeaseAccounting.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 842",
  paragraphs: ["842-20-50-1", "842-20-50-4"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitEquipmentLeaseAccounting(input: LogisticsEmitterInput): EmitterResult {
  if (!hasTerminalLeasesInput(input.extracted)) {
    throw new MissingDisclosureInputError("logistics.terminal_leases");
  }
  const t = input.extracted.logistics!.terminal_leases!;
  const text = `Terminal and equipment leases (${t.count} leases, total liability $${t.total_liability.toLocaleString()}) disclosed per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "equipment-lease-accounting",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "equipment-lease-accounting", citation: CITATION, text }],
  };
}
