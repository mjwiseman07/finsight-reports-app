import { describe, it, expect } from 'vitest';
import { estimateCostCents } from '@/lib/audit-ready/bedrock-client';

describe('estimateCostCents', () => {
  it('sonnet is more expensive than haiku for same tokens', () => {
    const sonnet = estimateCostCents('sonnet', 10_000, 2_000);
    const haiku = estimateCostCents('haiku', 10_000, 2_000);
    expect(sonnet).toBeGreaterThan(haiku);
  });

  it('non-negative for zero-token calls', () => {
    expect(estimateCostCents('sonnet', 0, 0)).toBe(0);
  });
});
