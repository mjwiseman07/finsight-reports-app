export const IFRS_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "FAR ",
  "FAR-",
  "CAS ",
  "CAS-",
  "DCAA",
  "DCMA",
  "ASC 280-",
  "ASU ",
  "FASB",
  "Form 1408",
  "incurred cost submission",
] as const;

export const USGAAP_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IFRS ",
  "IAS ",
  "IFRIC ",
  "IFRS for SMEs",
] as const;

export function assertIfrsGovconOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IFRS GovCon emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertUsgaapGovconOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`US GAAP GovCon emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}

export function collectIfrsFarCasDcaaMatches(text: string): string[] {
  return collectForbiddenMatches(text, IFRS_GOVCON_FORBIDDEN_OUTPUT_SUBSTRINGS);
}
