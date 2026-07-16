// lib/qbo/webhook-handlers.js
//
// Issue #2 — Entity handler dispatch for Intuit CloudEvents webhooks.
//
// Design contract:
//   - Called AFTER the event row is persisted in qbo_webhook_events.
//   - Called in a fire-and-forget context — no return value is awaited.
//   - MUST self-report status back onto the row via processed_at + processed_status.
//   - MUST NOT re-throw — swallow all errors, log, and record in processed_error.
//   - Handler stubs today only record "acknowledged" — actual QBO API refetch is
//     wired in Issue #4 (CDC cron consumes rows where fetch_pending = true).
//
// Row shape (from Block B insert):
//   { id, cloud_event_id, entity_name, operation, intuit_account_id, intuit_entity_id, data_payload }
import { supabaseAdmin } from "../supabase";

/**
 * Public entry point — Block B's route handler calls this.
 * Fire-and-forget. Never throws.
 */
export async function dispatchWebhookEvent(row) {
  try {
    const handler = HANDLERS[row.entity_name] || defaultHandler;
    await handler(row);
    await markProcessed(row.id, "ok", null);
  } catch (err) {
    console.error("[qbo-webhook-handlers] handler threw", {
      cloud_event_id: row.cloud_event_id,
      entity: row.entity_name,
      operation: row.operation,
      error: err?.message || String(err),
    });
    // Record failure — row stays with fetch_pending=true so Issue #4 CDC picks it up.
    try {
      await markProcessed(row.id, "error", err?.message || String(err));
    } catch (persistErr) {
      console.error(
        "[qbo-webhook-handlers] failed to record processing error",
        persistErr,
      );
    }
  }
}

// =========================================================================
// Entity handlers — stubs for Issue #2.
//
// Each handler's Issue #2 job is:
//   1. Log the event (for App Store review evidence).
//   2. Do any lightweight local-only bookkeeping (e.g. mark customer as
//      "may need re-fetch").
//   3. Leave `fetch_pending = true` so Issue #4 CDC cron will refetch the
//      full record from the QBO API on its next tick.
//
// Do NOT call the QBO API here. Doing so would:
//   - Slow the webhook 200 response beyond Intuit's timeout window.
//   - Require token lookup + refresh logic that belongs in the CDC path.
//   - Duplicate work Issue #4 will do more reliably (rate-limited, retried).
// =========================================================================

async function handleAccount(row)      { logAck(row, "account"); }
async function handleBill(row)         { logAck(row, "bill"); }
async function handleBillPayment(row)  { logAck(row, "billpayment"); }
async function handleBudget(row)       { logAck(row, "budget"); }
async function handleClass(row)        { logAck(row, "class"); }
async function handleCreditMemo(row)   { logAck(row, "creditmemo"); }
async function handleCurrency(row)     { logAck(row, "currency"); }
async function handleCustomer(row)     { logAck(row, "customer"); }
async function handleDepartment(row)   { logAck(row, "department"); }
async function handleDeposit(row)      { logAck(row, "deposit"); }
async function handleEmployee(row)     { logAck(row, "employee"); }
async function handleEstimate(row)     { logAck(row, "estimate"); }
async function handleInvoice(row)      { logAck(row, "invoice"); }
async function handleItem(row)         { logAck(row, "item"); }
async function handleJournalEntry(row) { logAck(row, "journalentry"); }
async function handlePayment(row)      { logAck(row, "payment"); }
async function handlePurchase(row)     { logAck(row, "purchase"); }
async function handlePurchaseOrder(row){ logAck(row, "purchaseorder"); }
async function handleRefundReceipt(row){ logAck(row, "refundreceipt"); }
async function handleSalesReceipt(row) { logAck(row, "salesreceipt"); }
async function handleTimeActivity(row) { logAck(row, "timeactivity"); }
async function handleTransfer(row)     { logAck(row, "transfer"); }
async function handleVendor(row)       { logAck(row, "vendor"); }
async function handleVendorCredit(row) { logAck(row, "vendorcredit"); }

async function defaultHandler(row) {
  console.log("[qbo-webhook-handlers] no handler registered for entity, acking", {
    cloud_event_id: row.cloud_event_id,
    entity: row.entity_name,
    operation: row.operation,
    realm: row.intuit_account_id,
  });
}

// =========================================================================
// Registry — keys MUST match `entity_name` after `parseCloudEventType`
// (lowercased second segment of the CloudEvents `type` string).
// =========================================================================
const HANDLERS = {
  account:       handleAccount,
  bill:          handleBill,
  billpayment:   handleBillPayment,
  budget:        handleBudget,
  class:         handleClass,
  creditmemo:    handleCreditMemo,
  currency:      handleCurrency,
  customer:      handleCustomer,
  department:    handleDepartment,
  deposit:       handleDeposit,
  employee:      handleEmployee,
  estimate:      handleEstimate,
  invoice:       handleInvoice,
  item:          handleItem,
  journalentry:  handleJournalEntry,
  payment:       handlePayment,
  purchase:      handlePurchase,
  purchaseorder: handlePurchaseOrder,
  refundreceipt: handleRefundReceipt,
  salesreceipt:  handleSalesReceipt,
  timeactivity:  handleTimeActivity,
  transfer:      handleTransfer,
  vendor:        handleVendor,
  vendorcredit:  handleVendorCredit,
};

// =========================================================================
// Utilities
// =========================================================================

function logAck(row, label) {
  console.log("[qbo-webhook-handlers] acked", {
    cloud_event_id: row.cloud_event_id,
    entity: label,
    operation: row.operation,
    realm: row.intuit_account_id,
    entity_id: row.intuit_entity_id,
  });
}

/**
 * Stamp processing state on the row. Enforced append-only by the DB trigger:
 * once processed_at is set, this cannot be re-called for the same row.
 */
async function markProcessed(rowId, status, errorMessage) {
  if (!supabaseAdmin) {
    console.error(
      "[qbo-webhook-handlers] markProcessed skipped — supabaseAdmin is null",
    );
    return;
  }
  const patch = {
    processed_at: new Date().toISOString(),
    processed_status: status,
    processed_error: errorMessage,
  };
  const { error } = await supabaseAdmin
    .from("qbo_webhook_events")
    .update(patch)
    .eq("id", rowId)
    .is("processed_at", null); // only stamp if not already stamped (defensive vs. append-only trigger)
  if (error) {
    console.error("[qbo-webhook-handlers] markProcessed error", {
      row_id: rowId,
      error: error.message,
    });
  }
}
