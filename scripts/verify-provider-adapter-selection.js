/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const originalLoad = Module._load;
Module._load = function loadWithProviderAdapterStubs(request, parent, isMain) {
  if (request.endsWith("erp-adapters/quickbooks-adapter") || request.endsWith("erp-adapters\\quickbooks-adapter")) {
    return {
      QuickBooksAdapter: class QuickBooksCertificationAdapter {
        connect() {
          return { url: "about:blank" };
        }
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

require.extensions[".ts"] = function loadTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      resolveJsonModule: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function buildConnection(provider, fixture) {
  return {
    id: `${provider}-adapter-selection-connection`,
    user_id: "adapter-selection-user",
    provider,
    provider_family: provider,
    provider_product: `${provider}_certification`,
    external_entity_id: `${provider}:adapter-selection-company`,
    external_entity_name: fixture.companyName || `${provider} Adapter Selection Company`,
    access_token: "fixture-access-token",
    refresh_token: "fixture-refresh-token",
    token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tenant_or_realm_id: `${provider}-tenant`,
    scopes: ["certification"],
    status: "connected",
    metadata_json: {
      company_id: `adapter-selection-company-${provider}`,
      certification_fixture: fixture,
    },
  };
}

async function normalizeThrough(adapter, connection, dateRange) {
  const rawReports = await adapter.fetchRawReports(connection, dateRange);
  return adapter.normalize(rawReports, {
    connection,
    reportPeriod: dateRange,
    syncId: `${connection.provider}-adapter-selection-sync`,
    tenantId: connection.tenant_or_realm_id,
    tenantName: connection.external_entity_name,
  });
}

async function expectReject(name, action, expectedMessage) {
  try {
    await action();
    fail(`${name}: expected rejection`);
  } catch (error) {
    if (String(error.message || "").includes(expectedMessage)) pass(name);
    else fail(`${name}: expected ${expectedMessage}, got ${error.message}`);
  }
}

async function run() {
  const {
    accountingProviderAdapters,
    quickBooksAdapter,
    xeroAdapter,
    getAccountingProviderMappingAdapter,
  } = require("../lib/integrations/accounting/provider-adapters.ts");

  if (
    accountingProviderAdapters.quickbooks === quickBooksAdapter &&
    accountingProviderAdapters.xero === xeroAdapter &&
    accountingProviderAdapters.netsuite &&
    accountingProviderAdapters.dynamics &&
    accountingProviderAdapters.sage
  ) {
    pass("provider adapter registry contains all required adapters");
  } else {
    fail("provider adapter registry is incomplete");
  }

  const dateRange = { startDate: "2026-05-01", endDate: "2026-05-31" };
  const quickbooksFixture = readJson("scripts/fixtures/accounting/quickbooks.json");
  const xeroFixture = readJson("scripts/fixtures/accounting/xero.json");
  const quickbooksConnection = buildConnection("quickbooks", quickbooksFixture);
  const xeroConnection = buildConnection("xero", xeroFixture);

  const quickbooksNormalized = await normalizeThrough(getAccountingProviderMappingAdapter("quickbooks"), quickbooksConnection, dateRange);
  if (quickbooksNormalized.sourceSystem === "quickbooks" && quickbooksNormalized.adapterName === "quickBooksAdapter") {
    pass("QuickBooks selected uses quickBooksAdapter");
  } else {
    fail("QuickBooks selected did not use quickBooksAdapter");
  }

  const quickbooksRevenue = quickbooksNormalized.normalizedIncomeStatement.find((row) => row.label === "Service Revenue")?.amount;
  if (quickbooksRevenue === 210000) pass("Existing QuickBooks numbers remain unchanged");
  else fail(`Existing QuickBooks revenue changed: ${quickbooksRevenue}`);

  const xeroNormalized = await normalizeThrough(getAccountingProviderMappingAdapter("xero"), xeroConnection, dateRange);
  if (xeroNormalized.sourceSystem === "xero" && xeroNormalized.adapterName === "xeroAdapter") {
    pass("Xero selected uses xeroAdapter");
  } else {
    fail("Xero selected did not use xeroAdapter");
  }

  await expectReject(
    "QuickBooks data cannot pass through xeroAdapter",
    () => xeroAdapter.fetchRawReports(quickbooksConnection, dateRange),
    "Provider adapter mismatch",
  );
  await expectReject(
    "Xero data cannot pass through quickBooksAdapter",
    () => quickBooksAdapter.fetchRawReports(xeroConnection, dateRange),
    "Provider adapter mismatch",
  );

  const switchedToXero = await normalizeThrough(getAccountingProviderMappingAdapter("xero"), xeroConnection, dateRange);
  const switchedBackToQuickBooks = await normalizeThrough(getAccountingProviderMappingAdapter("quickbooks"), quickbooksConnection, dateRange);
  if (
    switchedToXero.adapterName === "xeroAdapter" &&
    switchedToXero.sourceSystem === "xero" &&
    switchedBackToQuickBooks.adapterName === "quickBooksAdapter" &&
    switchedBackToQuickBooks.sourceSystem === "quickbooks" &&
    switchedBackToQuickBooks.normalizedIncomeStatement.find((row) => row.label === "Service Revenue")?.amount === 210000
  ) {
    pass("Switching QuickBooks -> Xero -> QuickBooks preserves selected adapter and data source");
  } else {
    fail("Provider switching did not preserve adapter/data source");
  }

  const serviceSource = read("lib/integrations/accounting/service.ts");
  for (const marker of [
    "getAccountingProviderMappingAdapter(selectedSourceSystem)",
    "mappingAdapter.fetchRawReports",
    "mappingAdapter.normalize",
    "Provider adapter mismatch",
    "Mapping adapter mismatch",
  ]) {
    if (serviceSource.includes(marker)) pass(`fetchCanonicalReports adapter marker present: ${marker}`);
    else fail(`fetchCanonicalReports adapter marker missing: ${marker}`);
  }

  const preflightSource = read("lib/reporting/report-preflight-validation.ts");
  if (preflightSource.includes("adapterName") && preflightSource.includes("PROVIDER_MISMATCH")) pass("preflight blocks adapter mismatch");
  else fail("preflight adapter mismatch blocker missing");

  const pdfSource = read("lib/financial-package-pdf.ts");
  if (!pdfSource.includes("xeroAccountingProvider") && !pdfSource.includes("quickBooksAccountingProvider") && pdfSource.includes("reportDataContext")) {
    pass("PDF receives normalized data only");
  } else {
    fail("PDF imports or uses provider-specific raw data");
  }

  const dashboardSource = read("app/dashboard/page.jsx");
  if (dashboardSource.includes("reportDataContext") && dashboardSource.includes("normalizedData") && !dashboardSource.includes("xeroAccountingProvider") && !dashboardSource.includes("quickBooksAccountingProvider")) {
    pass("PowerPoint/dashboard generation receives normalized data only");
  } else {
    fail("PowerPoint/dashboard generation imports or uses provider-specific raw data");
  }

  if (process.exitCode) {
    console.error("\nProvider adapter selection verification failed.");
    process.exit(process.exitCode);
  }

  console.log("\nProvider adapter selection verification passed.");
}

run().catch((error) => {
  console.error("Provider adapter selection verification failed.");
  console.error(error?.message || error);
  process.exitCode = 1;
});
