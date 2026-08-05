/**
 * MAJOR #2 — CLI wrapper for the schema-drift repo scanner.
 *
 * Usage:
 *   npx tsx scripts/schema-drift-scan.ts             # scan cwd
 *   npx tsx scripts/schema-drift-scan.ts ./app       # scan subdir
 *
 * Exits 0 on clean, 1 on any drifted refs. Emits JSON to stdout so it
 * composes with jq / CI diagnostics.
 */

import { runSchemaDriftScan } from "@/lib/schema-drift/repo-scanner";

async function main() {
  const target = process.argv[2] ?? process.cwd();
  const report = await runSchemaDriftScan(target);
  process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  process.exit(report.driftedRefs.length > 0 ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(
    `schema-drift-scan error: ${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`,
  );
  process.exit(2);
});
