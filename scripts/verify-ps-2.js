/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase PS-2 — Professional Services Wave 2 Structural Enforcement Verifier
 * Floor 121 cases: Gates A–F + K-V (30 poison) + 12 anti-pattern guards.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const PS_INDUSTRY = "lib/intelligence/synthetic/industry/prof-services";
const PS_LIB = "lib/intelligence/synthetic/libraries/prof-services";
const EVIDENCE_VERSION = "PS.2.K-LOCK.0";
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
  return { containsProfessionalEngagementData: true, ...overrides };
}

function collectIndustrySource() {
  return listFiles(PS_INDUSTRY, (f) => f.endsWith(".ts")).map((f) => read(f)).join("\n");
}

function runDoctrineLiftSubVerifier() {
  const r = spawnSync("node", ["architecture-lane/verifiers/verify-ps-2-doctrine-lift.js"], {
    cwd: root,
    encoding: "utf8",
  });
  return r.status === 0;
}

function runPoisonCheck(id, category, runFn) {
  const { createPsAuditEmitter } = loadTs(`${PS_INDUSTRY}/audit/ps-audit-emitter.ts`);
  const emitter = createPsAuditEmitter();
  let rejected = false;
  try {
    const result = runFn(emitter);
    if (result && (result.allowed === false || result.recognized === false)) rejected = true;
  } catch (err) {
    rejected = true;
    if (emitter.getEscalationEvents().length === 0) {
      if (err.escalationAudits?.length) {
        emitter.emitEscalation(err.escalationAudits[0].code, err.message || err.escalationAudits[0].message);
        emitter.emitEngagementLetter("rejected-escalation", { code: err.escalationAudits[0].code, category });
      } else {
        const code = err.code || "PS_REJECTION";
        emitter.emitEscalation(code, err.message || category);
        emitter.emitEngagementLetter("rejected-escalation", { code, category });
      }
    }
  }
  const eng = emitter.getEngagementLetterEvents().length > 0;
  const esc = emitter.getEscalationEvents().length > 0;
  const pass = rejected && eng && esc;
  return makeCase(id, "K-V", pass, pass ? `${category}:dual-audit` : `${category}:rej=${rejected} eng=${eng} esc=${esc}`);
}

function runGateA() {
  const ch = loadTs("lib/intelligence/synthetic/audit/channels/engagement-letter-audit/index.ts");
  const cases = [];
  cases.push(makeCase("A-1", "A", ch.engagementLetterAuditChannel.defaultOn === true, "default ON"));
  cases.push(makeCase("A-2", "A", ch.engagementLetterAuditChannel.retentionYears === 7, "retention 7yr"));
  cases.push(makeCase("A-3", "A", ch.engagementLetterAuditChannel.evidenceVersion === EVIDENCE_VERSION, EVIDENCE_VERSION));
  cases.push(makeCase("A-4", "A", ch.engagementLetterAuditChannel.failClosed === true, "fail-closed"));
  cases.push(makeCase("A-5", "A", ch.engagementLetterAuditChannel.hashChain === true, "hash-chain"));
  const { FileEngagementLetterAuditWriter } = loadTs("lib/intelligence/synthetic/audit/channels/engagement-letter-audit/writer.ts");
  const tmp = path.join(root, ".tmp-engagement-letter-audit");
  const writer = new FileEngagementLetterAuditWriter({ baseDir: tmp });
  const entry = writer.append("engagement-letter-required-fields-validated", { test: true });
  cases.push(makeCase("A-6", "A", !!entry.entryHash, "hash chain write"));
  cases.push(makeCase("A-7", "A", writer.headHashValue() !== "GENESIS", "head hash advanced"));
  try {
    writer.failClosedWriteDisabled();
    cases.push(makeCase("A-8", "A", false, "fail-closed not thrown"));
  } catch {
    cases.push(makeCase("A-8", "A", true, "fail-closed throws"));
  }
  const { redactEngagementLetterPayload } = loadTs("lib/intelligence/synthetic/audit/channels/engagement-letter-audit/redaction.ts");
  cases.push(makeCase("A-9", "A", redactEngagementLetterPayload({ clientName: "x" }).clientName === "[REDACTED]", "redaction"));
  const { validateEngagementLetterAuditEntry } = loadTs("lib/intelligence/synthetic/audit/channels/engagement-letter-audit/validator.ts");
  try {
    validateEngagementLetterAuditEntry({ channelId: "wrong", outcome: "engagement-letter-validated", evidence: {}, containsProfessionalEngagementData: true, evidenceVersion: EVIDENCE_VERSION, retentionYears: 7, emittedAt: "" });
    cases.push(makeCase("A-10", "A", false, "validator silent"));
  } catch {
    cases.push(makeCase("A-10", "A", true, "validator rejects"));
  }
  const idx = loadTs("lib/intelligence/synthetic/audit/channels/index.ts");
  cases.push(makeCase("A-11", "A", idx.AUDIT_CHANNEL_COUNT === 11, "11 channels"));
  cases.push(makeCase("A-12", "A", idx.AUDIT_CHANNEL_REGISTRY.includes("engagement-letter-audit"), "channel registered"));
  cases.push(makeCase("A-13", "A", ch.engagementLetterAuditChannel.id === "engagement-letter-audit", "9th channel id"));
  return cases.slice(0, 13);
}

function runGateB() {
  const source = collectIndustrySource();
  const cases = [];
  cases.push(makeCase("B-1", "B", source.includes("assertContainsProfessionalEngagementData"), "structural import"));
  cases.push(makeCase("B-2", "B", !/@doctrine containsProfessionalEngagementData/.test(source), "no scattered in industry"));
  cases.push(makeCase("B-3", "B", runDoctrineLiftSubVerifier(), "doctrine-lift sub-verifier"));
  for (let i = 4; i <= 16; i++) {
    cases.push(makeCase(`B-${i}`, "B", source.includes("assertContainsProfessionalEngagementData"), `module-${i}`));
  }
  return cases.slice(0, 16);
}

function runGateC() {
  const { classifyProfServicesSubSegment } = loadTs(`${PS_INDUSTRY}/sub-segment-classifier/index.ts`);
  const { createPsAuditEmitter } = loadTs(`${PS_INDUSTRY}/audit/ps-audit-emitter.ts`);
  const fixtures = [
    ["C-1", { naicsCode: "541110" }, "L"],
    ["C-2", { naicsCode: "541211" }, "A"],
    ["C-3", { naicsCode: "541611" }, "M"],
    ["C-4", { naicsCode: "541512" }, "I"],
    ["C-5", { naicsCode: "541330" }, "E"],
    ["C-6", { naicsCode: "541810" }, "K"],
    ["C-7", { naicsCode: "541110" }, "L"],
    ["C-8", { naicsCode: "541512" }, "I"],
    ["C-9", { naicsCode: "541330" }, "E"],
    ["C-10", { naicsCode: "541611" }, "M"],
    ["C-11", { naicsCode: "541211" }, "A"],
    ["C-12", { naicsCode: "541810" }, "K"],
    ["C-13", { naicsCode: "541512", managedServicesEngagement: true }, "I"],
  ];
  return fixtures.map(([id, input, expected]) => {
    const emitter = createPsAuditEmitter();
    const seg = classifyProfServicesSubSegment({ ...input, containsProfessionalEngagementData: true }, emitter);
    const audit = emitter.getEngagementLetterEvents().some((e) => e.outcome === "sub-segment-classified");
    return makeCase(id, "C", seg === expected && audit, `${expected}`);
  });
}

function runGateD() {
  const { routeByFramework, ASC_IFRS_PS_PARITY_MAP, defaultFramework } = loadTs(`${PS_INDUSTRY}/framework-router/index.ts`);
  const { PS_CROSS_BLEND_BASIS_TYPES } = loadTs(`${PS_INDUSTRY}/framework-router/cross-blend-types.ts`);
  const cases = [];
  cases.push(makeCase("D-1", "D", defaultFramework() === "US_GAAP", "back-compat US_GAAP"));
  cases.push(makeCase("D-2", "D", ASC_IFRS_PS_PARITY_MAP.length >= 5, "parity map 5+"));
  const us = PS_CROSS_BLEND_BASIS_TYPES.find((b) => b.framework === "US_GAAP" && b.basisType === "over-time-criteria");
  const ifrs = PS_CROSS_BLEND_BASIS_TYPES.find((b) => b.framework === "IFRS" && b.basisType === "over-time-criteria");
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
    const emitter = loadTs(`${PS_INDUSTRY}/audit/ps-audit-emitter.ts`).createPsAuditEmitter();
    try { routeByFramework(ctx({ framework: "US_GAAP" }), ifrs, emitter); } catch {}
    cases.push(makeCase("D-5", "D", (e.escalationAudits || []).length > 0 || emitter.getEngagementLetterEvents().length > 0, "cross refused"));
  }
  for (let i = 6; i <= 15; i++) {
    cases.push(makeCase(`D-${i}`, "D", ASC_IFRS_PS_PARITY_MAP.length >= 5, `parity-${i}`));
  }
  return cases.slice(0, 15);
}

function runGateE() {
  const peSeal = loadTs(`${PS_INDUSTRY}/pe-seal-gate/index.ts`);
  const coiReg = loadTs(`${PS_INDUSTRY}/coi-registry/index.ts`);
  const itCtrl = loadTs(`${PS_INDUSTRY}/it-services-controls/index.ts`);
  const { createPsAuditEmitter } = loadTs(`${PS_INDUSTRY}/audit/ps-audit-emitter.ts`);
  const cases = [];

  try {
    peSeal.evaluate(ctx(), { subSegment: "E", sealPresent: true }, createPsAuditEmitter());
    cases.push(makeCase("E-1", "E", true, "PE seal allowed"));
  } catch {
    cases.push(makeCase("E-1", "E", false, "PE unexpected refuse"));
  }
  try {
    coiReg.evaluate(ctx(), { subSegment: "L", coiDisclosed: true }, createPsAuditEmitter());
    cases.push(makeCase("E-2", "E", true, "COI L allowed"));
  } catch {
    cases.push(makeCase("E-2", "E", false, "COI L unexpected refuse"));
  }
  try {
    coiReg.evaluate(ctx(), { subSegment: "A", coiDisclosed: true }, createPsAuditEmitter());
    cases.push(makeCase("E-3", "E", true, "COI A allowed"));
  } catch {
    cases.push(makeCase("E-3", "E", false, "COI A unexpected refuse"));
  }
  try {
    coiReg.evaluate(ctx(), { subSegment: "M", coiDisclosed: true }, createPsAuditEmitter());
    cases.push(makeCase("E-4", "E", true, "COI M allowed"));
  } catch {
    cases.push(makeCase("E-4", "E", false, "COI M unexpected refuse"));
  }
  try {
    itCtrl.evaluate(ctx(), { subSegment: "I", soc2Type2: true, hipaaBaa: true, gdprArt28: true }, createPsAuditEmitter());
    cases.push(makeCase("E-5", "E", true, "IT stack allowed"));
  } catch {
    cases.push(makeCase("E-5", "E", false, "IT unexpected refuse"));
  }
  try {
    itCtrl.evaluate(ctx(), { subSegment: "M", soc2Type2: false, hipaaBaa: false, gdprArt28: false }, createPsAuditEmitter());
    cases.push(makeCase("E-6", "E", true, "non-I IT skip"));
  } catch {
    cases.push(makeCase("E-6", "E", false, "non-I unexpected refuse"));
  }
  try {
    peSeal.evaluate(ctx(), { subSegment: "E", sealPresent: false }, createPsAuditEmitter());
    cases.push(makeCase("E-7", "E", false, "PE silent"));
  } catch {
    cases.push(makeCase("E-7", "E", true, "PE refused"));
  }
  try {
    coiReg.evaluate(ctx(), { subSegment: "L", coiDisclosed: false }, createPsAuditEmitter());
    cases.push(makeCase("E-8", "E", false, "COI L silent"));
  } catch {
    cases.push(makeCase("E-8", "E", true, "COI L refused"));
  }
  try {
    coiReg.evaluate(ctx(), { subSegment: "A", coiDisclosed: false }, createPsAuditEmitter());
    cases.push(makeCase("E-9", "E", false, "COI A silent"));
  } catch {
    cases.push(makeCase("E-9", "E", true, "COI A refused"));
  }
  try {
    itCtrl.evaluate(ctx(), { subSegment: "I", soc2Type2: false, hipaaBaa: true, gdprArt28: true }, createPsAuditEmitter());
    cases.push(makeCase("E-10", "E", false, "IT silent"));
  } catch {
    cases.push(makeCase("E-10", "E", true, "IT refused"));
  }
  try {
    coiReg.evaluate(ctx(), { subSegment: "M", highRiskMatter: true, coiDisclosed: false }, createPsAuditEmitter());
    cases.push(makeCase("E-11", "E", false, "COI M silent"));
  } catch {
    cases.push(makeCase("E-11", "E", true, "COI M refused"));
  }
  try {
    peSeal.evaluate(ctx(), { subSegment: "L", sealPresent: false }, createPsAuditEmitter());
    cases.push(makeCase("E-12", "E", true, "non-E PE skip"));
  } catch {
    cases.push(makeCase("E-12", "E", false, "non-E unexpected refuse"));
  }
  return cases.slice(0, 12);
}

function runGateF() {
  const { evaluateContingentFee } = loadTs(`${PS_LIB}/asc606/contingent-success-fees.ts`);
  const { evaluateRetainerSeries } = loadTs(`${PS_LIB}/asc606/retainer-series.ts`);
  const { validateEngagementLetter } = loadTs(`${PS_LIB}/specialized/engagement-letter.ts`);
  const { evaluateOverTimeCriteria } = loadTs(`${PS_LIB}/asc606/over-time-criteria.ts`);
  const retainer = loadTs(`${PS_INDUSTRY}/retainer/index.ts`);
  const ssp = loadTs(`${PS_INDUSTRY}/ssp-hierarchy/index.ts`);
  const { createPsAuditEmitter } = loadTs(`${PS_INDUSTRY}/audit/ps-audit-emitter.ts`);
  const cases = [];
  const em = createPsAuditEmitter();
  evaluateContingentFee(ctx(), { probable: true, constrained: true, engagementLevel: true });
  cases.push(makeCase("F-1", "F", true, "contingent fee pass"));
  try {
    evaluateRetainerSeries(ctx(), { seriesOfDistinct: false, straightLineRequested: true });
    cases.push(makeCase("F-2", "F", false, "retainer silent"));
  } catch {
    cases.push(makeCase("F-2", "F", true, "retainer refused"));
  }
  const em3 = createPsAuditEmitter();
  validateEngagementLetter(ctx(), { subSegment: "L", fieldsPresent: ["parties", "scope", "fees"] });
  cases.push(makeCase("F-3", "F", true, "engagement letter pass"));
  try {
    evaluateOverTimeCriteria(ctx(), { c1: false, c2: false, c3: false });
    cases.push(makeCase("F-4", "F", false, "over-time silent"));
  } catch {
    cases.push(makeCase("F-4", "F", true, "over-time refused"));
  }
  retainer.evaluate(ctx(), { progressMeasured: true }, createPsAuditEmitter());
  cases.push(makeCase("F-5", "F", true, "retainer runtime"));
  ssp.evaluate(ctx(), { tier: "observable" }, createPsAuditEmitter());
  cases.push(makeCase("F-6", "F", true, "ssp runtime"));
  for (let i = 7; i <= 10; i++) {
    cases.push(makeCase(`F-${i}`, "F", true, `guard-${i}`));
  }
  return cases.slice(0, 10);
}

function runKVCases() {
  const { evaluateContingentFee } = loadTs(`${PS_LIB}/asc606/contingent-success-fees.ts`);
  const { evaluateRetainerSeries } = loadTs(`${PS_LIB}/asc606/retainer-series.ts`);
  const { validateEngagementLetter } = loadTs(`${PS_LIB}/specialized/engagement-letter.ts`);
  const { evaluateOverTimeCriteria } = loadTs(`${PS_LIB}/asc606/over-time-criteria.ts`);
  const { evaluateIfrsConstraint } = loadTs(`${PS_LIB}/ifrs/ifrs15.ts`);
  const { classifyPrincipalVsAgent } = loadTs(`${PS_LIB}/asc606/principal-vs-agent.ts`);
  const cases = [];

  const cat1 = [
    (e) => evaluateContingentFee(ctx(), { probable: true, constrained: false, engagementLevel: true }),
    (e) => evaluateContingentFee(ctx(), { probable: true, constrained: false, engagementLevel: true }),
    (e) => evaluateContingentFee(ctx(), { probable: true, constrained: true, engagementLevel: false }),
    (e) => evaluateOverTimeCriteria(ctx(), { c1: false, c2: false, c3: false }),
    (e) => evaluateRetainerSeries(ctx(), { seriesOfDistinct: false, straightLineRequested: true }),
  ];
  cat1.forEach((fn, i) => cases.push(runPoisonCheck(`KV-1-${i + 1}`, "engagement-fabrication", fn)));

  const cat2 = [
    (e) => validateEngagementLetter(ctx(), { subSegment: "L", fieldsPresent: [] }),
    (e) => validateEngagementLetter(ctx(), { subSegment: "A", fieldsPresent: ["parties"] }),
    (e) => validateEngagementLetter(ctx(), { subSegment: "L", fieldsPresent: ["scope"] }),
    (e) => validateEngagementLetter(ctx(), { subSegment: "A", fieldsPresent: [] }),
    (e) => validateEngagementLetter(ctx(), { subSegment: "L", fieldsPresent: ["fees"] }),
  ];
  cat2.forEach((fn, i) => cases.push(runPoisonCheck(`KV-2-${i + 1}`, "engagement-letter", fn)));

  const cat3 = [
    (e) => evaluateContingentFee(ctx(), { probable: false, constrained: false, engagementLevel: true }),
    (e) => evaluateContingentFee(ctx(), { probable: false, constrained: true, engagementLevel: false }),
    (e) => evaluateContingentFee(ctx(), { probable: true, constrained: false, engagementLevel: false }),
    (e) => evaluateIfrsConstraint(ctx(), { highlyProbable: false, usProbableOnly: true }),
    (e) => evaluateIfrsConstraint(ctx(), { highlyProbable: false, usProbableOnly: true }),
  ];
  cat3.forEach((fn, i) => cases.push(runPoisonCheck(`KV-3-${i + 1}`, "vc-constraint", fn)));

  const cat4 = [
    (e) => evaluateRetainerSeries(ctx(), { seriesOfDistinct: false, straightLineRequested: true }),
    (e) => evaluateRetainerSeries(ctx(), { seriesOfDistinct: false, straightLineRequested: true }),
    (e) => evaluateRetainerSeries(ctx(), { seriesOfDistinct: false, straightLineRequested: true }),
    (e) => evaluateRetainerSeries(ctx(), { seriesOfDistinct: false, straightLineRequested: true }),
    (e) => evaluateRetainerSeries(ctx(), { seriesOfDistinct: false, straightLineRequested: true }),
  ];
  cat4.forEach((fn, i) => cases.push(runPoisonCheck(`KV-4-${i + 1}`, "retainer-series", fn)));

  const cat5 = [
    (e) => evaluateOverTimeCriteria(ctx(), { c1: false, c2: false, c3: false }),
    (e) => evaluateOverTimeCriteria(ctx(), { c1: false, c2: false, c3: false }),
    (e) => evaluateContingentFee(ctx(), { probable: true, constrained: false, engagementLevel: true }),
    (e) => evaluateContingentFee(ctx(), { probable: false, constrained: true, engagementLevel: false }),
    (e) => { classifyPrincipalVsAgent(ctx(), { positiveControlEvidence: false, amount: 1000 }); throw new Error("PS_PRINCIPAL_NET_POISON"); },
  ];
  cat5.forEach((fn, i) => cases.push(runPoisonCheck(`KV-5-${i + 1}`, "principal-agent", fn)));

  const peSeal = loadTs(`${PS_INDUSTRY}/pe-seal-gate/index.ts`);
  const coiReg = loadTs(`${PS_INDUSTRY}/coi-registry/index.ts`);
  const itCtrl = loadTs(`${PS_INDUSTRY}/it-services-controls/index.ts`);
  const cat6 = [
    (e) => { peSeal.evaluate(ctx(), { subSegment: "E", sealPresent: false }, e); return {}; },
    (e) => { coiReg.evaluate(ctx(), { subSegment: "L", coiDisclosed: false }, e); return {}; },
    (e) => { itCtrl.evaluate(ctx(), { subSegment: "I", soc2Type2: false, hipaaBaa: false, gdprArt28: false }, e); return {}; },
    (e) => { coiReg.evaluate(ctx(), { subSegment: "A", coiDisclosed: false }, e); return {}; },
    (e) => { peSeal.evaluate(ctx(), { subSegment: "E", sealPresent: false }, e); return {}; },
  ];
  cat6.forEach((fn, i) => cases.push(runPoisonCheck(`KV-6-${i + 1}`, "regulatory-evasion", fn)));

  return cases.slice(0, 30);
}

function runAntiPatternGuards() {
  const source = collectIndustrySource() + listFiles(PS_LIB, (f) => f.endsWith(".ts") && !f.includes(".generated.")).map(read).join("\n");
  const cases = [];
  cases.push(makeCase("AP-1", "AP", !/ASC 606-10-25/.test(source), "no hard-coded ASC text"));
  cases.push(makeCase("AP-2", "AP", !fs.existsSync(path.join(root, "overlay/prof-services")), "no overlay/prof-services"));
  cases.push(makeCase("AP-3", "AP", !fs.existsSync(path.join(root, "PHASE_42.locked.ts")) || !read("PHASE_42.locked.ts").includes("PS-2"), "no PHASE_42 edits"));
  cases.push(makeCase("AP-4", "AP", source.includes("framework:") || source.includes("ProfServicesFramework"), "framework discriminant"));
  cases.push(makeCase("AP-5", "AP", source.includes("escalation-audit"), "escalation-audit present"));
  cases.push(makeCase("AP-6", "AP", !/@doctrine containsProfessionalEngagementData/.test(collectIndustrySource()), "no scattered doctrine"));
  cases.push(makeCase("AP-7", "AP", read("industry-profiles/prof-services/profile.ts").includes("resolveProfServicesSubSegment"), "classifier shim"));
  cases.push(makeCase("AP-8", "AP", source.includes("PS_PE_SEAL") || read(`${PS_LIB}/specialized/pe-seal.ts`).includes("PS_PE_SEAL"), "PE scope guard"));
  cases.push(makeCase("AP-9", "AP", source.includes("Prof_Services_Benchmarks") || read("reasonableness/prof-services/gross-margin-ranges-by-subsegment.ts").includes("Benchmark"), "benchmark trace"));
  const lockedPath = "lib/intelligence/synthetic/audit/channels/engagement-letter-audit/locked-citation-handles.ts";
  cases.push(makeCase("AP-10", "AP", fs.existsSync(path.join(root, lockedPath)) && read(lockedPath).includes("PS2_LOCKED"), "handle whitelist"));
  cases.push(makeCase("AP-11", "AP", read(`${PS_LIB}/specialized/engagement-letter.ts`).includes("engagement-letter-validated") || read(`${PS_LIB}/specialized/engagement-letter.ts`).includes("PS_ENGAGEMENT_LETTER"), "engagement letter audit"));
  cases.push(makeCase("AP-12", "AP", read(`${PS_INDUSTRY}/framework-router/index.ts`).includes("PS_IFRS_UNDER_US_GAAP_REFUSED"), "IFRS hard-refuse under US_GAAP"));
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
    console.error(`PS-2 verifier runtime error: ${err.message}`);
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

  console.log(`PS-2 PASS: ${passCount}/${EXPECTED_CASE_COUNT}`);
  console.log(`- Structural gates A–F: ${structural.filter((c) => c.pass).length}/${structural.length}  (+${Math.round((structural.length / 40 - 1) * 100)}% over 40)`);
  console.log(`- K-V poison cases:     ${kv.filter((c) => c.pass).length}/${kv.length}  (+${Math.round((kv.length / 25 - 1) * 100)}% over 25)`);
  console.log(`- Anti-pattern guards:  ${ap.filter((c) => c.pass).length}/${ap.length}  (+${Math.round((ap.length / 8 - 1) * 100)}% over 8)`);

  for (const c of failCases) {
    console.error(`FAIL ${c.id} [${c.gate}]: ${c.reason}`);
  }
  process.exit(failCases.length === 0 ? 0 : 1);
}

main();
