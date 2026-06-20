import * as fs from "fs";
import * as path from "path";

const BASELINE_FILENAME = "PHASE_42N1_HEALTHCARE_KPIS_BASELINE.md";

export const HEALTHCARE_KPI_BASELINE_IDENTIFIER_ORDER = [
  "kpi_net_days_in_ar",
  "kpi_gross_days_in_ar",
  "kpi_cash_collection_pct",
  "kpi_gross_collection_rate",
  "kpi_denial_rate",
  "kpi_clean_claim_rate",
  "kpi_days_cash_on_hand",
  "kpi_operating_margin",
  "kpi_bad_debt_pct_gross",
  "kpi_charity_care_pct_gross",
  "kpi_cost_to_charge_ratio",
  "kpi_ar_aging_buckets",
  "kpi_dnfb_days",
  "kpi_pos_collection_rate",
  "kpi_case_mix_index",
  "kpi_alos",
  "kpi_occupancy_rate",
  "kpi_block_utilization",
  "kpi_wrvu_per_fte",
  "kpi_hh_visits_recert",
  "kpi_adc",
  "kpi_readmission_rate",
  "kpi_hcahps",
  "kpi_pdpm_nta_acuity",
] as const;

export type HealthcareKpiBaselineIdentifier =
  (typeof HEALTHCARE_KPI_BASELINE_IDENTIFIER_ORDER)[number];

export type HealthcareKpiDomain = "financial_revenue_cycle" | "operational_clinical";

export type HealthcareKpiSubTypeApplicabilityValue =
  | "applicable"
  | "partial"
  | "not_applicable";

export type HealthcareKpiStandardVsVariable = "standardized" | "variable";

export interface HealthcareKpiSubTypeApplicabilityMatrix {
  acute_care_hospital: HealthcareKpiSubTypeApplicabilityValue;
  ambulatory_surgery_center: HealthcareKpiSubTypeApplicabilityValue;
  skilled_nursing_facility: HealthcareKpiSubTypeApplicabilityValue;
  physician_practice: HealthcareKpiSubTypeApplicabilityValue;
  home_health_or_hospice: HealthcareKpiSubTypeApplicabilityValue;
}

export interface HealthcareKpiCitationFlag {
  verificationStatus: "source_faithful_unverified";
  citationReference: string;
}

export interface HealthcareKpiBaselineRecord {
  kpiNumber: number;
  kpiIdentifier: HealthcareKpiBaselineIdentifier;
  domain: HealthcareKpiDomain;
  kpiDefinitionAuthored: string;
  subTypeApplicability: HealthcareKpiSubTypeApplicabilityMatrix;
  standardVsVariable: HealthcareKpiStandardVsVariable;
  hospitalVariantCompetingDefinitions: boolean;
  competingDefinitionsSurfaced: boolean;
  citationFlag: HealthcareKpiCitationFlag;
  verificationChecklistFlags: string[];
}

export interface HealthcareKpiBaselineLoadResult {
  libraryHeaderContent: string;
  kpisByIdentifier: Record<HealthcareKpiBaselineIdentifier, HealthcareKpiBaselineRecord>;
  libraryVerificationChecklistFlags: string[];
}

const SUB_TYPE_KEY_MAP = {
  H: "acute_care_hospital",
  A: "ambulatory_surgery_center",
  S: "skilled_nursing_facility",
  P: "physician_practice",
  HH: "home_health_or_hospice",
} as const satisfies Record<string, keyof HealthcareKpiSubTypeApplicabilityMatrix>;

const VARIABLE_KPI_IDENTIFIERS = new Set<HealthcareKpiBaselineIdentifier>([
  "kpi_gross_days_in_ar",
  "kpi_cash_collection_pct",
  "kpi_days_cash_on_hand",
  "kpi_operating_margin",
  "kpi_block_utilization",
  "kpi_hh_visits_recert",
]);

const COMPETING_DEFINITIONS_KPI_IDENTIFIERS = new Set<HealthcareKpiBaselineIdentifier>([
  ...VARIABLE_KPI_IDENTIFIERS,
  "kpi_gross_collection_rate",
]);

function resolveHealthcareKpiBaselinePath(): string {
  return path.join(process.cwd(), BASELINE_FILENAME);
}

function readHealthcareKpiBaselineSource(): string {
  return fs.readFileSync(resolveHealthcareKpiBaselinePath(), "utf8");
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

function extractKpiIdentifier(sectionHeaderAndBody: string): HealthcareKpiBaselineIdentifier | null {
  const idLine = extractLineValue(sectionHeaderAndBody, "id");
  const idMatch = idLine.match(/^(kpi_[a-z0-9_]+)/);
  if (!idMatch) {
    return null;
  }
  const kpiIdentifier = idMatch[1];
  if ((HEALTHCARE_KPI_BASELINE_IDENTIFIER_ORDER as readonly string[]).includes(kpiIdentifier)) {
    return kpiIdentifier as HealthcareKpiBaselineIdentifier;
  }
  return null;
}

function extractKpiNumber(sectionHeader: string): number | null {
  const numberMatch = sectionHeader.match(/^### KPI (\d+) —/);
  if (!numberMatch) {
    return null;
  }
  return Number(numberMatch[1]);
}

function extractDomain(sectionBody: string): HealthcareKpiDomain | null {
  const idLine = extractLineValue(sectionBody, "id");
  const domainMatch = idLine.match(/domain:\s*(financial_revenue_cycle|operational_clinical)/);
  if (!domainMatch) {
    return null;
  }
  return domainMatch[1] as HealthcareKpiDomain;
}

function parseSubTypeApplicability(sectionBody: string): HealthcareKpiSubTypeApplicabilityMatrix {
  const applicabilityLine = extractLineValue(sectionBody, "SUB-TYPE APPLICABILITY");
  const matrix: HealthcareKpiSubTypeApplicabilityMatrix = {
    acute_care_hospital: "not_applicable",
    ambulatory_surgery_center: "not_applicable",
    skilled_nursing_facility: "not_applicable",
    physician_practice: "not_applicable",
    home_health_or_hospice: "not_applicable",
  };

  const matches = [
    ...applicabilityLine.matchAll(
      /\b(HH|H|A|S|P)\s+(applicable|partial|not_applicable)\b/g,
    ),
  ];

  for (const match of matches) {
    const subTypeKey = SUB_TYPE_KEY_MAP[match[1] as keyof typeof SUB_TYPE_KEY_MAP];
    matrix[subTypeKey] = match[2] as HealthcareKpiSubTypeApplicabilityValue;
  }

  return matrix;
}

function parseStandardVsVariable(
  sectionBody: string,
  kpiIdentifier: HealthcareKpiBaselineIdentifier,
): {
  standardVsVariable: HealthcareKpiStandardVsVariable;
  hospitalVariantCompetingDefinitions: boolean;
  competingDefinitionsSurfaced: boolean;
} {
  const standardVsVariableLine = extractLineValue(sectionBody, "STANDARD vs VARIABLE");

  if (VARIABLE_KPI_IDENTIFIERS.has(kpiIdentifier)) {
    return {
      standardVsVariable: "variable",
      hospitalVariantCompetingDefinitions: false,
      competingDefinitionsSurfaced: true,
    };
  }

  if (kpiIdentifier === "kpi_gross_collection_rate") {
    return {
      standardVsVariable: "standardized",
      hospitalVariantCompetingDefinitions: true,
      competingDefinitionsSurfaced: true,
    };
  }

  if (standardVsVariableLine.trim().startsWith("VARIABLE")) {
    return {
      standardVsVariable: "variable",
      hospitalVariantCompetingDefinitions: false,
      competingDefinitionsSurfaced: COMPETING_DEFINITIONS_KPI_IDENTIFIERS.has(kpiIdentifier),
    };
  }

  return {
    standardVsVariable: "standardized",
    hospitalVariantCompetingDefinitions: false,
    competingDefinitionsSurfaced: COMPETING_DEFINITIONS_KPI_IDENTIFIERS.has(kpiIdentifier),
  };
}

function extractCitationReference(sectionBody: string): string {
  return extractLineValue(sectionBody, "CITATION");
}

function extractVerificationChecklistFlags(sectionBody: string): string[] {
  const flags = new Set<string>();
  const matches = sectionBody.match(/VC-N1-[A-Z0-9-]+/g) ?? [];
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

function parseKpiSections(source: string): HealthcareKpiBaselineLoadResult {
  const firstKpiIndex = source.search(/^### KPI 1 —/m);
  const libraryHeaderContent =
    firstKpiIndex >= 0 ? source.slice(0, firstKpiIndex).trim() : source.trim();

  const kpiSource = firstKpiIndex >= 0 ? source.slice(firstKpiIndex) : "";
  const checklistIndex = kpiSource.search(/^## OPEN VERIFICATION CHECKLIST/m);
  const kpiOnlySource = checklistIndex >= 0 ? kpiSource.slice(0, checklistIndex) : kpiSource;

  const sectionMatches = [...kpiOnlySource.matchAll(/^### KPI \d+ — .+$/gm)];
  const kpisByIdentifier = {} as Record<HealthcareKpiBaselineIdentifier, HealthcareKpiBaselineRecord>;

  sectionMatches.forEach((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = sectionMatches[index + 1]?.index ?? kpiOnlySource.length;
    const sectionText = kpiOnlySource.slice(sectionStart, sectionEnd).trim();
    const sectionHeader = match[0];
    const kpiIdentifier = extractKpiIdentifier(sectionText);
    const kpiNumber = extractKpiNumber(sectionHeader);
    const domain = extractDomain(sectionText);

    if (!kpiIdentifier || kpiNumber === null || !domain) {
      return;
    }

    const { standardVsVariable, hospitalVariantCompetingDefinitions, competingDefinitionsSurfaced } =
      parseStandardVsVariable(sectionText, kpiIdentifier);

    kpisByIdentifier[kpiIdentifier] = {
      kpiNumber,
      kpiIdentifier,
      domain,
      kpiDefinitionAuthored: sectionText,
      subTypeApplicability: parseSubTypeApplicability(sectionText),
      standardVsVariable,
      hospitalVariantCompetingDefinitions,
      competingDefinitionsSurfaced,
      citationFlag: {
        verificationStatus: "source_faithful_unverified",
        citationReference: extractCitationReference(sectionText),
      },
      verificationChecklistFlags: extractVerificationChecklistFlags(sectionText),
    };
  });

  for (const kpiIdentifier of HEALTHCARE_KPI_BASELINE_IDENTIFIER_ORDER) {
    if (!kpisByIdentifier[kpiIdentifier]) {
      throw new Error(
        `PHASE_42N1 healthcare KPI baseline missing definition section for ${kpiIdentifier}`,
      );
    }
  }

  return {
    libraryHeaderContent,
    kpisByIdentifier,
    libraryVerificationChecklistFlags: extractLibraryVerificationChecklistFlags(source),
  };
}

let cachedBaselineLoadResult: HealthcareKpiBaselineLoadResult | null = null;

export function loadHealthcareKpiBaseline(): HealthcareKpiBaselineLoadResult {
  if (!cachedBaselineLoadResult) {
    cachedBaselineLoadResult = parseKpiSections(readHealthcareKpiBaselineSource());
  }
  return cachedBaselineLoadResult;
}

export function getHealthcareKpiLibraryHeaderContent(): string {
  return loadHealthcareKpiBaseline().libraryHeaderContent;
}

export function getHealthcareKpiBaselineRecord(
  kpiIdentifier: HealthcareKpiBaselineIdentifier,
): HealthcareKpiBaselineRecord {
  return loadHealthcareKpiBaseline().kpisByIdentifier[kpiIdentifier];
}
