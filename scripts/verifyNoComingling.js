#!/usr/bin/env node
/**
 * Framework non-comingling spot-check for healthcare revenue lanes.
 * Usage: node scripts/verifyNoComingling.js healthcare US_GAAP_ASC606|IFRS_15|IFRS_9
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");

let loaderRegistered = false;
function ensureTsLoader() {
  if (loaderRegistered) return;
  require.extensions[".ts"] = function loadTs(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
        strict: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
  require.extensions[".json"] = function loadJson(module, filename) {
    module.exports = JSON.parse(fs.readFileSync(filename, "utf8"));
  };
  loaderRegistered = true;
}

function loadExtracted(rel) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
  return raw.extracted;
}

function main() {
  const [, , vertical, framework] = process.argv;
  if (vertical !== "healthcare") {
    console.error("Only healthcare lane supported");
    process.exit(1);
  }
  ensureTsLoader();
  const forbidden = require(path.join(root, "lib/router/lanes/healthcare/forbidden.ts"));
  const router = require(path.join(root, "lib/router/healthcare/index.ts"));

  const checks = {
    US_GAAP_ASC606: {
      fixture: "tests/fixtures/healthcare/cross-cutting/HCA-10K-PAYOR.json",
      outputFn: router.usgaapHealthcareRevenueOutputText,
      forbidden: forbidden.USGAAP_HC_FORBIDDEN_OUTPUT_SUBSTRINGS,
    },
    IFRS_15: {
      fixture: "tests/fixtures/healthcare/cross-cutting/NHS-AR-RECEIVABLES.json",
      outputFn: router.ifrsHealthcareRevenueOutputText,
      forbidden: forbidden.IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS,
    },
    IFRS_9: {
      fixture: "tests/fixtures/healthcare/cross-cutting/NHS-AR-RECEIVABLES.json",
      outputFn: router.ifrsHealthcareRevenueOutputText,
      forbidden: forbidden.IFRS_HC_REVENUE_FORBIDDEN_OUTPUT_SUBSTRINGS,
    },
  };

  const check = checks[framework];
  if (!check) {
    console.error(`Unknown framework: ${framework}`);
    process.exit(1);
  }

  const extracted = loadExtracted(check.fixture);
  const output = check.outputFn(extracted);
  const matches = forbidden.collectForbiddenMatches(output, check.forbidden);
  if (matches.length > 0) {
    console.error(`FAIL ${vertical} ${framework}: forbidden substrings: ${matches.join(", ")}`);
    process.exit(1);
  }
  console.log(`PASS ${vertical} ${framework}: zero forbidden substrings`);
}

main();
