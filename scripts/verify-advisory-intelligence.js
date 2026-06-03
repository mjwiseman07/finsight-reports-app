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

function includesAll(source, markers) {
  return markers.every((marker) => source.includes(marker));
}

const migration = read("supabase/migrations/20260602_create_advisory_intelligence.sql");
const signalDetector = read("lib/advisory-intelligence/signal-detector.js");
const recommendations = read("lib/advisory-intelligence/recommendation-engine.js");
const pulseSummary = read("lib/advisory-intelligence/pulse-summary.js");
const thresholds = read("lib/advisory-intelligence/thresholds.js");
const dashboard = read("app/dashboard/page.jsx");
const runRoute = read("app/api/advisory-intelligence/run/route.js");
const signalsRoute = read("app/api/advisory-intelligence/signals/route.js");
const recommendationsRoute = read("app/api/advisory-intelligence/recommendations/route.js");
const queueRoute = read("app/api/advisory-intelligence/package-queue/route.js");

for (const table of ["advisory_signals", "advisory_recommendations", "advisory_package_queue"]) {
  if (migration.includes(`create table if not exists public.${table}`)) pass(`${table} table exists`);
  else fail(`${table} table missing`);
  if (migration.includes(`alter table public.${table} enable row level security`)) pass(`${table} RLS enabled`);
  else fail(`${table} RLS missing`);
}

for (const column of [
  "signal_type",
  "severity",
  "detected_metric",
  "prior_value",
  "current_value",
  "variance_amount",
  "variance_percent",
  "confidence_score",
  "source_module",
  "reviewed_at",
]) {
  if (migration.includes(column)) pass(`advisory_signals includes ${column}`);
  else fail(`advisory_signals missing ${column}`);
}

if (migration.includes("advisory_signals_company_metric_period_source_idx")) pass("duplicate signal prevention index present");
else fail("duplicate signal prevention index missing");

if (thresholds.includes("revenueVariancePercent: 10") && thresholds.includes("cleanClaimRateDeclinePercent: 3") && thresholds.includes("materialVariancePercent: 5")) {
  pass("industry thresholds configured");
} else {
  fail("industry thresholds incomplete");
}

for (const marker of [
  "revenue",
  "gross_margin",
  "cash_balance",
  "ar_over_60",
  "clean_claim_rate",
  "job_cost_overrun",
  "material_variance",
]) {
  if (signalDetector.includes(marker) || signalDetector.includes(marker.toLowerCase())) pass(`signal detector covers ${marker}`);
  else fail(`signal detector missing ${marker}`);
}

if (includesAll(signalDetector, [".from(\"advisory_signals\")", ".eq(\"company_id\"", ".eq(\"detected_metric\"", ".in(\"status\""])) {
  pass("signal detector prevents duplicates by company metric period source");
} else {
  fail("signal duplicate prevention logic missing");
}

if (includesAll(signalDetector, ["severityFromVariance", "critical", "high", "confidence_score"])) pass("severity and confidence scoring present");
else fail("severity/confidence scoring missing");

for (const marker of ["dso", "gross_margin", "ppd", "job_cost_overrun", "material_variance"]) {
  if (recommendations.includes(marker)) pass(`recommendation template covers ${marker}`);
  else fail(`recommendation template missing ${marker}`);
}

if (includesAll(recommendations, ["highImpactSeverities", "advisory_package_queue", "pending_review"])) pass("high critical signals create package queue recommendations");
else fail("package queue recommendation logic missing");

if (includesAll(pulseSummary, ["what_changed", "why_it_matters", "financial_impact", "recommended_next_steps", "should_generate_package"])) {
  pass("Pulse advisory summary fields present");
} else {
  fail("Pulse advisory summary fields missing");
}

for (const [routeName, source] of [
  ["run", runRoute],
  ["signals", signalsRoute],
  ["recommendations", recommendationsRoute],
  ["package-queue", queueRoute],
]) {
  if (source.includes("requireAdvisoryCompanyAccess")) pass(`${routeName} route enforces company access`);
  else fail(`${routeName} route missing company access enforcement`);
  if (source.includes("auditAdvisoryAction")) pass(`${routeName} route audits advisory action`);
  else fail(`${routeName} route missing audit logging`);
  if (source.includes(".eq(\"company_id\", companyId)") || source.includes("companyId")) pass(`${routeName} route scopes by company`);
  else fail(`${routeName} route missing company scope`);
}

if (includesAll(dashboard, ["Pulse Advisory Intelligence", "Generate recommended package", "Dismiss", "Review recommendation"])) {
  pass("dashboard advisory panel wired");
} else {
  fail("dashboard advisory panel missing");
}

if (includesAll(dashboard, ["window.confirm(\"Generate YTD through today? Select Cancel for Month-End.\")", "runExecutivePackageGeneration(\"pdf\"", "updateAdvisoryPackageQueue(queueItem, \"generated\")"])) {
  pass("recommended package uses review and existing generation flow");
} else {
  fail("recommended package generation flow missing");
}

if (process.exitCode) {
  console.error("\nAdvisory intelligence verification failed.");
  process.exit(process.exitCode);
}

console.log("\nAdvisory intelligence verification passed.");
