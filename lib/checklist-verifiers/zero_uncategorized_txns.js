import { getVerifierQbo } from "./context";
import { qboReport, walkReportRows } from "@/lib/qbo-rest";

const TARGET_ACCOUNT_NAMES = [
  "Uncategorized Income",
  "Uncategorized Expense",
  "Ask My Accountant",
];

export async function zeroUncategorizedTxns(ctx) {
  const { accessToken, realmId } = await getVerifierQbo(ctx);
  const report = await qboReport(accessToken, realmId, "TrialBalance", {
    report_date: ctx.periodEnd,
  });
  const offenders = [];
  walkReportRows(report?.Rows?.Row || [], (node) => {
    const name = node.Header?.ColData?.[0]?.value || node.ColData?.[0]?.value;
    const bal = parseFloat(
      node.ColData?.[3]?.value || node.Summary?.ColData?.[3]?.value || "0",
    );
    if (name && TARGET_ACCOUNT_NAMES.includes(name) && Math.abs(bal) > 0.005) {
      offenders.push({ account: name, balance: bal });
    }
  });
  return {
    passed: offenders.length === 0,
    detail:
      offenders.length === 0
        ? "No balances in Uncategorized Income, Uncategorized Expense, or Ask My Accountant."
        : `Balances found in: ${offenders.map((o) => `${o.account} ($${o.balance.toFixed(2)})`).join(", ")}`,
    raw: { offenders },
  };
}
