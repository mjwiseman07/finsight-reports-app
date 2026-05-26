import { supabaseAdmin } from "../../../lib/supabase";
import { getAuthenticatedQuickBooksClient, getQuickBooksEnvironment } from "../../../lib/quickbooks";

function runReport(qbo, methodName, options) {
  return new Promise((resolve, reject) => {
    qbo[methodName](options, (error, report) => {
      if (error) reject(error);
      else resolve(report);
    });
  });
}

async function runBudgetVsActualReport(oauthClient, realmId, options) {
  const params = new URLSearchParams(options);
  const baseUrl =
    getQuickBooksEnvironment() === "sandbox"
      ? "https://sandbox-quickbooks.api.intuit.com"
      : "https://quickbooks.api.intuit.com";
  const response = await oauthClient.makeApiCall({
    url: `${baseUrl}/v3/company/${realmId}/reports/BudgetVsActual?${params.toString()}`,
    method: "GET",
  });

  return response.json;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!supabaseAdmin) {
    return res.status(500).json({ error: "Supabase admin client is not configured" });
  }

  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";

  if (!token) {
    return res.status(401).json({ error: "Missing Authorization bearer token" });
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

  if (authError || !authData?.user?.id) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  const { start_date: startDate, end_date: endDate } = req.body || {};

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "start_date and end_date are required" });
  }

  try {
    const { qbo, oauthClient, realmId } = await getAuthenticatedQuickBooksClient(authData.user.id);
    const reportOptions = {
      start_date: startDate,
      end_date: endDate,
    };
    const asOfReportOptions = {
      report_date: endDate,
    };
    const reportRequests = {
      profitAndLoss: () => runReport(qbo, "reportProfitAndLoss", reportOptions),
      balanceSheet: () => runReport(qbo, "reportBalanceSheet", asOfReportOptions),
      cashFlowStatement: () => runReport(qbo, "reportCashFlow", reportOptions),
      generalLedger: () => runReport(qbo, "reportGeneralLedgerDetail", reportOptions),
      arAgingSummary: () => runReport(qbo, "reportAgedReceivables", asOfReportOptions),
      apAgingSummary: () => runReport(qbo, "reportAgedPayables", asOfReportOptions),
      salesByCustomer: () => runReport(qbo, "reportCustomerSales", reportOptions),
      expensesByVendor: () => runReport(qbo, "reportVendorExpenses", reportOptions),
      inventoryValuation: () => runReport(qbo, "reportInventoryValuationSummary", asOfReportOptions),
      budgetVsActuals: () => runBudgetVsActualReport(oauthClient, realmId, reportOptions),
    };
    const entries = await Promise.all(
      Object.entries(reportRequests).map(async ([key, requestReport]) => {
        try {
          return [key, { ok: true, data: await requestReport() }];
        } catch (error) {
          return [
            key,
            {
              ok: false,
              error: error?.message || "QuickBooks report request failed",
            },
          ];
        }
      }),
    );

    return res.status(200).json({
      realm_id: realmId,
      start_date: startDate,
      end_date: endDate,
      reports: Object.fromEntries(entries),
    });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Unable to fetch QuickBooks reports" });
  }
}
