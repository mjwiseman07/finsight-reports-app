import * as fs from "fs";
import * as path from "path";

import {
  GENERIC_TREATMENT_11_APPLICABILITY_GUARD,
  GENERIC_TREATMENT_11_EXECUTION_CONSTRAINTS,
  GENERIC_TREATMENT_11_IFRS_IASB_TOPIC_IDENTIFIER,
  GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER,
  isGenericTreatment11ArAllowanceTopic,
  type GenericTreatmentApplicabilityGuard,
  type GenericTreatmentExecutionConstraints,
} from "./genericTreatment11Metadata";

export const GENERIC_US_GAAP_BASELINE_FILENAME = "PHASE_42I_GENERIC_TREATMENTS_BASELINE.md";
export const GENERIC_IFRS_IASB_BASELINE_FILENAME = "PHASE_42I_GENERIC_TREATMENTS_IFRS_IASB_BASELINE.md";
export const GENERIC_IFRS_EU_BASELINE_FILENAME = "PHASE_42I_GENERIC_TREATMENTS_IFRS_EU_BASELINE.md";

export const GENERIC_BASELINE_FRAMEWORKS = ["us_gaap", "ifrs_iasb", "ifrs_eu"] as const;
export type GenericBaselineFramework = (typeof GENERIC_BASELINE_FRAMEWORKS)[number];

export const GENERIC_SHARED_BASELINE_TOPIC_ORDER = [
  "professional_services_revenue",
  "smb_inventory",
  "light_manufacturing_cost_accounting",
  "distributor_inventory_and_freight",
  "holding_company_intercompany_eliminations",
  "smb_payroll_and_benefits_accruals",
  "smb_fixed_asset_categories",
  "smb_prepaid_and_accrual_conventions",
  "basic_smb_deferred_revenue",
  "smb_lease_classification",
] as const;

export const GENERIC_TREATMENT_11_TOPIC_BY_FRAMEWORK: Record<GenericBaselineFramework, string> = {
  us_gaap: GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER,
  ifrs_iasb: GENERIC_TREATMENT_11_IFRS_IASB_TOPIC_IDENTIFIER,
  ifrs_eu: GENERIC_TREATMENT_11_IFRS_IASB_TOPIC_IDENTIFIER,
};

export function getGenericBaselineTopicOrder(
  reportingFramework: GenericBaselineFramework,
): readonly string[] {
  return [
    ...GENERIC_SHARED_BASELINE_TOPIC_ORDER,
    GENERIC_TREATMENT_11_TOPIC_BY_FRAMEWORK[reportingFramework],
    "ap_cutoff_and_expense_recognition",
  ];
}

export const GENERIC_BASELINE_TOPIC_ORDER = getGenericBaselineTopicOrder("us_gaap");

export const GENERIC_BASELINE_TOPIC_IDENTIFIERS = [
  ...GENERIC_SHARED_BASELINE_TOPIC_ORDER,
  GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER,
  GENERIC_TREATMENT_11_IFRS_IASB_TOPIC_IDENTIFIER,
  "ap_cutoff_and_expense_recognition",
] as const;

export type GenericBaselineTopicIdentifier = (typeof GENERIC_BASELINE_TOPIC_IDENTIFIERS)[number];

export interface GenericTreatmentBaselineRecord {
  topicIdentifier: string;
  reportingFramework: GenericBaselineFramework;
  treatmentSummaryAuthored: string;
  citationReference: string;
  verificationChecklistFlags: string[];
  applicabilityGuard?: GenericTreatmentApplicabilityGuard;
  executionConstraints?: GenericTreatmentExecutionConstraints;
}

export interface GenericTreatmentBaselineLoadResult {
  reportingFramework: GenericBaselineFramework;
  libraryHeaderContent: string;
  treatmentsByTopic: Record<string, GenericTreatmentBaselineRecord>;
}

const BASELINE_FILENAME_BY_FRAMEWORK: Record<GenericBaselineFramework, string> = {
  us_gaap: GENERIC_US_GAAP_BASELINE_FILENAME,
  ifrs_iasb: GENERIC_IFRS_IASB_BASELINE_FILENAME,
  ifrs_eu: GENERIC_IFRS_EU_BASELINE_FILENAME,
};

function resolveGenericBaselinePath(reportingFramework: GenericBaselineFramework): string {
  return path.join(process.cwd(), BASELINE_FILENAME_BY_FRAMEWORK[reportingFramework]);
}

function readGenericTreatmentBaselineSource(reportingFramework: GenericBaselineFramework): string {
  return fs.readFileSync(resolveGenericBaselinePath(reportingFramework), "utf8");
}

function extractVerificationChecklistFlags(sectionBody: string): string[] {
  const flags = new Set<string>();
  const numberedMatches = sectionBody.match(/GVC-\d+/g) ?? [];
  for (const match of numberedMatches) {
    flags.add(match);
  }
  if (/\[GVC\]/.test(sectionBody)) {
    flags.add("GVC");
  }
  return [...flags].sort();
}

function extractCitationReference(sectionBody: string): string {
  const citationsLine = sectionBody
    .split("\n")
    .find((line) => line.trim().startsWith("CITATIONS:"));
  if (!citationsLine) {
    return "";
  }
  return citationsLine.replace(/^CITATIONS:\s*/, "").trim();
}

function extractTopicIdentifier(
  sectionHeaderAndBody: string,
  expectedTopicIdentifiers: readonly string[],
): string | null {
  const topicMatch = sectionHeaderAndBody.match(/Topic:\s*([a-z0-9_]+)/);
  if (!topicMatch) {
    return null;
  }
  const topicIdentifier = topicMatch[1];
  if (expectedTopicIdentifiers.includes(topicIdentifier)) {
    return topicIdentifier;
  }
  return null;
}

function parseTreatmentSections(
  source: string,
  reportingFramework: GenericBaselineFramework,
): GenericTreatmentBaselineLoadResult {
  const expectedTopicIdentifiers = getGenericBaselineTopicOrder(reportingFramework);
  const firstTreatmentIndex = source.search(/^## 1\.\s/m);
  const libraryHeaderContent =
    firstTreatmentIndex >= 0 ? source.slice(0, firstTreatmentIndex).trim() : source.trim();

  const treatmentSource = firstTreatmentIndex >= 0 ? source.slice(firstTreatmentIndex) : "";
  const sectionMatches = [...treatmentSource.matchAll(/^## \d+\.\s.+$/gm)];
  const treatmentsByTopic: Record<string, GenericTreatmentBaselineRecord> = {};

  sectionMatches.forEach((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = sectionMatches[index + 1]?.index ?? treatmentSource.length;
    const sectionText = treatmentSource.slice(sectionStart, sectionEnd).trim();
    const topicIdentifier = extractTopicIdentifier(sectionText, expectedTopicIdentifiers);

    if (!topicIdentifier) {
      return;
    }

    treatmentsByTopic[topicIdentifier] = {
      topicIdentifier,
      reportingFramework,
      treatmentSummaryAuthored: sectionText,
      citationReference: extractCitationReference(sectionText),
      verificationChecklistFlags: extractVerificationChecklistFlags(sectionText),
      ...(isGenericTreatment11ArAllowanceTopic(topicIdentifier)
        ? {
            applicabilityGuard: GENERIC_TREATMENT_11_APPLICABILITY_GUARD,
            executionConstraints: GENERIC_TREATMENT_11_EXECUTION_CONSTRAINTS,
          }
        : {}),
    };
  });

  for (const topicIdentifier of expectedTopicIdentifiers) {
    if (!treatmentsByTopic[topicIdentifier]) {
      throw new Error(
        `PHASE_42I generic ${reportingFramework} baseline missing treatment section for topic ${topicIdentifier}`,
      );
    }
  }

  return {
    reportingFramework,
    libraryHeaderContent,
    treatmentsByTopic,
  };
}

const cachedBaselineLoadResults = new Map<GenericBaselineFramework, GenericTreatmentBaselineLoadResult>();

export function loadGenericTreatmentBaseline(
  reportingFramework: GenericBaselineFramework,
): GenericTreatmentBaselineLoadResult {
  const cached = cachedBaselineLoadResults.get(reportingFramework);
  if (!cached) {
    const loaded = parseTreatmentSections(
      readGenericTreatmentBaselineSource(reportingFramework),
      reportingFramework,
    );
    cachedBaselineLoadResults.set(reportingFramework, loaded);
    return loaded;
  }
  return cached;
}

export function getGenericLibraryHeaderContent(
  reportingFramework: GenericBaselineFramework = "us_gaap",
): string {
  return loadGenericTreatmentBaseline(reportingFramework).libraryHeaderContent;
}

export function getGenericTreatmentBaselineRecord(
  topicIdentifier: string,
  reportingFramework: GenericBaselineFramework,
): GenericTreatmentBaselineRecord {
  const record = loadGenericTreatmentBaseline(reportingFramework).treatmentsByTopic[topicIdentifier];
  if (!record) {
    throw new Error(
      `PHASE_42I generic ${reportingFramework} baseline has no record for topic ${topicIdentifier}`,
    );
  }
  return record;
}

/** @deprecated Use getGenericTreatmentBaselineRecord(GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER, "us_gaap") */
export function getGenericTreatment11BaselineRecord(): GenericTreatmentBaselineRecord {
  return getGenericTreatmentBaselineRecord(GENERIC_TREATMENT_11_US_GAAP_TOPIC_IDENTIFIER, "us_gaap");
}
