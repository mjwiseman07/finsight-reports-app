/**
 * Phase G7 — IRS 990 fetch + extract (public e-file index).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExternalTruthVertical, FilingManifestEntry, NumericFact } from "./types";
import {
  RateLimiter,
  ensureDir,
  fetchWithRetry,
  filingDir,
  sha256Hex,
  writeJson,
} from "./utils";
import { extractFromManualJson } from "./extract-xbrl";
import { writeExpected } from "./generate-expected";

const limiter = new RateLimiter(150);

/** Public IRS 990 index XML (ProPublica mirror of IRS EO BMF data). */
const PROPUBLICA_ORG_URL = "https://projects.propublica.org/nonprofits/api/v2/organizations";

interface Irs990ManifestEntry extends FilingManifestEntry {
  ein: string;
}

export const G7_IRS990_MANIFEST: Irs990ManifestEntry[] = [
  { vertical: "npo", framework: "us-gaap", filingId: "ARC-990", ein: "530196605", formType: "990" },
  { vertical: "npo", framework: "us-gaap", filingId: "HABITAT-990", ein: "911914868", formType: "990" },
  { vertical: "npo", framework: "us-gaap", filingId: "GOODWILL-990", ein: "530196597", formType: "990" },
  { vertical: "npo", framework: "us-gaap", filingId: "SALVATION-ARMY-990", ein: "135562351", formType: "990" },
];

export async function fetchIrs990Organization(ein: string): Promise<unknown> {
  const url = `${PROPUBLICA_ORG_URL}/${ein}.json`;
  const response = await fetchWithRetry(url, limiter, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`IRS 990 org fetch ${response.status} for EIN ${ein}`);
  }
  return response.json();
}

export function extract990Payload(
  orgJson: Record<string, unknown>,
  entry: Irs990ManifestEntry,
): { numericFacts: NumericFact[]; narrativeSnippets: string[]; entityName: string } {
  const org = (orgJson.organization ?? orgJson) as Record<string, unknown>;
  const filings = (orgJson.filings_with_data ?? orgJson.filings ?? []) as Array<Record<string, unknown>>;
  const latest = filings[0] ?? {};
  const revenue = Number(latest.totrevenue ?? latest.total_revenue ?? 0);
  const assets = Number(latest.totassetsend ?? latest.total_assets ?? 0);
  const entityName = String(org.name ?? org.organization_name ?? entry.filingId);

  const numericFacts: NumericFact[] = [];
  if (Number.isFinite(revenue) && revenue > 0) {
    numericFacts.push({
      tag: "totrevenue",
      label: "Total revenue",
      value: revenue,
      unit: "USD",
      periodEnd: String(latest.tax_prd_yr ?? latest.tax_prd ?? ""),
    });
  }
  if (Number.isFinite(assets) && assets > 0) {
    numericFacts.push({
      tag: "totassetsend",
      label: "Total assets (EOY)",
      value: assets,
      unit: "USD",
      periodEnd: String(latest.tax_prd_yr ?? latest.tax_prd ?? ""),
    });
  }

  return {
    entityName,
    numericFacts,
    narrativeSnippets: [String(org.mission ?? org.ntee_code ?? "nonprofit operating charity")],
  };
}

export async function ingestIrs990Filing(entry: Irs990ManifestEntry): Promise<boolean> {
  const orgJson = (await fetchIrs990Organization(entry.ein)) as Record<string, unknown>;
  const dir = filingDir(entry.vertical, entry.framework, entry.filingId);
  const rawDir = join(dir, "raw");
  ensureDir(rawDir);
  const rawPayload = JSON.stringify(orgJson, null, 2);
  writeFileSync(join(rawDir, "organization.json"), rawPayload, "utf8");

  const sourceUrl = `${PROPUBLICA_ORG_URL}/${entry.ein}.json`;
  writeJson(join(dir, "source.json"), {
    schemaVersion: "1.0.0",
    filingId: entry.filingId,
    vertical: entry.vertical,
    framework: entry.framework,
    formType: entry.formType,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    sha256: sha256Hex(rawPayload),
    licenseTerms: "IRS Form 990 public disclosure + ProPublica Nonprofit Explorer API (research use)",
    synthesized: false,
    manualArchive: false,
    notes: `ein=${entry.ein}`,
  });

  const extractedBits = extract990Payload(orgJson, entry);
  const extracted = extractFromManualJson(dir, {
    filingId: entry.filingId,
    vertical: entry.vertical,
    framework: entry.framework,
    formType: entry.formType,
    entityName: extractedBits.entityName,
    numericFacts: extractedBits.numericFacts,
    narrativeSnippets: extractedBits.narrativeSnippets,
  });
  writeExpected(dir, extracted);
  return true;
}

export async function ingestIrs990Manifest(
  vertical: ExternalTruthVertical | null,
): Promise<Array<{ filingId: string; ok: boolean; error?: string }>> {
  const entries = G7_IRS990_MANIFEST.filter((e) => !vertical || e.vertical === vertical);
  const results: Array<{ filingId: string; ok: boolean; error?: string }> = [];
  for (const entry of entries) {
    try {
      await ingestIrs990Filing(entry);
      results.push({ filingId: entry.filingId, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ filingId: entry.filingId, ok: false, error: message });
    }
  }
  return results;
}
