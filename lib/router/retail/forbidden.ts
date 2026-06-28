export const IFRS_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "ASC 330-",
  "ASC 330",
  "ASU ",
  "FASB",
  "LIFO reserve",
] as const;

export function assertIfrsRtlOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_RTL_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IFRS RTL emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
  if (/\bLIFO\b/i.test(text)) {
    throw new Error("IFRS RTL emitter output comingling: LIFO substring in disclosure body");
  }
}

export function collectForbiddenMatches(text: string, forbidden: readonly string[]): string[] {
  return forbidden.filter((token) => text.includes(token));
}
