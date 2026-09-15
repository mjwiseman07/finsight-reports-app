/**
 * Durable Stripe webhook event leasing (no DELETE-on-retry).
 * Claim/finalize via SECURITY INVOKER RPCs; lease_token required for every finalize.
 */
import { createServiceClient } from "@/lib/supabase/service";
import { randomUUID } from "node:crypto";

export type WebhookLeaseClaim =
  | { outcome: "claimed" | "reclaimed"; leaseToken: string; attemptCount: number }
  | { outcome: "duplicate_terminal"; processingStatus: string; failureCode: string | null }
  | { outcome: "lease_held"; processingStatus: string };

export type WebhookFinalizeStatus =
  | "processed"
  | "skipped"
  | "retryable"
  | "failed_conflict";

const LEASE_TTL_SECONDS = 120;

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

export async function claimStripeWebhookEvent(args: {
  stripeEventId: string;
  eventType: string;
  livemode: boolean;
}): Promise<WebhookLeaseClaim> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("claim_stripe_webhook_event", {
    p_stripe_event_id: args.stripeEventId,
    p_event_type: args.eventType,
    p_livemode: args.livemode,
    p_lease_ttl_seconds: LEASE_TTL_SECONDS,
  });
  if (error) throw new Error(`claim_stripe_webhook_event failed: ${error.message}`);

  const row = asRecord(data);
  const outcome = String(row.outcome || "");
  if (outcome === "claimed" || outcome === "reclaimed") {
    const leaseToken = String(row.lease_token || "");
    if (!leaseToken) throw new Error("claim_stripe_webhook_event missing lease_token");
    return {
      outcome,
      leaseToken,
      attemptCount: Number(row.attempt_count || 1),
    };
  }
  if (outcome === "duplicate_terminal") {
    return {
      outcome: "duplicate_terminal",
      processingStatus: String(row.processing_status || "processed"),
      failureCode: row.failure_code == null ? null : String(row.failure_code),
    };
  }
  if (outcome === "lease_held") {
    return {
      outcome: "lease_held",
      processingStatus: String(row.processing_status || "processing"),
    };
  }
  throw new Error(`claim_stripe_webhook_event unexpected outcome: ${outcome}`);
}

export async function finalizeStripeWebhookEvent(args: {
  stripeEventId: string;
  leaseToken: string;
  status: WebhookFinalizeStatus;
  failureCode?: string | null;
}): Promise<{ ok: true } | { ok: false; outcome: "stale_lease" }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("finalize_stripe_webhook_event", {
    p_stripe_event_id: args.stripeEventId,
    p_lease_token: args.leaseToken,
    p_status: args.status,
    p_failure_code: args.failureCode ?? null,
  });
  if (error) throw new Error(`finalize_stripe_webhook_event failed: ${error.message}`);

  const row = asRecord(data);
  if (row.ok === true) return { ok: true };
  if (row.outcome === "stale_lease") return { ok: false, outcome: "stale_lease" };
  throw new Error(`finalize_stripe_webhook_event unexpected response`);
}

/** Test helper — generates a UUID without relying on DB. */
export function newLeaseTokenForTests(): string {
  return randomUUID();
}
