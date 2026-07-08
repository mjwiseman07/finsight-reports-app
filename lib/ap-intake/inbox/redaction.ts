const NUMERIC_RUN = /\b\d{7,}\b/g;
const IBAN_LIKE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g;

export function redactBankLikeNumbers(input: string): string {
  return input.replace(NUMERIC_RUN, "[REDACTED]").replace(IBAN_LIKE, "[REDACTED]");
}
