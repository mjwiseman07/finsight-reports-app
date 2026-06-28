#!/usr/bin/env node
const path = require("path");
const ts = require("typescript");
const fs = require("fs");

const stage = process.argv[2];
if (!stage) {
  console.error("Usage: node scripts/crossover/run-stage.js <stage-name>");
  process.exit(2);
}

const root = path.resolve(__dirname, "../..");
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

const crossover = require(path.join(root, "lib/router/crossover/index.ts"));
const ctx = crossover.loadDefaultCrossoverContext(root);

ctx.disclosures = [
  {
    entityId: "MFG-10K-INVENTORY",
    framework: "US_GAAP_ASC330",
    emitterPath: "lib/router/lanes/manufacturing/emitters/inventoryDecomposition.ts",
    text: "Inventories disaggregated per ASC 330",
  },
  {
    entityId: "SIE-AR-INVENTORY",
    framework: "IAS2_IFRS",
    emitterPath: "lib/router/lanes/manufacturing/emitters/ifrs/inventoryDecompositionIAS2.ts",
    text: "Inventories classified per IAS 2",
  },
];

ctx.footingPairs = [
  {
    label: "MFG COGM to COGS",
    computed: 22_700_000_000,
    referenced: 22_700_000_000,
    tolerance: 1_000,
    vertical: "mfg",
  },
];

const STAGES = {
  framework_consistency: crossover.validateFrameworkConsistency,
  emitter_path_integrity: crossover.validateEmitterPathIntegrity,
  crossover_footing: crossover.validateCrossoverFooting,
  lessor_gap_surveillance: crossover.validateLessorGapSurveillance,
  register_classification: crossover.validateRegisterClassification,
  timestamp_drift_normalization: crossover.validateTimestampDrift,
  collapse_step_documentation: crossover.validateCollapseStepDocumentation,
};

const validator = STAGES[stage];
if (!validator) {
  console.error(`Unknown crossover stage: ${stage}`);
  process.exit(2);
}

crossover.validateRegisterSchemaV120(ctx);
const result = validator(ctx);
const warn = result.warnings?.length ? ` warnings=${result.warnings.join("; ")}` : "";
console.log(`PASS ${result.validator}: ${result.detail}${warn}`);
process.exit(0);
