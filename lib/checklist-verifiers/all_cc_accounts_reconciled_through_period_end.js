import { getVerifierQbo } from "./context";
import { extractQueryEntities, qboQuery } from "@/lib/qbo-rest";

export async function allCcAccountsReconciled(ctx) {
  const { accessToken, realmId } = await getVerifierQbo(ctx);
  const payload = await qboQuery(
    accessToken,
    realmId,
    "select Id, Name from Account where AccountType = 'Credit Card' and Active = true maxresults 1000",
  );
  const accounts = extractQueryEntities(payload, "Account");
  if (accounts.length === 0) {
    return {
      passed: true,
      detail: "No active credit card accounts found.",
      raw: { accounts: [] },
    };
  }
  return {
    passed: false,
    detail: `Cannot auto-verify reconciliation dates for ${accounts.length} credit card account(s) via QBO API. Confirm each account is reconciled through ${ctx.periodEnd}.`,
    raw: {
      accounts: accounts.map((a) => ({ id: a.Id, name: a.Name })),
      manualRequired: true,
    },
  };
}
