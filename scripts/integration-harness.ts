#!/usr/bin/env node
/**
 * Advisacor Integration Harness v1.0.0 — LOCK-G3
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadScenarios } from "../tests/integration/harness/discover-scenarios";
import { runScenario } from "../tests/integration/harness/scenario-runner";
import type {
  IntegrationHarnessReport,
  ScenarioCategory,
  ScenarioRunReport,
} from "../tests/integration/types";

const HARNESS_VERSION = "1.0.0";
const BUDGET_MS = 300_000;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

interface HarnessCli {
  category: ScenarioCategory | null;
  upstreamPath: string;
  forceKvFailure: string | null;
  skipScenarios: Set<string>;
  onlyScenarios: Set<string>;
  writeJson: boolean;
  jsonPath: string | null;
  help: boolean;
}

function parseCli(argv: string[]): HarnessCli {
  const options: HarnessCli = {
    category: null,
    upstreamPath: join(repoRoot, "reports", "cascade-upstream.json"),
    forceKvFailure: null,
    skipScenarios: new Set(),
    onlyScenarios: new Set(),
    writeJson: true,
    jsonPath: null,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--category":
        i += 1;
        options.category = (argv[i] ?? null) as ScenarioCategory | null;
        break;
      case "--upstream-results":
        i += 1;
        if (argv[i]) options.upstreamPath = resolve(argv[i]);
        break;
      case "--force-kv-failure":
        i += 1;
        options.forceKvFailure = argv[i] ?? null;
        break;
      case "--skip":
        i += 1;
        if (argv[i]) options.skipScenarios.add(argv[i]);
        break;
      case "--only":
        i += 1;
        if (argv[i]) options.onlyScenarios.add(argv[i]);
        break;
      case "--no-json":
        options.writeJson = false;
        break;
      case "--json":
        i += 1;
        options.jsonPath = argv[i] ? resolve(argv[i]) : null;
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`Usage: pnpm test:integration [options]

Options:
  --category <name>           Run one category only
  --upstream-results <path>   cascade-upstream.json (default: reports/cascade-upstream.json)
  --force-kv-failure <stage>  Simulate kv stage failure for dependency testing
  --only <scenario-id>        Repeatable
  --skip <scenario-id>        Repeatable
  --json <path> | --no-json
  --help`);
}

function loadFailedStages(path: string, forceKvFailure: string | null): Set<string> {
  const failed = new Set<string>();
  if (forceKvFailure) {
    failed.add(forceKvFailure);
    return failed;
  }
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as { failedStages?: string[] };
    for (const stage of raw.failedStages ?? []) {
      failed.add(stage);
    }
  } catch {
    // No upstream file — assume all upstream passed
  }
  return failed;
}

function summarize(reports: readonly ScenarioRunReport[]): IntegrationHarnessReport["result"] {
  if (reports.some((r) => r.result === "FAIL")) {
    return "FAIL";
  }
  return "PASS";
}

async function main(): Promise<void> {
  let options: HarnessCli;
  try {
    options = parseCli(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(3);
    return;
  }

  if (options.help) {
    printHelp();
    process.exit(0);
    return;
  }

  if (!options.category) {
    console.error("--category is required");
    process.exit(3);
    return;
  }

  const startedAt = new Date();
  const failedStages = loadFailedStages(options.upstreamPath, options.forceKvFailure);
  const scenarios = await loadScenarios(options.category);

  const filtered = scenarios.filter((scenario) => {
    if (options.onlyScenarios.size > 0 && !options.onlyScenarios.has(scenario.id)) {
      return false;
    }
    return true;
  });

  const reports: ScenarioRunReport[] = [];
  for (const scenario of filtered) {
    const intentionalSkip = options.skipScenarios.has(scenario.id);
    const report = await runScenario(scenario, failedStages, intentionalSkip);
    reports.push(report);
    const status = report.result.padEnd(28, " ");
    console.log(`${report.id} ${status} ${report.durationMs}ms`);
    if (report.result === "FAIL") {
      for (const hint of report.diagnosticHints) {
        console.error(`  hint: ${hint}`);
      }
    }
  }

  const completedAt = new Date();
  const totalDurationMs = completedAt.getTime() - startedAt.getTime();
  const passed = reports.filter((r) => r.result === "PASS").length;
  const failed = reports.filter((r) => r.result === "FAIL").length;
  const notRunDependencyFailed = reports.filter((r) => r.result === "NOT-RUN-DEPENDENCY-FAILED").length;
  const skippedIntentional = reports.filter((r) => r.result === "SKIPPED-INTENTIONAL").length;

  const harnessReport: IntegrationHarnessReport = {
    harnessVersion: HARNESS_VERSION,
    category: options.category,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    totalDurationMs,
    budgetMs: BUDGET_MS,
    budgetUtilizationPct: Math.round((totalDurationMs / BUDGET_MS) * 1000) / 10,
    totalScenarios: reports.length,
    passed,
    failed,
    notRunDependencyFailed,
    skippedIntentional,
    scenarios: reports,
    result: summarize(reports),
  };

  if (options.writeJson) {
    const reportsDir = join(repoRoot, "reports");
    mkdirSync(reportsDir, { recursive: true });
    const jsonPath =
      options.jsonPath ?? join(reportsDir, `integration-${options.category}-${startedAt.toISOString().replace(/[:.]/g, "-")}.json`);
    writeFileSync(jsonPath, `${JSON.stringify(harnessReport, null, 2)}\n`, "utf8");
    console.log(`Report: ${jsonPath}`);
  }

  console.log(
    `Integration ${options.category}: ${passed}/${reports.length} PASS · ${failed} FAIL · ` +
      `${notRunDependencyFailed} DEP-SKIP · ${skippedIntentional} INTENTIONAL-SKIP · ${totalDurationMs}ms`,
  );

  if (totalDurationMs > BUDGET_MS) {
    console.error(`Budget exceeded: ${totalDurationMs}ms > ${BUDGET_MS}ms`);
    process.exit(1);
    return;
  }

  process.exit(harnessReport.result === "PASS" ? 0 : 1);
}

main().catch((error) => {
  console.error("Harness internal error:", error);
  process.exit(3);
});
