/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");
const ts = require("typescript");

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

const root = process.cwd();
const profiles = require("../lib/intelligence/synthetic/industry-profiles/index.ts");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (condition) pass(message);
  else fail(message);
}

const requiredExports = [
  "syntheticIndustryProfileCatalog",
  "getIndustryProfile",
  "listActiveIndustryProfiles",
  "validateIndustryProfile",
  "validateIndustryProfileCatalog",
  "healthcareProfile",
  "constructionProfile",
  "manufacturingProfile",
  "retailProfile",
  "professionalServicesProfile",
  "cpaFirmProfile",
  "bookkeeperProfile",
];

for (const exportName of requiredExports) {
  assert(profiles[exportName] !== undefined, `${exportName} exists and is exported`);
}

const requiredProfileIds = [
  "healthcare",
  "construction",
  "manufacturing",
  "retail",
  "professional_services",
  "cpa_firm",
  "bookkeeper",
];

const catalog = profiles.syntheticIndustryProfileCatalog;
assert(catalog.length === requiredProfileIds.length, "Industry profile catalog loads deterministically");
for (const profileId of requiredProfileIds) {
  const profile = profiles.getIndustryProfile({ industryProfileId: profileId, effectiveDate: "2026-06-01" });
  assert(profile?.profileStatus === "active", `${profileId} has an active profile`);
  assert(profile.version === "1.0.0" && profile.effectiveDate === "2026-01-01", `${profileId} version and effective date are valid`);
  assert(["basic", "intermediate", "advanced", "enterprise"].includes(profile.industryMaturityLevel), `${profileId} has maturity level`);
  assert(profile.kpiCatalog.length > 0, `${profileId} has KPI catalog`);
  assert(profile.thresholdCatalog.length > 0, `${profileId} has threshold catalog`);
  assert(profile.benchmarkCatalog.length > 0, `${profileId} has benchmark catalog`);
  assert(profile.seasonalityProfile?.version, `${profileId} has seasonality profile`);
  assert(profile.confidenceRules.length > 0, `${profileId} has confidence rules`);
  assert(profile.evidenceExpectations.length > 0, `${profileId} has evidence expectations`);
  assert(profile.signalExpectations.length > 0, `${profileId} has signal expectations`);
  assert(profile.recommendationExpectations.length > 0, `${profileId} has recommendation expectations`);
}

const catalogValidation = profiles.validateIndustryProfileCatalog(catalog);
assert(catalogValidation.valid, `Industry profile catalog validates: ${catalogValidation.errors.join(",")}`);

const cpa = profiles.getIndustryProfile({ industryProfileId: "cpa_firm" });
const bookkeeper = profiles.getIndustryProfile({ industryProfileId: "bookkeeper" });
assert(cpa.parentProfile.parentIndustryProfileId === "professional_services", "CPA Firm inherits from Professional Services");
assert(bookkeeper.parentProfile.parentIndustryProfileId === "professional_services", "Bookkeeper inherits from Professional Services");
assert(cpa.kpiCatalog.some((entry) => entry.inheritedFromProfileId === "professional_services" && entry.kpiKey === "utilization"), "CPA Firm preserves inherited KPI metadata");
assert(bookkeeper.kpiCatalog.some((entry) => entry.inheritedFromProfileId === "professional_services" && entry.kpiKey === "revenue_per_fte"), "Bookkeeper preserves inherited KPI metadata");

const healthcare = profiles.getIndustryProfile({ industryProfileId: "healthcare" });
assert(healthcare.kpiCatalog.some((entry) => entry.kpiKey === "dso" && entry.minimumMaturityLevel === "basic"), "Healthcare supports basic metric maturity");
assert(healthcare.kpiCatalog.some((entry) => entry.kpiKey === "clean_claim_rate" && entry.minimumMaturityLevel === "advanced"), "Healthcare supports advanced metric maturity");
assert(healthcare.evidenceExpectations.some((entry) => entry.evidenceKey === "claims" && entry.minimumMaturityLevel === "advanced"), "Healthcare claims evidence is advanced metadata");

const construction = profiles.getIndustryProfile({ industryProfileId: "construction" });
assert(construction.evidenceExpectations.some((entry) => entry.evidenceKey === "billing"), "Construction evidence expectations include billing");
assert(construction.signalExpectations.some((entry) => entry.signalType === "wip_risk"), "Construction signal expectations include WIP risk metadata");

const retail = profiles.getIndustryProfile({ industryProfileId: "retail" });
assert(retail.seasonalityProfile.rules.includes("holiday_season"), "Retail seasonality includes holiday metadata without forecasting");

const activeProfiles = profiles.listActiveIndustryProfiles("2026-06-01");
assert(activeProfiles.length === requiredProfileIds.length, "Active profile lookup is deterministic by effective date");

const engineDirs = ["confidence-scoring", "signal-engine", "recommendation-engine", "explanation-engine"];
const specificIndustryPattern = /\b(healthcare|construction|manufacturing|retail|professional_services|cpa_firm|bookkeeper)\b/i;
for (const dir of engineDirs) {
  const fullDir = path.join(root, "lib", "intelligence", "synthetic", dir);
  const sourceText = fs.readdirSync(fullDir)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => fs.readFileSync(path.join(fullDir, file), "utf8"))
    .join("\n");
  assert(!specificIndustryPattern.test(sourceText), `${dir} contains no hardcoded industry-specific logic`);
}

const industryProfileDir = path.join(root, "lib", "intelligence", "synthetic", "industry-profiles");
const profileSourceText = fs.readdirSync(industryProfileDir, { withFileTypes: true })
  .flatMap((entry) => {
    const fullPath = path.join(industryProfileDir, entry.name);
    if (entry.isDirectory()) {
      return fs.readdirSync(fullPath)
        .filter((file) => file.endsWith(".ts"))
        .map((file) => fs.readFileSync(path.join(fullPath, file), "utf8"));
    }
    return entry.name.endsWith(".ts") ? [fs.readFileSync(fullPath, "utf8")] : [];
  })
  .join("\n");

const forbiddenPatterns = [
  /from\s+["'][^"']*app\/dashboard/i,
  /from\s+["'][^"']*financial-package-pdf/i,
  /from\s+["'][^"']*powerpoint/i,
  /from\s+["'][^"']*pulse/i,
  /from\s+["'][^"']*package-ui/i,
  /from\s+["'][^"']*lib\/integrations/i,
  /from\s+["'][^"']*report-preflight/i,
  /supabase|createClient|migration|from\s+["'][^"']*\/route/i,
  /openai|@ai-sdk|langchain|anthropic|fetch\s*\(|axios|XMLHttpRequest/i,
  /forecasting logic|budgeting logic|dashboard wiring|pdf wiring|powerpoint wiring/i,
];

for (const pattern of forbiddenPatterns) {
  assert(!pattern.test(profileSourceText), `Forbidden runtime/output/database/API pattern absent: ${pattern}`);
}

if (process.exitCode) process.exit(process.exitCode);
console.log("\nIndustry profile catalog verification passed.");
