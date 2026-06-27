/**
 * Phase G7 — XBRL / SEC company-facts extraction (no new deps).
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { ExtractedFiling, ExternalTruthVertical, NumericFact, ReportingFramework } from "./types";
import { writeJson } from "./utils";

interface CompanyFactsUnit {
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

interface CompanyFactsTag {
  label: string;
  description: string;
  units: Record<string, CompanyFactsUnit[]>;
}

interface CompanyFactsFile {
  cik: number;
  entityName: string;
  facts: {
    "us-gaap"?: Record<string, CompanyFactsTag>;
    dei?: Record<string, CompanyFactsTag>;
    "ifrs-full"?: Record<string, CompanyFactsTag>;
  };
}

const REVENUE_TAGS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "SalesRevenueNet",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
];

const ASSET_TAGS = ["Assets", "AssetsCurrent"];

const INVENTORY_TAGS = ["InventoryNet", "InventoryFinishedGoods", "InventoryMethod"];

function latestUnit(tag: CompanyFactsTag | undefined, unit = "USD"): CompanyFactsUnit | null {
  if (!tag?.units?.[unit]?.length) {
    return null;
  }
  const sorted = [...tag.units[unit]].sort((a, b) => b.end.localeCompare(a.end));
  return sorted[0] ?? null;
}

function collectNumericFacts(facts: CompanyFactsFile): NumericFact[] {
  const gaap = facts.facts["us-gaap"] ?? {};
  const out: NumericFact[] = [];

  for (const tagName of [...REVENUE_TAGS, ...ASSET_TAGS]) {
    const tag = gaap[tagName];
    const unit = latestUnit(tag);
    if (unit) {
      out.push({
        tag: tagName,
        label: tag?.label ?? tagName,
        value: unit.val,
        unit: "USD",
        periodEnd: unit.end,
      });
    }
  }
  return out;
}

function detectInventoryMethod(facts: CompanyFactsFile): string | undefined {
  const gaap = facts.facts["us-gaap"] ?? {};
  for (const tagName of INVENTORY_TAGS) {
    const tag = gaap[tagName];
    const unit = latestUnit(tag);
    if (unit && tag?.description) {
      return tag.description;
    }
  }
  const narrative = JSON.stringify(gaap).toLowerCase();
  if (narrative.includes("lifo")) {
    return "LIFO";
  }
  if (narrative.includes("fifo")) {
    return "FIFO";
  }
  return undefined;
}

function collectNarrativeSnippets(facts: CompanyFactsFile): string[] {
  const snippets: string[] = [];
  const gaap = facts.facts["us-gaap"] ?? {};
  const ifrs = facts.facts["ifrs-full"] ?? {};
  for (const tag of [...Object.values(gaap), ...Object.values(ifrs)].slice(0, 5)) {
    if (tag.description) {
      snippets.push(tag.description.slice(0, 240));
    }
  }
  if (!snippets.length && facts.entityName) {
    snippets.push(`${facts.entityName} annual filing metadata`);
  }
  return snippets;
}

export function extractFromCompanyFactsFile(
  facts: CompanyFactsFile,
  input: {
    filingId: string;
    vertical: ExternalTruthVertical;
    framework: ReportingFramework;
    formType: string;
    ticker?: string;
  },
): ExtractedFiling {
  return {
    schemaVersion: "1.0.0",
    filingId: input.filingId,
    vertical: input.vertical,
    framework: input.framework,
    entityName: facts.entityName,
    cik: String(facts.cik).padStart(10, "0"),
    ticker: input.ticker,
    formType: input.formType,
    fiscalYearEnd: latestUnit(gaapDeiDate(facts))?.end,
    inventoryMethod: detectInventoryMethod(facts),
    numericFacts: collectNumericFacts(facts),
    narrativeSnippets: collectNarrativeSnippets(facts),
    rawFrameworkSignals: input.framework === "ifrs" ? ["ifrs-full"] : ["us-gaap"],
  };
}

function gaapDeiDate(facts: CompanyFactsFile): CompanyFactsTag | undefined {
  return facts.facts.dei?.DocumentPeriodEndDate;
}

export function extractFilingDir(filingPath: string): ExtractedFiling | null {
  const factsPath = join(filingPath, "raw/companyfacts.json");
  const submissionsPath = join(filingPath, "raw/submissions.json");
  const sourcePath = join(filingPath, "source.json");
  if (!existsSync(sourcePath)) {
    return null;
  }
  const source = JSON.parse(readFileSync(sourcePath, "utf8")) as {
    filingId: string;
    vertical: ExternalTruthVertical;
    framework: ReportingFramework;
    formType: string;
    notes?: string;
  };

  if (!existsSync(factsPath)) {
    if (!existsSync(submissionsPath)) {
      return null;
    }
    const submissions = JSON.parse(readFileSync(submissionsPath, "utf8")) as { name?: string };
    return extractFromManualJson(filingPath, {
      filingId: source.filingId,
      vertical: source.vertical,
      framework: source.framework,
      formType: source.formType,
      entityName: submissions.name ?? source.filingId,
      numericFacts: [],
      narrativeSnippets: [`${submissions.name ?? source.filingId} ${source.formType}`],
    });
  }

  const facts = JSON.parse(readFileSync(factsPath, "utf8")) as CompanyFactsFile;
  const ticker = source.notes?.includes("ticker=")
    ? undefined
    : filingPath.split(/[\\/]/).pop()?.split("-")[0];
  const extracted = extractFromCompanyFactsFile(facts, {
    filingId: source.filingId,
    vertical: source.vertical,
    framework: source.framework,
    formType: source.formType,
    ticker,
  });
  if (!extracted.entityName && existsSync(submissionsPath)) {
    const submissions = JSON.parse(readFileSync(submissionsPath, "utf8")) as { name?: string };
    extracted.entityName = submissions.name ?? source.filingId;
    if (!extracted.narrativeSnippets.length) {
      extracted.narrativeSnippets = [`${extracted.entityName} ${source.formType}`];
    }
  }
  writeJson(join(filingPath, "extracted.json"), extracted);
  return extracted;
}

export function extractFromManualJson(
  filingPath: string,
  manual: {
    entityName: string;
    framework: ReportingFramework;
    vertical: ExternalTruthVertical;
    filingId: string;
    formType: string;
    numericFacts: NumericFact[];
    narrativeSnippets: string[];
    inventoryMethod?: string;
  },
): ExtractedFiling {
  const extracted: ExtractedFiling = {
    schemaVersion: "1.0.0",
    filingId: manual.filingId,
    vertical: manual.vertical,
    framework: manual.framework,
    entityName: manual.entityName,
    formType: manual.formType,
    inventoryMethod: manual.inventoryMethod,
    numericFacts: manual.numericFacts,
    narrativeSnippets: manual.narrativeSnippets,
    rawFrameworkSignals: [manual.framework],
  };
  writeJson(join(filingPath, "extracted.json"), extracted);
  return extracted;
}
