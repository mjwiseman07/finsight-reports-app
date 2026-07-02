import { getQboForFirmClient } from "@/lib/qbo-for-firm-client";
import { reportBalanceSheet } from "@/lib/qbo-rest";
import { walkQboReport, pctChange } from "@/lib/close-packet/qbo-report-walker";

export async function build(ctx) {
  const { closePeriod, firmClient } = ctx;
  try {
    const { accessToken, realmId } = await getQboForFirmClient(firmClient.id);
    const priorEnd = new Date(closePeriod.period_start);
    priorEnd.setDate(priorEnd.getDate() - 1);
    const priorEndStr = priorEnd.toISOString().slice(0, 10);
    const [currentReport, priorReport] = await Promise.all([
      reportBalanceSheet(accessToken, realmId, { end_date: closePeriod.period_end }),
      reportBalanceSheet(accessToken, realmId, { end_date: priorEndStr }),
    ]);
    const currentRows = walkQboReport(currentReport);
    const priorRows = walkQboReport(priorReport);
    const rows = currentRows.map((cur) => {
      const p = priorRows.find((r) => r.account_name === cur.account_name);
      const current = cur.values[0] ?? 0;
      const priorVal = p?.values[0] ?? 0;
      return {
        account_name: cur.account_name,
        current,
        prior: priorVal,
        change: current - priorVal,
        pct_change: pctChange(current, priorVal),
        is_subtotal: cur.is_subtotal,
        indent_level: cur.indent_level,
      };
    });
    const totalAssets = rows.find((r) => /Total Assets$/i.test(r.account_name))?.current || 0;
    const totalLiabEquity =
      rows.find((r) => /Total Liabilities and Equity/i.test(r.account_name))?.current || 0;
    const warnings = [];
    if (Math.abs(totalAssets - totalLiabEquity) > 1) {
      warnings.push(
        `Balance sheet out of balance: Assets $${totalAssets.toFixed(2)} vs L+E $${totalLiabEquity.toFixed(2)} (diff $${(totalAssets - totalLiabEquity).toFixed(2)})`,
      );
    }
    return {
      status: "ok",
      columns: ["Account", "Current Period End", "Prior Period End", "Change", "% Change"],
      period_labels: {
        current: closePeriod.period_end,
        prior: priorEndStr,
      },
      rows,
      warnings,
      notes: ["Amounts in USD", "Point-in-time balances as of period end"],
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}
