/**
 * Phase G7 — IRS 990 fetch-only (public e-file index).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ExternalTruthVertical, FilingManifestEntry } from "./types";
import { extract990FilingDir, extract990Payload } from "./extract-990";
import {
  RateLimiter,
  ensureDir,
  fetchWithRetry,
  filingDir,
  sha256Hex,
  writeJson,
} from "./utils";

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

  return extract990FilingDir(dir);
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

/** Re-export for validator/tests that need payload shape without fetch. */
export { extract990Payload };
