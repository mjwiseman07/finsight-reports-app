/**
 * Phase G7 — SEC EDGAR fetcher (submissions + company facts).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExternalTruthVertical, FilingManifestEntry, ReportingFramework } from "./types";
import {
  RateLimiter,
  ensureDir,
  fetchWithRetry,
  filingDir,
  padCik,
  sha256Hex,
  writeJson,
} from "./utils";
import { extractFilingDir, extractFromManualJson } from "./extract-xbrl";
import { writeExpected } from "./generate-expected";

const TICKER_CIK: Record<string, string> = {
  CRM: "0001108524",
  NOW: "0001373715",
  ADBE: "0000796343",
  SHOP: "0001594805",
  SAP: "0001000184",
  WMT: "0000104169",
  COST: "0000909832",
  TGT: "0000027419",
  HCA: "0000860730",
  UHS: "0000352915",
  CVS: "0000064803",
  THC: "0000070318",
  FLR: "0001124198",
  PWR: "0001050915",
  GVA: "0000866273",
  MTZ: "0000019617",
  GE: "0000040545",
  CAT: "0000018230",
  HON: "0000773840",
  ETN: "0001551182",
  LMT: "0000936468",
  RTX: "0000101829",
  GD: "0000040533",
  NOC: "0001133421",
  ACN: "0001467373",
  KFY: "0000056679",
  FCN: "0000887936",
};

const limiter = new RateLimiter(100);

interface EdgarSubmissions {
  name: string;
  cik: string;
  tickers?: string[];
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
    };
  };
}

export function resolveCik(ticker: string): string | null {
  return TICKER_CIK[ticker.toUpperCase()] ?? null;
}

export async function fetchSubmissions(cik: string): Promise<EdgarSubmissions> {
  const padded = padCik(cik);
  const url = `https://data.sec.gov/submissions/CIK${padded}.json`;
  const response = await fetchWithRetry(url, limiter);
  if (!response.ok) {
    throw new Error(`EDGAR submissions ${response.status} for CIK ${padded}`);
  }
  return (await response.json()) as EdgarSubmissions;
}

export async function fetchCompanyFacts(cik: string): Promise<unknown> {
  const padded = padCik(cik);
  const url = `https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`;
  const response = await fetchWithRetry(url, limiter);
  if (!response.ok) {
    throw new Error(`EDGAR companyfacts ${response.status} for CIK ${padded}`);
  }
  return response.json();
}

export function findLatestAnnualForm(
  submissions: EdgarSubmissions,
  forms: string[],
): { form: string; filingDate: string; accessionNumber: string; primaryDocument: string } | null {
  const recent = submissions.filings.recent;
  for (let i = 0; i < recent.form.length; i += 1) {
    const form = recent.form[i];
    if (forms.includes(form)) {
      return {
        form,
        filingDate: recent.filingDate[i] ?? "",
        accessionNumber: recent.accessionNumber[i] ?? "",
        primaryDocument: recent.primaryDocument[i] ?? "",
      };
    }
  }
  return null;
}

export async function ingestEdgarFiling(entry: FilingManifestEntry): Promise<boolean> {
  const cik = entry.cik ?? (entry.ticker ? resolveCik(entry.ticker) : null);
  if (!cik) {
    throw new Error(`Unknown CIK for filing ${entry.filingId}`);
  }

  const submissions = await fetchSubmissions(cik);
  const formCandidates =
    entry.formType === "N-CSR"
      ? ["N-CSR", "N-CSRS", "NT-NCSR"]
      : entry.formType === "N-Q"
        ? ["N-Q", "N-CSR"]
        : [entry.formType];
  const latest = findLatestAnnualForm(submissions, formCandidates);
  if (!latest) {
    throw new Error(`No ${entry.formType} found for ${entry.ticker}`);
  }

  const facts = await fetchCompanyFacts(cik).catch(() => null);
  const dir = filingDir(entry.vertical, entry.framework, entry.filingId);
  const rawDir = join(dir, "raw");
  ensureDir(rawDir);

  const submissionsPayload = JSON.stringify(submissions, null, 2);
  const factsPayload = facts ? JSON.stringify(facts, null, 2) : "{}";
  writeFileSync(join(rawDir, "submissions.json"), submissionsPayload, "utf8");
  if (facts) {
    writeFileSync(join(rawDir, "companyfacts.json"), factsPayload, "utf8");
  }

  const sourceUrl = `https://data.sec.gov/submissions/CIK${padCik(cik)}.json`;
  const sha256 = sha256Hex(`${submissionsPayload}\n${factsPayload}`);

  writeJson(join(dir, "source.json"), {
    schemaVersion: "1.0.0",
    filingId: entry.filingId,
    vertical: entry.vertical,
    framework: entry.framework,
    formType: latest.form,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    sha256,
    licenseTerms: "SEC EDGAR — public domain (17 CFR §200.80)",
    synthesized: entry.synthesized ?? false,
    manualArchive: false,
    notes: `accession=${latest.accessionNumber}; filingDate=${latest.filingDate}; ticker=${entry.ticker ?? "n/a"}`,
  });

  const extracted = extractFilingDir(dir);
  if (extracted) {
    writeExpected(dir, extracted);
  } else if (!facts) {
    const manualExtracted = extractFromManualJson(dir, {
      filingId: entry.filingId,
      vertical: entry.vertical,
      framework: entry.framework,
      formType: latest.form,
      entityName: submissions.name,
      numericFacts: [],
      narrativeSnippets: [`${submissions.name} ${latest.form} filed ${latest.filingDate}`],
    });
    writeExpected(dir, manualExtracted);
  }

  return true;
}

export const G7_EDGAR_MANIFEST: FilingManifestEntry[] = [
  { vertical: "saas", framework: "us-gaap", filingId: "CRM-10k", ticker: "CRM", formType: "10-K" },
  { vertical: "saas", framework: "us-gaap", filingId: "NOW-10k", ticker: "NOW", formType: "10-K" },
  { vertical: "saas", framework: "us-gaap", filingId: "ADBE-10k", ticker: "ADBE", formType: "10-K" },
  { vertical: "saas", framework: "us-gaap", filingId: "SHOP-10k", ticker: "SHOP", formType: "10-K" },
  { vertical: "rtl", framework: "us-gaap", filingId: "WMT-10k", ticker: "WMT", formType: "10-K" },
  { vertical: "rtl", framework: "us-gaap", filingId: "COST-10k", ticker: "COST", formType: "10-K" },
  { vertical: "rtl", framework: "us-gaap", filingId: "TGT-10k", ticker: "TGT", formType: "10-K" },
  { vertical: "hc", framework: "us-gaap", filingId: "HCA-10k", ticker: "HCA", formType: "10-K" },
  { vertical: "hc", framework: "us-gaap", filingId: "UHS-10k", ticker: "UHS", formType: "10-K" },
  { vertical: "hc", framework: "us-gaap", filingId: "CVS-10k", ticker: "CVS", formType: "10-K" },
  { vertical: "hc", framework: "us-gaap", filingId: "THC-10k", ticker: "THC", formType: "10-K" },
  { vertical: "mfg", framework: "us-gaap", filingId: "GE-10k", ticker: "GE", formType: "10-K" },
  { vertical: "mfg", framework: "us-gaap", filingId: "CAT-10k", ticker: "CAT", formType: "10-K" },
  { vertical: "mfg", framework: "us-gaap", filingId: "HON-10k", ticker: "HON", formType: "10-K" },
  { vertical: "mfg", framework: "us-gaap", filingId: "ETN-10k", ticker: "ETN", formType: "10-K" },
  { vertical: "con", framework: "us-gaap", filingId: "FLR-10k", ticker: "FLR", formType: "10-K" },
  { vertical: "con", framework: "us-gaap", filingId: "PWR-10k", ticker: "PWR", formType: "10-K" },
  { vertical: "con", framework: "us-gaap", filingId: "GVA-10k", ticker: "GVA", formType: "10-K" },
  { vertical: "con", framework: "us-gaap", filingId: "MTZ-10k", ticker: "MTZ", formType: "10-K" },
  { vertical: "gc", framework: "us-gaap", filingId: "LMT-10k", ticker: "LMT", formType: "10-K" },
  { vertical: "gc", framework: "us-gaap", filingId: "RTX-10k", ticker: "RTX", formType: "10-K" },
  { vertical: "gc", framework: "us-gaap", filingId: "GD-10k", ticker: "GD", formType: "10-K" },
  { vertical: "gc", framework: "us-gaap", filingId: "NOC-10k", ticker: "NOC", formType: "10-K" },
  { vertical: "ps", framework: "us-gaap", filingId: "ACN-10k", ticker: "ACN", formType: "10-K" },
  { vertical: "ps", framework: "us-gaap", filingId: "KFY-10k", ticker: "KFY", formType: "10-K" },
  { vertical: "ps", framework: "us-gaap", filingId: "FCN-10k", ticker: "FCN", formType: "10-K" },
  { vertical: "saas", framework: "ifrs", filingId: "SAP-20f", ticker: "SAP", formType: "20-F" },
  { vertical: "fa", framework: "us-gaap", filingId: "VFIAX-NCSR", ticker: "VFINX", cik: "0000036405", formType: "N-CSR" },
  { vertical: "fa", framework: "us-gaap", filingId: "SPY-NQ", ticker: "SPY", cik: "0000884394", formType: "N-Q" },
  { vertical: "fa", framework: "us-gaap", filingId: "FXAIX-NCSR", ticker: "FXAIX", cik: "0000035341", formType: "N-CSR" },
  { vertical: "fa", framework: "us-gaap", filingId: "IVV-NCSR", ticker: "IVV", cik: "0001100663", formType: "N-CSR" },
];

export async function ingestEdgarManifest(
  vertical: ExternalTruthVertical | null,
): Promise<Array<{ filingId: string; ok: boolean; error?: string }>> {
  const entries = G7_EDGAR_MANIFEST.filter((e) => !vertical || e.vertical === vertical);
  const results: Array<{ filingId: string; ok: boolean; error?: string }> = [];
  for (const entry of entries) {
    try {
      await ingestEdgarFiling(entry);
      results.push({ filingId: entry.filingId, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ filingId: entry.filingId, ok: false, error: message });
    }
  }
  return results;
}
