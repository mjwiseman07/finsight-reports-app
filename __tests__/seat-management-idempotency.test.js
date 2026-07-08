import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// Mock modules BEFORE importing the SUT
const supabaseChain = () => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };
  return chain;
};

let supabaseMock;
let stripeMock;

vi.mock('../lib/supabase-admin.js', () => ({
  getSupabaseAdmin: () => supabaseMock,
}));

vi.mock('../lib/stripe.js', () => ({
  stripe: {
    billing: {
      meterEvents: {
        create: (...args) => stripeMock.billing.meterEvents.create(...args),
      },
    },
  },
}));

const { activateSeat } = await import('../lib/seat-management.js');

const FIRM_ID = '00000000-0000-0000-0000-000000000001';
const COMPANY_ID = '00000000-0000-0000-0000-000000000002';
const ITEM_ID = '00000000-0000-0000-0000-000000000003';
const SUB_ID = '00000000-0000-0000-0000-000000000004';
const PERIOD_START = '2026-07-01T00:00:00.000Z';

function expectedIdentifier(itemId, companyId, isoStart) {
  const material = `${itemId}|${companyId}|${isoStart}`;
  return `seat-${crypto.createHash('sha1').update(material).digest('hex')}`;
}

beforeEach(() => {
  supabaseMock = supabaseChain();
  stripeMock = { billing: { meterEvents: { create: vi.fn().mockResolvedValue({ identifier: 'x' }) } } };
});

describe('activateSeat idempotency', () => {
  it('emits meter event with deterministic identifier on first activation', async () => {
    supabaseMock.maybeSingle
      .mockResolvedValueOnce({ data: { id: SUB_ID, stripe_customer_id: 'cus_x', current_period_start: PERIOD_START } })
      .mockResolvedValueOnce({ data: { id: ITEM_ID, stripe_subscription_item_id: 'si_x', metered: true } })
      .mockResolvedValueOnce({ data: null });
    supabaseMock.single.mockResolvedValueOnce({ data: { id: 'seat_1' } });

    const result = await activateSeat({ firmId: FIRM_ID, companyId: COMPANY_ID, seatTier: 'firm_client_seat' });

    expect(result.meterEventEmitted).toBe(true);
    expect(result.identifier).toBe(expectedIdentifier(ITEM_ID, COMPANY_ID, PERIOD_START));
    expect(stripeMock.billing.meterEvents.create).toHaveBeenCalledWith({
      event_name: 'firm_client_seat_used',
      identifier: expectedIdentifier(ITEM_ID, COMPANY_ID, PERIOD_START),
      payload: { stripe_customer_id: 'cus_x', value: '1' },
    });
  });

  it('does NOT emit meter event when active seat already exists (app-side guard)', async () => {
    supabaseMock.maybeSingle
      .mockResolvedValueOnce({ data: { id: SUB_ID, stripe_customer_id: 'cus_x', current_period_start: PERIOD_START } })
      .mockResolvedValueOnce({ data: { id: ITEM_ID, stripe_subscription_item_id: 'si_x', metered: true } })
      .mockResolvedValueOnce({ data: { id: 'seat_existing', billing_period_anchor: PERIOD_START } });

    const result = await activateSeat({ firmId: FIRM_ID, companyId: COMPANY_ID, seatTier: 'firm_client_seat' });

    expect(result.meterEventEmitted).toBe(false);
    expect(result.reason).toBe('seat_already_active');
    expect(stripeMock.billing.meterEvents.create).not.toHaveBeenCalled();
  });

  it('treats Stripe duplicate-identifier response as idempotent success', async () => {
    supabaseMock.maybeSingle
      .mockResolvedValueOnce({ data: { id: SUB_ID, stripe_customer_id: 'cus_x', current_period_start: PERIOD_START } })
      .mockResolvedValueOnce({ data: { id: ITEM_ID, stripe_subscription_item_id: 'si_x', metered: true } })
      .mockResolvedValueOnce({ data: null });
    supabaseMock.single.mockResolvedValueOnce({ data: { id: 'seat_new' } });

    const dupErr = new Error('An event with identifier seat-abc already exists');
    dupErr.raw = { code: 'meter_event_already_exists' };
    stripeMock.billing.meterEvents.create.mockRejectedValueOnce(dupErr);

    const result = await activateSeat({ firmId: FIRM_ID, companyId: COMPANY_ID, seatTier: 'firm_client_seat' });

    expect(result.meterEventEmitted).toBe(false);
    expect(result.reason).toBe('stripe_dedup');
  });

  it('refuses to emit when subscription has no current_period_start', async () => {
    supabaseMock.maybeSingle.mockResolvedValueOnce({ data: { id: SUB_ID, stripe_customer_id: 'cus_x', current_period_start: null } });

    await expect(activateSeat({ firmId: FIRM_ID, companyId: COMPANY_ID, seatTier: 'firm_client_seat' })).rejects.toThrow(/missing current_period_start/);
    expect(stripeMock.billing.meterEvents.create).not.toHaveBeenCalled();
  });

  it('handles race condition (23505 unique_violation) as idempotent success', async () => {
    supabaseMock.maybeSingle
      .mockResolvedValueOnce({ data: { id: SUB_ID, stripe_customer_id: 'cus_x', current_period_start: PERIOD_START } })
      .mockResolvedValueOnce({ data: { id: ITEM_ID, stripe_subscription_item_id: 'si_x', metered: true } })
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { id: 'seat_winner' } });
    supabaseMock.single.mockResolvedValueOnce({ data: null, error: { code: '23505' } });

    const result = await activateSeat({ firmId: FIRM_ID, companyId: COMPANY_ID, seatTier: 'firm_client_seat' });

    expect(result.seatId).toBe('seat_winner');
    expect(result.reason).toBe('race_lost_to_winner');
    expect(stripeMock.billing.meterEvents.create).not.toHaveBeenCalled();
  });
});
