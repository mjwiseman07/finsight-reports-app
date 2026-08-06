/**
 * MAJOR #2.1 — CLI wrapper for the AST-based schema-drift repo scanner.
 *
 * Usage:
 *   npx tsx scripts/schema-drift-scan.ts --baseline=.schema-drift-baseline.json
 *   npx tsx scripts/schema-drift-scan.ts --strict
 *   npx tsx scripts/schema-drift-scan.ts --update-baseline=.schema-drift-baseline.json
 *   npx tsx scripts/schema-drift-scan.ts . --record
 *
 * Exits:
 *   0 → no blocking drift (baseline mode: remainder empty; strict: driftedRefs empty)
 *   1 → at least one definite drift outside the baseline (or any drift in --strict)
 *   2 → scanner itself errored (e.g. sp_list_public_columns unavailable)
 *
 * Emits JSON to stdout so it composes with jq / CI diagnostics.
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import {
  runSchemaDriftScan,
  recordScannerLimitations,
  type ColumnRef,
  type DriftReport,
} from "@/lib/schema-drift/repo-scanner";

interface BaselineEntry {
  table: string;
  column: string;
  note?: string;
  call_sites?: string[];
}

interface BaselineFile {
  $schema: string;
  generated_at: string;
  debt_ticket: string;
  notes: string;
  entries: BaselineEntry[];
}

function currentGitSha(): string {
  try {
    return execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function argValue(args: string[], prefix: string): string | null {
  const hit = args.find((a) => a === prefix || a.startsWith(`${prefix}=`));
  if (!hit) return null;
  if (hit === prefix) {
    const idx = args.indexOf(hit);
    return args[idx + 1] && !args[idx + 1].startsWith("--") ? args[idx + 1] : null;
  }
  return hit.slice(prefix.length + 1);
}

function loadBaseline(path: string): BaselineFile {
  return JSON.parse(readFileSync(path, "utf8")) as BaselineFile;
}

function baselineKeySet(baseline: BaselineFile): Set<string> {
  return new Set(baseline.entries.map((e) => `${e.table}.${e.column}`));
}

function refKey(r: ColumnRef): string {
  return `${r.table}.${r.columnName}`;
}

function buildBaselineFromReport(report: DriftReport, debtTicket: string): BaselineFile {
  const by = new Map<string, BaselineEntry>();
  for (const r of report.driftedRefs) {
    const key = refKey(r);
    const site = `${r.file.replace(/\\/g, "/")}:${r.line}`;
    const existing = by.get(key);
    if (existing) {
      if (!existing.call_sites!.includes(site)) existing.call_sites!.push(site);
    } else {
      by.set(key, {
        table: r.table,
        column: r.columnName,
        note: "accepted product drift; resolve and remove from baseline",
        call_sites: [site],
      });
    }
  }
  return {
    $schema: "internal:advisacor/schema-drift-baseline/v1",
    generated_at: new Date().toISOString(),
    debt_ticket: debtTicket,
    notes:
      "Pre-existing product drift accepted at MAJOR #2.1 ship. Each entry MUST be resolved in MAJOR #2.2. Do NOT extend this file without an accompanying debt ticket.",
    entries: Array.from(by.values()).sort((a, b) =>
      `${a.table}.${a.column}`.localeCompare(`${b.table}.${b.column}`),
    ),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const record = args.includes("--record");
  const strict = args.includes("--strict");
  const baselinePath = argValue(args, "--baseline");
  const updateBaselinePath = argValue(args, "--update-baseline");
  const target =
    args.find((a, i) => {
      if (a.startsWith("--")) return false;
      // skip values belonging to --baseline / --update-baseline when passed as two tokens
      const prev = args[i - 1];
      if (prev === "--baseline" || prev === "--update-baseline") return false;
      return true;
    }) ?? process.cwd();

  const report = await runSchemaDriftScan(target);

  if (updateBaselinePath) {
    const next = buildBaselineFromReport(report, "MAJOR-2.2");
    writeFileSync(updateBaselinePath, JSON.stringify(next, null, 2) + "\n", "utf8");
    process.stdout.write(
      JSON.stringify(
        {
          ...report,
          baselineUpdated: updateBaselinePath,
          baselineEntryCount: next.entries.length,
          recorded: null,
        },
        null,
        2,
      ) + "\n",
    );
    process.exit(0);
  }

  const useBaseline = Boolean(baselinePath) && !strict;
  let baselinedRefs: ColumnRef[] = [];
  let novelDriftedRefs = report.driftedRefs;

  if (useBaseline && baselinePath) {
    const baseline = loadBaseline(baselinePath);
    const keys = baselineKeySet(baseline);
    baselinedRefs = report.driftedRefs.filter((r) => keys.has(refKey(r)));
    novelDriftedRefs = report.driftedRefs.filter((r) => !keys.has(refKey(r)));
  }

  let recorded: { inserted: number } | null = null;
  if (record) {
    recorded = await recordScannerLimitations(report, currentGitSha(), {
      baselinedRefs: useBaseline ? baselinedRefs : [],
    });
  }

  const blocking = strict ? report.driftedRefs : novelDriftedRefs;
  process.stdout.write(
    JSON.stringify(
      {
        ...report,
        mode: strict ? "strict" : useBaseline ? "baseline" : "strict",
        baselinePath: useBaseline ? baselinePath : null,
        baselinedRefs,
        novelDriftedRefs,
        recorded,
      },
      null,
      2,
    ) + "\n",
  );
  process.exit(blocking.length > 0 ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(
    `schema-drift-scan error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(2);
});
