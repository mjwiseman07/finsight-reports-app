import {
  assertUsgaapCitationNonComingling,
  citationResolved,
  type EmitterCitation,
  type EmitterResult,
} from "../../types";
import { MissingDisclosureInputError } from "../errors";
import { scopeQualifier, type BankingEmitterInput } from "../types";

export const EMITTER_PATH = "lib/router/banking/usgaap/loan-portfolio-segmentation.ts";

const CITATION: EmitterCitation = {
  standard: "ASC 326",
  paragraphs: ["326-20-50-4", "326-20-55-5"],
};

export const CITATION_RESOLVED = citationResolved(CITATION);
assertUsgaapCitationNonComingling(CITATION_RESOLVED);

export function emitLoanPortfolioSegmentation(input: BankingEmitterInput): EmitterResult {
  const b = input.banking;
  if (!b.hasLoansHFI || !b.loansHFI?.portfolioSegmentation?.length) {
    throw new MissingDisclosureInputError("banking.loansHFI.portfolioSegmentation");
  }
  const segments = b.loansHFI.portfolioSegmentation.map((s) => s.segment).join(", ");
  const text = `[${scopeQualifier(b)}] Loan portfolio segmented (${segments}) with CECL allowances by segment per ${CITATION_RESOLVED}.`;
  return {
    emitterId: "loan-portfolio-segmentation",
    emitterPath: EMITTER_PATH,
    status: "satisfied",
    lines: [{ assertionId: "loan-portfolio-segmentation", citation: CITATION, text }],
  };
}
