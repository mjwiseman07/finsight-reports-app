export const IFRS_CON_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "ASC ",
  "ASC-",
  "ASU ",
  "FASB",
  "§501(r)",
] as const;

export const USGAAP_CON_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IFRS ",
  "IAS ",
  "IFRIC ",
  "IFRS for SMEs",
] as const;

export function assertIfrsConOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_CON_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IFRS CON emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertUsgaapConOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_CON_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`US GAAP CON emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}
