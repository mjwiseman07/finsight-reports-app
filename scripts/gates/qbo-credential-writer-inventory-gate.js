/**
 * Static gate: every accounting_connections credential UPDATE must use the shared CAS helper
 * or be explicitly allowlisted as non-credential / non-QBO.
 *
 * Exit 1 if an unclassified `.from("accounting_connections").update` remains in product code
 * that appears to write access_token/refresh_token without going through CAS.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const INVENTORY = path.join(
  ROOT,
  "docs/migration-remediation/qbo-canonical-credential-writer-inventory-2026-09-07.json",
);

const SCAN_GLOBS = [
  "lib",
  "app",
  "scripts",
];

const ALLOWLIST_PATH_FRAGMENTS = [
  // Xero refresh / status (not QBO CAS scope)
  "lib/integrations/accounting/ensure-fresh-tokens.ts",
  // Metadata / disconnect / entity selection (no token columns)
  "lib/integrations/accounting/service.ts",
  "app/api/quickbooks/disconnect/route.js",
  "app/api/integrations/xero/select-lead-entity/route.js",
  "lib/erp/quickbooks/health-checker.ts",
  "scripts/verify-xero-live.js",
  // Tests and this gate
  "__tests__",
  "canonical-qbo-credential-cas",
  "scripts/gates/qbo-credential-writer-inventory-gate.js",
];

const REQUIRED_WRITERS = [
  "lib/qbo/cdc.js",
  "lib/erp/quickbooks/token-resolver.ts",
  "lib/erp-adapters/quickbooks-adapter.js",
  "lib/integrations/accounting/persist-canonical-connection-grant.ts",
  "lib/integrations/accounting/canonical-qbo-credential-cas.ts",
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".git" || ent.name.startsWith(".tmp")) continue;
      walk(p, out);
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

function rel(p) {
  return path.relative(ROOT, p).replace(/\\/g, "/");
}

function isAllowlisted(fileRel) {
  return ALLOWLIST_PATH_FRAGMENTS.some((f) => fileRel.includes(f));
}

const offenders = [];
const files = SCAN_GLOBS.flatMap((g) => walk(path.join(ROOT, g)));

for (const file of files) {
  const fileRel = rel(file);
  if (isAllowlisted(fileRel)) continue;
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes("accounting_connections")) continue;
  if (!/access_token|refresh_token/.test(text)) continue;

  // Detect unconditional update patterns that set tokens without CAS helper import/call.
  const hasTokenUpdate =
    /\.from\(\s*["']accounting_connections["']\s*\)[\s\S]{0,400}\.update\(\s*\{[\s\S]*access_token/.test(
      text,
    ) ||
    /\.from\(\s*["']accounting_connections["']\s*\)[\s\S]{0,400}\.update\(\s*\{[\s\S]*refresh_token/.test(
      text,
    );

  if (!hasTokenUpdate) continue;

  const usesCas =
    text.includes("updateCanonicalQboCredentialsConditional") ||
    text.includes("persistRefreshedQboCredentialsConditional") ||
    text.includes("canonical-qbo-credential-cas");

  if (!usesCas) {
    offenders.push(fileRel);
  }
}

const missingRequired = REQUIRED_WRITERS.filter(
  (w) => !fs.existsSync(path.join(ROOT, w)),
);

if (!fs.existsSync(INVENTORY)) {
  console.error("FAIL: missing writer inventory", rel(INVENTORY));
  process.exit(1);
}

const inventory = JSON.parse(fs.readFileSync(INVENTORY, "utf8"));
if (!Array.isArray(inventory.writers) || inventory.writers.length < 4) {
  console.error("FAIL: inventory writers incomplete");
  process.exit(1);
}
if (inventory.unclassified_credential_writers?.length) {
  console.error("FAIL: inventory reports unclassified writers");
  process.exit(1);
}

if (missingRequired.length) {
  console.error("FAIL: missing required writer files", missingRequired);
  process.exit(1);
}

if (offenders.length) {
  console.error("FAIL: unclassified QBO credential writers:");
  for (const o of offenders) console.error(" -", o);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      inventoryWriters: inventory.writers.length,
      scannedFiles: files.length,
    },
    null,
    2,
  ),
);
