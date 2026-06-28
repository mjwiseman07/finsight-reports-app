export const IPSAS_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "ASC 958-",
  "ASC 958",
  "ASU ",
  "FASB",
  "§501",
  "501(c)(3)",
  "Form 990",
  "Schedule H",
] as const;

export const USGAAP_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IPSAS ",
  "IPSAS-",
  "IFRS ",
  "IAS ",
  "IFRIC ",
  "IFRS for SMEs",
] as const;

export function assertIpsasNpoOutputNonComingling(text: string): void {
  for (const forbidden of IPSAS_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IPSAS NPO emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertUsgaapNpoOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_NPO_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`US GAAP NPO emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}
