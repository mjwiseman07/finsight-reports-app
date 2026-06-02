/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");
const Module = require("module");
const ts = require("typescript");

const originalLoad = Module._load;
Module._load = function loadWithXeroMappingStubs(request, parent, isMain) {
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

const { XERO_SCOPES } = require("../lib/integrations/accounting/providers/xero.ts");

function pass(message) {
  console.log(`PASS ${message}`);
}

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function xeroCell(value, attributes = []) {
  return { Value: value, Attributes: attributes };
}

function accountCell(value, accountId, accountCode) {
  return xeroCell(value, [
    { Id: "account", Value: accountId },
    { Id: "accountCode", Value: accountCode },
  ]);
}

function populatedReports() {
  return {
    Accounts: [
      { AccountID: "x-1000", Name: "Business Bank", Code: "1000", Type: "BANK", Class: "ASSET", Status: "ACTIVE", CurrencyCode: "USD" },
      { AccountID: "x-1100", Name: "Accounts Receivable", Code: "1100", Type: "CURRENT", Class: "ASSET", Status: "ACTIVE", CurrencyCode: "USD" },
      { AccountID: "x-2000", Name: "Accounts Payable", Code: "2000", Type: "CURRLIAB", Class: "LIABILITY", Status: "ACTIVE", CurrencyCode: "USD" },
      { AccountID: "x-3000", Name: "Owner Equity", Code: "3000", Type: "EQUITY", Class: "EQUITY", Status: "ACTIVE", CurrencyCode: "USD" },
      { AccountID: "x-4000", Name: "Consulting Revenue", Code: "4000", Type: "REVENUE", Class: "REVENUE", Status: "ACTIVE", CurrencyCode: "USD" },
      { AccountID: "x-6000", Name: "Payroll Expense", Code: "6000", Type: "EXPENSE", Class: "EXPENSE", Status: "ACTIVE", CurrencyCode: "USD" },
    ],
    BalanceSheet: {
      Reports: [{
        Rows: [
          {
            RowType: "Section",
            Title: "Assets",
            Rows: [
              { RowType: "Row", Cells: [accountCell("Business Bank", "x-1000", "1000"), xeroCell("98,000.00")] },
              { RowType: "Row", Cells: [accountCell("Accounts Receivable", "x-1100", "1100"), xeroCell("64,000.00")] },
              { RowType: "SummaryRow", Cells: [xeroCell("Total Assets"), xeroCell("162,000.00")] },
            ],
          },
          {
            RowType: "Section",
            Title: "Liabilities",
            Rows: [
              { RowType: "Row", Cells: [accountCell("Accounts Payable", "x-2000", "2000"), xeroCell("38,000.00")] },
              { RowType: "SummaryRow", Cells: [xeroCell("Total Liabilities"), xeroCell("38,000.00")] },
            ],
          },
          {
            RowType: "Section",
            Title: "Equity",
            Rows: [
              { RowType: "Row", Cells: [accountCell("Owner Equity", "x-3000", "3000"), xeroCell("124,000.00")] },
              { RowType: "SummaryRow", Cells: [xeroCell("Total Equity"), xeroCell("124,000.00")] },
            ],
          },
        ],
      }],
    },
    ProfitAndLoss: {
      Reports: [{
        Rows: [
          {
            RowType: "Section",
            Title: "Income",
            Rows: [
              { RowType: "Row", Cells: [accountCell("Consulting Revenue", "x-4000", "4000"), xeroCell("180,000.00")] },
              { RowType: "SummaryRow", Cells: [xeroCell("Total Income"), xeroCell("180,000.00")] },
            ],
          },
          {
            RowType: "Section",
            Title: "Operating Expenses",
            Rows: [
              { RowType: "Row", Cells: [accountCell("Payroll Expense", "x-6000", "6000"), xeroCell("(72,000.00)")] },
              { RowType: "SummaryRow", Cells: [xeroCell("Total Operating Expenses"), xeroCell("(72,000.00)")] },
            ],
          },
          { RowType: "SummaryRow", Cells: [xeroCell("Net Profit"), xeroCell("108,000.00")] },
        ],
      }],
    },
    TrialBalance: {
      Reports: [{
        Rows: [
          { RowType: "Header", Cells: [xeroCell("Account"), xeroCell("Debit"), xeroCell("Credit")] },
          { RowType: "Row", Cells: [accountCell("Business Bank", "x-1000", "1000"), xeroCell("98,000.00"), xeroCell("")] },
          { RowType: "Row", Cells: [accountCell("Accounts Receivable", "x-1100", "1100"), xeroCell("64,000.00"), xeroCell("")] },
          { RowType: "Row", Cells: [accountCell("Payroll Expense", "x-6000", "6000"), xeroCell("72,000.00"), xeroCell("")] },
          { RowType: "Row", Cells: [accountCell("Accounts Payable", "x-2000", "2000"), xeroCell(""), xeroCell("38,000.00")] },
          { RowType: "Row", Cells: [accountCell("Consulting Revenue", "x-4000", "4000"), xeroCell(""), xeroCell("180,000.00")] },
          { RowType: "Row", Cells: [accountCell("Owner Equity", "x-3000", "3000"), xeroCell(""), xeroCell("16,000.00")] },
        ],
      }],
    },
    Contacts: { Contacts: [] },
    BankTransactions: { BankTransactions: [] },
    EmptyReport: { Reports: [{ Rows: [] }] },
  };
}

function zeroReportsWithRows() {
  const reports = populatedReports();
  reports.BalanceSheet = { Reports: [{ Rows: [{ RowType: "Row", Cells: [accountCell("Business Bank", "x-1000", "1000"), xeroCell("0.00")] }] }] };
  reports.ProfitAndLoss = { Reports: [{ Rows: [{ RowType: "Row", Cells: [accountCell("Consulting Revenue", "x-4000", "4000"), xeroCell("0.00")] }] }] };
  reports.TrialBalance = { Reports: [{ Rows: [{ RowType: "Row", Cells: [accountCell("Business Bank", "x-1000", "1000"), xeroCell("0.00"), xeroCell("0.00")] }] }] };
  return reports;
}

function emptyReports() {
  return {
    Accounts: [],
    BalanceSheet: { Reports: [{ Rows: [] }] },
    ProfitAndLoss: { Reports: [{ Rows: [] }] },
    TrialBalance: { Reports: [{ Rows: [] }] },
    Contacts: { Contacts: [] },
    BankTransactions: { BankTransactions: [] },
    EmptyReport: { Reports: [{ Rows: [] }] },
  };
}

function rawAccountsButUnmapped() {
  return {
    ...emptyReports(),
    Accounts: [{}],
  };
}

function rawTrialBalanceButUnmapped() {
  return {
    ...emptyReports(),
    TrialBalance: {
      Reports: [{
        Rows: [
          { RowType: "Header", Cells: [xeroCell("Account"), xeroCell("Debit"), xeroCell("Credit")] },
        ],
      }],
    },
  };
}

function installXeroFetchMock(reports) {
  global.fetch = async (url) => {
    const requestUrl = String(url);
    let payload = reports.EmptyReport;
    if (requestUrl.includes("/Accounts")) payload = { Accounts: reports.Accounts };
    else if (requestUrl.includes("Reports/BalanceSheet")) payload = reports.BalanceSheet;
    else if (requestUrl.includes("Reports/ProfitAndLoss")) payload = reports.ProfitAndLoss;
    else if (requestUrl.includes("Reports/TrialBalance")) payload = reports.TrialBalance;
    else if (requestUrl.includes("Contacts")) payload = reports.Contacts;
    else if (requestUrl.includes("BankTransactions")) payload = reports.BankTransactions;
    return {
      ok: true,
      status: 200,
      json: async () => payload,
    };
  };
}

function buildConnection() {
  return {
    id: "xero-mapping-connection",
    user_id: "xero-mapping-user",
    provider: "xero",
    provider_family: "xero",
    provider_product: "xero_accounting",
    external_entity_id: "xero:tenant-1",
    external_entity_name: "Xero Mapping Demo",
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    token_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    tenant_or_realm_id: "tenant-1",
    scopes: XERO_SCOPES.split(/\s+/),
    status: "connected",
    metadata_json: { company_id: "xero-mapping-company" },
  };
}

async function normalizeWithMockedXero(reports) {
  installXeroFetchMock(reports);
  const { xeroAdapter } = require("../lib/integrations/accounting/provider-adapters.ts");
  const connection = buildConnection();
  const reportPeriod = { startDate: "2026-05-01", endDate: "2026-05-31" };
  const rawReports = await xeroAdapter.fetchRawReports(connection, reportPeriod);
  return xeroAdapter.normalize(rawReports, {
    connection,
    reportPeriod,
    syncId: "xero-mapping-sync",
    tenantId: "tenant-1",
    tenantName: "Xero Mapping Demo",
  });
}

async function run() {
  const normalized = await normalizeWithMockedXero(populatedReports());
  const totalAssets = normalized.normalizedBalanceSheet.find((row) => row.label === "Total Assets")?.amount;
  const totalLiabilities = normalized.normalizedBalanceSheet.find((row) => row.label === "Total Liabilities")?.amount;
  const totalEquity = normalized.normalizedBalanceSheet.find((row) => row.label === "Total Equity")?.amount;
  if (totalAssets === 162000 && totalLiabilities === 38000 && totalEquity === 124000) pass("Xero populated Balance Sheet maps non-zero assets/liabilities/equity");
  else fail(`Xero Balance Sheet totals are wrong: assets=${totalAssets}, liabilities=${totalLiabilities}, equity=${totalEquity}`);

  const revenue = normalized.normalizedIncomeStatement.find((row) => row.label === "Total Income")?.amount;
  const expenses = normalized.normalizedIncomeStatement.find((row) => row.label === "Total Operating Expenses")?.amount;
  const netIncome = normalized.normalizedIncomeStatement.find((row) => row.label === "Net Profit")?.amount;
  if (revenue === 180000 && expenses === -72000 && netIncome === 108000) pass("Xero populated Profit and Loss maps non-zero revenue/expenses/net income");
  else fail(`Xero P&L totals are wrong: revenue=${revenue}, expenses=${expenses}, netIncome=${netIncome}`);

  const totalDebits = normalized.normalizedTrialBalance.reduce((total, row) => total + row.debit, 0);
  const totalCredits = normalized.normalizedTrialBalance.reduce((total, row) => total + row.credit, 0);
  if (normalized.normalizedTrialBalance.length >= 6 && totalDebits === 234000 && totalCredits === 234000) pass("Xero populated Trial Balance maps accounts/debits/credits");
  else fail(`Xero Trial Balance is wrong: rows=${normalized.normalizedTrialBalance.length}, debits=${totalDebits}, credits=${totalCredits}`);

  const bankAccount = normalized.normalizedAccounts.find((account) => account.accountNumber === "1000");
  if (bankAccount?.accountType === "BANK" && bankAccount.accountClass === "ASSET" && bankAccount.status === "ACTIVE" && bankAccount.currency === "USD") pass("Xero Chart of Accounts maps account code/type/class/status/currency");
  else fail("Xero Chart of Accounts metadata is missing");

  const empty = await normalizeWithMockedXero(emptyReports());
  const emptyTotal = [
    ...empty.normalizedBalanceSheet,
    ...empty.normalizedIncomeStatement,
    ...empty.normalizedTrialBalance,
  ].reduce((total, row) => total + Math.abs(Number(row.amount || row.debit || row.credit || row.netAmount || 0)), 0);
  if (emptyTotal === 0 && empty.validation.warnings.some((warning) => /No financial activity/i.test(warning))) pass("Xero empty company maps zero only when raw reports are truly empty");
  else fail("Xero empty company did not map to confirmed zero/no-activity data");

  try {
    await normalizeWithMockedXero(zeroReportsWithRows());
    fail("Xero raw rows present but mapped totals zero was not blocked");
  } catch (error) {
    if (/Xero (Balance Sheet|Profit and Loss|source) data .*could not be normalized safely/i.test(String(error.message || ""))) pass("Xero raw rows present but mapped totals zero causes validation blocker");
    else fail(`Unexpected Xero unsafe mapping error: ${error.message}`);
  }

  try {
    await normalizeWithMockedXero(rawAccountsButUnmapped());
    fail("Xero raw accounts present but mapped accounts zero was not blocked");
  } catch (error) {
    if (String(error.message || "").includes("Xero Accounts data was retrieved but could not be normalized safely.")) pass("Xero raw accounts present but mapped accounts zero is blocked");
    else fail(`Unexpected Xero accounts mapping error: ${error.message}`);
  }

  try {
    await normalizeWithMockedXero(rawTrialBalanceButUnmapped());
    fail("Xero raw trial balance rows present but mapped rows zero was not blocked");
  } catch (error) {
    if (String(error.message || "").includes("Xero Trial Balance data was retrieved but could not be normalized safely.")) pass("Xero raw trial balance rows present but mapped rows zero is blocked");
    else fail(`Unexpected Xero trial balance mapping error: ${error.message}`);
  }

  if (process.exitCode) {
    console.error("\nXero mapping verification failed.");
    process.exit(process.exitCode);
  }

  console.log("\nXero mapping verification passed.");
}

run().catch((error) => {
  console.error("Xero mapping verification failed.");
  console.error(error?.message || error);
  process.exitCode = 1;
});
