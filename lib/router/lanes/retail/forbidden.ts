export const USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "IFRS 16",
  "right-of-use single model",
  "lessee single model",
] as const;

export const IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "operating lease cost",
  "finance lease cost",
  "ASC 842",
  "two-model",
  "lessee dual model",
  "Thereafter",
] as const;

export function assertUsgaapRtlLeaseOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`US GAAP RTL lease emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertIfrsRtlLeaseOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_RTL_LEASE_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`IFRS RTL lease emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}
