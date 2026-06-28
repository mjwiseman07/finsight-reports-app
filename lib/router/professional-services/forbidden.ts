export const IFRS_PS_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "ASC 606-",
  "ASC 340-40-",
  "ASU ",
  "FASB",
] as const;

export const USGAAP_PS_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IFRS ",
  "IAS ",
  "IFRIC ",
  "IFRS for SMEs",
] as const;

export function assertIfrsPsOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_PS_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IFRS PS emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertUsgaapPsOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_PS_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`US GAAP PS emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}
