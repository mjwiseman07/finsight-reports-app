import * as fs from "fs";
import * as path from "path";

import type { HealthcareLaunchTopicIdentifier } from "./buildHealthcareIndustryTreatment";

const BASELINE_FILENAME = "PHASE_42M_HEALTHCARE_TREATMENTS_BASELINE.md";

const TOPIC_ORDER: readonly HealthcareLaunchTopicIdentifier[] = [
  "net_patient_service_revenue",
  "contractual_allowance_reserves",
  "implicit_price_concessions",
  "denial_reserves_and_credit_loss_boundary",
  "charity_care_and_community_benefit",
  "capitation_revenue",
  "risk_sharing_value_based_care",
  "drug_pricing_program_340b",
  "medical_malpractice_accruals",
  "healthcare_specific_intangibles",
  "healthcare_specific_fixed_assets",
  "healthcare_specific_lease_considerations",
];

export interface HealthcareTreatmentBaselineRecord {
  topicIdentifier: HealthcareLaunchTopicIdentifier;
  treatmentSummaryAuthored: string;
  citationReference: string;
  verificationChecklistFlags: string[];
}

export interface HealthcareTreatmentBaselineLoadResult {
  libraryHeaderContent: string;
  treatmentsByTopic: Record<HealthcareLaunchTopicIdentifier, HealthcareTreatmentBaselineRecord>;
}

function resolveHealthcareBaselinePath(): string {
  return path.join(process.cwd(), BASELINE_FILENAME);
}

function readHealthcareTreatmentBaselineSource(): string {
  const baselinePath = resolveHealthcareBaselinePath();
  return fs.readFileSync(baselinePath, "utf8");
}

function extractVerificationChecklistFlags(sectionBody: string): string[] {
  const flags = new Set<string>();
  const matches = sectionBody.match(/VC-\d+/g) ?? [];
  for (const match of matches) {
    flags.add(match);
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

function extractTopicIdentifier(sectionHeaderAndBody: string): HealthcareLaunchTopicIdentifier | null {
  const topicMatch = sectionHeaderAndBody.match(/Topic:\s*([a-z0-9_]+)/);
  if (!topicMatch) {
    return null;
  }
  const topicIdentifier = topicMatch[1];
  if ((TOPIC_ORDER as readonly string[]).includes(topicIdentifier)) {
    return topicIdentifier as HealthcareLaunchTopicIdentifier;
  }
  return null;
}

function parseTreatmentSections(source: string): HealthcareTreatmentBaselineLoadResult {
  const firstTreatmentIndex = source.search(/^## 1\.\s/m);
  const libraryHeaderContent =
    firstTreatmentIndex >= 0 ? source.slice(0, firstTreatmentIndex).trim() : source.trim();

  const treatmentSource = firstTreatmentIndex >= 0 ? source.slice(firstTreatmentIndex) : "";
  const sectionMatches = [...treatmentSource.matchAll(/^## \d+\.\s.+$/gm)];

  const treatmentsByTopic = {} as Record<HealthcareLaunchTopicIdentifier, HealthcareTreatmentBaselineRecord>;

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
    };
  });

  for (const topicIdentifier of TOPIC_ORDER) {
    if (!treatmentsByTopic[topicIdentifier]) {
      throw new Error(
        `PHASE_42M healthcare baseline missing treatment section for topic ${topicIdentifier}`,
      );
    }
  }

  return {
    libraryHeaderContent,
    treatmentsByTopic,
  };
}

let cachedBaselineLoadResult: HealthcareTreatmentBaselineLoadResult | null = null;

export function loadHealthcareTreatmentBaseline(): HealthcareTreatmentBaselineLoadResult {
  if (!cachedBaselineLoadResult) {
    cachedBaselineLoadResult = parseTreatmentSections(readHealthcareTreatmentBaselineSource());
  }
  return cachedBaselineLoadResult;
}

export function getHealthcareLibraryHeaderContent(): string {
  return loadHealthcareTreatmentBaseline().libraryHeaderContent;
}

export function getHealthcareTreatmentBaselineRecord(
  topicIdentifier: HealthcareLaunchTopicIdentifier,
): HealthcareTreatmentBaselineRecord {
  return loadHealthcareTreatmentBaseline().treatmentsByTopic[topicIdentifier];
}
