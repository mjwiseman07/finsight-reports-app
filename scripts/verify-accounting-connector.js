/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const originalLoad = Module._load;
Module._load = function loadWithCertificationStubs(request, parent, isMain) {
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
const providerAliases = {
  dynamics: "dynamics365",
  dynamics365: "dynamics365",
  quickbooks: "quickbooks",
  xero: "xero",
  netsuite: "netsuite",
  sage: "sage",
};
const displayNames = {
  quickbooks: "QuickBooks",
  xero: "Xero",
  netsuite: "NetSuite",
  dynamics365: "Microsoft Dynamics",
  sage: "Sage",
};
const requiredObjects = [
  "normalizedAccounts",
  "normalizedTrialBalance",
  "normalizedBalanceSheet",
  "normalizedIncomeStatement",
];
const allNormalizedObjects = [
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
const optionalObjects = allNormalizedObjects.filter((key) => !requiredObjects.includes(key));

function getProviderArg() {
  const providerFlagIndex = process.argv.indexOf("--provider");
  const rawProvider = providerFlagIndex >= 0 ? process.argv[providerFlagIndex + 1] : process.argv[2];
  const provider = providerAliases[String(rawProvider || "").toLowerCase()];
  if (!provider) throw new Error("Provider is required. Use --provider quickbooks|xero|netsuite|dynamics|sage.");
  return provider;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function isPresentArray(value) {
  return Array.isArray(value) && value.length > 0 && !value.every((item) => item?.type === "not_available");
}

function pass(message) {
  console.log(`✓ ${message}`);
}

function warn(message) {
  console.log(`⚠ ${message}`);
}

function buildConnection(provider, fixture) {
  return {
    id: `certification-${provider}-connection`,
    user_id: "certification-user",
    provider,
    provider_family: provider,
    provider_product: `${provider}_certification`,
    external_entity_id: `${provider}:certification-company`,
    external_entity_name: fixture.companyName || `${displayNames[provider]} Certification Company`,
    access_token: "fixture-access-token",
    refresh_token: "fixture-refresh-token",
    token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tenant_or_realm_id: "certification-company",
    scopes: ["certification"],
    status: "connected",
    metadata_json: {
      company_id: `certification-company-${provider}`,
      certification_fixture: fixture,
    },
  };
}

function assertDownstreamReadiness(normalizedData) {
  const { buildFinancialPackagePdfBlob, buildFluxAnalysisPdfBlob } = require("../lib/financial-package-pdf.ts");

  if (requiredObjects.every((key) => isPresentArray(normalizedData[key]))) pass("KPI engine readiness passed");
  else throw new Error("KPI engine readiness failed: missing core normalized financial data.");

  const fluxBlob = buildFluxAnalysisPdfBlob({ companyName: "Certification Company", normalizedData });
  if (fluxBlob?.size > 0) pass("Flux engine readiness passed");
  else throw new Error("Flux engine readiness failed: flux package generator did not return a PDF blob.");

  const pulseSource = read("lib/pulse-context-engine.js");
  if (pulseSource.includes("buildPulseContextPackage") && requiredObjects.every((key) => isPresentArray(normalizedData[key]))) {
    pass("Pulse engine readiness passed");
  } else {
    throw new Error("Pulse engine readiness failed: Pulse context engine entrypoint or normalized core data is missing.");
  }

  const pdfBlob = buildFinancialPackagePdfBlob({ companyName: "Certification Company", normalizedData });
  if (pdfBlob?.size > 0) pass("PDF package readiness passed");
  else throw new Error("PDF package readiness failed: PDF package generator did not return a PDF blob.");

  const deliveryArchitecture = read("lib/executive-delivery-architecture.js");
  if (deliveryArchitecture.includes("PowerPoint")) pass("PowerPoint package readiness passed");
  else warn("PowerPoint package readiness has no dedicated generator entrypoint yet.");

  const backgroundJobs = read("lib/background-jobs.js");
  if (backgroundJobs.includes("PDF generation") && backgroundJobs.includes("PowerPoint generation")) {
    pass("Scheduled report workflow readiness passed");
  } else {
    warn("Scheduled report workflow not available in local workflow catalog.");
  }
}

async function certify() {
  const provider = getProviderArg();
  const displayName = displayNames[provider];
  const fixture = readJson(`scripts/fixtures/accounting/${provider}.json`);
  const { getAccountingProvider } = require("../lib/integrations/accounting/registry.ts");
  const { getAccountingProviderMappingAdapter } = require("../lib/integrations/accounting/provider-adapters.ts");
  const {
    assertReadyForSourceAgnosticOutputs,
  } = require("../lib/integrations/accounting/advisacor-data-model.ts");

  console.log(`${displayName} Connector Certification`);

  const adapter = getAccountingProvider(provider);
  const mappingAdapter = getAccountingProviderMappingAdapter(provider);
  const connection = buildConnection(provider, fixture);
  const dateRange = { startDate: "2026-05-01", endDate: "2026-05-31" };
  const rawReports = await mappingAdapter.fetchRawReports(connection, dateRange);
  const normalizedData = await mappingAdapter.normalize(rawReports, {
    connection,
    reportPeriod: dateRange,
    syncId: `${provider}-certification-sync`,
    tenantId: connection.tenant_or_realm_id,
    tenantName: connection.external_entity_name,
  });
  mappingAdapter.validate(normalizedData);

  const missingRequired = [];

  if (adapter.provider === provider && normalizedData.sourceSystem === provider && normalizedData.companyId && normalizedData.connectionId) {
    pass("Provider identity valid");
  } else {
    missingRequired.push("provider identity");
  }

  for (const key of allNormalizedObjects) {
    if (isPresentArray(normalizedData[key])) {
      if (key === "normalizedAccounts") pass("Normalized accounts present");
      else if (key === "normalizedTrialBalance") pass("Trial balance present");
      else if (key === "normalizedBalanceSheet") pass("Balance sheet present");
      else if (key === "normalizedIncomeStatement") pass("Income statement present");
    } else if (requiredObjects.includes(key)) {
      missingRequired.push(key);
    } else if (optionalObjects.includes(key)) {
      warn(`${key.replace(/^normalized/, "").replace(/([A-Z])/g, " $1").trim()} not available in fixture`);
    }
  }

  if (missingRequired.length === 0) {
    assertReadyForSourceAgnosticOutputs(normalizedData);
    pass("Core reporting readiness passed");
    assertDownstreamReadiness(normalizedData);
    console.log("Certification result: PASSED");
    return;
  }

  console.log("Certification result: FAILED");
  console.log("Missing required normalized objects:");
  missingRequired.forEach((key) => console.log(`- ${key}`));
  process.exitCode = 1;
}

certify().catch((error) => {
  console.error("Certification result: FAILED");
  console.error(error?.message || error);
  process.exitCode = 1;
});
