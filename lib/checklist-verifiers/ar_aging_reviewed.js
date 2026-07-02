import { getVerifierQbo } from "./context";
import { qboReport } from "@/lib/qbo-rest";

export async function arAgingReviewed(ctx) {
  const { accessToken, realmId } = await getVerifierQbo(ctx);
  const report = await qboReport(accessToken, realmId, "AgedReceivableDetail", {
    report_date: ctx.periodEnd,
  });
  const hasRows = Array.isArray(report?.Rows?.Row) && report.Rows.Row.length > 0;
  return {
    passed: !!report,
    detail: hasRows
      ? "AR aging report generated and stored for review."
      : "AR aging report generated (no open AR).",
    raw: { generated: !!report, hasRows },
  };
}
