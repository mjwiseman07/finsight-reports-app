import { getQboForFirmClient } from "@/lib/qbo-for-firm-client";
import { reportProfitAndLoss } from "@/lib/qbo-rest";
import {
  walkQboReport,
  mergeReports,
  pctChange,
  priorPeriodRange,
  yoyPeriodRange,
} from "@/lib/close-packet/qbo-report-walker";

export async function build(ctx) {
  const { closePeriod, firmClient } = ctx;
  try {
    const { accessToken, realmId } = await getQboForFirmClient(firmClient.id);
    const prior = priorPeriodRange(closePeriod.period_start, closePeriod.period_end);
    const yoy = yoyPeriodRange(closePeriod.period_start, closePeriod.period_end);
    const [currentReport, priorReport, yoyReport] = await Promise.all([
      reportProfitAndLoss(accessToken, realmId, {
        start_date: closePeriod.period_start,
        end_date: closePeriod.period_end,
      }),
      reportProfitAndLoss(accessToken, realmId, { start_date: prior.start, end_date: prior.end }),
      reportProfitAndLoss(accessToken, realmId, { start_date: yoy.start, end_date: yoy.end }),
    ]);
    const currentRows = walkQboReport(currentReport);
    const priorRows = walkQboReport(priorReport);
    const yoyRows = walkQboReport(yoyReport);
    const merged = mergeReports(currentRows, priorRows, yoyRows);
    const rows = merged.map((row) => {
      const [current, priorVal, yoyVal] = row.values;
      return {
        account_name: row.account_name,
        current: current ?? 0,
        prior: priorVal ?? 0,
        pct_change: pctChange(current ?? 0, priorVal ?? 0),
        yoy: yoyVal ?? 0,
        pct_yoy: pctChange(current ?? 0, yoyVal ?? 0),
        is_subtotal: row.is_subtotal,
        indent_level: row.indent_level,
      };
    });
    return {
      status: "ok",
      columns: ["Account", "Current Period", "Prior Period", "% Change", "YoY", "% YoY"],
      period_labels: {
        current: `${closePeriod.period_start} to ${closePeriod.period_end}`,
        prior: `${prior.start} to ${prior.end}`,
        yoy: `${yoy.start} to ${yoy.end}`,
      },
      rows,
      notes: ["Amounts in USD"],
      generated_at: new Date().toISOString(),
    };
  } catch (err) {
    return { status: "error", error_message: err.message };
  }
}
