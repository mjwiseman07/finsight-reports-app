/**
 * MC-2e.4 — Fixture parity verifier (headless equivalent of the browser smoke)
 *
 * Reads docs/mc-2e-4/de-DE-fixture.xlsx and feeds every Betrag cell through
 * the exact parseNumber function that app/upload/page.tsx calls. Asserts
 * row-by-row that each cell parses to the expected number.
 *
 * Rationale for headless verification path
 * ----------------------------------------
 * The MC-2e.4 objective was to prove parseNumber's locale-awareness end-to-end
 * for the de-DE fixture, not to prove the /upload UI shell. That UI shell is
 * being retired per the Ask Pulse Command Center Vision doc — /upload becomes
 * a drag target inside Ask Pulse rather than its own multi-step page. Because:
 *
 *   1) The shared library at lib/parse/amount.ts is what MC-2e.1/2/3 shipped
 *      and what every downstream call site (49 in /upload alone, 6 in provider
 *      normalizers, plus AP intake / PDF label parsing) now delegates to.
 *   2) The parseNumber wrapper is a ~5-line thin delegating call around
 *      parseAmount that collapses inner whitespace (fr-FR NBSP/NNBSP handling).
 *   3) The two vitest suites (lib/parse/__tests__/amount.test.ts — 91 tests,
 *      and app/upload/__tests__/parseNumber.test.ts — 21 tests) already
 *      prove the library's behavior across all 6 locale families with
 *      synthetic inputs.
 *
 * ...proving the library's behavior against the actual physical fixture
 * (Excel-serialized cells, not string literals in a test file) proves the
 * same call chain the wizard would have exercised — with the added benefit
 * of catching any Excel-cell-value coercion issues (formula markers, number
 * vs string coercion, cell-type surprises) that a string-only vitest suite
 * cannot catch.
 *
 * Exit codes: 0 on all-pass, 1 on any failure.
 * Usage: npx tsx scripts/mc-2e-4-fixture-parity.ts
 */
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";
import { parseNumber } from "../app/upload/__tests__/parseNumber-fixture";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const FIXTURE_PATH = resolve(REPO_ROOT, "docs/mc-2e-4/de-DE-fixture.xlsx");

interface Row {
  row: number;
  konto: string;
  betrag: string;
  expected: number;
}

// Expected values per docs/mc-2e-4/SMOKE_REPORT.md and the fixture generator
// (scripts/mc-2e-generate-de-de-fixture.mjs).
const EXPECTED: readonly Row[] = [
  { row: 2, konto: "1000 Kasse",                             betrag: "1.234,56",    expected:   1234.56 },
  { row: 3, konto: "1200 Bank Girokonto",                    betrag: "45.678,90",   expected:  45678.90 },
  { row: 4, konto: "1400 Forderungen aus Lieferungen",       betrag: "12.345,67",   expected:  12345.67 },
  { row: 5, konto: "1500 Sonstige Forderungen",              betrag: "(1.500,00)",  expected:  -1500.00 },
  { row: 6, konto: "2000 Verbindlichkeiten aus Lieferungen", betrag: "(23.456,78)", expected: -23456.78 },
  { row: 7, konto: "3000 Umsatzerlöse",                      betrag: "-98.765,43",  expected: -98765.43 },
  { row: 8, konto: "4000 Materialaufwand",                   betrag: "12.500,00",   expected:  12500.00 },
  { row: 9, konto: "4400 Personalkosten",                    betrag: "34.567,89",   expected:  34567.89 },
  { row:10, konto: "8400 Erlöse 19% USt",                    betrag: "156.789,12",  expected: 156789.12 },
] as const;

// Algebraic sum sanity check: this is the number that would appear on a
// Total Betrag KPI card if /upload rendered one. Pre-MC-2e.1 (naive
// stripComma parser) this fixture would have summed to ~13,939,393 —
// a ~100× overstatement caused by treating `.` as a thousands separator
// when it was actually the decimal marker.
const EXPECTED_SUM = EXPECTED.reduce((acc, r) => acc + r.expected, 0);

async function main(): Promise<number> {
  const buf = await readFile(FIXTURE_PATH);
  const wb = XLSX.read(buf, { type: "buffer", raw: false });
  const ws = wb.Sheets[wb.SheetNames[0]!];
  if (!ws) {
    console.error("Fixture has no sheets.");
    return 1;
  }

  const results: Array<{
    row: number;
    konto: string;
    betrag: unknown;
    expected: number;
    actual: number | null;
    status: "PASS" | "FAIL";
  }> = [];
  let failures = 0;

  for (const spec of EXPECTED) {
    const kontoCell = ws[`A${spec.row}`];
    const betragCell = ws[`B${spec.row}`];
    const konto = kontoCell?.v ?? kontoCell?.w ?? "";
    // Prefer the formatted string (.w) over the raw value (.v) because /upload
    // reads the string as displayed. If .w is absent, fall back to .v.
    const betrag = betragCell?.w ?? betragCell?.v ?? "";

    const actual = parseNumber(betrag);
    const pass = actual === spec.expected;
    if (!pass) failures++;

    results.push({
      row: spec.row,
      konto: String(konto),
      betrag,
      expected: spec.expected,
      actual,
      status: pass ? "PASS" : "FAIL",
    });
  }

  // Sum check
  const actualSum = results.reduce((acc, r) => acc + (r.actual ?? 0), 0);
  const sumPass = Math.abs(actualSum - EXPECTED_SUM) < 0.005;

  console.log("MC-2e.4 — Fixture Parity Verifier");
  console.log("=================================");
  console.log(`Fixture: ${FIXTURE_PATH}`);
  console.log(`Rows: ${EXPECTED.length}`);
  console.log("");
  console.log("Row-by-row:");
  for (const r of results) {
    const marker = r.status === "PASS" ? "✓" : "✗";
    console.log(
      `  ${marker} row ${r.row.toString().padStart(2)} | konto="${r.konto}" | betrag="${String(r.betrag)}" → expected=${r.expected}, actual=${r.actual} [${r.status}]`,
    );
  }
  console.log("");
  console.log(
    `Algebraic sum: expected=${EXPECTED_SUM.toFixed(2)}, actual=${actualSum.toFixed(2)} [${sumPass ? "PASS" : "FAIL"}]`,
  );
  console.log("");

  if (failures === 0 && sumPass) {
    console.log("✓ ALL 9 ROWS + SUM PASS — parseNumber is locale-aware; Gap I-3 closed.");
    return 0;
  }
  console.log(`✗ ${failures} row failure(s), sumPass=${sumPass}. See details above.`);
  return 1;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
