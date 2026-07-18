/**
 * Phase MC-2e.4 — one-shot generator for a de-DE-formatted trial-balance
 * .xlsx fixture. Produces docs/mc-2e-4/de-DE-fixture.xlsx with realistic
 * numeric strings containing period-grouping and comma-decimal, matching
 * what a QuickBooks Online Deutschland tenant would export.
 *
 * Usage:
 *   node scripts/mc-2e-generate-de-de-fixture.mjs
 *
 * The generated file is committed alongside this script so downstream
 * reviewers can visually inspect it in Excel without re-running the
 * generator. Regenerate only if the fixture schema changes.
 */
import * as XLSX from "xlsx";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const OUT_PATH = resolve("docs/mc-2e-4/de-DE-fixture.xlsx");

const rows = [
  ["Konto", "Betrag"],
  ["1000 Kasse", "1.234,56"],
  ["1200 Bank Girokonto", "45.678,90"],
  ["1400 Forderungen aus Lieferungen", "12.345,67"],
  ["1500 Sonstige Forderungen", "(1.500,00)"],
  ["2000 Verbindlichkeiten aus Lieferungen", "(23.456,78)"],
  ["3000 Umsatzerlöse", "-98.765,43"],
  ["4000 Materialaufwand", "12.500,00"],
  ["4400 Personalkosten", "34.567,89"],
  ["8400 Erlöse 19% USt", "156.789,12"],
];

mkdirSync(dirname(OUT_PATH), { recursive: true });

const worksheet = XLSX.utils.aoa_to_sheet(rows);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, "Kontenrahmen SKR03");

const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
writeFileSync(OUT_PATH, buffer);

console.log(`Wrote ${OUT_PATH} (${buffer.length} bytes)`);
