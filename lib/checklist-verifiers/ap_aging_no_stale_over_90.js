import { getVerifierQbo } from "./context";
import { qboReport, walkReportRows } from "@/lib/qbo-rest";

export async function apAgingNoStaleOver90(ctx) {
  const { accessToken, realmId } = await getVerifierQbo(ctx);
  const report = await qboReport(accessToken, realmId, "AgedPayableDetail", {
    report_date: ctx.periodEnd,
    aging_period: "30",
    num_periods: "4",
  });
  const stale = [];
  walkReportRows(report?.Rows?.Row || [], (node) => {
    if (node.type !== "Data") return;
    const cols = node.ColData || [];
    const daysOverdue = parseInt(cols[cols.length - 2]?.value || "0", 10);
    const amount = parseFloat(cols[cols.length - 1]?.value || "0");
    if (daysOverdue > 90 && Math.abs(amount) > 0.005) {
      stale.push({ vendor: cols[1]?.value, days: daysOverdue, amount });
    }
  });
  return {
    passed: stale.length === 0,
    detail:
      stale.length === 0
        ? "No AP items over 90 days past due."
        : `${stale.length} bill(s) over 90 days past due totaling $${stale.reduce((s, x) => s + x.amount, 0).toFixed(2)}.`,
    raw: { stale },
  };
}
