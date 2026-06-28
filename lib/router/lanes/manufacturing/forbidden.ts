export const IFRS_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "ASC 330",
  "CECL",
  "LIFO reserve",
] as const;

export const IFRS_MFG_INVENTORY_FORBIDDEN_INPUT_PATTERNS = [
  /\blifo\b/i,
  /last.in.first.out/i,
  /last-in/i,
] as const;

export const USGAAP_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS = ["IAS 2"] as const;

export function assertUsgaapMfgInventoryOutputNonComingling(text: string): void {
  for (const forbidden of USGAAP_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`US GAAP MFG inventory emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function assertIfrsMfgInventoryOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.toLowerCase().includes(forbidden.toLowerCase())) {
      throw new Error(`IFRS MFG inventory emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
  if (/work in process/i.test(text)) {
    throw new Error("IFRS MFG inventory emitter output comingling: work in process terminology");
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.toLowerCase().includes(token.toLowerCase()));
}
