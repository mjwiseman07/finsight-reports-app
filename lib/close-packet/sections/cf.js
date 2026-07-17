import { getQboForFirmClient } from "@/lib/qbo-for-firm-client";
import { reportCashFlow } from "@/lib/qbo-rest";
import { walkQboReport, pctChange, priorPeriodRange } from "@/lib/close-packet/qbo-report-walker";
import { formatMoney, DEFAULT_FALLBACK_CURRENCY } from "@/lib/format/money";

export async function build(ctx) {
  const { closePeriod, firmClient, homeCurrency, priorSections } = ctx;
  const currency = homeCurrency || DEFAULT_FALLBACK_CURRENCY;
  try {
    const { accessToken, realmId } = await getQboForFirmClient(firmClient.id);
    const prior = priorPeriodRange(closePeriod.period_start, closePeriod.period_end);
    const [currentReport, priorReport] = await Promise.all([
      reportCashFlow(accessToken, realmId, {
        start_date: closePeriod.period_start,
        end_date: closePeriod.period_end,
      }),
      reportCashFlow(accessToken, realmId, { start_date: prior.start, end_date: prior.end }),
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
        pct_change: pctChange(current, priorVal),
        is_subtotal: cur.is_subtotal,
        indent_level: cur.indent_level,
      };
    });
    const warnings = [];
    const endingCash = rows.find((r) => /Cash at end of period|Ending Cash/i.test(r.account_name))?.current;
    const bsSection = priorSections?.bs;
    if (endingCash !== undefined && bsSection?.status === "ok") {
      const bsCash = bsSection.rows.find((r) => /^Cash|Total Bank/i.test(r.account_name))?.current;
      if (bsCash !== undefined && Math.abs(endingCash - bsCash) > 1) {
        warnings.push(
          `Cash flow ending cash ${formatMoney(endingCash, currency)} ` +
            `does not tie to balance sheet cash ${formatMoney(bsCash, currency)}`,
        );
      }
    }
    return {
      status: "ok",
      columns: ["Line Item", "Current Period", "Prior Period", "% Change"],
      period_labels: {
        current: `${closePeriod.period_start} to ${closePeriod.period_end}`,
        prior: `${prior.start} to ${prior.end}`,
      },
      rows,
      warnings,
      notes: [`Amounts in ${currency}`],
      currency,
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}
