/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Phase SAAS-1 — SaaS Wave 1 Reconnaissance Verifier
 * 5 structural gates A–E, 15 cases total.
 */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "../..");
const SAAS_ROOT = "lib/intelligence/synthetic/libraries/saas";
const PROFILE_PATH = "industry-profiles/saas/profile.ts";
const CHANNELS_DIR = "lib/intelligence/synthetic/audit/channels";

const MODULE_DIRS = [
  SAAS_ROOT,
  "kpi/saas-arr",
  "kpi/saas-retention",
  "kpi/saas-efficiency",
  "disclosure-variants/saas",
  "reasonableness/saas",
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
  const samples = ["ASC.606-10-25-27", "IFRS15.Page", "AICPA.TSC.SOC2"];
  return samples.map((handleId, index) => {
    let pass = false;
    let reason = "";
    try {
      const resolved = mod.resolveSaasCitationHandle(handleId);
      pass = resolved.url.startsWith("https://") || resolved.url.startsWith("http://");
      reason = pass ? resolved.url : "non-http url";
    } catch (err) {
      reason = err.message;
    }
    return makeCase(`A-${index + 1}`, "A", pass, reason);
  });
}

function runGateB(mod) {
  const segments = mod.listSaasSubSegmentIds();
  const expected = ["P", "H", "U", "F", "V"];
  const cases = [];
  cases.push(makeCase("B-1", "B", segments.length === 5, `segment count ${segments.length}`));
  cases.push(makeCase("B-2", "B", expected.every((s) => segments.includes(s)), "P/H/U/F/V present"));
  try {
    mod.getSaasSubSegment({ containsSaaSARRData: true }, "Z");
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
  const taggedRevenue = listFiles(`${SAAS_ROOT}/revenue/saas`, (f) => f.endsWith(".ts"));
  const withFlag = taggedRevenue.filter((f) => read(f).includes("@doctrine containsSaaSARRData: true"));
  const doctrineBus = read("lib/intelligence/synthetic/standards/doctrine/containsSaaSARRData.ts");
  return [
    makeCase("C-1", "C", withFlag.length === 5, `doctrine flag on ${withFlag.length} tagged revenue/saas modules (expect 5)`),
    makeCase("C-2", "C", doctrineBus.includes("assertContainsSaaSARRData") && !source.includes("DoctrineBinding"), "doctrine bus + no global DoctrineBinding union"),
    makeCase("C-3", "C", files.every((f) => read(f).includes("@spec Phase_SAAS_1_Recon_Spec.md")), "spec header on all modules"),
  ];
}

function runGateD(mod) {
  const profile = loadTsModule(PROFILE_PATH);
  const frameworks = profile.SAAS_FRAMEWORKS || profile.saasWave1Profile?.frameworks;
  const kfPoints = mod.SAAS_KF_DISCRIMINATED_POINTS || [];
  return [
    makeCase("D-1", "D", Array.isArray(frameworks), "frameworks array declared"),
    makeCase(
      "D-2",
      "D",
      frameworks.includes("US_GAAP") && frameworks.includes("IFRS"),
      "US_GAAP + IFRS dual-framework",
    ),
    makeCase("D-3", "D", kfPoints.length === 5, `K-F discriminated points ${kfPoints.length} (expect 5)`),
  ];
}

function runGateE() {
  const channelsMod = loadTsModule(`${CHANNELS_DIR}/index.ts`);
  const arrMod = loadTsModule(`${CHANNELS_DIR}/arr-mrr-audit/index.ts`);
  const channelCount = channelsMod.AUDIT_CHANNEL_COUNT;
  const registry = channelsMod.AUDIT_CHANNEL_REGISTRY || [];
  const hasArrMrrChannel = registry.includes("arr-mrr-audit");
  const profile = read(PROFILE_PATH);
  const wireFile = read(`${SAAS_ROOT}/audit/channels/arr-mrr-audit.ts`);
  return [
    makeCase("E-1", "E", channelCount === 10, `audit channel registry count ${channelCount} (expect 10)`),
    makeCase(
      "E-2",
      "E",
      hasArrMrrChannel &&
        arrMod.arrMrrAuditChannel.defaultOn === true &&
        arrMod.arrMrrAuditChannel.retentionYears === 7 &&
        arrMod.arrMrrAuditChannel.hashChain === true,
      "arr-mrr-audit default-ON 7yr hash-chained",
    ),
    makeCase(
      "E-3",
      "E",
      profile.includes("arr-mrr-audit") && wireFile.includes("arr-mrr-audit"),
      "arr-mrr-audit wired in profile + library re-export",
    ),
  ];
}

function runKvCases(mod) {
  const cases = [];
  const kvRoot = "architecture-lane/k-v-cases/saas-1";
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
  const mod = loadTsModule(`${SAAS_ROOT}/index.ts`);
  const source = collectModuleSources();

  const gateCases = [
    ...runGateA(mod),
    ...runGateB(mod),
    ...runGateC(source),
    ...runGateD(mod),
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
    console.error(`SAAS-1 FAIL: ${passCount}/15`);
    process.exit(1);
  }

  mod.assertSaasHandleCountFloor(80);
  const kvPass = kvCases.filter((c) => c.pass).length;
  if (kvCases.length < 15) {
    console.error(`FAIL: Expected 15+ K-V cases — got ${kvCases.length}`);
    process.exit(1);
  }
  if (kvPass !== kvCases.length) {
    kvCases.filter((c) => !c.pass).forEach((c) => {
      console.error(`FAIL KV ${c.id}: ${c.reason}`);
    });
    console.error(`FAIL: K-V cases ${kvPass}/${kvCases.length}`);
    process.exit(1);
  }

  console.log(`SAAS-1 PASS: 15/15`);
  console.log(`K-V seed cases: ${kvPass}/${kvCases.length} PASS`);
  console.log(`Handle registry: ${mod.SAAS_CITATION_HANDLE_COUNT} handles`);
}

main();
