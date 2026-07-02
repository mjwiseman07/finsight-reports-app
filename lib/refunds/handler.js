import { getSupabaseAdmin } from '../supabase-admin.js';
import { checkRefundEligibility } from '../refund-eligibility.js';
import { REFUND_PATHS } from '../refund-config.js';
import { detectRefundIntent } from './intent.ts';
import { isNegativeReaction } from './sentiment.ts';
import { resolveResponsePath } from './routing.ts';
import { executePathARefund } from './execute.ts';
import {
  resolveSubscriptionForRefund,
  resolveSubscriberDisplayName,
  computeWindowEndIso,
  logRefundAudit,
  findRecentPathCDenialForUser,
  daysRemainingInWindow,
} from './subscription-lookup.js';
import {
  sendPathAConfirmationEmail,
  sendPathBAcknowledgementEmail,
  buildCancellationOnlyResponse,
  buildPathAResponse,
  buildPathBResponse,
  buildPathCResponse,
  buildPathCEscalationRestatement,
  buildPathAProcessingFallbackResponse,
  buildGenericErrorResponse,
} from './customer-email.js';
import { alertPathBReviewNeeded, sendFounderAlert } from '../founder-alerts.js';

function verifyRefundEnv() {
  const missing = [];
  if (!process.env.STRIPE_SECRET_KEY) missing.push('STRIPE_SECRET_KEY');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push('SUPABASE_SERVICE_ROLE_KEY');
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!process.env.REFUNDS_EMAIL && !process.env.REFUNDS_INBOX_EMAIL) missing.push('REFUNDS_EMAIL');
  if (!process.env.FOUNDER_ALERT_EMAILS) missing.push('FOUNDER_ALERT_EMAILS');
  if (missing.length) {
    console.error('[refund-intent] missing env:', missing.join(', '));
    throw new Error(`Refund handler misconfigured: missing ${missing.join(', ')}`);
  }
}

async function maybeEscalatePathCReaction({ supabase, userId, userEmail, message, subscription }) {
  const priorDenial = await findRecentPathCDenialForUser(supabase, userId);
  if (!priorDenial || !isNegativeReaction(message)) {
    return { escalated: false, response: null };
  }

  const companyName = await resolveSubscriberDisplayName(subscription);
  const body = [
    'Path C customer reacted negatively after a policy denial.',
    '',
    `Customer: ${userEmail}`,
    `Company: ${companyName}`,
    `Subscription ID: ${subscription?.stripe_subscription_id || 'unknown'}`,
    `Prior denial request: ${priorDenial.id}`,
    `Prior denial at: ${priorDenial.created_at}`,
    '',
    'Negative follow-up (verbatim):',
    '----',
    message,
    '----',
    '',
    `Review: https://advisacor.com/admin/refunds?highlight=${priorDenial.id}`,
  ].join('\n');

  await sendFounderAlert({
    refundRequestId: priorDenial.id,
    subject: `Path C customer reacted negatively — ${companyName}`,
    subjectLine: `[Refund Escalation] Path C customer reacted negatively — ${companyName}`,
    body,
    context: { escalation: 'path_c_negative_reaction' },
  });

  const { data: denialRow } = await supabase
    .from('refund_requests')
    .select('first_paid_charge_at')
    .eq('id', priorDenial.id)
    .maybeSingle();

  const firstPaidAt = denialRow?.first_paid_charge_at;
  const response = buildPathCEscalationRestatement({
    firstPaidAt,
    windowEndAt: firstPaidAt ? computeWindowEndIso(firstPaidAt) : null,
  });

  return { escalated: true, response };
}

/**
 * Shared refund intent handler for POST /api/pulse/refund-intent and Pulse ask routing.
 */
export async function handleRefundIntentRequest({ userId, userEmail, companyId, message }) {
  verifyRefundEnv();

  const intent = detectRefundIntent(message);
  const supabase = getSupabaseAdmin();
  const subscription = await resolveSubscriptionForRefund(userId, companyId);

  if (!intent.isRefundRequest && !intent.isCancellationOnly) {
    const escalation = await maybeEscalatePathCReaction({
      supabase,
      userId,
      userEmail,
      message,
      subscription,
    });
    if (escalation.escalated) {
      return {
        path: 'NONE',
        response: escalation.response,
        refund_request_id: null,
        escalated: true,
      };
    }
    return { path: 'NONE', response: null, refund_request_id: null, escalated: false };
  }

  if (intent.isCancellationOnly) {
    return {
      path: 'CANCEL_ONLY',
      response: buildCancellationOnlyResponse(),
      refund_request_id: null,
      escalated: false,
    };
  }

  if (!subscription?.id) {
    return {
      path: 'NONE',
      response:
        'I could not locate an active Advisacor subscription for this account. Email refunds@advisacor.com with your account email so we can review under Advisacor Refund Policy v1.',
      refund_request_id: null,
      escalated: false,
    };
  }

  const eligibility = await checkRefundEligibility(subscription.id);

  if (!eligibility.eligible && eligibility.reason === 'request_already_active') {
    return {
      path: 'B',
      response:
        'An active refund request is already under review for this subscription under Advisacor Refund Policy v1. You should receive a decision within one business day at your account email.',
      refund_request_id: null,
      escalated: false,
    };
  }

  if (!eligibility.eligible && eligibility.reason === 'already_refunded') {
    return {
      path: 'C',
      response:
        'This subscription has already received a refund under Advisacor Refund Policy v1. You may cancel future billing from your Advisacor dashboard.',
      refund_request_id: null,
      escalated: false,
    };
  }

  const path = resolveResponsePath(eligibility);
  const meta = eligibility.metadata || {};
  const tierTrack = meta.tier || 'unknown';
  const firstPaidAt = meta.firstPaidChargeAt || subscription.first_paid_charge_at;
  const windowEndAt = firstPaidAt ? computeWindowEndIso(firstPaidAt) : null;

  const insertRow = {
    subscription_id: subscription.id,
    requester_user_id: userId,
    requester_email: userEmail,
    source: 'pulse',
    path,
    status: path === REFUND_PATHS.B ? 'pending_review' : path === REFUND_PATHS.C ? 'denied' : 'submitted',
    reason_provided: message,
    eligibility_reason: eligibility.humanReason || eligibility.reason,
    first_paid_charge_at: firstPaidAt,
    days_since_first_charge: meta.daysSinceFirstCharge ?? 0,
    stripe_invoice_id: meta.stripeInvoiceId,
    stripe_charge_id: meta.stripeChargeId,
    requested_amount_cents: meta.requestedAmountCents ?? 0,
    metered_deduction_cents: meta.meteredDeductionCents ?? 0,
    refundable_amount_cents: meta.refundableAmountCents ?? 0,
    denial_reason: path === REFUND_PATHS.C ? eligibility.humanReason : null,
  };

  const { data: refundRequest, error: insertErr } = await supabase
    .from('refund_requests')
    .insert(insertRow)
    .select('*')
    .single();
  if (insertErr) throw insertErr;

  await logRefundAudit(supabase, refundRequest.id, 'customer', userEmail, 'refund_request_created', {
    path,
    message,
    eligibility_summary: {
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      tier: tierTrack,
    },
  });

  if (path === REFUND_PATHS.A) {
    try {
      await executePathARefund(refundRequest.id);
      const { data: completed } = await supabase
        .from('refund_requests')
        .select('*')
        .eq('id', refundRequest.id)
        .single();

      await logRefundAudit(supabase, refundRequest.id, 'system', 'refund-intent.path_a', 'auto_refunded', {
        stripe_refund_id: completed?.stripe_refund_id,
      });

      await sendPathAConfirmationEmail({
        to: userEmail,
        refundRequest: completed || refundRequest,
        tierTrack,
      });

      return {
        path: 'A',
        response: buildPathAResponse({
          amountCents: refundRequest.refundable_amount_cents,
          tierTrack,
        }),
        refund_request_id: refundRequest.id,
        escalated: false,
      };
    } catch (err) {
      console.error('[refund-intent] Path A execute failed', err);
      await supabase
        .from('refund_requests')
        .update({
          status: 'execution_failed',
          denial_reason: `Stripe refund failed: ${err.message}`,
        })
        .eq('id', refundRequest.id);

      await logRefundAudit(supabase, refundRequest.id, 'stripe', err.code || 'unknown', 'execution.failed', {
        error_message: err.message,
      });

      await sendFounderAlert({
        refundRequestId: refundRequest.id,
        subject: 'Path A auto-execute failed — manual action required',
        body: [
          'Path A auto-refund failed during Pulse handling.',
          '',
          `Request ID: ${refundRequest.id}`,
          `Customer: ${userEmail}`,
          `Error: ${err.message}`,
          '',
          'Complete manually in Stripe and update refund_requests.',
          `Queue: https://advisacor.com/admin/refunds?highlight=${refundRequest.id}`,
        ].join('\n'),
        context: { path: 'A', error: err.message },
      });

      return {
        path: 'A',
        response: buildPathAProcessingFallbackResponse(),
        refund_request_id: refundRequest.id,
        escalated: false,
      };
    }
  }

  if (path === REFUND_PATHS.B) {
    await logRefundAudit(supabase, refundRequest.id, 'system', 'refund-intent.path_b', 'pending_review', {
      days_remaining: daysRemainingInWindow(firstPaidAt),
    });

    const companyName = await resolveSubscriberDisplayName(subscription);
    await alertPathBReviewNeeded({
      refundRequest,
      subscription,
      customerMessage: message,
      sentimentFlags: [],
      companyName,
    });

    await sendPathBAcknowledgementEmail({ to: userEmail });

    return {
      path: 'B',
      response: buildPathBResponse(),
      refund_request_id: refundRequest.id,
      escalated: false,
    };
  }

  await logRefundAudit(supabase, refundRequest.id, 'system', 'refund-intent.path_c', 'auto_denied', {
    eligibility_reason: eligibility.reason,
  });

  return {
    path: 'C',
    response: buildPathCResponse({
      firstPaidAt,
      windowEndAt,
      eligibilityReason: eligibility.humanReason,
    }),
    refund_request_id: refundRequest.id,
    escalated: false,
  };
}

export { buildGenericErrorResponse };
