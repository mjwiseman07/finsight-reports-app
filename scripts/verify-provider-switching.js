/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

// Provider switching lives on the dashboard activation OS (legacy /onboarding
// is a compatibility redirect only).
const dashboard = read("app/dashboard/page.jsx");
const onboarding = read("app/onboarding/page.tsx");

if (
  onboarding.includes("buildDashboardCompatibilityHref") ||
  onboarding.includes("redirect(")
) {
  pass("legacy /onboarding is compatibility redirect");
} else {
  fail("legacy /onboarding is not a compatibility redirect");
}

for (const marker of [
  "handleConnectQuickBooks",
  "handleConnectXero",
  "resolveAccountingDashboardHydrationPlan",
  "Provider mismatch: active",
]) {
  if (dashboard.includes(marker)) pass(`dashboard activation/provider path contains ${marker}`);
  else fail(`dashboard activation/provider path missing ${marker}`);
}

if (process.exitCode) {
  console.error("\nProvider switching verification failed.");
  process.exit(process.exitCode);
}

console.log("\nProvider switching verification passed.");
