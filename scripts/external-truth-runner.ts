/**
 * Phase G7 — external-truth orchestrator.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { G7_EDGAR_MANIFEST, ingestEdgarManifest } from "./external-truth/fetch-edgar";
import { G7_IRS990_MANIFEST, ingestIrs990Manifest } from "./external-truth/fetch-irs990";
import { ingestAllManualArchives } from "./external-truth/manual-archive";
import { ingestDcaaSamples } from "./external-truth/dcaa-synthesized";
import { extractFilingDir } from "./external-truth/extract-xbrl";
import { writeExpected } from "./external-truth/generate-expected";
import type {
  ExternalTruthVertical,
  GapRegister,
  MissingCorpus,
  MissingCorpusEntry,
} from "./external-truth/types";
import {
  GAP_REGISTER_PATH,
  MISSING_CORPUS_PATH,
  listFilingDirs,
  readJson,
  writeJson,
} from "./external-truth/utils";
import { validateAllFilings } from "./external-truth/validator";

interface CliOptions {
  vertical: ExternalTruthVertical | null;
  crossover: boolean;
  triageCheck: boolean;
  ingest: boolean;
  validate: boolean;
}

function parseCli(argv: string[]): CliOptions {
  const options: CliOptions = {
    vertical: null,
    crossover: false,
    triageCheck: false,
    ingest: true,
    validate: true,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--vertical" && argv[i + 1]) {
      options.vertical = argv[i + 1] as ExternalTruthVertical;
      i += 1;
      continue;
    }
    if (arg === "--crossover") {
      options.crossover = true;
      continue;
    }
    if (arg === "--triage-check") {
      options.triageCheck = true;
      continue;
    }
    if (arg === "--ingest-only") {
      options.validate = false;
      continue;
    }
    if (arg === "--validate-only") {
      options.ingest = false;
      continue;
    }
  }
  return options;
}

function loadGapRegister(): GapRegister {
  if (!existsSync(GAP_REGISTER_PATH)) {
    return { version: "1.0.0", schemaVersion: "1.2.0", gaps: [] };
  }
  return readJson<GapRegister>(GAP_REGISTER_PATH);
}

function loadMissingCorpus(): MissingCorpus {
  if (!existsSync(MISSING_CORPUS_PATH)) {
    return { version: "1.0.0", missing: [] };
  }
  return readJson<MissingCorpus>(MISSING_CORPUS_PATH);
}

function recordMissing(
  corpus: MissingCorpus,
  entry: MissingCorpusEntry,
): void {
  corpus.missing.push(entry);
  writeJson(MISSING_CORPUS_PATH, corpus);
}

async function runIngest(
  vertical: ExternalTruthVertical | null,
  missing: MissingCorpus,
): Promise<void> {
  const edgar = await ingestEdgarManifest(vertical);
  for (const result of edgar) {
    if (!result.ok) {
      const entry = G7_EDGAR_MANIFEST.find((e) => e.filingId === result.filingId);
      recordMissing(missing, {
        vertical: entry?.vertical ?? vertical ?? "saas",
        framework: entry?.framework ?? "us-gaap",
        filingId: result.filingId,
        reason: result.error ?? "EDGAR ingest failed",
        attemptedAt: new Date().toISOString(),
      });
    }
  }

  const irs = await ingestIrs990Manifest(vertical);
  for (const result of irs) {
    if (!result.ok) {
      const entry = G7_IRS990_MANIFEST.find((e) => e.filingId === result.filingId);
      recordMissing(missing, {
        vertical: entry?.vertical ?? "npo",
        framework: entry?.framework ?? "us-gaap",
        filingId: result.filingId,
        reason: result.error ?? "IRS 990 ingest failed",
        attemptedAt: new Date().toISOString(),
      });
    }
  }

  if (!vertical || vertical === "gc") {
    ingestDcaaSamples();
  }

  if (!vertical) {
    ingestAllManualArchives(null);
  } else {
    ingestAllManualArchives(vertical);
  }
}

function runExtractAndExpected(filingPaths: string[]): void {
  for (const path of filingPaths) {
    let extracted = extractFilingDir(path);
    if (!extracted && existsSync(join(path, "extracted.json"))) {
      extracted = JSON.parse(readFileSync(join(path, "extracted.json"), "utf8"));
    }
    if (extracted) {
      writeExpected(path, extracted);
    }
  }
}

function runValidate(register: GapRegister, filingPaths: string[]): number {
  register.gaps = [];
  const results = validateAllFilings(filingPaths, register);
  writeJson(GAP_REGISTER_PATH, register);
  return results.filter((r) => !r.passed).length;
}

async function main(): Promise<void> {
  const options = parseCli(process.argv.slice(2));
  const missing = loadMissingCorpus();
  const register = loadGapRegister();

  if (options.ingest) {
    await runIngest(options.vertical, missing);
  }

  const filingPaths = listFilingDirs().filter((path) => {
    if (options.crossover) {
      return path.includes(`${join("filings", "crossover")}`);
    }
    if (options.vertical) {
      return path.includes(`${join("filings", options.vertical)}`);
    }
    return !path.includes(`${join("filings", "crossover")}`);
  });

  if (options.validate) {
    runExtractAndExpected(filingPaths);
    const failed = runValidate(register, filingPaths);
    if (options.triageCheck) {
      const untriaged = register.gaps.filter((gap) => gap.triage === null);
      if (untriaged.length > 0) {
        process.stdout.write(`external-truth: ${untriaged.length} gaps await triage\n`);
        process.exit(1);
      }
    }
    process.stdout.write(
      `external-truth: filings=${filingPaths.length} failed=${failed} gaps=${register.gaps.length} missing=${missing.missing.length}\n`,
    );
    process.exit(failed > 0 ? 1 : 0);
  }

  process.stdout.write(`external-truth: ingest complete; filings=${filingPaths.length}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
