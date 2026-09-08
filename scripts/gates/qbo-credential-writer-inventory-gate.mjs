/**
 * Static gate: every accounting_connections credential UPDATE must route through
 * the shared CAS helper (or an explicit non-QBO allowlist entry with shape/function constraints).
 *
 * Usage: node scripts/gates/qbo-credential-writer-inventory-gate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_ROOT,
  scanCredentialWriters,
} from "./lib/qbo-credential-writer-scan.mjs";

const ROOT = process.env.QBO_CAS_GATE_ROOT
  ? path.resolve(process.env.QBO_CAS_GATE_ROOT)
  : DEFAULT_ROOT;

const INVENTORY = path.join(
  ROOT,
  "docs/migration-remediation/qbo-canonical-credential-writer-inventory-2026-09-07.json",
);

const REQUIRED_WRITERS = [
  "lib/qbo/cdc.js",
  "lib/erp/quickbooks/token-resolver.ts",
  "lib/erp-adapters/quickbooks-adapter.js",
  "lib/integrations/accounting/persist-canonical-connection-grant.ts",
  "lib/integrations/accounting/canonical-qbo-credential-cas.ts",
];

function isCredentialish(kind) {
  return (
    kind === "credential_literal" ||
    kind === "credential_identifier" ||
    kind === "credential_spread" ||
    kind === "unresolved_identifier"
  );
}

const { offenders, findings, scannedFiles } = scanCredentialWriters({ root: ROOT });

const missingRequired = REQUIRED_WRITERS.filter(
  (w) => !fs.existsSync(path.join(ROOT, w)),
);

if (!fs.existsSync(INVENTORY)) {
  console.error("FAIL: missing writer inventory", path.relative(ROOT, INVENTORY));
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
if (inventory.confidentiality !== "no_secret_url_filters") {
  console.error("FAIL: inventory must declare confidentiality=no_secret_url_filters");
  process.exit(1);
}

if (missingRequired.length) {
  console.error("FAIL: missing required writer files", missingRequired);
  process.exit(1);
}

if (offenders.length) {
  console.error("FAIL: unclassified accounting_connections credential writers:");
  for (const o of offenders) {
    console.error(
      ` - ${o.file}:${o.line} [${o.classification}/${o.reason}] fn=${o.enclosingFunction || "?"}`,
    );
  }
  process.exit(1);
}

const casFinding = findings.find(
  (f) =>
    f.file.includes("canonical-qbo-credential-cas.ts") &&
    isCredentialish(f.classification),
);
if (!casFinding) {
  console.error("FAIL: CAS helper credential update not detected (scanner regression)");
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      inventoryWriters: inventory.writers.length,
      scannedFiles,
      credentialFindings: findings.filter((f) => isCredentialish(f.classification))
        .length,
      confidentiality: inventory.confidentiality,
    },
    null,
    2,
  ),
);
