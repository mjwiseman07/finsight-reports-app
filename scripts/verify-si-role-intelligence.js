const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const requiredFiles = [
  "lib/intelligence/synthetic/roles/contracts/SyntheticRoleIntelligenceContracts.ts",
  "lib/intelligence/synthetic/roles/contracts/index.ts",
];

const missingFiles = requiredFiles.filter((filePath) => !fs.existsSync(path.join(root, filePath)));

if (missingFiles.length > 0) {
  console.error("FAIL");
  for (const filePath of missingFiles) {
    console.error(filePath);
  }
  process.exit(1);
}

console.log("PASS");
process.exit(0);
