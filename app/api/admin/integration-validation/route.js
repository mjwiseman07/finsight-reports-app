import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { providerRegistry } from "../../../../lib/integrations/accounting/registry";
import { auditSuperAdminEvent, resolveSuperAdminAccess } from "../../../../lib/super-admin-security";
import { rateLimit } from "../../../../lib/rate-limit";

const requiredNormalizedFields = [
  "sourceSystem",
  "companyId",
  "connectionId",
  "syncStatus",
  "lastSyncedAt",
  "normalizedAccounts",
  "normalizedTransactions",
  "normalizedTrialBalance",
  "normalizedBalanceSheet",
  "normalizedIncomeStatement",
  "normalizedARAging",
  "normalizedAPAging",
  "normalizedBudgets",
  "normalizedDepartments",
  "normalizedLocations",
  "normalizedClasses",
  "normalizedProjects",
  "normalizedVendors",
  "normalizedCustomers",
];

const downstreamFiles = [
  "app/api/accounting/fetch-reports/route.js",
  "lib/financial-package-pdf.ts",
  "lib/pulse-context-engine.js",
  "app/dashboard/page.jsx",
];

const xeroAdapterMarkers = [
  "flattenXeroReportRows",
  "getXeroTrialBalance",
  "getAgingReport",
  "getBudgetSummary",
  "getTrackingDimensions",
  "getContacts",
  "getTransactions",
  "bundle.normalizedTransactions",
  "bundle.normalizedARAging",
  "bundle.normalizedAPAging",
  "bundle.normalizedBudgets",
  "bundle.normalizedDepartments",
  "bundle.normalizedLocations",
  "bundle.normalizedClasses",
  "bundle.normalizedProjects",
  "bundle.normalizedVendors",
  "bundle.normalizedCustomers",
];

function readSource(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function buildCheck(name, ok, detail) {
  return { name, status: ok ? "pass" : "fail", detail };
}

function validateIntegrationEngine() {
  const checks = [];
  const typesSource = readSource("lib/integrations/accounting/types.ts");
  const serviceSource = readSource("lib/integrations/accounting/service.ts");
  const modelSource = readSource("lib/integrations/accounting/advisacor-data-model.ts");
  const xeroSource = readSource("lib/integrations/accounting/providers/xero.ts");
  const registeredProviders = Object.keys(providerRegistry);

  checks.push(
    buildCheck(
      "Required ERP providers registered",
      ["quickbooks", "xero", "sage", "netsuite", "dynamics365"].every((provider) => registeredProviders.includes(provider)),
      registeredProviders.join(", "),
    ),
  );

  for (const field of requiredNormalizedFields) {
    checks.push(buildCheck(`Normalized field: ${field}`, typesSource.includes(`${field}:`), "Required universal Advisacor data model field."));
  }

  checks.push(
    buildCheck(
      "Accounting service builds normalized data",
      serviceSource.includes("buildAdvisacorNormalizedFinancialData"),
      "All provider report fetches must pass through the normalized Advisacor model.",
    ),
  );
  checks.push(
    buildCheck(
      "Accounting service validates before outputs",
      serviceSource.includes("assertReadyForSourceAgnosticOutputs"),
      "Dashboards, reports, PDFs, PowerPoints, and AI commentary should not run on incomplete core normalized data.",
    ),
  );
  checks.push(
    buildCheck(
      "Normalized data validation exists",
      modelSource.includes("validateAdvisacorNormalizedFinancialData"),
      "Validation confirms connector output shape before downstream use.",
    ),
  );

  for (const marker of xeroAdapterMarkers) {
    checks.push(
      buildCheck(
        `Xero adapter normalized mapping: ${marker}`,
        xeroSource.includes(marker),
        "Xero-specific retrieval and mapping must stay inside the Xero adapter.",
      ),
    );
  }

  for (const file of downstreamFiles) {
    const source = readSource(file);
    checks.push(
      buildCheck(
        `Source-agnostic downstream path: ${file}`,
        !/quickbooks[_-]?specific|qbo-only|QuickBooks-only/i.test(source),
        "No provider-specific downstream marker found.",
      ),
    );
  }

  const failures = checks.filter((check) => check.status === "fail");
  return {
    ok: failures.length === 0,
    checkedAt: new Date().toISOString(),
    providers: registeredProviders,
    summary: {
      total: checks.length,
      passed: checks.length - failures.length,
      failed: failures.length,
    },
    checks,
  };
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: "admin-integration-validation", limit: 20, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveSuperAdminAccess(request);
  if (access.response) return access.response;

  const result = validateIntegrationEngine();

  await auditSuperAdminEvent({
    eventType: "integration_validation_viewed",
    actorUserId: access.userId,
    actorEmail: access.email,
    metadata: {
      test_only: true,
      passed: result.summary.passed,
      failed: result.summary.failed,
    },
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
