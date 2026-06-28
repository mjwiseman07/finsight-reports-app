export const USGAAP_HC_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IFRS 9",
  "IFRS 15.56",
  "stage 1",
  "stage 2",
  "stage 3",
  "lifetime ECL",
  "12-month ECL",
  "variable consideration constraint",
] as const;

export const IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "implicit price concession",
  "ASC 606",
  "ASC 326",
  "CECL",
  "contract inception concession",
] as const;

export function assertUsgaapHcRevenueOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_HC_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`US GAAP HC revenue emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertIfrsHcRevenueOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`IFRS HC revenue emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.toLowerCase().includes(token.toLowerCase()));
}
