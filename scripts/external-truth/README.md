# External Truth Scripts (Phase G7)

| Script | Role |
| --- | --- |
| `fetch-edgar.ts` | SEC EDGAR submissions + company facts (rate-limited) |
| `fetch-irs990.ts` | IRS 990 e-file fetcher |
| `extract-xbrl.ts` | XBRL / company-facts JSON → `extracted.json` |
| `extract-990.ts` | 990 XML → structured JSON |
| `validator.ts` | Three-tier validation (structural, numeric, narrative) |
| `types.ts` | Shared corpus + gap-register types |
| `utils.ts` | SHA-256, rate limiter, path helpers |

Orchestrator: `scripts/external-truth-runner.ts` (+ `run-external-truth.js` cascade wrapper).
