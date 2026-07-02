import { NextResponse } from 'next/server';
import { resolveSuperAdminAccess } from '../../../../lib/super-admin-security';
import { rateLimit } from '../../../../lib/rate-limit';
import { getSupabaseAdmin } from '../../../../lib/supabase-admin.js';
import { REFUND_WINDOW_DAYS } from '../../../../lib/refund-config.js';
import { daysRemainingInWindow } from '../../../../lib/refunds/subscription-lookup.js';

async function enrichRefundRows(rows) {
  if (!rows?.length) return [];
  const supabase = getSupabaseAdmin();
  const subscriptionIds = [...new Set(rows.map((row) => row.subscription_id))];

  const { data: subscriptions, error: subErr } = await supabase
    .from('subscriptions')
    .select('id, stripe_subscription_id, subscriber_type, subscriber_id')
    .in('id', subscriptionIds);
  if (subErr) throw subErr;

  const companyIds = (subscriptions || [])
    .filter((s) => s.subscriber_type === 'company')
    .map((s) => s.subscriber_id);
  const firmIds = (subscriptions || [])
    .filter((s) => s.subscriber_type === 'firm')
    .map((s) => s.subscriber_id);

  const [{ data: companies }, { data: firms }] = await Promise.all([
    companyIds.length
      ? supabase.from('companies').select('id, name').in('id', companyIds)
      : Promise.resolve({ data: [] }),
    firmIds.length
      ? supabase.from('firms').select('id, name').in('id', firmIds)
      : Promise.resolve({ data: [] }),
  ]);

  const companyMap = new Map((companies || []).map((c) => [c.id, c.name]));
  const firmMap = new Map((firms || []).map((f) => [f.id, f.name]));
  const subMap = new Map((subscriptions || []).map((s) => [s.id, s]));

  return rows.map((row) => {
    const sub = subMap.get(row.subscription_id);
    const companyName =
      sub?.subscriber_type === 'company'
        ? companyMap.get(sub.subscriber_id) || 'Company account'
        : sub?.subscriber_type === 'firm'
          ? firmMap.get(sub.subscriber_id) || 'Firm account'
          : 'Unknown';

    return {
      id: row.id,
      status: row.status,
      path: row.path,
      tier: row.path === 'A' ? 'pilot' : row.path === 'B' ? 'standard' : row.path,
      customer_email: row.requester_email,
      company_name: companyName,
      subscription_id: sub?.stripe_subscription_id || row.subscription_id,
      first_charge_id: row.stripe_charge_id,
      days_remaining: daysRemainingInWindow(row.first_paid_charge_at),
      message_excerpt: String(row.reason_provided || '').slice(0, 200),
      created_at: row.created_at,
      resolved_at: row.refund_completed_at || row.founder_decision_at,
      decided_by: row.founder_decision_by,
      refundable_amount_cents: row.refundable_amount_cents,
      reason_provided: row.reason_provided,
    };
  });
}

export async function GET(request) {
  const rateLimitResponse = rateLimit(request, { key: 'admin-refunds', limit: 60, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveSuperAdminAccess(request);
  if (access.response) return access.response;

  try {
    const supabase = getSupabaseAdmin();

    const { data: pendingRows, error: pendingErr } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('status', 'pending_review')
      .order('created_at', { ascending: true });
    if (pendingErr) throw pendingErr;

    const { data: recentRows, error: recentErr } = await supabase
      .from('refund_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(25);
    if (recentErr) throw recentErr;

    const pending = await enrichRefundRows(pendingRows || []);
    const recent = await enrichRefundRows(recentRows || []);

    return NextResponse.json({
      pending,
      recent,
      policy: {
        window_days: REFUND_WINDOW_DAYS,
        reference: 'Advisacor Refund Policy v1',
      },
    });
  } catch (error) {
    console.error('[admin/refunds] GET failed', error);
    return NextResponse.json({ error: 'Failed to load refund queue' }, { status: 500 });
  }
}
