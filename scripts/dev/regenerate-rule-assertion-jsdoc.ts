#!/usr/bin/env tsx
/**
 * Regenerate @assertions JSDoc blocks on rule logic files from migration seed.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const MIGRATION = path.join(
  process.cwd(),
  "supabase/migrations/20260707120000_d_assertions_part_1_schema_and_backfill.sql",
);
const sql = readFileSync(MIGRATION, "utf8");

type Row = {
  ruleId: string;
  assertionId: string;
  strength: string;
  accounts: string;
  citation: string;
};

const rows: Row[] = [];
const tupleRe =
  /\('([^']+)','([^']+)','(primary|secondary|partial)','(\{[^']*\})','([^']*(?:''[^']*)*)','([^']*(?:''[^']*)*)'\)/g;
let m: RegExpExecArray | null;
while ((m = tupleRe.exec(sql)) !== null) {
  rows.push({
    ruleId: m[1],
    assertionId: m[2],
    strength: m[3],
    accounts: m[4].replace(/[{}]/g, "").replace(/,/g, ", ").trim(),
    citation: m[6].replace(/''/g, "'"),
  });
}

const byRule = new Map<string, Row[]>();
for (const r of rows) {
  if (!byRule.has(r.ruleId)) byRule.set(r.ruleId, []);
  byRule.get(r.ruleId)!.push(r);
}

function ruleIdToPath(ruleId: string): string | null {
  const [prefix, ...rest] = ruleId.split(".");
  const base = rest.join("_");
  const dir =
    prefix === "gen"
      ? "general"
      : prefix === "mfg"
        ? "manufacturing"
        : prefix === "ps"
          ? "professional_services"
          : prefix === "rtl"
            ? "retail"
            : null;
  if (!dir) return null;
  return path.join("lib/rules/logic", dir, `${base}.ts`);
}

function buildJsdoc(ruleId: string, ruleRows: Row[]): string {
  const primaries = ruleRows.filter((r) => r.strength === "primary").map((r) => r.assertionId);
  const secondaries = ruleRows.filter((r) => r.strength === "secondary").map((r) => r.assertionId);
  const accounts = [
    ...new Set(
      ruleRows
        .flatMap((r) => r.accounts.split(",").map((a) => a.trim()))
        .filter(Boolean),
    ),
  ].join(", ");
  const citation = ruleRows[0]?.citation ?? "";
  return `/**
 * @rule       ${ruleId}
 * @assertions primary:${primaries.join(",")}${secondaries.length ? ` | secondary:${secondaries.join(",")}` : ""}
 * @accounts   ${accounts}
 * @citation   ${citation}
 */`;
}

function walkTsFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkTsFiles(full));
    else if (entry.endsWith(".ts") && entry !== "_helpers.ts" && entry !== "index.ts") out.push(full);
  }
  return out;
}

const files = walkTsFiles(path.join(process.cwd(), "lib/rules/logic"));
let updated = 0;
for (const file of files) {
  const base = path.basename(file, ".ts");
  const ruleId = [...byRule.keys()].find((id) => id.endsWith(`.${base}`) || id.split(".")[1] === base);
  if (!ruleId) continue;
  const ruleRows = byRule.get(ruleId);
  if (!ruleRows?.length) continue;
  const jsdoc = buildJsdoc(ruleId, ruleRows);
  let content = readFileSync(file, "utf8");
  content = content.replace(/^\/\*\*[\s\S]*?\*\/\s*/m, "");
  writeFileSync(file, `${jsdoc}\n${content}`);
  updated++;
}

console.log(`Updated JSDoc on ${updated} rule files (expected 32).`);
