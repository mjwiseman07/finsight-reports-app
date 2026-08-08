import { test, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import path from "path";

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) yield full;
  }
}

test("write-boundary module has zero coupling to provider SDKs or adapter code", () => {
  const root = path.resolve(__dirname, "../../../lib/accounting/write-boundary");
  const violations: string[] = [];
  const forbiddenImports = [
    /from ["']xero-node/,
    /from ["']intuit-oauth/,
    /from ["']node-quickbooks/,
    /from ["']@\/lib\/integrations\/xero/,
    /from ["']@\/lib\/integrations\/quickbooks/,
    /from ["']@\/lib\/integrations\/accounting\/service/,
    /from ["']@\/lib\/integrations\/accounting\/providers/,
  ];
  for (const file of walk(root)) {
    const src = readFileSync(file, "utf8");
    for (const pattern of forbiddenImports) {
      if (pattern.test(src)) {
        violations.push(`${path.relative(process.cwd(), file)} matches ${pattern}`);
      }
    }
  }
  expect(violations).toEqual([]);
});

test("no code outside write-boundary/ + provider adapter classes imports xero-node/intuit-oauth write methods directly", () => {
  // At W1b, no code has been wired to writes yet — this is a pre-flight guard for W1c.
  // Allowlist: the provider adapter files themselves are the ONLY files allowed to import
  // the SDK write surfaces. Everything else must go through @/lib/accounting/write-boundary.
  const root = path.resolve(__dirname, "../../..");
  const allowedFiles = [
    "lib/integrations/xero/provider.ts",
    "lib/integrations/quickbooks/provider.ts",
    "lib/wbp/xero-sandbox-spike.ts",
  ];
  const skipDirs = new Set(["node_modules", ".next", "scripts", "__tests__"]);
  const violations: string[] = [];
  const writeMethodPatterns = [
    /createOrUpdateManualJournals/,
    /\.createJournalEntry\(/,
  ];
  for (const file of walk(root)) {
    const rel = path.relative(root, file);
    if (rel.split(path.sep).some((seg) => skipDirs.has(seg))) continue;
    if (allowedFiles.some((a) => file.endsWith(a.replace(/\//g, path.sep)))) continue;
    if (rel.includes("write-boundary")) continue;
    if (/\.test\.tsx?$/.test(file)) continue;
    const src = readFileSync(file, "utf8");
    for (const pattern of writeMethodPatterns) {
      if (pattern.test(src)) {
        violations.push(`${rel} contains ${pattern}`);
      }
    }
  }
  expect(violations).toEqual([]);
});
