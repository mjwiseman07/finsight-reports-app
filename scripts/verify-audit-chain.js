/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase 42.7E — Standalone audit hash-chain verifier.
 * Reads audit-log-evidence.json or walks InMemoryAuditLogWriter entries.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const evidencePath = path.join(root, "audit-log-evidence.json");

let typeScriptLoaderRegistered = false;

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) {
    return;
  }
  require.extensions[".ts"] = function loadTypeScript(module, filename) {
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
  typeScriptLoaderRegistered = true;
}

function loadModule(relativePath) {
  ensureTypeScriptLoader();
  // eslint-disable-next-line import/no-dynamic-require, global-require
  return require(path.join(root, relativePath));
}

function collectEntriesFromEvidence() {
  if (!fs.existsSync(evidencePath)) {
    return null;
  }
  const evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  if (evidence.failCount > 0) {
    throw new Error(`audit-log-evidence.json has ${evidence.failCount} failures`);
  }
  return evidence;
}

function buildSampleChain() {
  const { InMemoryAuditLogWriter } = loadModule(
    "lib/intelligence/synthetic/standards/audit/InMemoryAuditLogWriter.ts",
  );
  const writer = new InMemoryAuditLogWriter();
  const actor = { kind: "system", id: "verify-audit-chain", via: "direct-api" };
  writer.append({ kind: "cache.write", actor, subject: {}, payload: { step: 1 } });
  writer.append({ kind: "cache.hit", actor, subject: {}, payload: { step: 2 } });
  writer.append({ kind: "cache.miss", actor, subject: {}, payload: { step: 3 } });
  return writer.getEntries();
}

function main() {
  const { verifyAuditChain } = loadModule(
    "lib/intelligence/synthetic/standards/audit/hash-chain.ts",
  );

  const evidence = collectEntriesFromEvidence();
  if (evidence) {
    console.log(
      `Audit evidence loaded: ${evidence.passCount}/${evidence.totalCases} cases, version ${evidence.evidenceVersion}`,
    );
  }

  const entries = buildSampleChain();
  const valid = verifyAuditChain(entries);
  if (!valid) {
    console.error("FAIL verify-audit-chain: hash chain verification failed");
    process.exit(1);
  }

  const tampered = [...entries];
  tampered[1] = { ...tampered[1], payload: { tampered: true } };
  if (verifyAuditChain(tampered)) {
    console.error("FAIL verify-audit-chain: tampered chain incorrectly passed");
    process.exit(1);
  }

  console.log(`PASS verify-audit-chain (${entries.length} entries verified, tamper detection ok)`);
}

main();
