import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { recordIssue } from "./issue-recorder";
import { derivePilotStatusFromStripe } from "./status-mapping";

export type DriftDetectorResult = {
  slots_checked: number;
  drifted: number;
  errors: number;
  dedup_hits: number;
};

export async function runDriftDetector(): Promise<DriftDetectorResult> {
  const result: DriftDetectorResult = {
    slots_checked: 0,
    drifted: 0,
    errors: 0,
    dedup_hits: 0,
  };

  const stripeSecret =
    process.env.STRIPE_LIVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "";

  if (!stripeSecret) {
    // Cannot recordIssue without a partition; surface via return value only.
    console.error(
      "[drift-detector] skipped: no STRIPE_LIVE_SECRET_KEY / STRIPE_SECRET_KEY",
    );
    result.errors += 1;
    return result;
  }

  const stripe = new Stripe(stripeSecret, {
    // Stripe SDK typings no longer export LatestApiVersion; pin deployed API version.
    apiVersion: "2026-04-22.dahlia" as never,
  });
  const admin = getSupabaseAdmin();

  const { data: slots, error } = await admin
    .from("pilot_slots")
    .select("id, company_id, firm_id, pilot_status, stripe_subscription_id")
    .not("stripe_subscription_id", "is", null);

  if (error) {
    result.errors += 1;
    return result;
  }

  for (const slot of slots ?? []) {
    result.slots_checked += 1;
    let stripeSub: Stripe.Subscription | null = null;
    try {
      stripeSub = await stripe.subscriptions.retrieve(
        slot.stripe_subscription_id as string,
      );
    } catch (e) {
      result.errors += 1;
      if (slot.company_id || slot.firm_id) {
        const r = await recordIssue({
          fingerprint: `drift:stripe-retrieve-error:${slot.id}`,
          level: "warning",
          issueKind: "pilot.lifecycle.monitor.error",
          pilotSlotId: slot.id,
          companyId: slot.company_id,
          firmId: slot.firm_id,
          tags: {
            stripe_subscription_id: String(slot.stripe_subscription_id),
          },
          extra: { error: e instanceof Error ? e.message : String(e) },
          message: `Failed to retrieve Stripe subscription for pilot_slot ${slot.id}`,
        });
        if (r.deduped) result.dedup_hits += 1;
      }
      continue;
    }

    const derivedStatus = derivePilotStatusFromStripe(stripeSub.status);
    const actualStatus = slot.pilot_status as string;

    if (derivedStatus !== actualStatus) {
      result.drifted += 1;
      if (!slot.company_id && !slot.firm_id) continue;
      const r = await recordIssue({
        fingerprint: `drift:${slot.id}:${actualStatus}:${derivedStatus}`,
        level: "warning",
        issueKind: "pilot.lifecycle.drift.detected",
        pilotSlotId: slot.id,
        companyId: slot.company_id,
        firmId: slot.firm_id,
        tags: {
          stripe_subscription_id: String(slot.stripe_subscription_id),
          stripe_status: stripeSub.status,
          pilot_status_actual: actualStatus,
          pilot_status_expected: derivedStatus,
        },
        extra: {
          subscription_current_period_end: (
            stripeSub as { current_period_end?: number }
          ).current_period_end,
          subscription_cancel_at_period_end: stripeSub.cancel_at_period_end,
        },
        message: `Drift: pilot_slot ${slot.id} pilot_status=${actualStatus} but Stripe says ${stripeSub.status} → expected ${derivedStatus}`,
      });
      if (r.deduped) result.dedup_hits += 1;
    }
  }

  return result;
}
