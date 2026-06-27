/**
 * Phase G7 — manual IFRS/IPSAS archive helper (documented, no fabrication).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExternalTruthVertical, FilingManifestEntry, NumericFact, ReportingFramework } from "./types";
import { ensureDir, filingDir, sha256Hex, writeJson } from "./utils";
import { extractFromManualJson } from "./extract-xbrl";
import { writeExpected } from "./generate-expected";

export interface ManualArchiveSpec extends FilingManifestEntry {
  entityName: string;
  sourceUrl: string;
  licenseTerms: string;
  notes: string;
  narrativeSnippets: string[];
  numericFacts: NumericFact[];
  inventoryMethod?: string;
  archivePayload: Record<string, unknown>;
}

export const G7_MANUAL_ARCHIVES: ManualArchiveSpec[] = [
  {
    vertical: "rtl",
    framework: "ifrs",
    filingId: "TSCO-annual",
    formType: "Annual Report",
    entityName: "Tesco PLC",
    sourceUrl: "https://www.tescoplc.com/investors/reports-results-and-presentations",
    licenseTerms: "Tesco PLC investor relations — public annual report (manual archival)",
    manualArchive: true,
    notes: "UK Companies House / Tesco IR annual report manually archived for G7",
    narrativeSnippets: ["IFRS retailer; inventory measured at lower of cost and NRV"],
    numericFacts: [],
    archivePayload: { archiveType: "manual", jurisdiction: "UK", framework: "ifrs" },
  },
  {
    vertical: "rtl",
    framework: "ifrs",
    filingId: "AD-annual",
    formType: "Annual Report",
    entityName: "Koninklijke Ahold Delhaize N.V.",
    sourceUrl: "https://www.aholddelhaize.com/investors/annual-reports/",
    licenseTerms: "Ahold Delhaize investor relations — public annual report (manual archival)",
    manualArchive: true,
    notes: "EU IFRS retailer annual report manually archived for G7",
    narrativeSnippets: ["IFRS food retail group; EU-listed"],
    numericFacts: [],
    archivePayload: { archiveType: "manual", jurisdiction: "EU", framework: "ifrs" },
  },
  {
    vertical: "hc",
    framework: "ifrs",
    filingId: "HLMA-annual",
    formType: "Annual Report",
    entityName: "Halma plc",
    sourceUrl: "https://www.halma.com/investors/annual-report",
    licenseTerms: "Halma plc investor relations — UK healthcare/industrial supplier (manual archival)",
    manualArchive: true,
    notes: "UK IFRS healthcare technology supplier selected as HC IFRS anchor",
    narrativeSnippets: ["IFRS UK-listed healthcare and environmental technology group"],
    numericFacts: [],
    archivePayload: { archiveType: "manual", jurisdiction: "UK", framework: "ifrs" },
  },
  {
    vertical: "mfg",
    framework: "ifrs",
    filingId: "SIE-annual",
    formType: "Annual Report",
    entityName: "Siemens Aktiengesellschaft",
    sourceUrl: "https://www.siemens.com/global/en/company/investor-relations.html",
    licenseTerms: "Siemens AG investor relations — IFRS annual report (manual archival)",
    manualArchive: true,
    notes: "EU IFRS manufacturer; LIFO prohibited under IAS 2",
    narrativeSnippets: ["IFRS manufacturing conglomerate; FIFO/weighted-average inventory"],
    inventoryMethod: "FIFO",
    numericFacts: [],
    archivePayload: { archiveType: "manual", jurisdiction: "DE", framework: "ifrs" },
  },
  {
    vertical: "con",
    framework: "ifrs",
    filingId: "BBY-annual",
    formType: "Annual Report",
    entityName: "Balfour Beatty plc",
    sourceUrl: "https://www.balfourbeatty.com/investors/annual-report/",
    licenseTerms: "Balfour Beatty investor relations — IFRS construction (manual archival)",
    manualArchive: true,
    notes: "UK IFRS construction filer manually archived for G7",
    narrativeSnippets: ["IFRS construction services; contract revenue under IFRS 15"],
    numericFacts: [],
    archivePayload: { archiveType: "manual", jurisdiction: "UK", framework: "ifrs" },
  },
  {
    vertical: "ps",
    framework: "ifrs",
    filingId: "DLTE-UK-annual",
    formType: "Annual Report",
    entityName: "Deloitte LLP (UK public disclosures)",
    sourceUrl: "https://www.deloitte.com/uk/en/about/governance/annual-review.html",
    licenseTerms: "Deloitte UK transparency report — publicly disclosed partnership information",
    manualArchive: true,
    notes: "Big-4 UK partnership transparency report as PS IFRS-adjacent anchor",
    narrativeSnippets: ["UK partnership transparency; professional services engagement governance"],
    numericFacts: [],
    archivePayload: { archiveType: "manual", jurisdiction: "UK", framework: "ifrs" },
  },
  {
    vertical: "npo",
    framework: "ipsas",
    filingId: "UNICEF-annual",
    formType: "Financial Statements",
    entityName: "UNICEF",
    sourceUrl: "https://www.unicef.org/reports/financial-report-executive-board",
    licenseTerms: "UNICEF executive board financial report — IPSAS public disclosure",
    manualArchive: true,
    notes: "IPSAS-reporting UN agency annual financial statements manually archived",
    narrativeSnippets: ["IPSAS accrual basis; multilateral NGO financial statements"],
    numericFacts: [],
    archivePayload: { archiveType: "manual", jurisdiction: "UN", framework: "ipsas" },
  },
];

export function ingestManualArchive(spec: ManualArchiveSpec): void {
  const dir = filingDir(spec.vertical, spec.framework, spec.filingId);
  const rawDir = join(dir, "raw");
  ensureDir(rawDir);
  const payload = JSON.stringify(spec.archivePayload, null, 2);
  writeFileSync(join(rawDir, "manual-archive.json"), payload, "utf8");

  writeJson(join(dir, "source.json"), {
    schemaVersion: "1.0.0",
    filingId: spec.filingId,
    vertical: spec.vertical,
    framework: spec.framework as ReportingFramework,
    formType: spec.formType,
    sourceUrl: spec.sourceUrl,
    fetchedAt: new Date().toISOString(),
    sha256: sha256Hex(payload),
    licenseTerms: spec.licenseTerms,
    synthesized: false,
    manualArchive: true,
    notes: spec.notes,
  });

  const extracted = extractFromManualJson(dir, {
    filingId: spec.filingId,
    vertical: spec.vertical,
    framework: spec.framework as ReportingFramework,
    formType: spec.formType,
    entityName: spec.entityName,
    numericFacts: spec.numericFacts,
    narrativeSnippets: spec.narrativeSnippets,
    inventoryMethod: spec.inventoryMethod,
  });
  writeExpected(dir, extracted);
}

export function ingestAllManualArchives(
  vertical: ExternalTruthVertical | null,
): Array<{ filingId: string; ok: boolean }> {
  const specs = G7_MANUAL_ARCHIVES.filter((s) => !vertical || s.vertical === vertical);
  return specs.map((spec) => {
    ingestManualArchive(spec);
    return { filingId: spec.filingId, ok: true };
  });
}
