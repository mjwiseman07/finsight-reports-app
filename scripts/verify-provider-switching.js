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

const onboarding = read("app/onboarding/page.tsx");

for (const marker of [
  "const onProviderChange",
  "clearReportContext()",
  "fetchLatestSyncForProvider(provider",
  "providerReportPayloadKey(provider)",
  "setSelectedIntegration(provider)",
  "window.localStorage.removeItem(\"advisacor_active_report_payload\")",
  "window.sessionStorage.removeItem(\"advisacor_active_report_payload\")",
  "const activeProvider = selectedIntegration",
]) {
  if (onboarding.includes(marker)) pass(`provider switching contains ${marker}`);
  else fail(`provider switching missing ${marker}`);
}

if (
  onboarding.includes("providerReportPayloadKey(selectedIntegration)") ||
  (onboarding.includes("providerReportPayloadKey(provider)") && onboarding.includes("setReportContextForProvider(selectedIntegration"))
) {
  pass("sync writes active and provider-specific report payloads");
} else {
  fail("sync does not write provider-specific report payloads");
}

if (onboarding.includes("Provider mismatch: active") && onboarding.includes("reportPayloadSourceSystem(reportPayload) !== activeProvider")) {
  pass("mixed provider context remains blocked");
} else {
  fail("mixed provider context guard missing");
}

if (process.exitCode) {
  console.error("\nProvider switching verification failed.");
  process.exit(process.exitCode);
}

console.log("\nProvider switching verification passed.");
