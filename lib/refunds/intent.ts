/** Deterministic refund-intent detection for Pulse. No LLM. */

const REFUND_PHRASES = Object.freeze([
  'refund',
  'money back',
  'reimburse',
  'reverse the charge',
  'chargeback',
  'get my money back',
]);

const REFUND_WORD_PATTERN = new RegExp(
  `\\b(${REFUND_PHRASES.filter((p) => !p.includes(' ')).join('|')})\\b|${REFUND_PHRASES.filter((p) => p.includes(' '))
    .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')}`,
  'i',
);

const CANCEL_PATTERN = /\bcancel(l)?(ation|ing)?\b/i;

export type RefundIntentResult = {
  isRefundRequest: boolean;
  isCancellationOnly: boolean;
  isFollowUpAfterDenial: boolean;
};

export function detectRefundIntent(message: string): RefundIntentResult {
  const text = String(message || '').trim();
  if (!text) {
    return { isRefundRequest: false, isCancellationOnly: false, isFollowUpAfterDenial: false };
  }

  const isRefundRequest = REFUND_WORD_PATTERN.test(text);
  const hasCancel = CANCEL_PATTERN.test(text);
  const isCancellationOnly = hasCancel && !isRefundRequest;

  return {
    isRefundRequest,
    isCancellationOnly,
    isFollowUpAfterDenial: false,
  };
}
