/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const Module = require("module");
const path = require("path");
const ts = require("typescript");

const root = process.cwd();
const fixedNow = "2026-06-01T00:00:00.000Z";
const providers = ["quickbooks", "xero"];
const normalizedRowKeys = [
  "normalizedAccounts",
  "normalizedTransactions",
  "normalizedTrialBalance",
  "normalizedBalanceSheet",
  "normalizedIncomeStatement",
  "normalizedIncomeStatementYtd",
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

const originalLoad = Module._load;
Module._load = function loadWithEquivalenceStubs(request, parent, isMain) {
  if (request.endsWith("erp-adapters/quickbooks-adapter") || request.endsWith("erp-adapters\\quickbooks-adapter")) {
    return {
      QuickBooksAdapter: class QuickBooksLaneEquivalenceAdapter {
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

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
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
    id: `lane-equivalence-${provider}-connection`,
    user_id: "lane-equivalence-user",
    provider,
    provider_family: provider,
    provider_product: `${provider}_lane_equivalence`,
    external_entity_id: `${provider}:lane-equivalence-company`,
    external_entity_name: fixture.companyName || `${provider} Lane Equivalence Company`,
    access_token: "fixture-access-token",
    refresh_token: "fixture-refresh-token",
    token_expires_at: "2026-06-01T01:00:00.000Z",
    tenant_or_realm_id: "lane-equivalence-company",
    scopes: ["lane-equivalence"],
    status: "connected",
    metadata_json: {
      company_id: `lane-equivalence-company-${provider}`,
      certification_fixture: fixture,
    },
  };
}

function stableStringify(value) {
  return JSON.stringify(sortObject(value), null, 2);
}

function sortObject(value) {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).sort().reduce((sorted, key) => {
    sorted[key] = sortObject(value[key]);
    return sorted;
  }, {});
}

async function withFrozenTime(callback) {
  const RealDate = Date;
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length > 0) return super(...args);
      return new RealDate(fixedNow);
    }

    static now() {
      return new RealDate(fixedNow).getTime();
    }

    static parse(value) {
      return RealDate.parse(value);
    }

    static UTC(...args) {
      return RealDate.UTC(...args);
    }
  }

  global.Date = FrozenDate;
  try {
    return await callback();
  } finally {
    global.Date = RealDate;
  }
}

function amountTotal(rows, keys) {
  return rows.reduce((total, row) => total + keys.reduce((sum, key) => sum + Number(row?.[key] || 0), 0), 0);
}

function rowSignature(row) {
  const raw = row?.source?.raw && typeof row.source.raw === "object" ? row.source.raw : {};
  return {
    label: row?.label || row?.name || row?.accountName || row?.id || "",
    section: row?.section || "",
    amount: Number(row?.amount || row?.netAmount || 0),
    hierarchyPath: raw.__advisacorHierarchyPath || raw.hierarchyPath || raw.hierarchy || [],
  };
}

function assertRowCounts(provider, oldData, newData) {
  for (const key of normalizedRowKeys) {
    const oldCount = Array.isArray(oldData[key]) ? oldData[key].length : 0;
    const newCount = Array.isArray(newData[key]) ? newData[key].length : 0;
    if (oldCount !== newCount) throw new Error(`${provider} ${key} row count changed: old=${oldCount} new=${newCount}`);
  }
  pass(`${provider} row counts equivalent`);
}

function assertBalances(provider, oldData, newData) {
  const checks = [
    ["normalizedBalanceSheet", ["amount"]],
    ["normalizedIncomeStatement", ["amount"]],
    ["normalizedIncomeStatementYtd", ["amount"]],
    ["normalizedTrialBalance", ["debit", "credit", "netAmount"]],
  ];

  for (const [key, amountKeys] of checks) {
    const oldTotal = amountTotal(oldData[key] || [], amountKeys);
    const newTotal = amountTotal(newData[key] || [], amountKeys);
    if (Math.abs(oldTotal - newTotal) > 0.0001) throw new Error(`${provider} ${key} balance changed: old=${oldTotal} new=${newTotal}`);
  }
  pass(`${provider} balances equivalent`);
}

function assertClassifications(provider, oldData, newData) {
  for (const key of ["normalizedBalanceSheet", "normalizedIncomeStatement", "normalizedIncomeStatementYtd"]) {
    const oldSignatures = stableStringify((oldData[key] || []).map(rowSignature));
    const newSignatures = stableStringify((newData[key] || []).map(rowSignature));
    if (oldSignatures !== newSignatures) throw new Error(`${provider} ${key} classifications or hierarchy changed`);
  }
  pass(`${provider} classifications and hierarchy equivalent`);
}

function assertByteEquivalent(provider, oldData, newData) {
  const oldSerialized = stableStringify(oldData);
  const newSerialized = stableStringify(newData);
  if (oldSerialized !== newSerialized) {
    const oldLines = oldSerialized.split("\n");
    const newLines = newSerialized.split("\n");
    const firstDiff = oldLines.findIndex((line, index) => line !== newLines[index]);
    throw new Error(`${provider} normalized output differs at line ${firstDiff + 1}: old=${oldLines[firstDiff]} new=${newLines[firstDiff]}`);
  }
  pass(`${provider} normalized output byte-for-byte equivalent`);
}

async function verifyProvider(provider) {
  const fixture = readJson(`scripts/fixtures/accounting/${provider}.json`);
  const { getAccountingProviderMappingAdapter } = require("../lib/integrations/accounting/provider-adapters.ts");
  const { getProviderLaneAdapter } = require("../lib/integrations/shared/compatibility/providerLaneRegistry.ts");
  const oldAdapter = getAccountingProviderMappingAdapter(provider);
  const laneAdapter = getProviderLaneAdapter(provider);
  const connection = buildConnection(provider, fixture);
  const reportPeriod = { startDate: "2026-05-01", endDate: "2026-05-31" };
  const context = {
    connection,
    reportPeriod,
    syncId: `${provider}-lane-equivalence-sync`,
    tenantId: connection.tenant_or_realm_id,
    tenantName: connection.external_entity_name,
  };

  const oldRawReports = await oldAdapter.fetchRawReports(connection, reportPeriod);
  const laneRawReports = await laneAdapter.fetchInitialPeriodData({ connection, reportPeriod });
  if (stableStringify(oldRawReports) !== stableStringify(laneRawReports)) throw new Error(`${provider} raw report pull changed through lane wrapper`);

  const oldData = await withFrozenTime(() => oldAdapter.normalize(oldRawReports, context));
  const newData = await withFrozenTime(() => laneAdapter.normalizeData(laneRawReports, context));

  assertRowCounts(provider, oldData, newData);
  assertBalances(provider, oldData, newData);
  assertClassifications(provider, oldData, newData);
  assertByteEquivalent(provider, oldData, newData);
}

async function main() {
  for (const provider of providers) {
    await verifyProvider(provider);
  }
  if (process.exitCode) process.exit(process.exitCode);
  console.log("\nAdapter lane equivalence verification passed.");
}

main().catch((error) => {
  fail(error?.message || error);
  process.exit(process.exitCode || 1);
});
