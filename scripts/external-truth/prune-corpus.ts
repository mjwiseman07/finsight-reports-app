/**
 * Phase G7-C5.5 — prune SEC companyfacts.json to validated XBRL slices.
 */
import { existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExpectedFiling, ExtractedFiling, SourceJson } from "./types";
import { FILINGS_ROOT, listFilingDirs, sha256Hex, writeJson } from "./utils";

const CORE_TAGS = [
  "Revenues",
  "RevenueFromContractWithCustomerExcludingAssessedTax",
  "SalesRevenueNet",
  "RevenueFromContractWithCustomerIncludingAssessedTax",
  "Assets",
  "AssetsCurrent",
  "InventoryNet",
  "InventoryFinishedGoods",
  "InventoryMethod",
  "CostOfGoodsSold",
  "CostOfRevenue",
  "CostOfSales",
  "OperatingLeaseLiability",
  "FinanceLeaseLiability",
  "ContractWithCustomerAsset",
  "ContractWithCustomerLiability",
  "ContractWithCustomerLiabilityCurrent",
  "DeferredRevenue",
  "CapitalizedContractCost",
  "DeferredSalesCommission",
  "DocumentPeriodEndDate",
  "EntityCommonStockSharesOutstanding",
  "NetAssets",
  "SharesOutstanding",
];

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
  facts: Record<string, Record<string, CompanyFactsTag>>;
}

function latestUnits(tag: CompanyFactsTag): Record<string, CompanyFactsUnit[]> {
  const out: Record<string, CompanyFactsUnit[]> = {};
  for (const [unit, rows] of Object.entries(tag.units)) {
    const sorted = [...rows].sort((a, b) => b.end.localeCompare(a.end));
    if (sorted[0]) {
      out[unit] = [sorted[0]];
    }
  }
  return out;
}

function collectReferencedTags(filingPath: string): Set<string> {
  const tags = new Set(CORE_TAGS);
  const extractedPath = join(filingPath, "extracted.json");
  const expectedPath = join(filingPath, "expected.json");
  if (existsSync(extractedPath)) {
    const extracted = JSON.parse(readFileSync(extractedPath, "utf8")) as ExtractedFiling;
    for (const fact of extracted.numericFacts) {
      tags.add(fact.tag);
    }
  }
  if (existsSync(expectedPath)) {
    const expected = JSON.parse(readFileSync(expectedPath, "utf8")) as ExpectedFiling;
    for (const fact of expected.numericFacts) {
      tags.add(fact.tag);
    }
  }
  const sourcePath = join(filingPath, "source.json");
  if (existsSync(sourcePath)) {
    const source = JSON.parse(readFileSync(sourcePath, "utf8")) as SourceJson;
    for (const tag of source.prunedElements ?? []) {
      tags.add(tag);
    }
  }
  return tags;
}

export function pruneCompanyFactsFile(
  full: CompanyFactsFile,
  referencedTags: Set<string>,
): { slim: CompanyFactsFile; keptTags: string[] } {
  const slimFacts: CompanyFactsFile["facts"] = {};
  const keptTags: string[] = [];

  for (const [taxonomy, tagMap] of Object.entries(full.facts)) {
    for (const [tagName, tagValue] of Object.entries(tagMap)) {
      if (!referencedTags.has(tagName)) {
        continue;
      }
      if (!slimFacts[taxonomy]) {
        slimFacts[taxonomy] = {};
      }
      slimFacts[taxonomy][tagName] = {
        label: tagValue.label,
        description: tagValue.description,
        units: latestUnits(tagValue),
      };
      keptTags.push(`${taxonomy}:${tagName}`);
    }
  }

  return {
    slim: {
      cik: full.cik,
      entityName: full.entityName,
      facts: slimFacts,
    },
    keptTags,
  };
}

export function pruneFilingDir(filingPath: string): { pruned: boolean; before: number; after: number } {
  const factsPath = join(filingPath, "raw/companyfacts.json");
  if (!existsSync(factsPath)) {
    return { pruned: false, before: 0, after: 0 };
  }

  const before = readFileSync(factsPath).length;
  const originalSha256 = sha256Hex(readFileSync(factsPath));
  const full = JSON.parse(readFileSync(factsPath, "utf8")) as CompanyFactsFile;
  const referenced = collectReferencedTags(filingPath);
  const { slim, keptTags } = pruneCompanyFactsFile(full, referenced);
  const slimPath = join(filingPath, "raw/companyfacts.slim.json");
  const slimPayload = `${JSON.stringify(slim, null, 2)}\n`;
  writeFileSync(slimPath, slimPayload, "utf8");
  const prunedSha256 = sha256Hex(slimPayload);
  unlinkSync(factsPath);

  const sourcePath = join(filingPath, "source.json");
  if (existsSync(sourcePath)) {
    const source = JSON.parse(readFileSync(sourcePath, "utf8")) as SourceJson;
    writeJson(sourcePath, {
      ...source,
      originalSha256,
      prunedSha256,
      sha256: prunedSha256,
      pruningRule: "subset-of-original-by-xbrl-element-set",
      prunedElements: keptTags.map((entry) => entry.split(":")[1] ?? entry),
    });
  }

  return { pruned: true, before, after: slimPayload.length };
}

export function pruneCorpus(root = FILINGS_ROOT): {
  prunedCount: number;
  beforeBytes: number;
  afterBytes: number;
  perFiling: Array<{ path: string; before: number; after: number }>;
} {
  const perFiling: Array<{ path: string; before: number; after: number }> = [];
  let prunedCount = 0;
  let beforeBytes = 0;
  let afterBytes = 0;

  for (const filingPath of listFilingDirs()) {
    const result = pruneFilingDir(filingPath);
    if (result.pruned) {
      prunedCount += 1;
      beforeBytes += result.before;
      afterBytes += result.after;
      perFiling.push({ path: filingPath, before: result.before, after: result.after });
    }
  }

  return { prunedCount, beforeBytes, afterBytes, perFiling };
}

function dirSize(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      total += dirSize(full);
    } else {
      total += readFileSync(full).length;
    }
  }
  return total;
}

function main(): void {
  const summary = pruneCorpus();
  const totalBytes = listFilingDirs().reduce((sum, filingPath) => sum + dirSize(filingPath), 0);

  process.stdout.write(
    `prune-corpus: filings=${summary.prunedCount} rawBeforeMB=${(summary.beforeBytes / 1024 / 1024).toFixed(2)} rawAfterMB=${(summary.afterBytes / 1024 / 1024).toFixed(2)} corpusMB=${(totalBytes / 1024 / 1024).toFixed(2)}\n`,
  );
  if (totalBytes > 100 * 1024 * 1024) {
    process.exit(1);
  }
}

main();
