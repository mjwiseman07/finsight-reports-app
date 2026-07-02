import { NextResponse } from 'next/server';
import { resolveSuperAdminAccess, auditSuperAdminEvent } from '@/lib/super-admin-security';
import { rateLimit } from '@/lib/rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-admin.js';
import { approveAndExecuteRefund } from '@/lib/refunds/execute';
import { logRefundAudit } from '@/lib/refunds/subscription-lookup.js';
import {
  sendFounderApprovalEmail,
  sendFounderDenialEmail,
} from '@/lib/refunds/customer-email.js';
import { sendFounderAlert } from '@/lib/founder-alerts.js';

export async function POST(request, { params }) {
  const rateLimitResponse = rateLimit(request, { key: 'admin-refunds-decide', limit: 30, windowMs: 60_000 });
  if (rateLimitResponse) return rateLimitResponse;

  const access = await resolveSuperAdminAccess(request);
  if (access.response) return access.response;

  const refundRequestId = params?.id;
  if (!refundRequestId) {
    return NextResponse.json({ error: 'Refund request id is required' }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const reason = String(body.reason || '').trim();

    if (action !== 'approve' && action !== 'deny') {
      return NextResponse.json({ error: 'action must be approve or deny' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ error: 'reason is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error: loadErr } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('id', refundRequestId)
      .single();
    if (loadErr) throw loadErr;
    if (!row) return NextResponse.json({ error: 'Refund request not found' }, { status: 404 });
    if (row.status !== 'pending_review') {
      return NextResponse.json({ error: 'already decided' }, { status: 409 });
    }

    if (action === 'approve') {
      try {
        const result = await approveAndExecuteRefund(refundRequestId, {
          decidedBy: access.email,
          reason,
        });

        await logRefundAudit(
          supabase,
          refundRequestId,
          'founder',
          access.email,
          'founder_approved',
          { reason, stripe_refund_id: result.stripeRefundId },
        );

        const { data: updated } = await supabase
          .from('refund_requests')
          .select('*')
          .eq('id', refundRequestId)
          .single();

        await sendFounderApprovalEmail({
          to: row.requester_email,
          refundRequest: updated || row,
          reason,
        });

        await auditSuperAdminEvent({
          eventType: 'refund_approved',
          actorUserId: access.userId,
          actorEmail: access.email,
          metadata: { refund_request_id: refundRequestId, stripe_refund_id: result.stripeRefundId },
        });

        return NextResponse.json({ status: 'refunded', stripe_refund_id: result.stripeRefundId });
      } catch (err) {
        console.error('[admin/refunds/decide] approve failed', err);
        await supabase
          .from('refund_requests')
          .update({
            status: 'execution_failed',
            founder_decision_by: access.email,
            founder_decision_at: new Date().toISOString(),
            founder_decision_notes: `${reason} | Stripe error: ${err.message}`,
          })
          .eq('id', refundRequestId);

        await sendFounderAlert({
          refundRequestId,
          subject: 'Path B approval execute failed — manual action required',
          body: [
            'Founder approved a Path B refund but Stripe execution failed.',
            '',
            `Request ID: ${refundRequestId}`,
            `Admin: ${access.email}`,
            `Error: ${err.message}`,
          ].join('\n'),
          context: { action: 'approve', error: err.message },
        });

        return NextResponse.json({ error: err.message || 'Stripe refund failed' }, { status: 500 });
      }
    }

    const { error: denyErr } = await supabase
      .from('refund_requests')
      .update({
        status: 'denied',
        founder_decision_by: access.email,
        founder_decision_at: new Date().toISOString(),
        founder_decision_notes: reason,
        denial_reason: reason,
      })
      .eq('id', refundRequestId)
      .eq('status', 'pending_review');
    if (denyErr) throw denyErr;

    await logRefundAudit(supabase, refundRequestId, 'founder', access.email, 'founder_denied', { reason });

    await sendFounderDenialEmail({
      to: row.requester_email,
      refundRequest: row,
      reason,
    });

    await auditSuperAdminEvent({
      eventType: 'refund_denied',
      actorUserId: access.userId,
      actorEmail: access.email,
      metadata: { refund_request_id: refundRequestId },
    });

    return NextResponse.json({ status: 'denied' });
  } catch (error) {
    console.error('[admin/refunds/decide] failed', error);
    return NextResponse.json({ error: 'Failed to process refund decision' }, { status: 500 });
  }
}
