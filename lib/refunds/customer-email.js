import { sendEmail, escapeHtml, getRefundsEmail } from '@/lib/email';
import { getRefundEmailConfig } from '../refund-config.js';
import { formatPolicyDate } from './subscription-lookup.js';

const REFUND_POLICY_URL = 'https://advisacor.com/refund-policy';
const BILLING_URL = 'https://advisacor.com/dashboard';
const SETTLEMENT_WINDOW = '5–10 business days';

function refundsFromAddress() {
  const config = getRefundEmailConfig();
  return config.fromCustomer;
}

function formatUsd(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}

export async function sendPathAConfirmationEmail({ to, refundRequest, tierTrack }) {
  const amount = formatUsd(refundRequest.refundable_amount_cents);
  const text = [
    'Your Advisacor refund has been processed under Advisacor Refund Policy v1.',
    '',
    `Refund amount: ${amount} USD`,
    `Expected settlement: ${SETTLEMENT_WINDOW}`,
    `Tier on record: ${tierTrack === 'pilot' ? 'Pilot' : tierTrack || 'Standard'}`,
    '',
    'This automatic refund is available because your account is on the pilot tier and within the 30-day first-cycle window under the Advisacor Refund Policy v1.',
    'The decision is anchored to your subscription tier, first successful charge date, and the disclosure validation surfaces that govern Advisacor billing.',
    '',
    `Full policy: ${REFUND_POLICY_URL}`,
    'Governing law: Commonwealth of Virginia.',
  ].join('\n');

  await sendEmail({
    from: refundsFromAddress(),
    to: [to],
    subject: 'Advisacor refund processed — Advisacor Refund Policy v1',
    text,
    html: `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6;">${escapeHtml(text)}</pre>`,
    reply_to: [getRefundsEmail()],
  });
}

export async function sendPathBAcknowledgementEmail({ to }) {
  const text = [
    'Your refund request has been received under Advisacor Refund Policy v1.',
    '',
    'Your request will be reviewed within one business day. You will receive a decision at this email address.',
    'This review applies because your subscription is on the Standard track within the 30-day first-cycle window.',
    '',
    `Policy reference: ${REFUND_POLICY_URL}`,
    'Governing law: Commonwealth of Virginia.',
  ].join('\n');

  await sendEmail({
    from: refundsFromAddress(),
    to: [to],
    subject: 'Advisacor refund request received — under review',
    text,
    html: `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6;">${escapeHtml(text)}</pre>`,
    reply_to: [getRefundsEmail()],
  });
}

export async function sendFounderApprovalEmail({ to, refundRequest, reason }) {
  const amount = formatUsd(refundRequest.refundable_amount_cents);
  const text = [
    'Your refund request has been approved under Advisacor Refund Policy v1.',
    '',
    `Refund amount: ${amount} USD`,
    `Expected settlement: ${SETTLEMENT_WINDOW}`,
    reason ? `Decision note: ${reason}` : '',
    '',
    'This approval follows founder review for a Standard-tier subscription within the first-cycle window.',
    '',
    `Policy reference: ${REFUND_POLICY_URL}`,
    'Governing law: Commonwealth of Virginia.',
  ]
    .filter(Boolean)
    .join('\n');

  await sendEmail({
    from: refundsFromAddress(),
    to: [to],
    subject: 'Advisacor refund approved',
    text,
    html: `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6;">${escapeHtml(text)}</pre>`,
    reply_to: [getRefundsEmail()],
  });
}

export async function sendFounderDenialEmail({ to, refundRequest, reason }) {
  const text = [
    'Your refund request has been denied under Advisacor Refund Policy v1.',
    '',
    reason ? `Reason: ${reason}` : 'Reason: Outside the eligible refund window or first billing cycle.',
    '',
    'You may cancel future billing from your Advisacor dashboard billing portal.',
    `Manage billing: ${BILLING_URL}`,
    '',
    `Policy reference: ${REFUND_POLICY_URL}`,
    'Governing law: Commonwealth of Virginia.',
  ].join('\n');

  await sendEmail({
    from: refundsFromAddress(),
    to: [to],
    subject: 'Advisacor refund request decision',
    text,
    html: `<pre style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; line-height: 1.6;">${escapeHtml(text)}</pre>`,
    reply_to: [getRefundsEmail()],
  });
}

export function buildCancellationOnlyResponse() {
  return [
    'To cancel your subscription without requesting a refund, open Billing from your Advisacor dashboard.',
    `Billing portal: ${BILLING_URL}`,
    'Cancellation is governed by your active subscription terms under Advisacor Refund Policy v1.',
    `Policy: ${REFUND_POLICY_URL}`,
  ].join(' ');
}

export function buildPathAResponse({ amountCents, tierTrack }) {
  const amount = formatUsd(amountCents);
  return [
    `Your refund of ${amount} has been initiated under Advisacor Refund Policy v1 because your ${tierTrack === 'pilot' ? 'Pilot' : 'pilot-tier'} subscription is within the 30-day first-cycle window.`,
    `Watch for confirmation at your email on file. Settlement typically takes ${SETTLEMENT_WINDOW}.`,
    `Policy reference: ${REFUND_POLICY_URL}`,
  ].join(' ');
}

export function buildPathBResponse() {
  return [
    'Your refund request is under founder review under Advisacor Refund Policy v1 because your subscription is on the Standard track within the first-cycle window.',
    'You should receive a decision within one business day at your account email.',
    'No outcome is guaranteed until review completes.',
    `Policy reference: ${REFUND_POLICY_URL}`,
  ].join(' ');
}

export function buildPathCResponse({ firstPaidAt, windowEndAt, eligibilityReason }) {
  const chargeDate = formatPolicyDate(firstPaidAt);
  const windowEnd = formatPolicyDate(windowEndAt);
  return [
    'Your request falls outside the refundable window under Advisacor Refund Policy v1.',
    eligibilityReason ? eligibilityReason : '',
    `First successful charge date: ${chargeDate}. Refund window ended: ${windowEnd}.`,
    'Refunds are limited to the 30-day first-cycle window. You may cancel future billing only.',
    `Manage billing: ${BILLING_URL}`,
    `Policy: ${REFUND_POLICY_URL}`,
  ]
    .filter(Boolean)
    .join(' ');
}

export function buildPathCEscalationRestatement({ firstPaidAt, windowEndAt }) {
  const chargeDate = formatPolicyDate(firstPaidAt);
  const windowEnd = formatPolicyDate(windowEndAt);
  return [
    'Advisacor Refund Policy v1 still applies to your account.',
    `Your first charge was on ${chargeDate}. The refund window closed on ${windowEnd}.`,
    'You may cancel future billing from your dashboard if you no longer wish to continue.',
    `Billing: ${BILLING_URL} · Policy: ${REFUND_POLICY_URL}`,
  ].join(' ');
}

export function buildPathAProcessingFallbackResponse() {
  return [
    'Your refund is being processed under Advisacor Refund Policy v1.',
    'If you do not see it within two business days, contact refunds@advisacor.com.',
    `Policy: ${REFUND_POLICY_URL}`,
  ].join(' ');
}

export function buildGenericErrorResponse() {
  return 'I am having trouble processing that right now. Please email refunds@advisacor.com with your account email and we will assist under Advisacor Refund Policy v1.';
}
