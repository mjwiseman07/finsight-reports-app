/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("child_process");

const providers = ["quickbooks", "xero", "netsuite", "dynamics", "sage"];
let failed = false;

for (const provider of providers) {
  const result = spawnSync(process.execPath, ["scripts/verify-accounting-connector.js", "--provider", provider], {
    stdio: "inherit",
  });

  if (result.status !== 0) failed = true;
  if (provider !== providers[providers.length - 1]) console.log("");
}

if (failed) {
  console.error("\nAccounting connector certification failed.");
  process.exitCode = 1;
} else {
  console.log("\nAccounting connector certification passed for all providers.");
}
