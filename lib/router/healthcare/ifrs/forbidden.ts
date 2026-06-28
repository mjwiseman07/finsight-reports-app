export const IFRS_HEALTHCARE_FORBIDDEN_OUTPUT_SUBSTRINGS = [
  "§501(r)",
  "501(r)",
  "Community Health Needs Assessment",
  "CHNA",
  "Form 990",
  "Schedule H",
] as const;

export function assertIfrsHealthcareOutputNonComingling(text: string): void {
  for (const forbidden of IFRS_HEALTHCARE_FORBIDDEN_OUTPUT_SUBSTRINGS) {
    if (text.includes(forbidden)) {
      throw new Error(`IFRS healthcare emitter output comingling: forbidden substring ${forbidden}`);
    }
  }
}

export function collectIfrsHealthcareForbiddenMatches(text: string): string[] {
  return IFRS_HEALTHCARE_FORBIDDEN_OUTPUT_SUBSTRINGS.filter((forbidden) => text.includes(forbidden));
}
