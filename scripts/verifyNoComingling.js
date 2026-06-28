#!/usr/bin/env node
/**
 * Framework non-comingling spot-check for lane emitters.
 * Usage:
 *   node scripts/verifyNoComingling.js healthcare US_GAAP_ASC606|IFRS_15|IFRS_9
 *   node scripts/verifyNoComingling.js manufacturing US_GAAP_ASC330|IAS2_IFRS
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

const VERTICAL_CHECKS = {
  healthcare: () => {
    const forbidden = require(path.join(root, "lib/router/lanes/healthcare/forbidden.ts"));
    const router = require(path.join(root, "lib/router/healthcare/index.ts"));
    return {
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
  },
  manufacturing: () => {
    const forbidden = require(path.join(root, "lib/router/lanes/manufacturing/forbidden.ts"));
    const router = require(path.join(root, "lib/router/manufacturing/index.ts"));
    return {
      US_GAAP_ASC330: {
        fixture: "tests/fixtures/manufacturing/cross-cutting/MFG-10K-INVENTORY.json",
        outputFn: router.usgaapManufacturingInventoryOutputText,
        forbidden: forbidden.USGAAP_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS,
      },
      IAS2_IFRS: {
        fixture: "tests/fixtures/manufacturing/cross-cutting/SIE-AR-INVENTORY.json",
        outputFn: router.ifrsManufacturingInventoryOutputText,
        forbidden: forbidden.IFRS_MFG_INVENTORY_FORBIDDEN_OUTPUT_SUBSTRINGS,
      },
    };
  },
};

function main() {
  const [, , vertical, framework] = process.argv;
  if (!VERTICAL_CHECKS[vertical]) {
    console.error(`Unsupported vertical: ${vertical}`);
    process.exit(1);
  }
  ensureTsLoader();
  const forbiddenModule = require(
    path.join(root, `lib/router/lanes/${vertical === "healthcare" ? "healthcare" : "manufacturing"}/forbidden.ts`),
  );
  const checks = VERTICAL_CHECKS[vertical]();
  const check = checks[framework];
  if (!check) {
    console.error(`Unknown framework: ${framework}`);
    process.exit(1);
  }

  const extracted = loadExtracted(check.fixture);
  const output = check.outputFn(extracted);
  const matches = forbiddenModule.collectForbiddenMatches(output, check.forbidden);
  if (matches.length > 0) {
    console.error(`FAIL ${vertical} ${framework}: forbidden substrings: ${matches.join(", ")}`);
    process.exit(1);
  }
  console.log(`PASS ${vertical} ${framework}: zero forbidden substrings`);
}

main();
