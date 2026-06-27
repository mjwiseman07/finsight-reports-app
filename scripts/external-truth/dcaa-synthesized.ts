/**
 * Phase G7 — synthesized DCAA samples (public methodology anchors).
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { NumericFact } from "./types";
import { ensureDir, FILINGS_ROOT, sha256Hex, writeJson } from "./utils";
import { extractFromManualJson } from "./extract-xbrl";
import { writeExpected } from "./generate-expected";

interface DcaaSample {
  filingId: string;
  scenario: string;
  methodologyUrl: string;
  notes: string;
  numericFacts: NumericFact[];
  narrativeSnippets: string[];
}

const DCAA_SAMPLES: DcaaSample[] = [
  {
    filingId: "DCAA-CAS410-GNA",
    scenario: "CAS 410 allocation of G&A expense pools",
    methodologyUrl: "https://www.acquisition.gov/dfars/252.242-7006-Accounting-system-criteria.",
    notes: "Synthesized from public FAR 31.203 + CAS 410 criteria; USAspending award anchors",
    numericFacts: [
      { tag: "ga-pool-total", label: "G&A pool base", value: 12_500_000, unit: "USD", periodEnd: "2025-12-31" },
      { tag: "allocation-base", label: "CAS 410 allocation base", value: 48_000_000, unit: "USD", periodEnd: "2025-12-31" },
    ],
    narrativeSnippets: ["CAS 410 G&A allocation base per public DoD cost principles"],
  },
  {
    filingId: "DCAA-CAS418-OVERHEAD",
    scenario: "CAS 418 allocation of indirect costs",
    methodologyUrl: "https://www.dcaa.mil/Portals/88/CAS_418.pdf",
    notes: "Synthesized DCAA CAS 418 indirect cost allocation scenario",
    numericFacts: [
      { tag: "indirect-pool", label: "Indirect cost pool", value: 8_200_000, unit: "USD", periodEnd: "2025-12-31" },
      { tag: "allocation-rate", label: "Provisional indirect rate", value: 0.142, unit: "rate", periodEnd: "2025-12-31" },
    ],
    narrativeSnippets: ["CAS 418 indirect cost allocation per DCAA guidance"],
  },
  {
    filingId: "DCAA-FAR31205-52",
    scenario: "FAR 31.205-52 depreciation",
    methodologyUrl: "https://www.acquisition.gov/far/subpart-31.2",
    notes: "Synthesized FAR 31.205-52 depreciation allowability check",
    numericFacts: [
      { tag: "depreciation-expense", label: "Depreciation expense tested", value: 1_150_000, unit: "USD", periodEnd: "2025-12-31" },
    ],
    narrativeSnippets: ["FAR 31.205-52 depreciation allowability"],
  },
];

export function ingestDcaaSamples(): Array<{ filingId: string; ok: boolean }> {
  const results: Array<{ filingId: string; ok: boolean }> = [];
  for (const sample of DCAA_SAMPLES) {
    const dir = join(FILINGS_ROOT, "gc", "dcaa-synthesized", sample.filingId);
    const rawDir = join(dir, "raw");
    ensureDir(rawDir);
    const payload = JSON.stringify(sample, null, 2);
    writeFileSync(join(rawDir, "synthesized.json"), payload, "utf8");

    writeJson(join(dir, "source.json"), {
      schemaVersion: "1.0.0",
      filingId: sample.filingId,
      vertical: "gc",
      framework: "us-gaap",
      formType: "DCAA-SYNTH",
      sourceUrl: sample.methodologyUrl,
      fetchedAt: new Date().toISOString(),
      sha256: sha256Hex(payload),
      licenseTerms: "Synthesized from public FAR/CAS/DCAA guidance + USAspending public data",
      synthesized: true,
      manualArchive: false,
      notes: sample.notes,
    });

    const extracted = extractFromManualJson(dir, {
      filingId: sample.filingId,
      vertical: "gc",
      framework: "us-gaap",
      formType: "DCAA-SYNTH",
      entityName: `Synthesized DCAA Sample — ${sample.scenario}`,
      numericFacts: sample.numericFacts,
      narrativeSnippets: sample.narrativeSnippets,
    });
    writeExpected(dir, extracted);
    results.push({ filingId: sample.filingId, ok: true });
  }
  return results;
}
