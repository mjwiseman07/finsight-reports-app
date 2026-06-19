const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const industryRoot = path.join(root, "lib", "intelligence", "synthetic", "industry");
const memoryReservationDir = path.join(industryRoot, "memory-reservation");
const industryMemoryDimensionPath = path.join(memoryReservationDir, "IndustryMemoryDimension.ts");
const memoryReservationIndexPath = path.join(memoryReservationDir, "index.ts");

const analyticCategories = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
];

const treatmentScopedIndustryCategories = [
  "revenue_recognition_industry_overlay",
  "reserve_and_allowance_patterns",
  "industry_specific_cost_accounting",
  "industry_specific_disclosure_patterns",
  "industry_specific_reasonableness_application",
];

const phiDerivationStatusValues = [
  "containsNoPHI",
  "derivedFromPHIThroughSafeHarbor",
  "derivedFromPHIThroughExpertDetermination",
  "containsPHI",
];

const checks = [
  checkMemoryReservationDirectoryExists,
  checkIndustryMemoryDimensionFileExists,
  checkMemoryReservationIndexExists,
  checkIndustryClassificationDimensionReservedMarker,
  checkIndustrySubClassificationDimensionReservedMarker,
  checkSchemaReservationOnlyMarker,
  checkWritesNoIndustrySpecificMemoryMarker,
  checkCompositeScopeKeyAndFrameworkPreservation,
  checkIsolationScopingMarkers,
  checkGranularAnalyticCategorySplit,
  checkTreatmentScopedIndustryCategories,
  checkContainsPhiAndPhiDerivationStatus,
  checkHandoffContinuityMarkers,
  checkExecutableLiteralFalse,
  checkNoBannedRuntimePatterns,
];

if (require.main === module) {
  runVerifier();
}

module.exports = {
  checks,
  checkMemoryReservationDirectoryExists,
  checkIndustryMemoryDimensionFileExists,
  checkMemoryReservationIndexExists,
  checkIndustryClassificationDimensionReservedMarker,
  checkIndustrySubClassificationDimensionReservedMarker,
  checkSchemaReservationOnlyMarker,
  checkWritesNoIndustrySpecificMemoryMarker,
  checkCompositeScopeKeyAndFrameworkPreservation,
  checkIsolationScopingMarkers,
  checkGranularAnalyticCategorySplit,
  checkTreatmentScopedIndustryCategories,
  checkContainsPhiAndPhiDerivationStatus,
  checkHandoffContinuityMarkers,
  checkExecutableLiteralFalse,
  checkNoBannedRuntimePatterns,
  classifyAnalyticComponentScope,
  isTreatmentScopedCategory,
  analyticCategories,
  treatmentScopedIndustryCategories,
  phiDerivationStatusValues,
};

function runVerifier() {
  const results = checks.map((check) => check());
  const failures = results.filter((result) => !result.passed);

  if (failures.length > 0) {
    console.error("FAIL");
    for (const failure of failures) {
      console.error(`- ${failure.name}: ${failure.reason}`);
    }
    process.exit(1);
  }

  console.log("PASS");
  console.log("VERIFY_EXIT:0");
  process.exit(0);
}

function classifyAnalyticComponentScope(reservation, category, component) {
  const granularSplit = reservation?.analyticCategoriesGranularSplit;
  if (!granularSplit || !granularSplit[category]) {
    return null;
  }

  const componentScope = granularSplit[category][component];
  if (componentScope !== "industry_agnostic" && componentScope !== "industry_scoped") {
    return null;
  }

  return componentScope;
}

function isTreatmentScopedCategory(category, reservation) {
  const categories = reservation?.treatmentScopedMemoryCategories ?? treatmentScopedIndustryCategories;
  return categories.includes(category);
}

function checkMemoryReservationDirectoryExists() {
  return {
    name: "42A industry memory reservation directory exists",
    passed: isDirectory(memoryReservationDir),
    reason: "missing lib/intelligence/synthetic/industry/memory-reservation/",
  };
}

function checkIndustryMemoryDimensionFileExists() {
  return {
    name: "42A IndustryMemoryDimension.ts exists",
    passed: isFile(industryMemoryDimensionPath),
    reason: "missing IndustryMemoryDimension.ts",
  };
}

function checkMemoryReservationIndexExists() {
  return {
    name: "42A memory reservation index.ts exists",
    passed: isFile(memoryReservationIndexPath),
    reason: "missing memory-reservation/index.ts",
  };
}

function checkIndustryClassificationDimensionReservedMarker() {
  return sourceIncludesCheck(
    "42A industryClassificationDimensionReserved marker",
    "industryClassificationDimensionReserved: true",
    "missing industryClassificationDimensionReserved: true",
  );
}

function checkIndustrySubClassificationDimensionReservedMarker() {
  return sourceIncludesCheck(
    "42A industrySubClassificationDimensionReserved marker",
    "industrySubClassificationDimensionReserved: true",
    "missing industrySubClassificationDimensionReserved: true",
  );
}

function checkSchemaReservationOnlyMarker() {
  return sourceIncludesCheck(
    "42A schema reservation only marker",
    "schemaReservationOnly: true",
    "missing schemaReservationOnly: true",
  );
}

function checkWritesNoIndustrySpecificMemoryMarker() {
  return sourceIncludesCheck(
    "42A writes no industry-specific memory marker",
    "writesNoIndustrySpecificMemory: true",
    "missing writesNoIndustrySpecificMemory: true",
  );
}

function checkCompositeScopeKeyAndFrameworkPreservation() {
  const source = readIndustryMemoryDimensionSource();
  const hasCompositeScopeKey =
    source.includes("(customerIsolation, framework, industry, industrySubClassification)") &&
    source.includes("compositeScopeKeyForTreatmentScopedMemory");
  const hasFrameworkPreserved = source.includes("frameworkDimensionFrom41_5Preserved: true");

  return {
    name: "42A composite scope key and framework dimension preserved",
    passed: hasCompositeScopeKey && hasFrameworkPreserved,
    reason: hasCompositeScopeKey
      ? "missing frameworkDimensionFrom41_5Preserved: true"
      : "missing composite scope key (customerIsolation, framework, industry, industrySubClassification)",
  };
}

function checkIsolationScopingMarkers() {
  const source = readIndustryMemoryDimensionSource();
  const requiredMarkers = [
    "industryIsNotAnIsolationPeer: true",
    "isolationPeersUnchanged: true",
    "customerIsolation",
    "firmIsolation",
    "clientIsolation",
  ];
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));

  return {
    name: "42A isolation scoping markers",
    passed: missingMarkers.length === 0,
    reason: `missing isolation scoping markers: ${missingMarkers.join(", ")}`,
  };
}

function checkGranularAnalyticCategorySplit() {
  const source = readIndustryMemoryDimensionSource();
  const missing = [];

  for (const category of analyticCategories) {
    if (!source.includes(category)) {
      missing.push(`${category} missing`);
      continue;
    }

    if (!source.includes("algorithm: \"industry_agnostic\"") && !source.includes("algorithm: 'industry_agnostic'")) {
      if (!source.includes("readonly algorithm: \"industry_agnostic\"")) {
        missing.push(`${category} algorithm scoping`);
      }
    }

    if (
      !source.includes("baselineParameters: \"industry_scoped\"") &&
      !source.includes("baselineParameters: 'industry_scoped'") &&
      !source.includes("readonly baselineParameters: \"industry_scoped\"")
    ) {
      missing.push(`${category} baselineParameters scoping`);
    }

    if (
      !source.includes("normalizationRules: \"industry_scoped\"") &&
      !source.includes("normalizationRules: 'industry_scoped'") &&
      !source.includes("readonly normalizationRules: \"industry_scoped\"")
    ) {
      missing.push(`${category} normalizationRules scoping`);
    }
  }

  if (!source.includes("AnalyticCategoriesGranularSplit")) {
    missing.push("AnalyticCategoriesGranularSplit type");
  }

  return {
    name: "42A granular analytic-category split",
    passed: missing.length === 0,
    reason: missing.join("; "),
  };
}

function checkTreatmentScopedIndustryCategories() {
  const source = readIndustryMemoryDimensionSource();
  const missingCategories = treatmentScopedIndustryCategories.filter((category) => !source.includes(category));

  return {
    name: "42A treatment-scoped industry categories exhaustive",
    passed: missingCategories.length === 0 && source.includes("TreatmentScopedIndustryCategoryList"),
    reason:
      missingCategories.length > 0
        ? `missing treatment-scoped categories: ${missingCategories.join(", ")}`
        : "missing TreatmentScopedIndustryCategoryList type",
  };
}

function checkContainsPhiAndPhiDerivationStatus() {
  const source = readIndustryMemoryDimensionSource();
  const missingPhiValues = phiDerivationStatusValues.filter((value) => !source.includes(value));

  return {
    name: "42A containsPHI and phiDerivationStatus enum",
    passed:
      source.includes("containsPHI") &&
      source.includes("phiDerivationStatus") &&
      source.includes("PhiDerivationStatus") &&
      missingPhiValues.length === 0,
    reason:
      missingPhiValues.length > 0
        ? `missing phiDerivationStatus values: ${missingPhiValues.join(", ")}`
        : "missing containsPHI or phiDerivationStatus",
  };
}

function checkHandoffContinuityMarkers() {
  const source = readIndustryMemoryDimensionSource();

  return {
    name: "42A Phase 40, 40.5, and 41.5 handoff continuity",
    passed:
      source.includes("boundPhase40SnapshotHash") &&
      source.includes("boundPhase40_5SnapshotHash") &&
      source.includes("boundPhase41_5SnapshotHash"),
    reason: "missing boundPhase40SnapshotHash, boundPhase40_5SnapshotHash, or boundPhase41_5SnapshotHash",
  };
}

function checkExecutableLiteralFalse() {
  const source = readIndustryMemoryDimensionSource();

  return {
    name: "42A executable literal false",
    passed: source.includes("executable: false") && !source.includes("executable: boolean"),
    reason: "IndustryMemoryDimension.ts must type executable as literal false, not boolean",
  };
}

function checkNoBannedRuntimePatterns() {
  return checkBannedPatternsInSource("42A industry memory-reservation", readIndustryMemoryDimensionSource());
}

function checkBannedPatternsInSource(label, source) {
  const bannedPatterns = [
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3|better-sqlite3)[^"']*["']/i],
    ["fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["file system write call", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink|rename)\s*\(/],
    ["memory write call", /\b(?:writeMemory|storeMemory|persistMemory|saveMemory|upsertMemory|createMemory)\s*\(/i],
  ];
  const violations = bannedPatterns.filter(([, pattern]) => pattern.test(source)).map(([name]) => name);

  return {
    name: label,
    passed: violations.length === 0,
    reason: `banned runtime patterns found: ${violations.join(", ")}`,
  };
}

function sourceIncludesCheck(name, marker, reason) {
  return {
    name,
    passed: readIndustryMemoryDimensionSource().includes(marker),
    reason,
  };
}

function isDirectory(directoryPath) {
  return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory();
}

function isFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function readIndustryMemoryDimensionSource() {
  if (!isFile(industryMemoryDimensionPath)) {
    return "";
  }

  return fs.readFileSync(industryMemoryDimensionPath, "utf8");
}
