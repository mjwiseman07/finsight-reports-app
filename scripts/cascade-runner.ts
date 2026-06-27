/**
 * Advisacor Cascade Runner v1.0.0 — LOCK-G6
 * Single entry point for tsc, verifier, vertical K-V, control, doctrine, audit, lint.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RUNNER = "advisacor-cascade-runner";
const VERSION = "1.1.0";
const EXPECTED_BRANCH = "architecture-lane-refactor-baseline";
const MAX_CAPTURE_BYTES = 1024 * 1024;
const TAIL_LINE_COUNT = 20;
const FAIL_STDERR_LINES = 40;
const MAX_JSON_REPORTS = 10;

type StageResultKind =
  | "PASS"
  | "FAIL"
  | "SKIPPED-INTENTIONAL"
  | "SKIPPED-MISSING-PATH"
  | "NOT-RUN";

type CascadeMode = "fail-fast" | "run-all";

type StageMetrics = Record<string, string | number | boolean>;

interface StageDefinition {
  name: string;
  command: string;
  args: string[];
  requiredPath: string | null;
  advisory?: boolean;
}

interface StageReport {
  name: string;
  command: string;
  startedAt: string;
  durationMs: number;
  exitCode: number | null;
  result: StageResultKind;
  metrics: StageMetrics;
  stdoutTail: string;
  stderrTail: string;
}

interface IntegrationReportBlock {
  totalScenarios: number;
  passed: number;
  failed: number;
  notRunDependencyFailed: number;
  skippedIntentional: number;
  totalDurationMs: number;
  budgetMs: number;
  budgetUtilizationPct: number;
  scenarios: unknown[];
}

interface CascadeReport {
  runner: string;
  version: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  gitSha: string;
  gitBranch: string;
  atlasVersion: string;
  mode: CascadeMode;
  result: "PASS" | "FAIL";
  summary: {
    total: number;
    passed: number;
    failed: number;
    skippedIntentional: number;
    skippedMissingPath: number;
  };
  stages: StageReport[];
  integration?: IntegrationReportBlock;
}

interface CliOptions {
  mode: CascadeMode;
  only: Set<string>;
  skip: Set<string>;
  strictLint: boolean;
  writeJson: boolean;
  jsonPath: string | null;
  quiet: boolean;
  verbose: boolean;
  help: boolean;
}

const STAGES: StageDefinition[] = [
  { name: "tsc", command: "npx", args: ["tsc", "--noEmit"], requiredPath: null },
  {
    name: "verifier",
    command: "npm",
    args: ["run", "verify:phase-42-7f:all"],
    requiredPath: null,
  },
  {
    name: "kv-fa",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/fa"],
    requiredPath: "architecture-lane/k-v-cases/fa",
  },
  {
    name: "kv-hc",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/hc"],
    requiredPath: "architecture-lane/k-v-cases/hc",
  },
  {
    name: "kv-gc",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/gc"],
    requiredPath: "architecture-lane/k-v-cases/gc",
  },
  {
    name: "kv-con",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/con-1"],
    requiredPath: "architecture-lane/k-v-cases/con-1",
  },
  {
    name: "kv-ps",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/ps"],
    requiredPath: "architecture-lane/k-v-cases/ps",
  },
  {
    name: "kv-saas",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/saas"],
    requiredPath: "architecture-lane/k-v-cases/saas",
  },
  {
    name: "kv-npo",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/npo"],
    requiredPath: "architecture-lane/k-v-cases/npo",
  },
  {
    name: "kv-mfg",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/mfg"],
    requiredPath: "architecture-lane/k-v-cases/mfg",
  },
  {
    name: "kv-rtl",
    command: "pnpm",
    args: ["test", "architecture-lane/k-v-cases/rtl"],
    requiredPath: "architecture-lane/k-v-cases/rtl",
  },
  {
    name: "control",
    command: "pnpm",
    args: ["test", "tests/control-layer"],
    requiredPath: "tests/control-layer",
  },
  {
    name: "doctrine",
    command: "pnpm",
    args: ["test", "tests/doctrine"],
    requiredPath: "tests/doctrine",
  },
  {
    name: "audit",
    command: "pnpm",
    args: ["test", "tests/audit"],
    requiredPath: "tests/audit",
  },
  {
    name: "lint",
    command: "pnpm",
    args: ["lint"],
    requiredPath: null,
    advisory: true,
  },
  {
    name: "integration-c1",
    command: "node",
    args: ["scripts/run-integration-harness.js", "--category", "consolidation-non-comingled"],
    requiredPath: "scripts/integration-harness.ts",
  },
  {
    name: "integration-c2",
    command: "node",
    args: ["scripts/run-integration-harness.js", "--category", "audit-channel-routing"],
    requiredPath: "scripts/integration-harness.ts",
  },
  {
    name: "integration-c3",
    command: "node",
    args: ["scripts/run-integration-harness.js", "--category", "disclosure-handoff"],
    requiredPath: "scripts/integration-harness.ts",
  },
  {
    name: "integration-c4",
    command: "node",
    args: ["scripts/run-integration-harness.js", "--category", "panel-decision"],
    requiredPath: "scripts/integration-harness.ts",
  },
  {
    name: "integration-c5",
    command: "node",
    args: ["scripts/run-integration-harness.js", "--category", "memory-framework"],
    requiredPath: "scripts/integration-harness.ts",
  },
  {
    name: "integration-c6",
    command: "node",
    args: ["scripts/run-integration-harness.js", "--category", "org-standards"],
    requiredPath: "scripts/integration-harness.ts",
  },
  {
    name: "integration-c7",
    command: "node",
    args: ["scripts/run-integration-harness.js", "--category", "registry-change-mgmt"],
    requiredPath: "scripts/integration-harness.ts",
  },
];

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function executableName(command: string): string {
  if (process.platform !== "win32") {
    return command;
  }
  if (command === "pnpm" || command === "npm" || command === "npx") {
    return `${command}.cmd`;
  }
  return command;
}

function resolveInvocation(command: string, args: string[]): { command: string; args: string[] } {
  const node = process.execPath;

  if (command === "npx" && args[0] === "tsc") {
    return {
      command: node,
      args: [join(repoRoot, "node_modules/typescript/bin/tsc"), ...args.slice(1)],
    };
  }

  if (command === "pnpm") {
    if (args[0] === "test") {
      return {
        command: node,
        args: [join(repoRoot, "node_modules/vitest/vitest.mjs"), "run", ...args.slice(1)],
      };
    }
    if (args[0] === "lint") {
      return {
        command: node,
        args: [join(repoRoot, "node_modules/eslint/bin/eslint.js")],
      };
    }
    if (args[0] === "exec" && args[1] === "vitest") {
      return {
        command: node,
        args: [join(repoRoot, "node_modules/vitest/vitest.mjs"), ...args.slice(2)],
      };
    }
  }

  if (command === "tsx") {
    const candidates = [
      join(repoRoot, "node_modules/tsx/dist/cli.mjs"),
      join(repoRoot, "node_modules/tsx/dist/cli.cjs"),
    ];
    const cli = candidates.find((path) => existsSync(path));
    if (cli) {
      return { command: node, args: [cli, ...args] };
    }
    return {
      command: node,
      args: ["--import", "tsx", ...args.map((arg) => (arg.startsWith("scripts/") ? join(repoRoot, arg) : arg))],
    };
  }

  return { command: executableName(command), args };
}

function expandInvocations(
  command: string,
  args: string[],
): Array<{ command: string; args: string[] }> {
  if (command === "npm" && args[0] === "run") {
    const scriptName = args[1];
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    const scriptBody = pkg.scripts?.[scriptName];
    if (!scriptBody) {
      throw new Error(`Missing npm script: ${scriptName}`);
    }
    return scriptBody.split("&&").map((segment) => {
      const trimmed = segment.trim();
      const nodeMatch = /^node\s+(.+)$/.exec(trimmed);
      if (nodeMatch) {
        return {
          command: process.execPath,
          args: nodeMatch[1].split(/\s+/),
        };
      }
      throw new Error(`Unsupported npm script segment: ${trimmed}`);
    });
  }

  return [resolveInvocation(command, args)];
}

function writeUpstreamState(failedStages: readonly string[]): void {
  const reportsDir = join(repoRoot, "reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(
    join(reportsDir, "cascade-upstream.json"),
    `${JSON.stringify({ failedStages, writtenAt: new Date().toISOString() }, null, 2)}\n`,
    "utf8",
  );
}

function aggregateIntegrationReports(): IntegrationReportBlock | undefined {
  const reportsDir = join(repoRoot, "reports");
  if (!existsSync(reportsDir)) {
    return undefined;
  }
  const files = readdirSync(reportsDir)
    .filter((name) => name.startsWith("integration-") && name.endsWith(".json"))
    .map((name) => join(reportsDir, name));
  if (files.length === 0) {
    return undefined;
  }
  let totalScenarios = 0;
  let passed = 0;
  let failed = 0;
  let notRunDependencyFailed = 0;
  let skippedIntentional = 0;
  let totalDurationMs = 0;
  const scenarios: unknown[] = [];
  for (const file of files) {
    try {
      const report = JSON.parse(readFileSync(file, "utf8")) as {
        totalScenarios?: number;
        passed?: number;
        failed?: number;
        notRunDependencyFailed?: number;
        skippedIntentional?: number;
        totalDurationMs?: number;
        scenarios?: unknown[];
      };
      totalScenarios += report.totalScenarios ?? 0;
      passed += report.passed ?? 0;
      failed += report.failed ?? 0;
      notRunDependencyFailed += report.notRunDependencyFailed ?? 0;
      skippedIntentional += report.skippedIntentional ?? 0;
      totalDurationMs += report.totalDurationMs ?? 0;
      if (report.scenarios) {
        scenarios.push(...report.scenarios);
      }
    } catch {
      // ignore malformed integration report
    }
  }
  return {
    totalScenarios,
    passed,
    failed,
    notRunDependencyFailed,
    skippedIntentional,
    totalDurationMs,
    budgetMs: 300_000,
    budgetUtilizationPct: Math.round((totalDurationMs / 300_000) * 1000) / 10,
    scenarios,
  };
}

function readAtlasVersion(): string {
  const atlasPath = join(repoRoot, "Advisacor_Phase_Atlas_v1.md");
  try {
    const header = readFileSync(atlasPath, "utf8").split("\n", 1)[0] ?? "";
    const match = header.match(/v(\d+\.\d+)/);
    return match ? match[1] : "unknown";
  } catch {
    return "unknown";
  }
}

function runGit(args: string[]): string {
  const result = spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    shell: false,
  });
  return (result.stdout ?? "").trim();
}

function parseCli(argv: string[]): CliOptions {
  const options: CliOptions = {
    mode: "fail-fast",
    only: new Set<string>(),
    skip: new Set<string>(),
    strictLint: false,
    writeJson: true,
    jsonPath: null,
    quiet: false,
    verbose: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "--fail-fast":
        options.mode = "fail-fast";
        break;
      case "--run-all":
        options.mode = "run-all";
        break;
      case "--only":
        i += 1;
        if (argv[i]) options.only.add(argv[i]);
        break;
      case "--skip":
        i += 1;
        if (argv[i]) options.skip.add(argv[i]);
        break;
      case "--strict-lint":
        options.strictLint = true;
        break;
      case "--json":
        i += 1;
        options.jsonPath = argv[i] ?? null;
        options.writeJson = true;
        break;
      case "--no-json":
        options.writeJson = false;
        break;
      case "--quiet":
        options.quiet = true;
        break;
      case "--verbose":
        options.verbose = true;
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
  console.log(`Usage: pnpm test:cascade [options]

Options:
  --fail-fast | --run-all       default: --fail-fast
  --only <stage>                repeatable
  --skip <stage>                repeatable
  --strict-lint                 default: lint advisory
  --json <path> | --no-json     default: ./reports/cascade-<ISO8601>.json
  --quiet | --verbose             default: captured + summarized
  --help

Stages: ${STAGES.map((s) => s.name).join(", ")}`);
}

function pathExists(relPath: string): boolean {
  return existsSync(join(repoRoot, relPath));
}

function rollingCapture(buffer: string, chunk: Buffer): string {
  const next = buffer + chunk.toString("utf8");
  if (Buffer.byteLength(next, "utf8") <= MAX_CAPTURE_BYTES) {
    return next;
  }
  const trimmed = next.slice(-MAX_CAPTURE_BYTES);
  const lines = trimmed.split(/\r?\n/);
  return lines.slice(-TAIL_LINE_COUNT).join("\n");
}

function tailLines(text: string, count: number): string {
  const lines = text.split(/\r?\n/);
  return lines.slice(-count).join("\n");
}

function extractMetrics(stageName: string, stdout: string, stderr: string): StageMetrics {
  const combined = `${stdout}\n${stderr}`;
  const metrics: StageMetrics = {};

  if (stageName === "verifier") {
    const meta = combined.match(/meta-verifier passed \((\d+)\/(\d+)/i);
    if (meta) {
      metrics.metaPassed = Number(meta[1]);
      metrics.metaTotal = Number(meta[2]);
    }
    const main = combined.match(/(\d+)\/(\d+) assertions passed/i);
    if (main) {
      metrics.mainPassed = Number(main[1]);
      metrics.mainTotal = Number(main[2]);
    }
  }

  const cases = combined.match(/(\d+)\/(\d+)\s+cases/i);
  if (cases) {
    metrics.casesPassed = Number(cases[1]);
    metrics.casesTotal = Number(cases[2]);
  }

  const vitest = combined.match(/Tests\s+(\d+)\s+passed/i);
  if (vitest) {
    metrics.testsPassed = Number(vitest[1]);
  }

  return metrics;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${(ms / 1000).toFixed(1)}s`;
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
}

function formatMetricsLine(metrics: StageMetrics): string {
  if (
    typeof metrics.metaPassed === "number" &&
    typeof metrics.metaTotal === "number" &&
    typeof metrics.mainPassed === "number" &&
    typeof metrics.mainTotal === "number"
  ) {
    return `Meta ${metrics.metaPassed}/${metrics.metaTotal} · Main ${metrics.mainPassed}/${metrics.mainTotal}`;
  }
  if (
    typeof metrics.casesPassed === "number" &&
    typeof metrics.casesTotal === "number"
  ) {
    return `${metrics.casesPassed}/${metrics.casesTotal} cases`;
  }
  if (typeof metrics.testsPassed === "number") {
    return `${metrics.testsPassed} tests`;
  }
  return "";
}

function defaultJsonPath(startedAt: Date): string {
  const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
  return join(repoRoot, "reports", `cascade-${stamp}.json`);
}

function pruneJsonReports(): void {
  const reportsDir = join(repoRoot, "reports");
  if (!existsSync(reportsDir)) {
    return;
  }
  const files = readdirSync(reportsDir)
    .filter((name) => name.startsWith("cascade-") && name.endsWith(".json"))
    .map((name) => ({
      name,
      path: join(reportsDir, name),
    }));

  const withMtime = files.map((file) => ({
    ...file,
    mtime: statSync(file.path).mtimeMs,
  }));

  withMtime.sort((a, b) => b.mtime - a.mtime);
  for (const file of withMtime.slice(MAX_JSON_REPORTS)) {
    unlinkSync(file.path);
  }
}

function writeReport(path: string, report: CascadeReport): void {
  const reportsDir = join(repoRoot, "reports");
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(path, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  pruneJsonReports();
}

function shouldRunStage(
  stage: StageDefinition,
  options: CliOptions,
): "run" | "skip-intentional" | "skip-filter" {
  if (options.only.size > 0 && !options.only.has(stage.name)) {
    return "skip-filter";
  }
  if (options.skip.has(stage.name)) {
    return "skip-intentional";
  }
  return "run";
}

function resolveStageResult(
  stage: StageDefinition,
  exitCode: number | null,
  strictLint: boolean,
): StageResultKind {
  if (exitCode === 0) {
    return "PASS";
  }
  if (stage.advisory && !strictLint) {
    return "PASS";
  }
  return "FAIL";
}

async function runStage(
  stage: StageDefinition,
  options: CliOptions,
): Promise<StageReport> {
  const startedAt = new Date();
  const commandLine = [stage.command, ...stage.args].join(" ");

  if (stage.requiredPath && !pathExists(stage.requiredPath)) {
    return {
      name: stage.name,
      command: commandLine,
      startedAt: startedAt.toISOString(),
      durationMs: 0,
      exitCode: null,
      result: "SKIPPED-MISSING-PATH",
      metrics: {},
      stdoutTail: "",
      stderrTail: `Required path not found: ${stage.requiredPath}`,
    };
  }

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = 1;

  const invocations = expandInvocations(stage.command, stage.args);

  for (const invocation of invocations) {
    const stepExitCode = await new Promise<number | null>((resolvePromise, rejectPromise) => {
      const child: ChildProcess = spawn(invocation.command, invocation.args, {
        cwd: repoRoot,
        shell: false,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });

      const onSigint = (): void => {
        child.kill("SIGINT");
      };
      process.on("SIGINT", onSigint);

      child.stdout?.on("data", (chunk: Buffer) => {
        stdout = rollingCapture(stdout, chunk);
        if (options.verbose) {
          process.stdout.write(chunk);
        }
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        stderr = rollingCapture(stderr, chunk);
        if (options.verbose) {
          process.stderr.write(chunk);
        }
      });

      child.on("error", (error) => {
        process.removeListener("SIGINT", onSigint);
        rejectPromise(error);
      });

      child.on("close", (code, signal) => {
        process.removeListener("SIGINT", onSigint);
        if (signal === "SIGINT") {
          resolvePromise(130);
        } else {
          resolvePromise(code);
        }
      });
    });

    exitCode = stepExitCode;
    if (stepExitCode !== 0) {
      break;
    }
  }

  const completedAt = new Date();
  const metrics = extractMetrics(stage.name, stdout, stderr);

  return {
    name: stage.name,
    command: commandLine,
    startedAt: startedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    exitCode,
    result: resolveStageResult(stage, exitCode, options.strictLint),
    metrics,
    stdoutTail: tailLines(stdout, TAIL_LINE_COUNT),
    stderrTail: tailLines(stderr, TAIL_LINE_COUNT),
  };
}

function printHeader(gitBranch: string, gitSha: string, atlasVersion: string, mode: CascadeMode): void {
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  Advisacor Cascade Runner v${VERSION}`);
  console.log(`  Branch: ${gitBranch} @ ${gitSha.slice(0, 7)}`);
  console.log(`  Mode: ${mode} | Atlas v${atlasVersion}`);
  console.log("═══════════════════════════════════════════════════════");
  console.log("");
}

function printStageLine(
  index: number,
  total: number,
  stage: StageReport,
  lintExitCode: number | null,
  strictLint: boolean,
): void {
  const label = `[${String(index).padStart(2, " ")}/${total}] ${stage.name.padEnd(20, " ")}`;
  const dots = ".".repeat(Math.max(1, 10 - Math.floor(stage.durationMs / 1000)));
  const duration = formatDuration(stage.durationMs);

  let displayResult = stage.result;
  if (
    stage.result !== "SKIPPED-INTENTIONAL" &&
    stage.result !== "SKIPPED-MISSING-PATH" &&
    stage.name === "lint" &&
    lintExitCode !== 0 &&
    lintExitCode !== null &&
    !strictLint
  ) {
    displayResult = "FAIL";
  }

  const metrics = formatMetricsLine(stage.metrics);
  const metricsSuffix = metrics ? `   ${metrics}` : "";
  console.log(`${label} ${dots.padEnd(10, ".")} ${displayResult.padEnd(5, " ")} ${duration.padStart(6, " ")}${metricsSuffix}`);
}

function computeSummary(stages: StageReport[]): CascadeReport["summary"] {
  return {
    total: stages.length,
    passed: stages.filter((s) => s.result === "PASS").length,
    failed: stages.filter((s) => s.result === "FAIL").length,
    skippedIntentional: stages.filter((s) => s.result === "SKIPPED-INTENTIONAL").length,
    skippedMissingPath: stages.filter((s) => s.result === "SKIPPED-MISSING-PATH").length,
  };
}

function computeOverallResult(
  stages: StageReport[],
  options: CliOptions,
): "PASS" | "FAIL" {
  const hasFail = stages.some((s) => s.result === "FAIL");
  if (hasFail) {
    return "FAIL";
  }
  if (options.mode === "fail-fast") {
    const hasMissing = stages.some((s) => s.result === "SKIPPED-MISSING-PATH");
    if (hasMissing) {
      return "FAIL";
    }
  }
  return "PASS";
}

function resolveExitCode(
  stages: StageReport[],
  options: CliOptions,
  interrupted: boolean,
): number {
  if (interrupted) {
    return 130;
  }
  const hasMissing = stages.some((s) => s.result === "SKIPPED-MISSING-PATH");
  if (hasMissing) {
    return 2;
  }
  const hasFail = stages.some((s) => s.result === "FAIL");
  if (hasFail) {
    return 1;
  }
  return 0;
}

async function main(): Promise<void> {
  let options: CliOptions;
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

  const startedAt = new Date();
  const gitSha = runGit(["rev-parse", "HEAD"]) || "unknown";
  const gitBranch = runGit(["rev-parse", "--abbrev-ref", "HEAD"]) || "unknown";
  const atlasVersion = readAtlasVersion();

  if (gitBranch !== EXPECTED_BRANCH) {
    console.log(`⚠ WARNING: not on ${EXPECTED_BRANCH} branch`);
  }

  if (!options.quiet) {
    printHeader(gitBranch, gitSha, atlasVersion, options.mode);
  }

  const stageReports: StageReport[] = [];
  let interrupted = false;
  const failedUpstreamStages: string[] = [];
  const plannedStages = STAGES.filter((stage) => {
    const decision = shouldRunStage(stage, options);
    return decision !== "skip-filter";
  });

  for (const stage of STAGES) {
    const decision = shouldRunStage(stage, options);
    if (decision === "skip-filter") {
      continue;
    }

    if (decision === "skip-intentional") {
      stageReports.push({
        name: stage.name,
        command: [stage.command, ...stage.args].join(" "),
        startedAt: new Date().toISOString(),
        durationMs: 0,
        exitCode: null,
        result: "SKIPPED-INTENTIONAL",
        metrics: {},
        stdoutTail: "",
        stderrTail: "",
      });
      if (!options.quiet) {
        const index = stageReports.length;
        printStageLine(index, plannedStages.length, stageReports[stageReports.length - 1], null, options.strictLint);
      }
      continue;
    }

    let report: StageReport;
    try {
      report = await runStage(stage, options);
    } catch (error) {
      console.error(`Runner internal error in stage ${stage.name}:`, error);
      process.exit(3);
      return;
    }

    if (report.exitCode === 130) {
      interrupted = true;
    }

    stageReports.push(report);

    if (report.result === "FAIL" && stage.name.startsWith("kv-")) {
      failedUpstreamStages.push(stage.name);
      writeUpstreamState(failedUpstreamStages);
    }

    if (stage.name === "audit" && report.result === "PASS") {
      writeUpstreamState(failedUpstreamStages);
    }

    if (!options.quiet) {
      printStageLine(
        stageReports.length,
        plannedStages.length,
        report,
        stage.name === "lint" ? report.exitCode : null,
        options.strictLint,
      );
    }

    if (report.result === "FAIL" && !options.quiet) {
      const stderrBlock = tailLines(report.stderrTail, FAIL_STDERR_LINES);
      if (stderrBlock.trim()) {
        console.log("");
        console.log(`--- stderr tail (${stage.name}) ---`);
        console.log(stderrBlock);
        console.log("");
      }
    }

    if (options.mode === "fail-fast") {
      if (report.result === "FAIL" || report.result === "SKIPPED-MISSING-PATH") {
        break;
      }
    }

    if (interrupted) {
      break;
    }
  }

  const completedAt = new Date();
  const notRunStages = STAGES.filter(
    (stage) =>
      shouldRunStage(stage, options) === "run" &&
      !stageReports.some((report) => report.name === stage.name),
  );

  for (const stage of notRunStages) {
    stageReports.push({
      name: stage.name,
      command: [stage.command, ...stage.args].join(" "),
      startedAt: completedAt.toISOString(),
      durationMs: 0,
      exitCode: null,
      result: "NOT-RUN",
      metrics: {},
      stdoutTail: "",
      stderrTail: "",
    });
  }

  const summary = computeSummary(stageReports);
  const overall = computeOverallResult(stageReports, options);
  const jsonPath = options.jsonPath ?? defaultJsonPath(startedAt);

  const report: CascadeReport = {
    runner: RUNNER,
    version: VERSION,
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    durationMs: completedAt.getTime() - startedAt.getTime(),
    gitSha,
    gitBranch,
    atlasVersion,
    mode: options.mode,
    result: overall,
    summary,
    stages: stageReports,
    integration: aggregateIntegrationReports(),
  };

  if (options.writeJson) {
    try {
      writeReport(jsonPath, report);
    } catch (error) {
      console.error("Failed to write JSON report:", error);
      process.exit(3);
      return;
    }
  }

  if (!options.quiet) {
    console.log("");
    console.log("───────────────────────────────────────────────────────");
    console.log(
      `  Summary: ${summary.passed}/${summary.total} PASS · ${summary.failed} FAIL · ` +
        `${summary.skippedIntentional + summary.skippedMissingPath} SKIP`,
    );
    console.log(`  Duration: ${formatDuration(report.durationMs)}`);
    if (options.writeJson) {
      console.log(`  Report:   ${jsonPath.replace(/\\/g, "/")}`);
    }
    console.log(`  Result:   ${overall === "PASS" ? "✅ PASS" : "❌ FAIL"}`);
    console.log("───────────────────────────────────────────────────────");
  }

  process.exit(resolveExitCode(stageReports, options, interrupted));
}

main().catch((error) => {
  console.error("Runner internal error:", error);
  process.exit(3);
});
