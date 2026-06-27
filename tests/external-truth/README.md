# External Truth Filing Corpus (Phase G7)

Machine-readable copies of public filings and synthesized DCAA samples used to validate
disclosure-router outputs against real-world anchors.

## Layout

```
tests/external-truth/filings/
  <vertical>/
    us-gaap/<filing-id>/
    ifrs/<filing-id>/
    dcaa-synthesized/          # GovCon only (G7-C4)
  crossover/                   # G7-C7 population
```

Vertical keys: `saas`, `rtl`, `hc`, `npo`, `mfg`, `con`, `gc`, `ps`, `fa`.

## Per-filing artifacts

| File | Purpose |
| --- | --- |
| `source.json` | Provenance: URL, fetched-at ISO timestamp, SHA-256, license terms, optional `synthesized` flag |
| `raw/` | Verbatim source payload (EDGAR index, 990 XML, manual archive excerpt) |
| `extracted.json` | Normalized facts parsed from raw (XBRL / 990 / manual) |
| `expected.json` | Golden expected disclosure-router output for this filing |

## `source.json` schema (v1.0)

```json
{
  "schemaVersion": "1.0.0",
  "filingId": "CRM-10k-2024",
  "vertical": "saas",
  "framework": "us-gaap",
  "formType": "10-K",
  "sourceUrl": "https://data.sec.gov/...",
  "fetchedAt": "2026-06-27T00:00:00.000Z",
  "sha256": "<hex>",
  "licenseTerms": "SEC EDGAR — public domain (17 CFR §200.80)",
  "synthesized": false,
  "manualArchive": false,
  "notes": ""
}
```

## Validation

Run `pnpm external-truth` (or `npx tsx scripts/external-truth-runner.ts`) to validate all
filings and append gaps to `reports/g7-gap-register.json`.
