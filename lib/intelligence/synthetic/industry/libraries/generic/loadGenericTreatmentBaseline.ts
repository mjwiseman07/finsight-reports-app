import * as fs from "fs";
import * as path from "path";

import {
  GENERIC_TREATMENT_11_APPLICABILITY_GUARD,
  GENERIC_TREATMENT_11_EXECUTION_CONSTRAINTS,
  GENERIC_TREATMENT_11_TOPIC_IDENTIFIER,
  type GenericTreatmentApplicabilityGuard,
  type GenericTreatmentExecutionConstraints,
} from "./genericTreatment11Metadata";

const BASELINE_FILENAME = "PHASE_42I_GENERIC_TREATMENTS_BASELINE.md";

export const GENERIC_BASELINE_TOPIC_ORDER = [
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
  GENERIC_TREATMENT_11_TOPIC_IDENTIFIER,
  "ap_cutoff_and_expense_recognition",
] as const;

export type GenericBaselineTopicIdentifier = (typeof GENERIC_BASELINE_TOPIC_ORDER)[number];

export interface GenericTreatmentBaselineRecord {
  topicIdentifier: GenericBaselineTopicIdentifier;
  treatmentSummaryAuthored: string;
  citationReference: string;
  verificationChecklistFlags: string[];
  applicabilityGuard?: GenericTreatmentApplicabilityGuard;
  executionConstraints?: GenericTreatmentExecutionConstraints;
}

export interface GenericTreatmentBaselineLoadResult {
  libraryHeaderContent: string;
  treatmentsByTopic: Record<GenericBaselineTopicIdentifier, GenericTreatmentBaselineRecord>;
}

function resolveGenericBaselinePath(): string {
  return path.join(process.cwd(), BASELINE_FILENAME);
}

function readGenericTreatmentBaselineSource(): string {
  return fs.readFileSync(resolveGenericBaselinePath(), "utf8");
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

function extractTopicIdentifier(sectionHeaderAndBody: string): GenericBaselineTopicIdentifier | null {
  const topicMatch = sectionHeaderAndBody.match(/Topic:\s*([a-z0-9_]+)/);
  if (!topicMatch) {
    return null;
  }
  const topicIdentifier = topicMatch[1];
  if ((GENERIC_BASELINE_TOPIC_ORDER as readonly string[]).includes(topicIdentifier)) {
    return topicIdentifier as GenericBaselineTopicIdentifier;
  }
  return null;
}

function parseTreatmentSections(source: string): GenericTreatmentBaselineLoadResult {
  const firstTreatmentIndex = source.search(/^## 1\.\s/m);
  const libraryHeaderContent =
    firstTreatmentIndex >= 0 ? source.slice(0, firstTreatmentIndex).trim() : source.trim();

  const treatmentSource = firstTreatmentIndex >= 0 ? source.slice(firstTreatmentIndex) : "";
  const sectionMatches = [...treatmentSource.matchAll(/^## \d+\.\s.+$/gm)];
  const treatmentsByTopic = {} as Record<GenericBaselineTopicIdentifier, GenericTreatmentBaselineRecord>;

  sectionMatches.forEach((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = sectionMatches[index + 1]?.index ?? treatmentSource.length;
    const sectionText = treatmentSource.slice(sectionStart, sectionEnd).trim();
    const topicIdentifier = extractTopicIdentifier(sectionText);

    if (!topicIdentifier) {
      return;
    }

    treatmentsByTopic[topicIdentifier] = {
      topicIdentifier,
      treatmentSummaryAuthored: sectionText,
      citationReference: extractCitationReference(sectionText),
      verificationChecklistFlags: extractVerificationChecklistFlags(sectionText),
      ...(topicIdentifier === GENERIC_TREATMENT_11_TOPIC_IDENTIFIER
        ? {
            applicabilityGuard: GENERIC_TREATMENT_11_APPLICABILITY_GUARD,
            executionConstraints: GENERIC_TREATMENT_11_EXECUTION_CONSTRAINTS,
          }
        : {}),
    };
  });

  for (const topicIdentifier of GENERIC_BASELINE_TOPIC_ORDER) {
    if (!treatmentsByTopic[topicIdentifier]) {
      throw new Error(
        `PHASE_42I generic baseline missing treatment section for topic ${topicIdentifier}`,
      );
    }
  }

  return {
    libraryHeaderContent,
    treatmentsByTopic,
  };
}

let cachedBaselineLoadResult: GenericTreatmentBaselineLoadResult | null = null;

export function loadGenericTreatmentBaseline(): GenericTreatmentBaselineLoadResult {
  if (!cachedBaselineLoadResult) {
    cachedBaselineLoadResult = parseTreatmentSections(readGenericTreatmentBaselineSource());
  }
  return cachedBaselineLoadResult;
}

export function getGenericLibraryHeaderContent(): string {
  return loadGenericTreatmentBaseline().libraryHeaderContent;
}

export function getGenericTreatmentBaselineRecord(
  topicIdentifier: GenericBaselineTopicIdentifier,
): GenericTreatmentBaselineRecord {
  return loadGenericTreatmentBaseline().treatmentsByTopic[topicIdentifier];
}

/** @deprecated Use getGenericTreatmentBaselineRecord(GENERIC_TREATMENT_11_TOPIC_IDENTIFIER) */
export function getGenericTreatment11BaselineRecord(): GenericTreatmentBaselineRecord {
  return getGenericTreatmentBaselineRecord(GENERIC_TREATMENT_11_TOPIC_IDENTIFIER);
}
