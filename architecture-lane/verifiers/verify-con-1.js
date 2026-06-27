/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase CON-1 — Construction Wave 1 Reconnaissance Verifier
 * 5 structural gates A–E, 15 cases total.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const CON_ROOT = "lib/intelligence/synthetic/libraries/construction";
const PROFILE_PATH = "industry-profiles/construction/profile.ts";
const CHANNELS_DIR = "lib/intelligence/synthetic/audit/channels";

const MODULE_DIRS = [
  CON_ROOT,
  "kpi/construction-revenue",
  "kpi/construction-progress",
  "kpi/construction-liquidity",
  "kpi/construction-profitability",
  "kpi/construction-bonding",
  "disclosure-variants/construction",
  "reasonableness/construction",
  PROFILE_PATH,
];

let typeScriptLoaderRegistered = false;

function read(relativeOrAbsolute) {
  const absolute = path.isAbsolute(relativeOrAbsolute)
    ? relativeOrAbsolute
    : path.join(root, relativeOrAbsolute);
  return fs.readFileSync(absolute, "utf8");
}

function listFiles(directory, predicate = () => true) {
  const absolute = path.isAbsolute(directory) ? directory : path.join(root, directory);
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

function loadTsModule(relativePath) {
  ensureTypeScriptLoader();
  return require(path.join(root, relativePath));
}

function makeCase(id, gate, pass, reason, escalationAudits = []) {
  return { id, gate, pass, reason, escalationAudits, outcome: pass ? "PASS" : "FAIL" };
}

function collectModuleSources() {
  return MODULE_DIRS.flatMap((dir) => {
    if (dir.endsWith(".ts")) return [read(dir)];
    return listFiles(dir, (f) => f.endsWith(".ts")).map(read);
  }).join("\n");
}

function runGateA(mod) {
  const samples = ["ASC.606-10-25-27", "IFRS15.Page", "AICPA.AAG-CON"];
  return samples.map((handleId, index) => {
    let pass = false;
    let reason = "";
    try {
      const resolved = mod.resolveConstructionCitationHandle(handleId);
      pass = resolved.url.startsWith("https://") || resolved.url.startsWith("http://");
      reason = pass ? resolved.url : "non-http url";
    } catch (err) {
      reason = err.message;
    }
    return makeCase(`A-${index + 1}`, "A", pass, reason);
  });
}

function runGateB(mod) {
  const segments = mod.listConstructionSubSegmentIds();
  const expected = ["G", "S", "R", "C", "H", "D"];
  const cases = [];
  cases.push(makeCase("B-1", "B", segments.length === 6, `segment count ${segments.length}`));
  cases.push(makeCase("B-2", "B", expected.every((s) => segments.includes(s)), "G/S/R/C/H/D present"));
  try {
    mod.getConstructionSubSegment("Z");
    cases.push(makeCase("B-3", "B", false, "silent reject for unknown segment"));
  } catch (err) {
    const audits = err.escalationAudits || [];
    cases.push(
      makeCase(
        "B-3",
        "B",
        audits.length > 0,
        audits.length > 0 ? "escalation-audit on unknown segment" : "missing escalation-audit",
        audits,
      ),
    );
  }
  return cases;
}

function runGateC(source) {
  const files = MODULE_DIRS.flatMap((dir) => {
    if (dir.endsWith(".ts")) return [dir];
    return listFiles(dir, (f) => f.endsWith(".ts") && !f.includes(".generated."));
  });
  const withFlag = files.filter((f) => read(f).includes("containsConstructionContractData: true"));
  return [
    makeCase("C-1", "C", withFlag.length >= 40, `doctrine flag in ${withFlag.length} modules`),
    makeCase("C-2", "C", !source.includes("DoctrineBinding"), "no global DoctrineBinding union"),
    makeCase("C-3", "C", files.every((f) => read(f).includes("@spec Phase_CON_1_Recon_Spec.md")), "spec header on all modules"),
  ];
}

function runGateD() {
  const profile = loadTsModule(PROFILE_PATH);
  const frameworks = profile.CONSTRUCTION_FRAMEWORKS || profile.constructionWave1Profile?.frameworks;
  const cases = [];
  cases.push(makeCase("D-1", "D", Array.isArray(frameworks), "frameworks array declared"));
  cases.push(
    makeCase(
      "D-2",
      "D",
      frameworks.includes("US_GAAP") && frameworks.includes("IFRS"),
      "US_GAAP + IFRS dual-framework",
    ),
  );
  cases.push(
    makeCase(
      "D-3",
      "D",
      profile.constructionWave1Profile?.staticOnly === true,
      "static profile only (no runtime classifier)",
    ),
  );
  return cases;
}

function runGateE() {
  const channelsMod = loadTsModule(`${CHANNELS_DIR}/index.ts`);
  const channelCount = channelsMod.AUDIT_CHANNEL_COUNT;
  const registry = channelsMod.AUDIT_CHANNEL_REGISTRY || [];
  const hasPocChannel = registry.includes("poc-progress-audit");
  const channelFiles = listFiles(CHANNELS_DIR, (f) => f.endsWith(".ts") && !f.endsWith("index.ts"));
  const profile = read(PROFILE_PATH);
  return [
    makeCase("E-1", "E", channelCount === 7, `audit channel registry count ${channelCount} (expect 7)`),
    makeCase("E-2", "E", !hasPocChannel && !channelFiles.some((f) => f.includes("poc-progress-audit")), "poc-progress-audit channel not created in CON-1"),
    makeCase("E-3", "E", profile.includes("poc-progress-audit"), "channel surface reserved in profile"),
  ];
}

function runKvCases(mod) {
  const cases = [];
  const kvRoot = "architecture-lane/k-v-cases/con-1";
  const kvFiles = listFiles(kvRoot, (f) => f.endsWith(".ts"));

  for (const file of kvFiles) {
    const kv = loadTsModule(file);
    const runners =
      typeof kv.runCases === "function"
        ? kv.runCases(mod)
        : typeof kv.runCase === "function"
          ? [kv.runCase(mod)]
          : [];
    for (const result of runners) {
      cases.push(
        makeCase(
          result.id,
          "KV",
          result.pass,
          result.reason,
          result.escalationAudits || [],
        ),
      );
    }
  }
  return cases;
}

function main() {
  const mod = loadTsModule(`${CON_ROOT}/index.ts`);
  const source = collectModuleSources();

  const gateCases = [
    ...runGateA(mod),
    ...runGateB(mod),
    ...runGateC(source),
    ...runGateD(),
    ...runGateE(),
  ];

  const kvCases = runKvCases(mod);
  const structuralCases = gateCases.filter((c) => ["A", "B", "C", "D", "E"].includes(c.gate));
  const passCount = structuralCases.filter((c) => c.pass).length;

  structuralCases.filter((c) => !c.pass).forEach((c) => {
    console.error(`FAIL ${c.id} [${c.gate}]: ${c.reason}`);
  });

  if (structuralCases.length !== 15) {
    console.error(`FAIL: Expected 15 structural cases — got ${structuralCases.length}`);
    process.exit(1);
  }

  if (passCount !== 15) {
    console.error(`CON-1 FAIL: ${passCount}/15`);
    process.exit(1);
  }

  mod.assertConstructionHandleCountFloor(109);
  const kvPass = kvCases.filter((c) => c.pass).length;
  if (kvCases.length < 15) {
    console.error(`FAIL: Expected 15+ K-V cases — got ${kvCases.length}`);
    process.exit(1);
  }

  console.log(`CON-1 PASS: 15/15`);
  console.log(`K-V seed cases: ${kvPass}/${kvCases.length} PASS`);
  console.log(`Handle registry: ${mod.CONSTRUCTION_CITATION_HANDLE_COUNT} handles`);
}

main();
