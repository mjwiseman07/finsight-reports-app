import * as fs from "fs";
import * as path from "path";

const BASELINE_FILENAME = "PHASE_42O_HEALTHCARE_DISCLOSURES_BASELINE.md";

export const HEALTHCARE_DISCLOSURE_BASELINE_IDENTIFIER_ORDER = [
  "disc_npsr_presentation",
  "disc_revenue_disaggregation",
  "disc_contractual_allowances",
  "disc_implicit_price_concessions",
  "disc_portfolio_approach",
  "disc_patient_receivables_presentation",
  "disc_contract_balances",
  "disc_significant_judgments",
  "disc_charity_care",
  "disc_charity_care_policy",
  "disc_payer_disaggregation",
  "disc_third_party_settlements",
  "disc_retroactive_adjustments",
  "disc_340b_program",
  "disc_medicare_medicaid_settlements",
  "disc_dsh_upl_supplemental",
  "disc_ehr_incentive_legacy",
  "disc_provider_relief_funds",
  "disc_community_benefit",
] as const;

export type HealthcareDisclosureBaselineIdentifier =
  (typeof HEALTHCARE_DISCLOSURE_BASELINE_IDENTIFIER_ORDER)[number];

export type HealthcareDisclosureSection = "A" | "B" | "C" | "D";

export interface HealthcareDisclosureCitationFlag {
  verificationStatus: "source_faithful_unverified";
}

export interface HealthcareDisclosureBaselineRecord {
  itemLabel: string;
  disclosureIdentifier: HealthcareDisclosureBaselineIdentifier;
  section: HealthcareDisclosureSection;
  disclosureRequirementAuthored: string;
  requiredVsVoluntary: string;
  ascCitations: string[];
  whatMustBeDisclosed: string;
  providerApplicability: string;
  asc606TransitionNote: string;
  citationFlag: HealthcareDisclosureCitationFlag;
  verificationChecklistFlags: string[];
}

export interface HealthcareDisclosureBaselineLoadResult {
  libraryHeaderContent: string;
  disclosuresByIdentifier: Record<
    HealthcareDisclosureBaselineIdentifier,
    HealthcareDisclosureBaselineRecord
  >;
  libraryVerificationChecklistFlags: string[];
}

function resolveHealthcareDisclosureBaselinePath(): string {
  return path.join(process.cwd(), BASELINE_FILENAME);
}

function readHealthcareDisclosureBaselineSource(): string {
  return fs.readFileSync(resolveHealthcareDisclosureBaselinePath(), "utf8");
}

function extractLineValue(sectionBody: string, label: string): string {
  const line = sectionBody
    .split("\n")
    .find((entry) => entry.trim().startsWith(`${label}:`));
  if (!line) {
    return "";
  }
  return line.replace(new RegExp(`^${label}:\\s*`), "").trim();
}

function extractDisclosureIdentifier(
  sectionHeaderAndBody: string,
): HealthcareDisclosureBaselineIdentifier | null {
  const idLine = extractLineValue(sectionHeaderAndBody, "id");
  const idMatch = idLine.match(/^(disc_[a-z0-9_]+)/);
  if (!idMatch) {
    return null;
  }
  const disclosureIdentifier = idMatch[1];
  if (
    (HEALTHCARE_DISCLOSURE_BASELINE_IDENTIFIER_ORDER as readonly string[]).includes(
      disclosureIdentifier,
    )
  ) {
    return disclosureIdentifier as HealthcareDisclosureBaselineIdentifier;
  }
  return null;
}

function extractItemLabel(sectionHeader: string): string | null {
  const labelMatch = sectionHeader.match(/^### ([ABCD]\.\d+) —/);
  if (!labelMatch) {
    return null;
  }
  return labelMatch[1];
}

function extractSection(itemLabel: string): HealthcareDisclosureSection | null {
  const section = itemLabel.charAt(0);
  if (section === "A" || section === "B" || section === "C" || section === "D") {
    return section;
  }
  return null;
}

function parseRequiredVsVoluntary(sectionBody: string): string {
  const idLine = extractLineValue(sectionBody, "id");
  const requiredMatch = idLine.match(/requiredVsVoluntary:\s*(.+)$/);
  return requiredMatch ? requiredMatch[1].trim() : "";
}

function parseAscCitations(sectionBody: string): string[] {
  const ascLine = extractLineValue(sectionBody, "ASC");
  if (!ascLine) {
    return [];
  }
  return ascLine
    .split(";")
    .map((citation) => citation.trim())
    .filter((citation) => citation.length > 0);
}

function extractMultilineField(sectionBody: string, label: string): string {
  const lines = sectionBody.split("\n");
  const startIndex = lines.findIndex((line) => line.trim().startsWith(label));
  if (startIndex < 0) {
    return "";
  }

  const firstLine = lines[startIndex]
    .replace(new RegExp(`^${label}[^:]*:\\s*`), "")
    .trim();
  const collected = firstLine ? [firstLine] : [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    if (
      trimmed.startsWith("PROVIDER APPLICABILITY:") ||
      trimmed.startsWith("ASC 606 TRANSITION:") ||
      trimmed.startsWith("NOTE:") ||
      trimmed.startsWith("id:") ||
      trimmed.startsWith("ASC:") ||
      trimmed.startsWith("WHAT MUST BE DISCLOSED") ||
      trimmed.startsWith("### ")
    ) {
      break;
    }
    if (trimmed.length > 0) {
      collected.push(trimmed);
    }
  }

  return collected.join(" ").trim();
}

function extractVerificationChecklistFlags(sectionBody: string): string[] {
  const flags = new Set<string>();
  const matches = sectionBody.match(/VC-O-[A-Z0-9-]+/g) ?? [];
  for (const match of matches) {
    flags.add(match);
  }
  return [...flags].sort();
}

function extractLibraryVerificationChecklistFlags(source: string): string[] {
  const checklistIndex = source.search(/^## OPEN VERIFICATION CHECKLIST/m);
  if (checklistIndex < 0) {
    return [];
  }
  return extractVerificationChecklistFlags(source.slice(checklistIndex));
}

function parseDisclosureSections(source: string): HealthcareDisclosureBaselineLoadResult {
  const firstDisclosureIndex = source.search(/^### [ABCD]\.\d+ —/m);
  const libraryHeaderContent =
    firstDisclosureIndex >= 0 ? source.slice(0, firstDisclosureIndex).trim() : source.trim();

  const disclosureSource = firstDisclosureIndex >= 0 ? source.slice(firstDisclosureIndex) : "";
  const checklistIndex = disclosureSource.search(/^## OPEN VERIFICATION CHECKLIST/m);
  const disclosureOnlySource =
    checklistIndex >= 0 ? disclosureSource.slice(0, checklistIndex) : disclosureSource;

  const sectionMatches = [
    ...disclosureOnlySource.matchAll(/^### [ABCD]\.\d+ — .+$/gm),
  ];
  const disclosuresByIdentifier = {} as Record<
    HealthcareDisclosureBaselineIdentifier,
    HealthcareDisclosureBaselineRecord
  >;

  sectionMatches.forEach((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = sectionMatches[index + 1]?.index ?? disclosureOnlySource.length;
    const sectionText = disclosureOnlySource.slice(sectionStart, sectionEnd).trim();
    const sectionHeader = match[0];
    const disclosureIdentifier = extractDisclosureIdentifier(sectionText);
    const itemLabel = extractItemLabel(sectionHeader);

    if (!disclosureIdentifier || !itemLabel) {
      return;
    }

    const section = extractSection(itemLabel);
    if (!section) {
      return;
    }

    disclosuresByIdentifier[disclosureIdentifier] = {
      itemLabel,
      disclosureIdentifier,
      section,
      disclosureRequirementAuthored: sectionText,
      requiredVsVoluntary: parseRequiredVsVoluntary(sectionText),
      ascCitations: parseAscCitations(sectionText),
      whatMustBeDisclosed: extractMultilineField(sectionText, "WHAT MUST BE DISCLOSED"),
      providerApplicability: extractLineValue(sectionText, "PROVIDER APPLICABILITY"),
      asc606TransitionNote: extractLineValue(sectionText, "ASC 606 TRANSITION"),
      citationFlag: {
        verificationStatus: "source_faithful_unverified",
      },
      verificationChecklistFlags: extractVerificationChecklistFlags(sectionText),
    };
  });

  for (const disclosureIdentifier of HEALTHCARE_DISCLOSURE_BASELINE_IDENTIFIER_ORDER) {
    if (!disclosuresByIdentifier[disclosureIdentifier]) {
      throw new Error(
        `PHASE_42O healthcare disclosure baseline missing requirement section for ${disclosureIdentifier}`,
      );
    }
  }

  return {
    libraryHeaderContent,
    disclosuresByIdentifier,
    libraryVerificationChecklistFlags: extractLibraryVerificationChecklistFlags(source),
  };
}

let cachedBaselineLoadResult: HealthcareDisclosureBaselineLoadResult | null = null;

export function loadHealthcareDisclosureBaseline(): HealthcareDisclosureBaselineLoadResult {
  if (!cachedBaselineLoadResult) {
    cachedBaselineLoadResult = parseDisclosureSections(readHealthcareDisclosureBaselineSource());
  }
  return cachedBaselineLoadResult;
}

export function getHealthcareDisclosureLibraryHeaderContent(): string {
  return loadHealthcareDisclosureBaseline().libraryHeaderContent;
}

export function getHealthcareDisclosureBaselineRecord(
  disclosureIdentifier: HealthcareDisclosureBaselineIdentifier,
): HealthcareDisclosureBaselineRecord {
  return loadHealthcareDisclosureBaseline().disclosuresByIdentifier[disclosureIdentifier];
}
