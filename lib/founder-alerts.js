// Silent founder alert routing. NEVER call this from any code path that also
// writes to the customer-facing conversation.

import { sendEmail } from '@/lib/email';
import { getRefundEmailConfig } from './refund-config.js';
import { getSupabaseAdmin } from './supabase-admin.js';

/**
 * Send a silent alert to the founder inboxes and log it to refund_audit_log.
 */
export async function sendFounderAlert({ refundRequestId, subject, body, context = {} }) {
  const config = getRefundEmailConfig();
  const supabase = getSupabaseAdmin();

  const html = `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; font-size: 13px; line-height: 1.5;">${escapeHtml(body)}</pre>`;

  await sendEmail({
    from: config.fromFounderAlert,
    to: config.founderAlerts,
    subject: `[Advisacor Refunds] ${subject}`,
    text: body,
    html,
    reply_to: [config.publicInbox],
  });

  await supabase.from('refund_audit_log').insert({
    refund_request_id: refundRequestId,
    actor_type: 'system',
    actor_identifier: 'founder-alerts.sendFounderAlert',
    event_type: 'founder_alert.sent',
    payload: {
      subject,
      recipients: config.founderAlerts,
      ...context,
    },
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function alertPathBReviewNeeded({ refundRequest, subscription, customerMessage, sentimentFlags }) {
  const dollars = (refundRequest.refundable_amount_cents / 100).toFixed(2);
  const body = [
    `A Standard-tier refund request requires your review.`,
    ``,
    `Request ID: ${refundRequest.id}`,
    `Customer:   ${refundRequest.requester_email}`,
    `Subscription: ${subscription.stripe_subscription_id}`,
    `Amount:     $${dollars} USD (of $${(refundRequest.requested_amount_cents / 100).toFixed(2)} gross, less $${(refundRequest.metered_deduction_cents / 100).toFixed(2)} metered)`,
    `Days since first charge: ${refundRequest.days_since_first_charge}`,
    `Source:     ${refundRequest.source}`,
    sentimentFlags && sentimentFlags.length ? `Sentiment flags: ${sentimentFlags.join(', ')}` : 'Sentiment: neutral',
    ``,
    `Customer reason (verbatim):`,
    `----`,
    refundRequest.reason_provided || '(no reason provided)',
    `----`,
    ``,
    `Customer message (verbatim):`,
    `----`,
    customerMessage || '(email-only request, no chat transcript)',
    `----`,
    ``,
    `Review and decide in the founder queue:`,
    `  https://advisacor.com/founder/refund-queue/${refundRequest.id}`,
    ``,
    `SLA: Customer was told to expect a response within 1 business day.`,
  ].join('\n');

  await sendFounderAlert({
    refundRequestId: refundRequest.id,
    subject: `Path B review needed — ${refundRequest.requester_email} — $${dollars}`,
    body,
    context: { path: 'B', sentimentFlags: sentimentFlags || [] },
  });
}

export async function alertSentimentEscalation({ refundRequest, customerMessage, sentimentResult }) {
  const body = [
    `Sentiment escalation triggered on a refund interaction.`,
    ``,
    `Request ID: ${refundRequest.id}`,
    `Customer:   ${refundRequest.requester_email}`,
    `Path:       ${refundRequest.path}`,
    `Status:     ${refundRequest.status}`,
    `Severity:   ${sentimentResult.severity.toUpperCase()}`,
    `Flags:      ${sentimentResult.flags.join(', ')}`,
    `Matched terms: ${sentimentResult.matchedTerms.join(', ')}`,
    ``,
    `Customer message (verbatim):`,
    `----`,
    customerMessage || '(no chat transcript available)',
    `----`,
    ``,
    `IMPORTANT: The customer has NOT been told this was escalated.`,
    `Do not reply from any address that reveals founder involvement.`,
    `If you decide to respond, reply from the shared inbox: refunds@advisacor.com`,
    ``,
    `Review in the founder queue:`,
    `  https://advisacor.com/founder/refund-queue/${refundRequest.id}`,
  ].join('\n');

  await sendFounderAlert({
    refundRequestId: refundRequest.id,
    subject: `[${sentimentResult.severity.toUpperCase()}] Sentiment escalation — ${refundRequest.requester_email}`,
    body,
    context: {
      severity: sentimentResult.severity,
      flags: sentimentResult.flags,
      matchedTerms: sentimentResult.matchedTerms,
    },
  });
}

export async function alertPathACompleted({ refundRequest }) {
  const dollars = (refundRequest.refundable_amount_cents / 100).toFixed(2);
  const body = [
    `A Pilot refund was auto-executed under the 30-day guarantee.`,
    ``,
    `Request ID: ${refundRequest.id}`,
    `Customer:   ${refundRequest.requester_email}`,
    `Amount:     $${dollars} USD`,
    `Days since first charge: ${refundRequest.days_since_first_charge}`,
    `Stripe refund: ${refundRequest.stripe_refund_id}`,
    ``,
    `This is informational — no action required unless something looks off.`,
  ].join('\n');

  await sendFounderAlert({
    refundRequestId: refundRequest.id,
    subject: `Path A auto-refunded — ${refundRequest.requester_email} — $${dollars}`,
    body,
    context: { path: 'A' },
  });
}

export async function alertChargebackCreated({ dispute, priorRefundRequest }) {
  const dollars = (dispute.amount_cents / 100).toFixed(2);
  const body = [
    `A Stripe chargeback / dispute was opened against a charge.`,
    ``,
    `Stripe dispute ID: ${dispute.stripe_dispute_id}`,
    `Stripe charge ID:  ${dispute.stripe_charge_id}`,
    `Amount:            $${dollars} ${dispute.currency.toUpperCase()}`,
    `Reason:            ${dispute.reason}`,
    `Status:            ${dispute.status}`,
    `Evidence due:      ${dispute.evidence_due_by || 'not set'}`,
    ``,
    `Policy-window check: charge was ${dispute.is_within_policy_window ? 'WITHIN' : 'OUTSIDE'} the 30-day refund window.`,
    `Prior contact:       customer ${dispute.had_prior_contact ? 'DID' : 'did NOT'} contact us before the chargeback.`,
    ``,
    priorRefundRequest
      ? `Related refund request: ${priorRefundRequest.id} (status: ${priorRefundRequest.status})`
      : `No prior refund request found for this subscription.`,
    ``,
    `Contest strategy:`,
    `- If OUTSIDE window AND no prior contact: contest per Refund Policy Section 10.`,
    `- If WITHIN window: consider issuing a refund voluntarily to preempt losing the dispute.`,
    ``,
    `Full runbook: /founder/runbooks/chargeback-playbook`,
  ].join('\n');

  const supabase = getSupabaseAdmin();
  const config = getRefundEmailConfig();

  await sendEmail({
    from: config.fromFounderAlert,
    to: config.founderAlerts,
    subject: `[Advisacor Refunds] CHARGEBACK — ${dispute.reason} — $${dollars}`,
    text: body,
    html: `<pre>${escapeHtml(body)}</pre>`,
    reply_to: [config.publicInbox],
  });

  if (priorRefundRequest) {
    await supabase.from('refund_audit_log').insert({
      refund_request_id: priorRefundRequest.id,
      actor_type: 'system',
      actor_identifier: 'founder-alerts.alertChargebackCreated',
      event_type: 'chargeback.founder_alerted',
      payload: {
        stripe_dispute_id: dispute.stripe_dispute_id,
        amount_cents: dispute.amount_cents,
        reason: dispute.reason,
        is_within_policy_window: dispute.is_within_policy_window,
        had_prior_contact: dispute.had_prior_contact,
      },
    });
  }
}
