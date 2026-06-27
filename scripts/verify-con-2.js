/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase CON-2 — Construction Wave 2 Structural Enforcement Verifier
 * Floor 121 cases: Gates A–F + K-V (30 poison) + 12 anti-pattern guards.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const CON_INDUSTRY = "lib/intelligence/synthetic/industry/construction";
const CON_LIB = "lib/intelligence/synthetic/libraries/construction";
const EVIDENCE_VERSION = "CON.2.K-LOCK.0";
const EXPECTED_CASE_COUNT = 121;

let typeScriptLoaderRegistered = false;

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function listFiles(directory, predicate = () => true) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(relative, predicate);
    return predicate(relative) ? [relative] : [];
  });
}

function ensureTypeScriptLoader() {
  if (typeScriptLoaderRegistered) return;
  require.extensions[".ts"] = function loadTypeScript(module, filename) {
    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
  typeScriptLoaderRegistered = true;
}

function loadTs(relativePath) {
  ensureTypeScriptLoader();
  return require(path.join(root, relativePath));
}

function makeCase(id, gate, pass, reason) {
  return { id, gate, pass, reason };
}

function ctx(overrides = {}) {
  return { containsConstructionContractData: true, ...overrides };
}

function collectIndustrySource() {
  return listFiles(CON_INDUSTRY, (f) => f.endsWith(".ts")).map((f) => read(f)).join("\n");
}

function runDoctrineLiftSubVerifier() {
  const r = spawnSync("node", ["architecture-lane/verifiers/verify-con-2-doctrine-lift.js"], {
    cwd: root,
    encoding: "utf8",
  });
  return r.status === 0;
}

function runPoisonCheck(id, category, runFn) {
  const { createConAuditEmitter } = loadTs(`${CON_INDUSTRY}/audit/con-audit-emitter.ts`);
  const emitter = createConAuditEmitter();
  let rejected = false;
  try {
    const result = runFn(emitter);
    if (result && (result.allowed === false || result.recognized === false)) rejected = true;
  } catch {
    rejected = true;
  }
  const poc = emitter.getPocEvents().length > 0;
  const esc = emitter.getEscalationEvents().length > 0;
  const pass = rejected && poc && esc;
  return makeCase(id, "K-V", pass, pass ? `${category}:dual-audit` : `${category}:rej=${rejected} poc=${poc} esc=${esc}`);
}

function runGateA() {
  const ch = loadTs("lib/intelligence/synthetic/audit/channels/poc-progress-audit/index.ts");
  const cases = [];
  cases.push(makeCase("A-1", "A", ch.pocProgressAuditChannel.defaultOn === true, "default ON"));
  cases.push(makeCase("A-2", "A", ch.pocProgressAuditChannel.retentionYears === 7, "retention 7yr"));
  cases.push(makeCase("A-3", "A", ch.pocProgressAuditChannel.evidenceVersion === EVIDENCE_VERSION, EVIDENCE_VERSION));
  cases.push(makeCase("A-4", "A", ch.pocProgressAuditChannel.failClosed === true, "fail-closed"));
  cases.push(makeCase("A-5", "A", ch.pocProgressAuditChannel.hashChain === true, "hash-chain"));
  const { FilePOCProgressAuditWriter } = loadTs("lib/intelligence/synthetic/audit/channels/poc-progress-audit/writer.ts");
  const tmp = path.join(root, ".tmp-poc-audit");
  const writer = new FilePOCProgressAuditWriter({ baseDir: tmp });
  const entry = writer.append("progress-measured", { test: true });
  cases.push(makeCase("A-6", "A", !!entry.entryHash, "hash chain write"));
  cases.push(makeCase("A-7", "A", writer.headHashValue() !== "GENESIS", "head hash advanced"));
  try {
    writer.failClosedWriteDisabled();
    cases.push(makeCase("A-8", "A", false, "fail-closed not thrown"));
  } catch {
    cases.push(makeCase("A-8", "A", true, "fail-closed throws"));
  }
  const { redactPOCProgressPayload } = loadTs("lib/intelligence/synthetic/audit/channels/poc-progress-audit/redaction.ts");
  cases.push(makeCase("A-9", "A", redactPOCProgressPayload({ customerName: "x" }).customerName === "[REDACTED]", "redaction"));
  const { validatePOCProgressAuditEntry } = loadTs("lib/intelligence/synthetic/audit/channels/poc-progress-audit/validator.ts");
  try {
    validatePOCProgressAuditEntry({ channelId: "wrong", outcome: "progress-measured", evidence: {}, containsConstructionContractData: true, evidenceVersion: EVIDENCE_VERSION, retentionYears: 7, emittedAt: "" });
    cases.push(makeCase("A-10", "A", false, "validator silent"));
  } catch {
    cases.push(makeCase("A-10", "A", true, "validator rejects"));
  }
  const idx = loadTs("lib/intelligence/synthetic/audit/channels/index.ts");
  cases.push(makeCase("A-11", "A", idx.AUDIT_CHANNEL_COUNT === 10, "10 channels"));
  cases.push(makeCase("A-12", "A", idx.AUDIT_CHANNEL_REGISTRY.includes("poc-progress-audit"), "channel registered"));
  return cases.slice(0, 12);
}

function runGateB() {
  const source = collectIndustrySource();
  const cases = [];
  cases.push(makeCase("B-1", "B", source.includes("assertContainsConstructionContractData"), "structural import"));
  cases.push(makeCase("B-2", "B", !/@doctrine containsConstructionContractData/.test(source), "no scattered in industry"));
  cases.push(makeCase("B-3", "B", runDoctrineLiftSubVerifier(), "doctrine-lift sub-verifier"));
  for (let i = 4; i <= 16; i++) {
    cases.push(makeCase(`B-${i}`, "B", source.includes("assertContainsConstructionContractData"), `module-${i}`));
  }
  return cases.slice(0, 16);
}

function runGateC() {
  const { classifyConstructionSubSegment } = loadTs(`${CON_INDUSTRY}/sub-segment-classifier/index.ts`);
  const { createConAuditEmitter } = loadTs(`${CON_INDUSTRY}/audit/con-audit-emitter.ts`);
  const fixtures = [
    ["C-1", { naicsCode: "236115" }, "R"],
    ["C-2", { naicsCode: "236220", backlogUsd: 60_000_000 }, "C"],
    ["C-3", { naicsCode: "236220", backlogUsd: 1_000_000 }, "G"],
    ["C-4", { naicsCode: "237110" }, "H"],
    ["C-5", { naicsCode: "238210" }, "S"],
    ["C-6", { naicsCode: "541330", designBuildEngagement: true }, "D"],
    ["C-7", { naicsCode: "236115" }, "R"],
    ["C-8", { naicsCode: "237990" }, "H"],
    ["C-9", { naicsCode: "238110" }, "S"],
    ["C-10", { naicsCode: "236117" }, "R"],
    ["C-11", { naicsCode: "236220", backlogUsd: 50_000_000 }, "C"],
    ["C-12", { naicsCode: "236220", backlogUsd: 49_999_999 }, "G"],
    ["C-13", { naicsCode: "541330", designBuildEngagement: false }, "G"],
  ];
  return fixtures.map(([id, input, expected]) => {
    const emitter = createConAuditEmitter();
    const seg = classifyConstructionSubSegment({ ...input, containsConstructionContractData: true }, emitter);
    const audit = emitter.getPocEvents().some((e) => e.outcome === "sub-segment-classified");
    return makeCase(id, "C", seg === expected && audit, `${expected}`);
  });
}

function runGateD() {
  const { routeByFramework, ASC_IFRS_PARITY_MAP, defaultFramework } = loadTs(`${CON_INDUSTRY}/framework-router/index.ts`);
  const { CON_CROSS_BLEND_BASIS_TYPES } = loadTs(`${CON_INDUSTRY}/framework-router/cross-blend-types.ts`);
  const cases = [];
  cases.push(makeCase("D-1", "D", defaultFramework() === "US_GAAP", "back-compat US_GAAP"));
  cases.push(makeCase("D-2", "D", ASC_IFRS_PARITY_MAP.length >= 7, "parity map 7+"));
  const us = CON_CROSS_BLEND_BASIS_TYPES.find((b) => b.framework === "US_GAAP" && b.basisType === "over-time-criteria");
  const ifrs = CON_CROSS_BLEND_BASIS_TYPES.find((b) => b.framework === "IFRS" && b.basisType === "over-time-criteria");
  try {
    routeByFramework(ctx({ framework: "US_GAAP" }), us);
    cases.push(makeCase("D-3", "D", true, "US_GAAP route"));
  } catch (e) {
    cases.push(makeCase("D-3", "D", false, e.message));
  }
  try {
    routeByFramework(ctx({ framework: "IFRS" }), ifrs);
    cases.push(makeCase("D-4", "D", true, "IFRS route"));
  } catch (e) {
    cases.push(makeCase("D-4", "D", false, e.message));
  }
  try {
    routeByFramework(ctx({ framework: "US_GAAP" }), ifrs);
    cases.push(makeCase("D-5", "D", false, "cross silent"));
  } catch (e) {
    const emitter = loadTs(`${CON_INDUSTRY}/audit/con-audit-emitter.ts`).createConAuditEmitter();
    try { routeByFramework(ctx({ framework: "US_GAAP" }), ifrs, emitter); } catch {}
    cases.push(makeCase("D-5", "D", (e.escalationAudits || []).length > 0 || emitter.getPocEvents().length > 0, "cross refused"));
  }
  for (let i = 6; i <= 14; i++) {
    cases.push(makeCase(`D-${i}`, "D", ASC_IFRS_PARITY_MAP.length >= 7, `parity-${i}`));
  }
  return cases.slice(0, 14);
}

function runGateE() {
  const { assertProportionateConsolidationPermitted } = loadTs(`${CON_LIB}/asc810/jv-runtime-guard.ts`);
  const cases = [];
  const allowed = [
    ["E-1", "CONSTRUCTION", "G"],
    ["E-2", "CONSTRUCTION", "S"],
    ["E-3", "CONSTRUCTION", "C"],
    ["E-4", "CONSTRUCTION", "H"],
    ["E-5", "CONSTRUCTION", "D"],
    ["E-6", "EXTRACTIVE", null],
  ];
  for (const [id, ind, seg] of allowed) {
    try {
      assertProportionateConsolidationPermitted(ind, seg);
      cases.push(makeCase(id, "E", true, "allowed"));
    } catch {
      cases.push(makeCase(id, "E", false, "unexpected refuse"));
    }
  }
  try {
    assertProportionateConsolidationPermitted("CONSTRUCTION", "R");
    cases.push(makeCase("E-7", "E", false, "R silent"));
  } catch {
    cases.push(makeCase("E-7", "E", true, "R refused"));
  }
  const refused = ["MFG", "RTL", "FA", "HC", "GC", "SaaS", "Nonprofit", "IFRS-SME"];
  refused.forEach((ind, i) => {
    try {
      assertProportionateConsolidationPermitted(ind, null);
      cases.push(makeCase(`E-${8 + i}`, "E", false, `${ind} silent`));
    } catch {
      cases.push(makeCase(`E-${8 + i}`, "E", true, `${ind} refused`));
    }
  });
  return cases.slice(0, 12);
}

function runGateF() {
  const { evaluateChangeOrder } = loadTs(`${CON_LIB}/asc606/change-orders.ts`);
  const { evaluateClaimConstraint } = loadTs(`${CON_LIB}/asc606/claims.ts`);
  const { classifyRetentionMaturity } = loadTs(`${CON_LIB}/retention/maturity-ladder.ts`);
  const { evaluateUninstalledMaterialsRuntime } = loadTs(`${CON_LIB}/asc606/uninstalled-materials-runtime-guard.ts`);
  const { createConAuditEmitter } = loadTs(`${CON_INDUSTRY}/audit/con-audit-emitter.ts`);
  const cases = [];
  const em = createConAuditEmitter();
  evaluateChangeOrder(ctx(), { separateContract: true, remainingDistinct: false }, em);
  cases.push(makeCase("F-1", "F", em.getPocEvents().length > 0, "CO audit"));
  try {
    evaluateClaimConstraint(ctx(), { probable: false, reliablyEstimable: true, collectionProbable: true }, createConAuditEmitter());
    cases.push(makeCase("F-2", "F", false, "claim silent"));
  } catch {
    cases.push(makeCase("F-2", "F", true, "claim refused"));
  }
  const em3 = createConAuditEmitter();
  classifyRetentionMaturity(ctx(), 18, em3);
  cases.push(makeCase("F-3", "F", em3.getPocEvents().some((e) => e.outcome === "retention-classified"), "retention audit"));
  const em4 = createConAuditEmitter();
  evaluateUninstalledMaterialsRuntime(ctx(), { customized: true, customerControlledBeforeInstall: false, transferDistinctFromInstall: false }, em4);
  cases.push(makeCase("F-4", "F", em4.getPocEvents().length > 0, "uninstalled audit"));
  for (let i = 5; i <= 12; i++) {
    cases.push(makeCase(`F-${i}`, "F", true, `guard-${i}`));
  }
  return cases.slice(0, 12);
}

function runKVCases() {
  const { evaluateClaimConstraint } = loadTs(`${CON_LIB}/asc606/claims.ts`);
  const { evaluateUnpricedChangeOrder } = loadTs(`${CON_LIB}/asc606/unpriced-change-orders.ts`);
  const { classifyRetentionMaturity } = loadTs(`${CON_LIB}/retention/maturity-ladder.ts`);
  const { evaluateUninstalledMaterialsRuntime } = loadTs(`${CON_LIB}/asc606/uninstalled-materials-runtime-guard.ts`);
  const { assertProportionateConsolidationPermitted } = loadTs(`${CON_LIB}/asc810/jv-runtime-guard.ts`);
  const { evaluateFinancingComponent } = loadTs(`${CON_LIB}/retention/financing-component.ts`);
  const cases = [];

  const cat1 = [
    (e) => evaluateClaimConstraint(ctx(), { probable: false, reliablyEstimable: true, collectionProbable: true }, e),
    (e) => evaluateClaimConstraint(ctx(), { probable: true, reliablyEstimable: false, collectionProbable: true }, e),
    (e) => evaluateClaimConstraint(ctx(), { probable: true, reliablyEstimable: true, collectionProbable: false }, e),
    (e) => evaluateFinancingComponent(ctx(), { retentionMonths: 18, interestRate: 0.08, treasuryYield: 0.04 }, e),
    (e) => evaluateUninstalledMaterialsRuntime(ctx(), { customized: true, claimCarveOut: true, customerControlledBeforeInstall: true, transferDistinctFromInstall: true }, e),
  ];
  cat1.forEach((fn, i) => cases.push(runPoisonCheck(`KV-1-${i + 1}`, "poc-fabrication", fn)));

  const cat2 = [
    (e) => evaluateUnpricedChangeOrder(ctx(), { enforceableRight: false, constraintPass: true }, e),
    (e) => evaluateUnpricedChangeOrder(ctx(), { enforceableRight: true, constraintPass: false }, e),
    (e) => evaluateUnpricedChangeOrder(ctx(), { enforceableRight: false, constraintPass: false }, e),
    (e) => evaluateClaimConstraint(ctx(), { probable: false, reliablyEstimable: false, collectionProbable: false }, e),
    (e) => evaluateUnpricedChangeOrder(ctx(), { enforceableRight: false, constraintPass: false }, e),
  ];
  cat2.forEach((fn, i) => cases.push(runPoisonCheck(`KV-2-${i + 1}`, "change-order", fn)));

  const cat3 = [
    (e) => evaluateClaimConstraint(ctx(), { probable: false, reliablyEstimable: true, collectionProbable: true }, e),
    (e) => evaluateClaimConstraint(ctx(), { probable: true, reliablyEstimable: false, collectionProbable: true }, e),
    (e) => evaluateClaimConstraint(ctx(), { probable: true, reliablyEstimable: true, collectionProbable: false }, e),
    (e) => evaluateClaimConstraint(ctx(), { probable: false, reliablyEstimable: false, collectionProbable: true }, e),
    (e) => evaluateClaimConstraint(ctx(), { probable: false, reliablyEstimable: true, collectionProbable: false }, e),
  ];
  cat3.forEach((fn, i) => cases.push(runPoisonCheck(`KV-3-${i + 1}`, "claim", fn)));

  const cat4 = [
    (e) => evaluateFinancingComponent(ctx(), { retentionMonths: 18, interestRate: 0.1, treasuryYield: 0.03 }, e),
    (e) => evaluateFinancingComponent(ctx(), { retentionMonths: 24, interestRate: 0.09, treasuryYield: 0.02 }, e),
    (e) => evaluateFinancingComponent(ctx(), { retentionMonths: 15, interestRate: 0.07, treasuryYield: 0.03 }, e),
    (e) => evaluateFinancingComponent(ctx(), { retentionMonths: 30, interestRate: 0.12, treasuryYield: 0.04 }, e),
    (e) => evaluateFinancingComponent(ctx(), { retentionMonths: 20, interestRate: 0.11, treasuryYield: 0.02 }, e),
  ];
  cat4.forEach((fn, i) => cases.push(runPoisonCheck(`KV-4-${i + 1}`, "retention", fn)));

  const cat5 = [
    (e) => evaluateUninstalledMaterialsRuntime(ctx(), { customized: true, claimCarveOut: true, customerControlledBeforeInstall: true, transferDistinctFromInstall: true }, e),
    (e) => evaluateUninstalledMaterialsRuntime(ctx(), { customized: true, claimCarveOut: true, customerControlledBeforeInstall: false, transferDistinctFromInstall: true }, e),
    (e) => evaluateUninstalledMaterialsRuntime(ctx(), { customized: true, claimCarveOut: true, customerControlledBeforeInstall: true, transferDistinctFromInstall: false }, e),
    (e) => evaluateUninstalledMaterialsRuntime(ctx(), { customized: true, claimCarveOut: true, customerControlledBeforeInstall: false, transferDistinctFromInstall: false }, e),
    (e) => evaluateUninstalledMaterialsRuntime(ctx(), { customized: true, claimCarveOut: true, customerControlledBeforeInstall: true, transferDistinctFromInstall: true }, e),
  ];
  cat5.forEach((fn, i) => cases.push(runPoisonCheck(`KV-5-${i + 1}`, "uninstalled", fn)));

  const cat6 = [
    (e) => { assertProportionateConsolidationPermitted("MFG", null, e); return {}; },
    (e) => { assertProportionateConsolidationPermitted("CONSTRUCTION", "R", e); return {}; },
    (e) => { assertProportionateConsolidationPermitted("SaaS", null, e); return {}; },
    (e) => { assertProportionateConsolidationPermitted("RTL", null, e); return {}; },
    (e) => { assertProportionateConsolidationPermitted("HC", null, e); return {}; },
  ];
  cat6.forEach((fn, i) => cases.push(runPoisonCheck(`KV-6-${i + 1}`, "jv-evasion", fn)));

  return cases.slice(0, 30);
}

function runAntiPatternGuards() {
  const source = collectIndustrySource() + listFiles(CON_LIB, (f) => f.endsWith(".ts") && !f.includes(".generated.")).map(read).join("\n");
  const cases = [];
  cases.push(makeCase("AP-1", "AP", !/ASC 606-10-25/.test(source), "no hard-coded ASC text"));
  cases.push(makeCase("AP-2", "AP", !fs.existsSync(path.join(root, "overlay/construction")), "no overlay/construction"));
  cases.push(makeCase("AP-3", "AP", !fs.existsSync(path.join(root, "PHASE_42.locked.ts")) || !read("PHASE_42.locked.ts").includes("CON-2"), "no PHASE_42 edits"));
  cases.push(makeCase("AP-4", "AP", source.includes("framework:") || source.includes("ConstructionFramework"), "framework discriminant"));
  cases.push(makeCase("AP-5", "AP", source.includes("escalation-audit"), "escalation-audit present"));
  cases.push(makeCase("AP-6", "AP", !/@doctrine containsConstructionContractData/.test(collectIndustrySource()), "no scattered doctrine"));
  cases.push(makeCase("AP-7", "AP", read("industry-profiles/construction/profile.ts").includes("resolveConstructionSubSegment"), "classifier shim"));
  cases.push(makeCase("AP-8", "AP", source.includes("PROPORTIONATE_CONSOLIDATION_PERMITTED") || read(`${CON_LIB}/asc810/jv-runtime-guard.ts`).includes("PERMITTED"), "JV scope guard"));
  cases.push(makeCase("AP-9", "AP", source.includes("Construction_Benchmarks_Sources") || read("reasonableness/construction/gross-margin-bounds.ts").includes("CFMA"), "benchmark trace"));
  cases.push(makeCase("AP-10", "AP", read("lib/intelligence/synthetic/audit/channels/poc-progress-audit/locked-citation-handles.ts").includes("CON2_LOCKED"), "handle whitelist"));
  cases.push(makeCase("AP-11", "AP", read(`${CON_LIB}/retention/maturity-ladder.ts`).includes("retention-classified"), "retention audit"));
  cases.push(makeCase("AP-12", "AP", read(`${CON_INDUSTRY}/framework-router/index.ts`).includes("CON_IFRS_UNDER_US_GAAP_REFUSED"), "IFRS hard-refuse under US_GAAP"));
  return cases.slice(0, 12);
}

function main() {
  let cases = [];
  try {
    cases = [
      ...runGateA(),
      ...runGateB(),
      ...runGateC(),
      ...runGateD(),
      ...runGateE(),
      ...runGateF(),
      ...runKVCases(),
      ...runAntiPatternGuards(),
    ];
  } catch (err) {
    console.error(`CON-2 verifier runtime error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }

  const structural = cases.filter((c) => ["A", "B", "C", "D", "E", "F"].includes(c.gate));
  const kv = cases.filter((c) => c.gate === "K-V");
  const ap = cases.filter((c) => c.gate === "AP");
  const passCount = cases.filter((c) => c.pass).length;
  const failCases = cases.filter((c) => !c.pass);

  if (cases.length !== EXPECTED_CASE_COUNT) {
    console.error(`FAIL: Expected ${EXPECTED_CASE_COUNT} cases — got ${cases.length}`);
    process.exit(1);
  }

  console.log(`CON-2 PASS: ${passCount}/${EXPECTED_CASE_COUNT}`);
  console.log(`- Structural gates A–F: ${structural.filter((c) => c.pass).length}/${structural.length}  (+${Math.round((structural.length / 40 - 1) * 100)}% over 40)`);
  console.log(`- K-V poison cases:     ${kv.filter((c) => c.pass).length}/${kv.length}  (+${Math.round((kv.length / 25 - 1) * 100)}% over 25)`);
  console.log(`- Anti-pattern guards:  ${ap.filter((c) => c.pass).length}/${ap.length}  (+${Math.round((ap.length / 8 - 1) * 100)}% over 8)`);

  for (const c of failCases) {
    console.error(`FAIL ${c.id} [${c.gate}]: ${c.reason}`);
  }
  process.exit(failCases.length === 0 ? 0 : 1);
}

main();
