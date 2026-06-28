#!/usr/bin/env node
/**
 * Export gap register rows with optional filters.
 * Usage:
 *   node scripts/gap-register-export.js --filter triage=fix-now --vertical con
 *   node scripts/gap-register-export.js --filter triage=fix-now --remaining-after C7a-8
 */
const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const REGISTER_PATH = join(ROOT, "reports/g7-gap-register.json");

function parseArgs(argv) {
  const filters = {};
  let remainingAfter = null;
  let output = null;
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--filter" && argv[i + 1]) {
      const [key, value] = argv[i + 1].split("=");
      filters[key] = value;
      i += 1;
    } else if (argv[i] === "--vertical" && argv[i + 1]) {
      filters.vertical = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--cluster" && argv[i + 1]) {
      filters.cluster = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--framework" && argv[i + 1]) {
      filters.framework = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--remaining-after" && argv[i + 1]) {
      remainingAfter = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--output" && argv[i + 1]) {
      output = argv[i + 1];
      i += 1;
    }
  }
  return { filters, remainingAfter, output };
}

function verticalAlias(vertical) {
  const map = { CON: "con", FA: "fa", HC: "hc", RTL: "rtl", MFG: "mfg", GC: "gc", PS: "ps", SAAS: "saas", NPO: "npo" };
  return map[vertical.toUpperCase()] ?? vertical.toLowerCase();
}

const CLUSTER_ASSERTIONS = {
  "community-benefit": ["chna-cycle"],
};

function assertionFromMessage(message) {
  const head = (message || "").split(":")[0];
  return head.split("/").pop();
}

function matches(gap, filters) {
  for (const [key, value] of Object.entries(filters)) {
    if (key === "vertical") {
      if (gap.vertical !== verticalAlias(value)) return false;
      continue;
    }
    if (key === "cluster") {
      const allowed = CLUSTER_ASSERTIONS[value];
      if (!allowed || !allowed.includes(assertionFromMessage(gap.message))) return false;
      continue;
    }
    if (key === "framework") {
      if (gap.framework !== value) return false;
      continue;
    }
    if (gap[key] !== value) return false;
  }
  return true;
}

function main() {
  const { filters, remainingAfter, output } = parseArgs(process.argv);
  const register = JSON.parse(readFileSync(REGISTER_PATH, "utf8"));
  let rows = register.gaps.filter((gap) => matches(gap, filters));

  if (remainingAfter) {
    rows = rows.filter((gap) => !gap.closed_in || gap.closed_in > remainingAfter);
  }

  const payload = rows.map((gap) => ({
    id: gap.id,
    filingId: gap.filingId,
    vertical: gap.vertical,
    framework: gap.framework,
    triage: gap.triage,
    assertion: (gap.message || "").split(":")[0].split("/").pop(),
    closed_in: gap.closed_in ?? null,
  }));

  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (output) {
    writeFileSync(join(ROOT, output), text, "utf8");
    console.log(`wrote ${output} (${payload.length} rows)`);
  } else {
    process.stdout.write(text);
  }
}

main();
