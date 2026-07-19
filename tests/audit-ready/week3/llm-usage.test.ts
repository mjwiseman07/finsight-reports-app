import { describe, it, expect, vi, beforeEach } from 'vitest';

const store: Array<{ cost_usd_cents: number; success?: boolean }> = [];

vi.mock('@/lib/supabase/service', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => Promise.resolve({ data: [...store], error: null }),
        }),
      }),
      insert: (row: { cost_usd_cents?: number }) => {
        store.push({ cost_usd_cents: row.cost_usd_cents ?? 0, success: true });
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

import { checkEngagementCap } from '@/lib/audit-ready/llm-usage';

describe('llm-usage cap logic', () => {
  beforeEach(() => {
    store.length = 0;
  });

  it('allows Sonnet under threshold', async () => {
    const r = await checkEngagementCap('eng-1', 'sonnet');
    expect(r.allowed).toBe(true);
    expect(r.modelToUse).toBe('sonnet');
    expect(r.reason).toBe('under_threshold');
  });

  it('falls back to Haiku at 90% of cap', async () => {
    store.push({ cost_usd_cents: 720 });
    const r = await checkEngagementCap('eng-1', 'sonnet');
    expect(r.allowed).toBe(true);
    expect(r.modelToUse).toBe('haiku');
    expect(r.reason).toBe('over_threshold_fallback');
  });

  it('blocks when over cap', async () => {
    store.push({ cost_usd_cents: 800 });
    const r = await checkEngagementCap('eng-1', 'sonnet');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('over_cap_blocked');
  });
});
