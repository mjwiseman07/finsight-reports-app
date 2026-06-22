/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.5U — D0 subprocessor boundary evidence generator (executable).
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const opsRoot = path.join(root, "ops");
const MATRIX_PATH = path.join(opsRoot, "compliance/vendors/D0_FLOW_MATRIX.json");
const OUTPUT_PATH = path.join(opsRoot, "compliance/vendors/D0_EVIDENCE.json");

let typeScriptLoaderRegistered = false;

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) return;
  require.extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
  typeScriptLoaderRegistered = true;
}

function loadVendorsModule() {
  ensureTypeScriptLoader();
  return require(path.join(opsRoot, "compliance/vendors/index.ts"));
}

function generateD0Evidence() {
  const { subprocessorRegistry } = loadVendorsModule();
  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, "utf8"));

  const compliantFlows = matrix.compliantFlows.filter((flow) => !flow.expectDeny);
  const compliantProof = subprocessorRegistry.proveOutboundPhiBoundary(compliantFlows);

  const attackResults = matrix.attackFlows.map((flow) => {
    const assertion = subprocessorRegistry.assertBaaOnFile({
      subprocessorId: flow.subprocessorId,
      tenantId: flow.tenantId,
      overlayActive: flow.overlayActive,
      payloadTags: flow.payloadTags,
    });
    return {
      flowId: flow.flowId,
      subprocessorId: flow.subprocessorId,
      denied: assertion.decision === "DENY",
      reason: assertion.reason,
    };
  });

  const expectedDenyFlows = matrix.compliantFlows.filter((flow) => flow.expectDeny);
  const expectedDenyResults = expectedDenyFlows.map((flow) => {
    const assertion = subprocessorRegistry.assertBaaOnFile({
      subprocessorId: flow.subprocessorId,
      tenantId: flow.tenantId,
      overlayActive: flow.overlayActive,
      payloadTags: flow.payloadTags,
    });
    return {
      flowId: flow.flowId,
      denied: assertion.decision === "DENY",
    };
  });

  const attacksBlocked = attackResults.every((entry) => entry.denied);
  const expectedDeniesOk = expectedDenyResults.every((entry) => entry.denied);
  const pass = compliantProof.pass && attacksBlocked && expectedDeniesOk;

  return {
    generatedAtIso: "2026-06-20T18:00:00.000Z",
    module: "42.5U",
    totalFlows: compliantFlows.length + matrix.attackFlows.length + expectedDenyFlows.length,
    compliantFlowCount: compliantFlows.length,
    violationCount: compliantProof.violations.length,
    attackFlowCount: matrix.attackFlows.length,
    attacksBlocked,
    expectedDenyOk: expectedDeniesOk,
    pass,
    compliantProof,
    attackResults,
    expectedDenyResults,
  };
}

module.exports = { generateD0Evidence, MATRIX_PATH, OUTPUT_PATH };

if (require.main === module) {
  const result = generateD0Evidence();
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
  console.log(
    `D0_SUBPROCESSOR_EVIDENCE:${result.pass ? 0 : 1}  flows=${result.totalFlows} violations=${result.violationCount}`,
  );
  process.exit(result.pass ? 0 : 1);
}
