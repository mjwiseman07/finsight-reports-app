/**
 * FIX-STRIPE-CUSTOMER-ID-WRITE-PATH — Block 3
 *
 * One-shot backfill for users.stripe_customer_id from Stripe Customer
 * records. Reads Stripe → matches customer.email to users.email → writes
 * stripe_customer_id back.
 *
 * Safe to re-run:
 *   - Skips users that already have stripe_customer_id populated
 *   - Skips Stripe customers whose email doesn't match any users row
 *   - Reports mismatches without writing
 *
 * Usage:
 *   npx tsx scripts/backfill-stripe-customer-id.ts [--dry-run] [--customer=cus_XXX]
 *
 * Default behavior: dry-run. Pass --apply to actually write.
 */
/* eslint-disable no-console */
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import Stripe from "stripe";

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes("--apply");
  const customerFilter = args
    .find((a) => a.startsWith("--customer="))
    ?.split("=")[1];

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.error("STRIPE_SECRET_KEY not set");
    process.exit(1);
  }

  const { getSupabaseAdmin } = await import("../lib/supabase-admin.js");
  const admin = getSupabaseAdmin();
  const stripe = new Stripe(stripeSecret);

  // Discover orphan candidates from Supabase.
  const { data: orphanSlots, error: slotErr } = await admin
    .from("pilot_slots")
    .select("id, tier_key, stripe_customer_id, firm_id")
    .not("stripe_customer_id", "is", null);

  if (slotErr) {
    console.error("Failed to read pilot_slots:", slotErr.message);
    process.exit(1);
  }

  const candidates = customerFilter
    ? (orphanSlots ?? []).filter(
        (r: { stripe_customer_id: string | null }) =>
          r.stripe_customer_id === customerFilter,
      )
    : orphanSlots ?? [];

  console.log(
    `[backfill] mode=${dryRun ? "DRY-RUN" : "APPLY"} candidates=${candidates.length}`,
  );

  const report: Array<{
    stripeCustomerId: string;
    stripeEmail: string | null;
    matchedUserId: string | null;
    matchedUserEmail: string | null;
    alreadyLinked: boolean;
    wrote: boolean;
    skipReason: string | null;
  }> = [];

  for (const slot of candidates) {
    const cid = slot.stripe_customer_id as string;

    // 1. Retrieve Stripe customer.
    let customer: Stripe.Customer | Stripe.DeletedCustomer;
    try {
      customer = await stripe.customers.retrieve(cid);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      report.push({
        stripeCustomerId: cid,
        stripeEmail: null,
        matchedUserId: null,
        matchedUserEmail: null,
        alreadyLinked: false,
        wrote: false,
        skipReason: `stripe retrieve failed: ${msg}`,
      });
      continue;
    }

    if (customer.deleted) {
      report.push({
        stripeCustomerId: cid,
        stripeEmail: null,
        matchedUserId: null,
        matchedUserEmail: null,
        alreadyLinked: false,
        wrote: false,
        skipReason: "stripe customer deleted",
      });
      continue;
    }

    const stripeEmail = customer.email;
    if (!stripeEmail) {
      report.push({
        stripeCustomerId: cid,
        stripeEmail: null,
        matchedUserId: null,
        matchedUserEmail: null,
        alreadyLinked: false,
        wrote: false,
        skipReason: "stripe customer has no email",
      });
      continue;
    }

    // 2. Match to users.email (case-insensitive).
    const { data: userMatch, error: userErr } = await admin
      .from("users")
      .select("id, email, stripe_customer_id")
      .ilike("email", stripeEmail)
      .maybeSingle();

    if (userErr) {
      report.push({
        stripeCustomerId: cid,
        stripeEmail,
        matchedUserId: null,
        matchedUserEmail: null,
        alreadyLinked: false,
        wrote: false,
        skipReason: `users lookup failed: ${userErr.message}`,
      });
      continue;
    }

    if (!userMatch) {
      report.push({
        stripeCustomerId: cid,
        stripeEmail,
        matchedUserId: null,
        matchedUserEmail: null,
        alreadyLinked: false,
        wrote: false,
        skipReason: "no users row with matching email",
      });
      continue;
    }

    // 3. Skip if already linked.
    if (userMatch.stripe_customer_id === cid) {
      report.push({
        stripeCustomerId: cid,
        stripeEmail,
        matchedUserId: userMatch.id,
        matchedUserEmail: userMatch.email,
        alreadyLinked: true,
        wrote: false,
        skipReason: "already linked",
      });
      continue;
    }

    if (userMatch.stripe_customer_id && userMatch.stripe_customer_id !== cid) {
      report.push({
        stripeCustomerId: cid,
        stripeEmail,
        matchedUserId: userMatch.id,
        matchedUserEmail: userMatch.email,
        alreadyLinked: false,
        wrote: false,
        skipReason: `users row already has different stripe_customer_id=${userMatch.stripe_customer_id}`,
      });
      continue;
    }

    // 4. Write.
    if (dryRun) {
      report.push({
        stripeCustomerId: cid,
        stripeEmail,
        matchedUserId: userMatch.id,
        matchedUserEmail: userMatch.email,
        alreadyLinked: false,
        wrote: false,
        skipReason: "dry-run — would write",
      });
    } else {
      const { error: writeErr } = await admin
        .from("users")
        .update({ stripe_customer_id: cid })
        .eq("id", userMatch.id);

      if (writeErr) {
        report.push({
          stripeCustomerId: cid,
          stripeEmail,
          matchedUserId: userMatch.id,
          matchedUserEmail: userMatch.email,
          alreadyLinked: false,
          wrote: false,
          skipReason: `write failed: ${writeErr.message}`,
        });
      } else {
        report.push({
          stripeCustomerId: cid,
          stripeEmail,
          matchedUserId: userMatch.id,
          matchedUserEmail: userMatch.email,
          alreadyLinked: false,
          wrote: true,
          skipReason: null,
        });
      }
    }
  }

  console.log("");
  console.log("=== BACKFILL REPORT ===");
  console.table(report);
  const written = report.filter((r) => r.wrote).length;
  const skipped = report.filter((r) => !r.wrote).length;
  console.log(`Wrote: ${written}  Skipped: ${skipped}`);
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
