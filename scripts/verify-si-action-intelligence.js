const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "lib/intelligence/synthetic/actions/contracts/SyntheticActionIntelligenceContracts.ts",
  "lib/intelligence/synthetic/actions/contracts/index.ts",
];

const missingFiles = requiredFiles.filter((filePath) => !fs.existsSync(path.join(root, filePath)));

if (missingFiles.length > 0) {
  console.error("FAIL missing Phase 38 action intelligence files:");
  for (const filePath of missingFiles) {
    console.error(filePath);
  }
  process.exit(1);
}

console.log("PASS");
process.exit(0);
