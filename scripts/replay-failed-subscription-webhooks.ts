/**
 * FIX-STRIPE-CUSTOMER-ID-WRITE-PATH — Block 3 REVISED
 *
 * Local replay for the 4 pre-existing failed webhook events on
 * 2026-07-11. Runs syncSubscriptionFromStripe against the current
 * Stripe state of each subscription (both are canceled + refunded),
 * then flips stripe_webhook_events rows from failed to processed
 * with an audit-trail suffix.
 *
 * Stripe resend cannot heal these rows: /api/stripe-webhook is insert-once
 * idempotent, so a duplicate stripe_event_id returns { duplicate: true }
 * without re-running the handler.
 *
 * Idempotent: syncSubscriptionFromStripe upserts on
 * stripe_subscription_id + stripe_subscription_item_id. Re-running is
 * safe.
 *
 * Usage (must run under vite-node, not tsx/node):
 *   npm i --no-save vite-node
 *   npx vite-node --config vitest.config.ts scripts/replay-failed-subscription-webhooks.ts
 *   npx vite-node --config vitest.config.ts scripts/replay-failed-subscription-webhooks.ts --apply
 *
 * lib/entitlements.js is a runtime facade that re-exports ./entitlements.ts,
 * which in turn imports via the "@/..." tsconfig alias. tsx rewrites the
 * ./entitlements.js specifier to the .ts twin (losing
 * deriveEntitlementFromItems) and plain node cannot resolve the alias. Vite
 * resolves both the way the Next build does.
 */
/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const FAILED_EVENT_IDS = [
  "evt_1TrtLUEEQBooK166FrZrskqw", // customer.subscription.created cus_UrcaFiuTaKyhhf
  "evt_1TrtSBEEQBooK1668JYBavGS", // customer.subscription.deleted cus_UrcaFiuTaKyhhf
  "evt_1TrtrREEQBooK1663S1VCLdc", // customer.subscription.created cus_Urd7snHnBEPP5j
  "evt_1Trty2EEQBooK166MJJAjRjc", // customer.subscription.deleted cus_Urd7snHnBEPP5j
];

const AUDIT_SUFFIX =
  " | RECONCILED 2026-07-30 via scripts/replay-failed-subscription-webhooks.ts after FIX-STRIPE-CUSTOMER-ID-WRITE-PATH (#215)";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");

  const { getSupabaseAdmin } = await import("../lib/supabase-admin.js");
  const { syncSubscriptionFromStripe } = await import(
    "../lib/subscription-sync.js"
  );
  const admin = getSupabaseAdmin();

  // 1. Read the failed rows + extract subscription IDs.
  const { data: rows, error: readErr } = await admin
    .from("stripe_webhook_events")
    .select("stripe_event_id, event_type, raw_payload, processing_status, processing_error")
    .in("stripe_event_id", FAILED_EVENT_IDS);

  if (readErr) {
    console.error("Failed to read stripe_webhook_events:", readErr.message);
    process.exit(1);
  }
  if (!rows || rows.length !== FAILED_EVENT_IDS.length) {
    console.error(
      `Expected ${FAILED_EVENT_IDS.length} rows, got ${rows?.length ?? 0}`,
    );
    process.exit(1);
  }

  // 2. Collect distinct subscription IDs from the raw_payload.
  const subIds = new Set<string>();
  for (const row of rows) {
    const rawObj = (row.raw_payload as { data?: { object?: { id?: string } } })?.data
      ?.object;
    const subId: string | undefined = rawObj?.id;
    if (!subId || !subId.startsWith("sub_")) {
      console.error(
        `Row ${row.stripe_event_id}: no sub_XXX in raw_payload.data.object.id`,
      );
      process.exit(1);
    }
    subIds.add(subId);
  }

  console.log(
    `[replay] mode=${dryRun ? "DRY-RUN" : "APPLY"} distinct_subs=${subIds.size}`,
  );

  // 3. Replay syncSubscriptionFromStripe for each distinct subscription.
  const syncResults: Array<{
    subId: string;
    ok: boolean;
    detail: string;
  }> = [];

  for (const subId of subIds) {
    if (dryRun) {
      syncResults.push({
        subId,
        ok: true,
        detail: "dry-run — would call syncSubscriptionFromStripe",
      });
      continue;
    }
    try {
      const result = await syncSubscriptionFromStripe(subId);
      syncResults.push({
        subId,
        ok: true,
        detail: `subscription_id=${result.subscriptionId} subscriber=${result.subscriberType}:${result.subscriberId}`,
      });
    } catch (err) {
      // Supabase rejects with a plain PostgrestError object, not an Error, so
      // String(err) would collapse it to "[object Object]".
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null
            ? JSON.stringify(err)
            : String(err);
      syncResults.push({ subId, ok: false, detail: msg });
    }
  }

  console.log("");
  console.log("=== SYNC RESULTS ===");
  console.table(syncResults);

  const anyFail = syncResults.some((r) => !r.ok);
  if (anyFail) {
    console.error(
      "One or more syncs failed — NOT flipping ledger rows. Fix root cause and re-run.",
    );
    process.exit(1);
  }

  // 4. Flip ledger rows.
  const ledgerResults: Array<{
    eventId: string;
    wrote: boolean;
    detail: string;
  }> = [];

  for (const row of rows) {
    const newProcessingError = `${row.processing_error ?? ""}${AUDIT_SUFFIX}`;
    if (dryRun) {
      ledgerResults.push({
        eventId: row.stripe_event_id,
        wrote: false,
        detail: `dry-run — would set processing_status=processed, append audit suffix`,
      });
      continue;
    }
    const { error: updErr } = await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "processed",
        processing_error: newProcessingError,
        processed_at: new Date().toISOString(),
      })
      .eq("stripe_event_id", row.stripe_event_id);

    if (updErr) {
      ledgerResults.push({
        eventId: row.stripe_event_id,
        wrote: false,
        detail: `update failed: ${updErr.message}`,
      });
    } else {
      ledgerResults.push({
        eventId: row.stripe_event_id,
        wrote: true,
        detail: "processed + audit suffix",
      });
    }
  }

  console.log("");
  console.log("=== LEDGER FLIP RESULTS ===");
  console.table(ledgerResults);

  const flipFail = ledgerResults.some((r) => !r.wrote && !dryRun);
  if (flipFail) {
    console.error(
      "One or more ledger flips failed. Subscriptions table is updated but ledger is inconsistent — investigate.",
    );
    process.exit(1);
  }

  console.log(
    dryRun
      ? "Dry-run complete. Re-run with --apply to persist."
      : "Apply complete.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
