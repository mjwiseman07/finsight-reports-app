const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const contractsDirectory = path.join(root, "lib", "intelligence", "synthetic", "organization", "contracts");
const contractsSourcePath = path.join(contractsDirectory, "SyntheticOrganizationContracts.ts");
const contractsIndexPath = path.join(contractsDirectory, "index.ts");

const checks = [
  checkContractsDirectoryExists,
  checkContractsSourceExists,
  checkContractsIndexExists,
  checkExecutableLiteralFalse,
  checkSeparateIsolationFields,
  checkContainsPhiMarker,
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
    passed: fs.existsSync(contractsDirectory) && fs.statSync(contractsDirectory).isDirectory(),
    reason: "missing lib/intelligence/synthetic/organization/contracts/",
  };
}

function checkContractsSourceExists() {
  return {
    name: "SyntheticOrganizationContracts.ts exists",
    passed: fs.existsSync(contractsSourcePath) && fs.statSync(contractsSourcePath).isFile(),
    reason: "missing SyntheticOrganizationContracts.ts",
  };
}

function checkContractsIndexExists() {
  return {
    name: "contracts index.ts exists",
    passed: fs.existsSync(contractsIndexPath) && fs.statSync(contractsIndexPath).isFile(),
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

function checkNoBannedRuntimePatterns() {
  const source = readContractsSource();
  const bannedPatterns = [
    ["ERP SDK import", /\bimport\s+.*?\s+from\s+["'](?:quickbooks|xero|netsuite|sage|intacct|dynamics|@intuit|@xero|@oracle|@microsoft\/dynamics)[^"']*["']/i],
    ["AI model client import", /\bimport\s+.*?\s+from\s+["'](?:openai|@openai|anthropic|@anthropic|langchain|@langchain)[^"']*["']/i],
    ["database client import", /\bimport\s+.*?\s+from\s+["'](?:@prisma\/client|prisma|drizzle-orm|mongoose|pg|mysql2|sqlite3)[^"']*["']/i],
    ["fetch call", /\bfetch\s*\(/],
    ["axios call or import", /\baxios\b/],
    ["scheduling or cron import", /\bimport\s+.*?\s+from\s+["'](?:node-cron|cron|agenda|bull|bullmq|bree)[^"']*["']/i],
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

function readContractsSource() {
  if (!fs.existsSync(contractsSourcePath) || !fs.statSync(contractsSourcePath).isFile()) {
    return "";
  }

  return fs.readFileSync(contractsSourcePath, "utf8");
}
