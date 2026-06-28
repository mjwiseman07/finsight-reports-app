/**
 * Phase G7-C7a — disclosure router lane shared types.
 */
export interface EmitterCitation {
  standard: string;
  paragraphs: readonly string[];
}

export interface EmitterLine {
  assertionId: string;
  text: string;
  citation: EmitterCitation;
}

export type EmitterStatus = "satisfied" | "fail-closed";

export interface EmitterResult {
  emitterId: string;
  emitterPath: string;
  lines: EmitterLine[];
  status: EmitterStatus;
  failureReason?: string;
}

export const IFRS_FORBIDDEN_CITATION_SUBSTRINGS = [
  "ASC ",
  "ASC-",
  "FASB ",
  "§501(r)",
  "IRC ",
  "Form 990",
  "Form 1023",
] as const;

export const IFRS_REQUIRED_CITATION_SUBSTRINGS = [
  "IFRS ",
  "IAS ",
  "IFRIC ",
  "IFRS for SMEs ",
  "EU Directive ",
  "UK Charities SORP",
  "IPSAS",
] as const;

export const US_GAAP_FORBIDDEN_CITATION_SUBSTRINGS = [
  "IFRS ",
  "IAS ",
  "IFRIC ",
  "IFRS for SMEs ",
  "IPSAS",
] as const;

export const US_GAAP_REQUIRED_CITATION_SUBSTRINGS = [
  "ASC ",
  "ASU ",
  "SAB ",
  "§501",
  "IRC ",
  "Form 990",
  "Form 1023",
  "FAR ",
  "CAS ",
] as const;

export function citationResolved(citation: EmitterCitation): string {
  return `${citation.standard} ${citation.paragraphs.join(", ")}`;
}

export function assertIfrsCitationNonComingling(citationText: string): void {
  for (const forbidden of IFRS_FORBIDDEN_CITATION_SUBSTRINGS) {
    if (citationText.includes(forbidden)) {
      throw new Error(`IFRS emitter citation comingling: forbidden substring ${forbidden}`);
    }
  }
  const hasRequired = IFRS_REQUIRED_CITATION_SUBSTRINGS.some((token) => citationText.includes(token));
  if (!hasRequired) {
    throw new Error("IFRS emitter citation missing required IFRS/IAS token");
  }
}

export function assertUsgaapCitationNonComingling(citationText: string): void {
  for (const forbidden of US_GAAP_FORBIDDEN_CITATION_SUBSTRINGS) {
    if (citationText.includes(forbidden)) {
      throw new Error(`US GAAP emitter citation comingling: forbidden substring ${forbidden}`);
    }
  }
  const hasRequired = US_GAAP_REQUIRED_CITATION_SUBSTRINGS.some((token) => citationText.includes(token));
  if (!hasRequired) {
    throw new Error("US GAAP emitter citation missing required ASC/US GAAP token");
  }
}
