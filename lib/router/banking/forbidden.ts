import { FrameworkViolationError } from "../errors/FrameworkViolationError";
import type { ExtractedFiling } from "../../../scripts/external-truth/types";
import { getBanking } from "./types";
import { MissingDisclosureInputError } from "./errors";

const AOCI_OPT_OUT_ASSET_CAP = 100_000_000_000;

export function validateBankingForbidden(extracted: ExtractedFiling): void {
  if (!extracted.banking) {
    throw new MissingDisclosureInputError("banking");
  }
  const b = getBanking(extracted);

  if (b.aociOptOutElection && b.totalAssets > AOCI_OPT_OUT_ASSET_CAP) {
    throw new FrameworkViolationError(
      "ASC_825",
      "AOCI opt-out election ineligible for large banks",
      "ASC 825-10",
      "Large banks (total assets > $100B) are ineligible for AOCI opt-out.",
    );
  }

  if (
    b.htmSaleDuringPeriod &&
    !b.htmPermittedExceptionFlag &&
    b.hasHTMDebtSecurities
  ) {
    // Router must fire htm-taint-disclosure; validate at routing time via assertHtmTaintDisclosureRequired
  }

  if (b.gaapBasis === "IFRS" && b.ifrs9) {
    const amortizedCostEligible =
      b.ifrs9.sppiTestPass && b.ifrs9.businessModel === "hold-to-collect";
    if (!amortizedCostEligible && b.hasLoansHFI) {
      throw new FrameworkViolationError(
        "IFRS_9",
        "IFRS 9 amortized cost classification criteria not met",
        "IFRS 9.4.1",
        "Amortized cost requires SPPI pass and hold-to-collect business model.",
      );
    }
  }
}

export function assertHedgeDocumentation(b: ReturnType<typeof getBanking>): void {
  if (!b.hedgePortfolio?.hedgeDocumentationFlag) {
    throw new FrameworkViolationError(
      "ASC_815",
      "Hedge accounting without contemporaneous documentation",
      "ASC 815-20-25-3",
      "Set hedgePortfolio.hedgeDocumentationFlag true when hedge emitters are in scope.",
    );
  }
}

export function assertHtmTaintDisclosureRequired(b: ReturnType<typeof getBanking>): void {
  if (b.htmSaleDuringPeriod && !b.htmPermittedExceptionFlag) {
    throw new FrameworkViolationError(
      "ASC_320",
      "HTM taint without permitted exception disclosure",
      "ASC 320-10-25-14",
      "HTM sale during period requires htm-taint-disclosure unless permitted exception applies.",
    );
  }
}

export function assertNoIndustryGuide3(text: string): void {
  if (text.includes("Industry Guide 3")) {
    throw new FrameworkViolationError(
      "SEC_SUBPART_1400",
      "Industry Guide 3 reference in post-2021 period",
      "SEC Subpart 1400",
      "Industry Guide 3 is superseded; use Subpart 1400 disclosures for SEC filers.",
    );
  }
}
