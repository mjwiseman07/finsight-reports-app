/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function listFiles(directory, predicate = () => true) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(relative, predicate);
    return predicate(relative) ? [relative] : [];
  });
}

const checks = [];

function check(name, passed, detail = "") {
  checks.push({ name, passed, detail });
}

const apiRoutes = listFiles("app/api", (file) => file.endsWith("route.js") || file.endsWith("route.ts"));
const protectedRoutePatterns = [
  "pulse",
  "pdf-packages",
  "accounting",
  "quickbooks",
  "company",
  "owner",
  "firm",
  "admin",
  "healthcare",
  "account",
  "create-checkout",
  "create-billing-portal",
];

for (const route of apiRoutes) {
  const source = read(route);
  const normalized = route.replace(/\\/g, "/");
  const publicReadOnlyRoute = normalized === "app/api/accounting/providers/route.js";
  const shouldProtect = protectedRoutePatterns.some((pattern) => normalized.includes(`/api/${pattern}/`)) || normalized.includes("/api/account/");
  if (!shouldProtect || publicReadOnlyRoute) continue;

  const hasAuthGuard =
    source.includes("getAuthenticatedCompanyUser") ||
    source.includes("resolveSuperAdminAccess") ||
    source.includes("resolveOwnerBriefAccess") ||
    source.includes("resolveFirmAccess") ||
    source.includes("auth.getUser") ||
    source.includes("handleCallback(") ||
    source.includes("constructEvent(rawBody");

  check(`protected route auth guard: ${normalized}`, hasAuthGuard, hasAuthGuard ? "" : "No obvious auth guard found.");
}

for (const route of apiRoutes.filter((file) => file.replace(/\\/g, "/").includes("/api/admin/"))) {
  const source = read(route);
  check(`admin route super-admin guard: ${route}`, source.includes("resolveSuperAdminAccess"), "Admin routes should require resolveSuperAdminAccess.");
}

const companyScopedRoutes = [
  "app/api/pulse/ask/route.js",
  "app/api/pulse/memory/route.js",
  "app/api/pdf-packages/customize/route.js",
  "app/api/company/users/route.js",
  "app/api/healthcare/operational-stats/route.js",
];

for (const route of companyScopedRoutes) {
  const source = read(route);
  check(`company membership check: ${route}`, source.includes("resolveCompanyMembership"), "Company-scoped access should validate company membership.");
}

const auditRoutes = [
  "app/api/pulse/ask/route.js",
  "app/api/pdf-packages/customize/route.js",
  "app/api/company/users/route.js",
  "app/api/company/onboarding/route.js",
  "app/api/accounting/fetch-reports/route.js",
  "app/api/admin/support-tickets/route.js",
  "app/api/healthcare/operational-stats/route.js",
];

for (const route of auditRoutes) {
  const source = read(route);
  check(`audit logging coverage: ${route}`, source.includes("auditSecurityEvent") || source.includes("auditOwnerEvent") || source.includes("auditSuperAdminEvent"), "Sensitive backend action should write an audit event.");
}

const migrations = listFiles("supabase/migrations", (file) => file.endsWith(".sql"));
const migrationText = migrations.map(read).join("\n");
const expectedTables = [
  "audit_logs",
  "companies",
  "company_users",
  "company_invitations",
  "accounting_connections",
  "pulse_conversation_memory",
  "pulse_historical_snapshots",
  "pulse_insight_memory",
  "pulse_usage_events",
  "pdf_package_customizations",
  "support_tickets",
  "free_review_leads",
];

for (const table of expectedTables) {
  check(
    `RLS enabled for ${table}`,
    migrationText.includes(`alter table public.${table} enable row level security`) || migrationText.includes(`alter table if exists public.${table} enable row level security`),
    `${table} should have RLS enabled in migrations.`,
  );
}

const serverSecretPatterns = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "RESEND_API_KEY",
  "QB_CLIENT_SECRET",
];

const clientFiles = listFiles("app", (file) => /\.(jsx|tsx|js|ts)$/.test(file) && !file.replace(/\\/g, "/").startsWith("app/api/")).concat(
  listFiles("components", (file) => /\.(jsx|tsx|js|ts)$/.test(file)),
);

for (const secretName of serverSecretPatterns) {
  const exposed = clientFiles.filter((file) => read(file).includes(`process.env.${secretName}`));
  check(`server secret not referenced in client files: ${secretName}`, exposed.length === 0, exposed.join(", "));
}

let failed = 0;
for (const result of checks) {
  if (result.passed) {
    console.log(`PASS ${result.name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${result.name}${result.detail ? ` - ${result.detail}` : ""}`);
  }
}

if (failed) {
  console.error(`\nSecurity verification failed: ${failed} check(s).`);
  process.exit(1);
}

console.log(`\nSecurity verification passed: ${checks.length} checks.`);
