const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contractsDirectory = path.join(root, "lib", "intelligence", "foundation", "integrations", "contracts");
const contractsSourcePath = path.join(contractsDirectory, "IntegrationContracts.ts");
const contractsIndexPath = path.join(contractsDirectory, "index.ts");

const checks = [
  checkContractsDirectoryExists,
  checkContractsSourceExists,
  checkContractsIndexExists,
  checkExecutableLiteralFalse,
  checkSeparateIsolationFields,
  checkContainsPhiMarker,
  checkPhase40HandoffContinuity,
  checkTwoTierTenancyFields,
  checkCoreWriteSafetyMarkers,
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

function checkContractsDirectoryExists() {
  return {
    name: "contracts directory exists",
    passed: isDirectory(contractsDirectory),
    reason: "missing lib/intelligence/foundation/integrations/contracts/",
  };
}

function checkContractsSourceExists() {
  return {
    name: "IntegrationContracts.ts exists",
    passed: isFile(contractsSourcePath),
    reason: "missing IntegrationContracts.ts",
  };
}

function checkContractsIndexExists() {
  return {
    name: "contracts index.ts exists",
    passed: isFile(contractsIndexPath),
    reason: "missing contracts/index.ts",
  };
}

function checkExecutableLiteralFalse() {
  const source = readContractsSource();

  return {
    name: "executable literal false",
    passed: source.includes("executable: false") && !source.includes("executable: boolean"),
    reason: "contracts must type executable as literal false, not boolean",
  };
}

function checkSeparateIsolationFields() {
  const source = readContractsSource();
  const missingFields = ["customerIsolation", "firmIsolation", "clientIsolation"].filter(
    (fieldName) => !source.includes(fieldName),
  );

  return {
    name: "separate isolation fields",
    passed: missingFields.length === 0,
    reason: `missing isolation fields: ${missingFields.join(", ")}`,
  };
}

function checkContainsPhiMarker() {
  const source = readContractsSource();

  return {
    name: "containsPHI marker",
    passed: source.includes("containsPHI"),
    reason: "contracts must include containsPHI classification marker",
  };
}

function checkPhase40HandoffContinuity() {
  const source = readContractsSource();

  return {
    name: "Phase 40 handoff continuity",
    passed: source.includes("boundPhase40SnapshotHash"),
    reason: "contracts must include boundPhase40SnapshotHash",
  };
}

function checkTwoTierTenancyFields() {
  const source = readContractsSource();
  const missingFields = ["firmTenantId", "clientTenantId"].filter((fieldName) => !source.includes(fieldName));

  return {
    name: "two-tier tenancy fields",
    passed: missingFields.length === 0,
    reason: `missing tenancy fields: ${missingFields.join(", ")}`,
  };
}

function checkCoreWriteSafetyMarkers() {
  const source = readContractsSource();
  const requiredMarkers = [
    "startsReadOnly",
    "recommendationOnlyByDefault",
    "failClosedOnCredentialError",
    "credentialNeverLogged",
    "writeModeRequiresHumanApproval",
  ];
  const missingMarkers = requiredMarkers.filter((marker) => !source.includes(marker));

  return {
    name: "core write-safety markers",
    passed: missingMarkers.length === 0,
    reason: `missing write-safety markers: ${missingMarkers.join(", ")}`,
  };
}

function checkNoBannedRuntimePatterns() {
  const source = readContractsSource();
  const bannedPatterns = [
    ["OAuth client import", /\bimport\s+.*?\s+from\s+["'](?:simple-oauth2|passport|passport-oauth2|oauth|openid-client)[^"']*["']/i],
    ["ERP SDK import", /\bimport\s+.*?\s+from\s+["'](?:quickbooks|xero|netsuite|sage|intacct|dynamics|@intuit|@xero|@oracle|@microsoft\/dynamics)[^"']*["']/i],
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3)[^"']*["']/i],
    ["fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["credential or secret storage call", /\b(?:storeCredential|saveCredential|persistCredential|storeSecret|saveSecret|setSecret|putSecret)\s*\(/i],
    ["file system write call", /\b(?:writeFile|appendFile|createWriteStream|mkdir|rm|unlink)\s*\(/],
  ];
  const violations = bannedPatterns
    .filter(([, pattern]) => pattern.test(source))
    .map(([label]) => label);

  return {
    name: "no banned runtime patterns",
    passed: violations.length === 0,
    reason: `banned runtime patterns found: ${violations.join(", ")}`,
  };
}

function isDirectory(directoryPath) {
  return fs.existsSync(directoryPath) && fs.statSync(directoryPath).isDirectory();
}

function isFile(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function readContractsSource() {
  if (!isFile(contractsSourcePath)) {
    return "";
  }

  return fs.readFileSync(contractsSourcePath, "utf8");
}
