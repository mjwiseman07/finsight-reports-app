export const IFRS_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "ASC 606-10-",
  "ASC 340-40-",
  "ASU ",
  "FASB",
] as const;

export const USGAAP_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IFRS 15",
  "IFRS ",
  "IAS ",
  "IFRIC ",
] as const;

export function assertIfrsSaasOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IFRS SaaS emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertUsgaapSaasOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_SAAS_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`US GAAP SaaS emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}
