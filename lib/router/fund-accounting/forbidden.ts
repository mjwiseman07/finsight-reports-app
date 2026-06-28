export const IFRS_FA_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "ASC ",
  "ASC-",
  "ASU ",
  "FASB",
  "N-CSR",
  "N-1A",
  "N-Q",
  "Item 27",
  "Item 31",
  "Rule 17a-7",
] as const;

export const USGAAP_FA_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IFRS ",
  "IAS ",
  "IFRIC ",
  "IFRS for SMEs",
] as const;

export const SEC_FORM_FORBIDDEN_IFRS = [
  "N-CSR",
  "N-1A",
  "N-Q",
  "Item 27",
  "Item 31",
  "Rule 17a-7",
] as const;

export function assertIfrsFaOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_FA_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IFRS FA emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertUsgaapFaOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_FA_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`US GAAP FA emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}

export function collectSecFormMatches(text: string): string[] {
  return collectForbiddenMatches(text, SEC_FORM_FORBIDDEN_IFRS);
}
