// Reconciliations Summary.
// C1 scaffold: derives account status from the checklist run's reconciliation
// items (deterministic, no direct QBO call). C2 enriches with live QBO account
// balances + unreconciled txn counts.
function mapItemStatus(status) {
  if (status === "passed" || status === "manual_confirmed") return "current";
  if (status === "waived") return "waived";
  if (status === "failed") return "stale";
  return "not_reconciled";
}

export async function build(ctx) {
  const { checklistRun } = ctx;
  const runItems = checklistRun?.close_checklist_run_items || [];

  const reconItems = runItems.filter(
    (ri) => ri.close_checklist_items?.category === "reconciliation",
  );

  return {
    source: "checklist_run",
    accounts: reconItems.map((ri) => ({
      account_name: ri.close_checklist_items?.label || ri.close_checklist_items?.code,
      account_type: null,
      last_reconciled: ri.verified_at || null,
      status: mapItemStatus(ri.status),
      balance_at_period_end: null,
      unreconciled_txns: null,
      note: ri.note || null,
    })),
  };
}
