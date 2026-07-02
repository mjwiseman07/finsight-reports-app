import { getSupabaseAdmin } from '../supabase-admin.js';
import { REFUND_WINDOW_DAYS } from '../refund-config.js';

/**
 * Resolve the active subscription UUID for a Pulse refund request.
 * Adaptation: subscriptions are keyed by subscriber_type + subscriber_id (company or firm).
 */
export async function resolveSubscriptionForRefund(userId, companyId) {
  const supabase = getSupabaseAdmin();

  if (companyId) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, stripe_customer_id, status, subscriber_type, subscriber_id')
      .eq('subscriber_type', 'company')
      .eq('subscriber_id', companyId)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data: firm, error: firmErr } = await supabase
    .from('firms')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle();
  if (firmErr) throw firmErr;

  if (firm?.id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, stripe_customer_id, status, subscriber_type, subscriber_id')
      .eq('subscriber_type', 'firm')
      .eq('subscriber_id', firm.id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;
  }

  const { data: membership, error: memberErr } = await supabase
    .from('company_users')
    .select('company_id')
    .eq('user_id', userId)
    .eq('role', 'owner')
    .eq('status', 'active')
    .maybeSingle();
  if (memberErr) throw memberErr;

  if (membership?.company_id) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id, stripe_subscription_id, stripe_customer_id, status, subscriber_type, subscriber_id')
      .eq('subscriber_type', 'company')
      .eq('subscriber_id', membership.company_id)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  return null;
}

export async function resolveSubscriberDisplayName(subscription) {
  if (!subscription) return 'Unknown company';
  const supabase = getSupabaseAdmin();

  if (subscription.subscriber_type === 'company') {
    const { data } = await supabase
      .from('companies')
      .select('name')
      .eq('id', subscription.subscriber_id)
      .maybeSingle();
    return data?.name || 'Company account';
  }

  if (subscription.subscriber_type === 'firm') {
    const { data } = await supabase
      .from('firms')
      .select('name')
      .eq('id', subscription.subscriber_id)
      .maybeSingle();
    return data?.name || 'Firm account';
  }

  return 'Advisacor account';
}

export function computeWindowEndIso(firstPaidChargeAt) {
  const start = new Date(firstPaidChargeAt);
  const end = new Date(start.getTime() + REFUND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return end.toISOString();
}

export function formatPolicyDate(iso) {
  if (!iso) return 'not available';
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function daysRemainingInWindow(firstPaidChargeAt, asOf = new Date()) {
  if (!firstPaidChargeAt) return 0;
  const start = new Date(firstPaidChargeAt);
  const elapsed = Math.floor((asOf.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, REFUND_WINDOW_DAYS - elapsed);
}

export async function logRefundAudit(supabase, refundRequestId, actorType, actorIdentifier, eventType, payload) {
  const { error } = await supabase.from('refund_audit_log').insert({
    refund_request_id: refundRequestId,
    actor_type: actorType,
    actor_identifier: actorIdentifier,
    event_type: eventType,
    payload: payload || {},
  });
  if (error) throw error;
}

export async function findRecentPathCDenialForUser(supabase, userId) {
  const { data, error } = await supabase
    .from('refund_requests')
    .select('id, path, status, reason_provided, created_at, subscription_id')
    .eq('requester_user_id', userId)
    .eq('path', 'C')
    .eq('status', 'denied')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
