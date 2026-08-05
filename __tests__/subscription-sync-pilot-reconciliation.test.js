import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const buildFromChain = ({ existing, updateResult }) => {
  // .select('id, pilot_status').eq(...) returns { data, error }
  // .update({...}).eq(...).select('id', { count: 'exact', head: true }) returns { count, error }
  const chain = {
    select: vi.fn((cols) => {
      if (cols === 'id, pilot_status') {
        return {
          eq: vi.fn().mockResolvedValue({ data: existing, error: null }),
        };
      }
      // second .select (after update)
      return Promise.resolve({ count: updateResult?.count ?? existing?.length ?? 0, error: null });
    }),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() =>
          Promise.resolve({ count: updateResult?.count ?? existing?.length ?? 0, error: null }),
        ),
      })),
    })),
  };
  return chain;
};

vi.mock('../lib/stripe.js', () => ({
  stripe: {},
}));

vi.mock('../lib/supabase-admin.js', () => ({
  getSupabaseAdmin: vi.fn(),
}));

import { getSupabaseAdmin } from '../lib/supabase-admin.js';
import {
  reconcilePilotSlotStatus,
  STRIPE_TO_PILOT_STATUS,
} from '../lib/subscription-sync.js';

describe('STRIPE_TO_PILOT_STATUS map', () => {
  it('maps active/trialing/past_due → active', () => {
    expect(STRIPE_TO_PILOT_STATUS.active).toBe('active');
    expect(STRIPE_TO_PILOT_STATUS.trialing).toBe('active');
    expect(STRIPE_TO_PILOT_STATUS.past_due).toBe('active');
  });

  it('maps unpaid/paused/canceled/incomplete_expired → cancelled', () => {
    expect(STRIPE_TO_PILOT_STATUS.unpaid).toBe('cancelled');
    expect(STRIPE_TO_PILOT_STATUS.paused).toBe('cancelled');
    expect(STRIPE_TO_PILOT_STATUS.canceled).toBe('cancelled');
    expect(STRIPE_TO_PILOT_STATUS.incomplete_expired).toBe('cancelled');
  });

  it('maps incomplete → null (do not overwrite)', () => {
    expect(STRIPE_TO_PILOT_STATUS.incomplete).toBeNull();
  });

  it('uses double-L cancelled spelling', () => {
    // Guard against accidental US-spelling drift.
    for (const value of Object.values(STRIPE_TO_PILOT_STATUS)) {
      if (value !== null) {
        expect(['active', 'cancelled']).toContain(value);
      }
    }
  });
});

describe('reconcilePilotSlotStatus', () => {
  beforeEach(() => {
    getSupabaseAdmin.mockReset();
  });
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns no-op when Stripe status is incomplete (leaves row alone)', async () => {
    getSupabaseAdmin.mockReturnValue({ from: vi.fn() });
    const result = await reconcilePilotSlotStatus('sub_x', 'incomplete');
    expect(result).toEqual({
      updated: false,
      targetStatus: null,
      previousStatus: null,
      rowsAffected: 0,
    });
  });

  it('returns no-op when no pilot_slots row matches (engagement sub)', async () => {
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() => buildFromChain({ existing: [], updateResult: null })),
    });
    const result = await reconcilePilotSlotStatus('sub_engagement', 'canceled');
    expect(result.updated).toBe(false);
    expect(result.previousStatus).toBeNull();
  });

  it('returns no-op when row already matches target', async () => {
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() =>
        buildFromChain({
          existing: [{ id: 'r1', pilot_status: 'cancelled' }],
          updateResult: null,
        }),
      ),
    });
    const result = await reconcilePilotSlotStatus('sub_already', 'canceled');
    expect(result.updated).toBe(false);
    expect(result.previousStatus).toBe('cancelled');
    expect(result.targetStatus).toBe('cancelled');
  });

  it('flips active → cancelled on canceled', async () => {
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() =>
        buildFromChain({
          existing: [{ id: 'r1', pilot_status: 'active' }],
          updateResult: { count: 1 },
        }),
      ),
    });
    const result = await reconcilePilotSlotStatus('sub_flip', 'canceled');
    expect(result.updated).toBe(true);
    expect(result.previousStatus).toBe('active');
    expect(result.targetStatus).toBe('cancelled');
    expect(result.rowsAffected).toBe(1);
  });

  it('flips active → cancelled on unpaid', async () => {
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() =>
        buildFromChain({
          existing: [{ id: 'r1', pilot_status: 'active' }],
          updateResult: { count: 1 },
        }),
      ),
    });
    const result = await reconcilePilotSlotStatus('sub_unpaid', 'unpaid');
    expect(result.targetStatus).toBe('cancelled');
    expect(result.updated).toBe(true);
  });

  it('leaves active → active on past_due (grace period)', async () => {
    getSupabaseAdmin.mockReturnValue({
      from: vi.fn(() =>
        buildFromChain({
          existing: [{ id: 'r1', pilot_status: 'active' }],
          updateResult: null,
        }),
      ),
    });
    const result = await reconcilePilotSlotStatus('sub_past_due', 'past_due');
    expect(result.updated).toBe(false); // already matches target
    expect(result.targetStatus).toBe('active');
  });
});
