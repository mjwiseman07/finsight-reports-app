const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const memoryReservationDirectory = path.join(
  root,
  "lib",
  "intelligence",
  "synthetic",
  "standards",
  "memory-reservation",
);
const memoryFrameworkDimensionPath = path.join(memoryReservationDirectory, "MemoryFrameworkDimension.ts");
const memoryReservationIndexPath = path.join(memoryReservationDirectory, "index.ts");

const treatmentScopedCategories = [
  "revenue_recognition",
  "lease_accounting",
  "inventory_measurement",
  "impairment_measurement",
  "financial_instruments_measurement",
];

const frameworkAgnosticCategories = [
  "fraud_detection",
  "obvious_error_reasonableness",
  "fte_to_payroll_consistency",
  "vendor_duplicate_detection",
  "structural_anomaly_patterns",
];

const checks = [
  checkMemoryReservationDirectoryExists,
  checkMemoryFrameworkDimensionExists,
  checkMemoryReservationIndexExists,
  checkFrameworkDimensionReservedMarker,
  checkSchemaReservationOnlyMarker,
  checkWritesNoFrameworkSpecificMemoryMarker,
  checkTreatmentScopedCategories,
  checkFrameworkAgnosticCategories,
  checkIsolationScopingMarkers,
  checkContainsPhiMarker,
  checkHandoffContinuityMarkers,
  checkExecutableLiteralFalse,
  checkNoBannedRuntimePatterns,
];

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

function checkMemoryReservationDirectoryExists() {
  return {
    name: "memory reservation directory exists",
    passed: isDirectory(memoryReservationDirectory),
    reason: "missing lib/intelligence/synthetic/standards/memory-reservation/",
  };
}

function checkMemoryFrameworkDimensionExists() {
  return {
    name: "MemoryFrameworkDimension.ts exists",
    passed: isFile(memoryFrameworkDimensionPath),
    reason: "missing MemoryFrameworkDimension.ts",
  };
}

function checkMemoryReservationIndexExists() {
  return {
    name: "memory reservation index.ts exists",
    passed: isFile(memoryReservationIndexPath),
    reason: "missing memory-reservation/index.ts",
  };
}

function checkFrameworkDimensionReservedMarker() {
  return sourceIncludesCheck(
    "reportingFrameworkDimensionReserved marker",
    "reportingFrameworkDimensionReserved: true",
    "missing reportingFrameworkDimensionReserved: true",
  );
}

function checkSchemaReservationOnlyMarker() {
  return sourceIncludesCheck(
    "schema reservation only marker",
    "schemaReservationOnly: true",
    "missing schemaReservationOnly: true",
  );
}

function checkWritesNoFrameworkSpecificMemoryMarker() {
  return sourceIncludesCheck(
    "writes no framework-specific memory marker",
    "writesNoFrameworkSpecificMemory: true",
    "missing writesNoFrameworkSpecificMemory: true",
  );
}

function checkTreatmentScopedCategories() {
  const source = readMemoryFrameworkDimensionSource();
  const missingCategories = treatmentScopedCategories.filter((category) => !source.includes(category));

  return {
    name: "treatment-scoped categories",
    passed: missingCategories.length === 0,
    reason: `missing treatment-scoped categories: ${missingCategories.join(", ")}`,
  };
}

function checkFrameworkAgnosticCategories() {
  const source = readMemoryFrameworkDimensionSource();
  const missingCategories = frameworkAgnosticCategories.filter((category) => !source.includes(category));

  return {
    name: "framework-agnostic categories",
    passed: missingCategories.length === 0,
    reason: `missing framework-agnostic categories: ${missingCategories.join(", ")}`,
  };
}

function checkIsolationScopingMarkers() {
  const source = readMemoryFrameworkDimensionSource();
  const requiredMarkers = ["customerIsolation", "firmIsolation", "clientIsolation", "isolationPeersUnchanged: true"];
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));

  return {
    name: "isolation scoping markers",
    passed: missingMarkers.length === 0,
    reason: `missing isolation scoping markers: ${missingMarkers.join(", ")}`,
  };
}

function checkContainsPhiMarker() {
  return sourceIncludesCheck("containsPHI marker", "containsPHI", "missing containsPHI");
}

function checkHandoffContinuityMarkers() {
  const source = readMemoryFrameworkDimensionSource();
  const requiredMarkers = ["boundPhase40SnapshotHash", "boundPhase40_5SnapshotHash"];
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));

  return {
    name: "Phase 40 and 40.5 handoff continuity",
    passed: missingMarkers.length === 0,
    reason: `missing handoff markers: ${missingMarkers.join(", ")}`,
  };
}

function checkExecutableLiteralFalse() {
  const source = readMemoryFrameworkDimensionSource();

  return {
    name: "executable literal false",
    passed: source.includes("executable: false") && !source.includes("executable: boolean"),
    reason: "MemoryFrameworkDimension.ts must type executable as literal false, not boolean",
  };
}

function checkNoBannedRuntimePatterns() {
  const source = readMemoryFrameworkDimensionSource();
  const bannedPatterns = [
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3|better-sqlite3)[^"']*["']/i],
    ["fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["file system write call", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink|rename)\s*\(/],
    ["memory write call", /\b(?:writeMemory|storeMemory|persistMemory|saveMemory|upsertMemory|createMemory)\s*\(/i],
  ];
  const violations = bannedPatterns.filter(([, pattern]) => pattern.test(source)).map(([label]) => label);

  return {
    name: "no banned runtime patterns",
    passed: violations.length === 0,
    reason: `banned runtime patterns found: ${violations.join(", ")}`,
  };
}

function sourceIncludesCheck(name, marker, reason) {
  return {
    name,
    passed: readMemoryFrameworkDimensionSource().includes(marker),
    reason,
  };
}

function isDirectory(directoryPath) {
  return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory();
}

function isFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function readMemoryFrameworkDimensionSource() {
  if (!isFile(memoryFrameworkDimensionPath)) {
    return "";
  }

  return fs.readFileSync(memoryFrameworkDimensionPath, "utf8");
}
