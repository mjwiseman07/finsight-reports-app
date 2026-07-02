import { describe, expect, it } from 'vitest';
import { detectRefundIntent } from '../../lib/refunds/intent';
import { isNegativeReaction } from '../../lib/refunds/sentiment';

describe('detectRefundIntent', () => {
  it.each([
    'I want a refund',
    'Please give me my money back',
    'Can you reimburse this charge',
    'I need to chargeback this',
    'get my money back please',
  ])('detects refund request: %s', (message) => {
    const result = detectRefundIntent(message);
    expect(result.isRefundRequest).toBe(true);
    expect(result.isCancellationOnly).toBe(false);
  });

  it('detects cancel-only without refund language', () => {
    const result = detectRefundIntent('I want to cancel my subscription');
    expect(result.isRefundRequest).toBe(false);
    expect(result.isCancellationOnly).toBe(true);
  });

  it.each(['What is my revenue this month', ''])('returns false for non-refund: %s', (message) => {
    const result = detectRefundIntent(message);
    expect(result.isRefundRequest).toBe(false);
    expect(result.isCancellationOnly).toBe(false);
  });
});

describe('isNegativeReaction', () => {
  it.each(['this is UNACCEPTABLE', 'I will sue you', 'filing a chargeback'])('detects negative: %s', (message) => {
    expect(isNegativeReaction(message)).toBe(true);
  });

  it.each(['Thank you for explaining the policy', ''])('returns false for calm text', (message) => {
    expect(isNegativeReaction(message)).toBe(false);
  });
});

describe('resolveResponsePath', () => {
  it('routes pilot in-window to Path A', async () => {
    const { resolveResponsePath } = await import('../../lib/refunds/routing');
    expect(resolveResponsePath({ eligible: true, path: 'A' })).toBe('A');
  });

  it('routes standard in-window to Path B', async () => {
    const { resolveResponsePath } = await import('../../lib/refunds/routing');
    expect(resolveResponsePath({ eligible: true, path: 'B' })).toBe('B');
  });

  it('routes outside window to Path C', async () => {
    const { resolveResponsePath } = await import('../../lib/refunds/routing');
    expect(resolveResponsePath({ eligible: false, path: 'C' })).toBe('C');
  });
});
