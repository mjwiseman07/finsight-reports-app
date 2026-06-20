import * as fs from "fs";
import * as path from "path";

const BASELINE_FILENAME = "PHASE_42P_HEALTHCARE_BENCHMARKS_BASELINE.md";

export const HEALTHCARE_BENCHMARK_BASELINE_IDENTIFIER_ORDER = [
  "bench_net_days_in_ar",
  "bench_cash_collection_rate",
  "bench_initial_denial_rate",
  "bench_clean_claim_rate",
  "bench_days_cash_on_hand",
  "bench_operating_margin",
  "bench_bad_debt_pct",
  "bench_charity_care_pct",
  "bench_ar_over_90_pct",
  "bench_pos_collection_rate",
  "bench_occupancy_rate",
  "bench_alos",
  "bench_cmi",
  "bench_wrvu_per_fte",
  "bench_or_utilization",
  "bench_recert_rate",
  "bench_adc",
  "bench_readmission_rate",
] as const;

export type HealthcareBenchmarkBaselineIdentifier =
  (typeof HEALTHCARE_BENCHMARK_BASELINE_IDENTIFIER_ORDER)[number];

export interface HealthcareBenchmarkCitationFlag {
  verificationStatus: "source_faithful_unverified";
}

export interface HealthcareBenchmarkRangeBySubClassification {
  industrySubClassificationKey: string;
  rangeDescription: string;
}

export interface HealthcareBenchmarkBaselineRecord {
  benchmarkNumber: number;
  benchmarkIdentifier: HealthcareBenchmarkBaselineIdentifier;
  linksToKpiIdentifier: string;
  benchmarkAuthored: string;
  cautionNote: string;
  rangesBySubClassification: HealthcareBenchmarkRangeBySubClassification[];
  rangesSectionAuthored: string;
  sources: string;
  dataYear: string;
  citationFlag: HealthcareBenchmarkCitationFlag;
  verificationChecklistFlags: string[];
}

export interface HealthcareBenchmarkBaselineLoadResult {
  libraryHeaderContent: string;
  benchmarksByIdentifier: Record<
    HealthcareBenchmarkBaselineIdentifier,
    HealthcareBenchmarkBaselineRecord
  >;
  libraryVerificationChecklistFlags: string[];
}

function resolveHealthcareBenchmarkBaselinePath(): string {
  return path.join(process.cwd(), BASELINE_FILENAME);
}

function readHealthcareBenchmarkBaselineSource(): string {
  return fs.readFileSync(resolveHealthcareBenchmarkBaselinePath(), "utf8");
}

function extractLineValue(sectionBody: string, label: string): string {
  const line = sectionBody
    .split("\n")
    .find((entry) => entry.trim().startsWith(label));
  if (!line) {
    return "";
  }
  return line.replace(new RegExp(`^${label}[^:]*:\\s*`), "").trim();
}

function extractBenchmarkIdentifier(
  sectionHeaderAndBody: string,
): HealthcareBenchmarkBaselineIdentifier | null {
  const idLine = extractLineValue(sectionHeaderAndBody, "id");
  const idMatch = idLine.match(/^(bench_[a-z0-9_]+)/);
  if (!idMatch) {
    return null;
  }
  const benchmarkIdentifier = idMatch[1];
  if (
    (HEALTHCARE_BENCHMARK_BASELINE_IDENTIFIER_ORDER as readonly string[]).includes(
      benchmarkIdentifier,
    )
  ) {
    return benchmarkIdentifier as HealthcareBenchmarkBaselineIdentifier;
  }
  return null;
}

function extractBenchmarkNumber(sectionHeader: string): number | null {
  const numberMatch = sectionHeader.match(/^## BENCHMARK (\d+) —/);
  if (!numberMatch) {
    return null;
  }
  return Number(numberMatch[1]);
}

function extractLinksToKpiIdentifier(sectionBody: string): string {
  const linksLine = sectionBody
    .split("\n")
    .find((line) => line.trim().startsWith("id:") && line.includes("links to:"));
  if (!linksLine) {
    return "";
  }
  const kpiMatch = linksLine.match(/links to:\s*42N1\s+(kpi_[a-z0-9_]+)/);
  return kpiMatch ? kpiMatch[1] : "";
}

function extractCautionNote(sectionBody: string): string {
  const lines = sectionBody.split("\n");
  const startIndex = lines.findIndex((line) => line.trim().startsWith("CAUTION"));
  if (startIndex < 0) {
    return "";
  }

  const firstLine = lines[startIndex]
    .replace(/^CAUTION[^:]*:\s*/, "")
    .trim();
  const collected = firstLine ? [firstLine] : [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (
      trimmed.startsWith("RANGES") ||
      trimmed.startsWith("SOURCES:") ||
      trimmed.startsWith("id:") ||
      trimmed.startsWith("## ")
    ) {
      break;
    }
    if (trimmed.length > 0) {
      collected.push(trimmed);
    }
  }

  return collected.join(" ").trim();
}

function extractRangesSection(sectionBody: string): string {
  const lines = sectionBody.split("\n");
  const startIndex = lines.findIndex((line) => line.trim().startsWith("RANGES"));
  if (startIndex < 0) {
    return "";
  }

  const collected: string[] = [lines[startIndex].trim()];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (trimmed.startsWith("SOURCES:") || trimmed.startsWith("## ")) {
      break;
    }
    if (trimmed.length > 0) {
      collected.push(trimmed);
    }
  }

  return collected.join("\n").trim();
}

function parseRangeBullets(rangesSectionAuthored: string): HealthcareBenchmarkRangeBySubClassification[] {
  const ranges: HealthcareBenchmarkRangeBySubClassification[] = [];
  const lines = rangesSectionAuthored.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("- ")) {
      continue;
    }

    const bulletBody = trimmed.slice(2).trim();
    const colonIndex = bulletBody.indexOf(":");
    if (colonIndex < 0) {
      ranges.push({
        industrySubClassificationKey: bulletBody,
        rangeDescription: "",
      });
      continue;
    }

    ranges.push({
      industrySubClassificationKey: bulletBody.slice(0, colonIndex).trim(),
      rangeDescription: bulletBody.slice(colonIndex + 1).trim(),
    });
  }

  return ranges;
}

function extractSources(sectionBody: string): string {
  const sourcesLine = sectionBody
    .split("\n")
    .find((line) => line.trim().startsWith("SOURCES:"));
  if (!sourcesLine) {
    return "";
  }
  return sourcesLine.replace(/^SOURCES:\s*/, "").trim();
}

function extractDataYear(sectionBody: string): string {
  const dataYearMatch = sectionBody.match(/DATA YEAR:\s*([^\n.)]+)/);
  return dataYearMatch ? dataYearMatch[1].trim() : "";
}

function extractVerificationChecklistFlags(sectionBody: string): string[] {
  const flags = new Set<string>();
  const matches = sectionBody.match(/VC-P-[A-Z0-9-]+/g) ?? [];
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

function parseBenchmarkSections(source: string): HealthcareBenchmarkBaselineLoadResult {
  const firstBenchmarkIndex = source.search(/^## BENCHMARK 1 —/m);
  const libraryHeaderContent =
    firstBenchmarkIndex >= 0 ? source.slice(0, firstBenchmarkIndex).trim() : source.trim();

  const benchmarkSource = firstBenchmarkIndex >= 0 ? source.slice(firstBenchmarkIndex) : "";
  const checklistIndex = benchmarkSource.search(/^## OPEN VERIFICATION CHECKLIST/m);
  const benchmarkOnlySource =
    checklistIndex >= 0 ? benchmarkSource.slice(0, checklistIndex) : benchmarkSource;

  const sectionMatches = [...benchmarkOnlySource.matchAll(/^## BENCHMARK \d+ — .+$/gm)];
  const benchmarksByIdentifier = {} as Record<
    HealthcareBenchmarkBaselineIdentifier,
    HealthcareBenchmarkBaselineRecord
  >;

  sectionMatches.forEach((match, index) => {
    const sectionStart = match.index ?? 0;
    const sectionEnd = sectionMatches[index + 1]?.index ?? benchmarkOnlySource.length;
    const sectionText = benchmarkOnlySource.slice(sectionStart, sectionEnd).trim();
    const sectionHeader = match[0];
    const benchmarkIdentifier = extractBenchmarkIdentifier(sectionText);
    const benchmarkNumber = extractBenchmarkNumber(sectionHeader);

    if (!benchmarkIdentifier || benchmarkNumber === null) {
      return;
    }

    const rangesSectionAuthored = extractRangesSection(sectionText);

    benchmarksByIdentifier[benchmarkIdentifier] = {
      benchmarkNumber,
      benchmarkIdentifier,
      linksToKpiIdentifier: extractLinksToKpiIdentifier(sectionText),
      benchmarkAuthored: sectionText,
      cautionNote: extractCautionNote(sectionText),
      rangesBySubClassification: parseRangeBullets(rangesSectionAuthored),
      rangesSectionAuthored,
      sources: extractSources(sectionText),
      dataYear: extractDataYear(sectionText),
      citationFlag: {
        verificationStatus: "source_faithful_unverified",
      },
      verificationChecklistFlags: extractVerificationChecklistFlags(sectionText),
    };
  });

  for (const benchmarkIdentifier of HEALTHCARE_BENCHMARK_BASELINE_IDENTIFIER_ORDER) {
    if (!benchmarksByIdentifier[benchmarkIdentifier]) {
      throw new Error(
        `PHASE_42P healthcare benchmark baseline missing entry for ${benchmarkIdentifier}`,
      );
    }
  }

  return {
    libraryHeaderContent,
    benchmarksByIdentifier,
    libraryVerificationChecklistFlags: extractLibraryVerificationChecklistFlags(source),
  };
}

let cachedBaselineLoadResult: HealthcareBenchmarkBaselineLoadResult | null = null;

export function loadHealthcareBenchmarkBaseline(): HealthcareBenchmarkBaselineLoadResult {
  if (!cachedBaselineLoadResult) {
    cachedBaselineLoadResult = parseBenchmarkSections(readHealthcareBenchmarkBaselineSource());
  }
  return cachedBaselineLoadResult;
}

export function getHealthcareBenchmarkLibraryHeaderContent(): string {
  return loadHealthcareBenchmarkBaseline().libraryHeaderContent;
}

export function getHealthcareBenchmarkBaselineRecord(
  benchmarkIdentifier: HealthcareBenchmarkBaselineIdentifier,
): HealthcareBenchmarkBaselineRecord {
  return loadHealthcareBenchmarkBaseline().benchmarksByIdentifier[benchmarkIdentifier];
}
