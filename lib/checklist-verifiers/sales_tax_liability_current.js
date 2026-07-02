import { getVerifierQbo } from "./context";
import { extractQueryEntities, qboQuery } from "@/lib/qbo-rest";

export async function salesTaxLiabilityCurrent(ctx) {
  const { accessToken, realmId } = await getVerifierQbo(ctx);
  const accountsPayload = await qboQuery(
    accessToken,
    realmId,
    "select Id, Name from Account where AccountSubType = 'SalesTaxPayable' and Active = true maxresults 100",
  );
  const accounts = extractQueryEntities(accountsPayload, "Account");
  if (accounts.length === 0) {
    return {
      passed: true,
      detail: "No sales tax payable account configured — item does not apply.",
      raw: { skipped: true },
    };
  }

  const txnsPayload = await qboQuery(
    accessToken,
    realmId,
    `select Id, Line from JournalEntry where TxnDate >= '${ctx.periodStart}' and TxnDate <= '${ctx.periodEnd}' maxresults 1000`,
  );
  const txns = extractQueryEntities(txnsPayload, "JournalEntry");
  const accountIds = new Set(accounts.map((a) => a.Id));
  const hasActivity = txns.some((j) =>
    (j.Line || []).some((l) => accountIds.has(l.JournalEntryLineDetail?.AccountRef?.value)),
  );

  return {
    passed: hasActivity,
    detail: hasActivity
      ? "Sales tax liability activity recorded in period."
      : "No sales tax activity found — please confirm and post if applicable.",
    raw: { accountCount: accounts.length, hasActivity },
  };
}
