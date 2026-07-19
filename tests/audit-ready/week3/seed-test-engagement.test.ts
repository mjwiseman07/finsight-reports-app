import { describe, it, expect } from 'vitest';
import {
  TEST_ENGAGEMENT_SEED_NAME,
  TEST_ENGAGEMENT_TIER,
  TEST_ENGAGEMENT_BILLING_MODE,
} from '@/lib/audit-ready/seed-test-engagement';

describe('seed-test-engagement constants', () => {
  it('names are stable so idempotency key is stable across builds', () => {
    expect(TEST_ENGAGEMENT_SEED_NAME).toBe('Week 3 Smoke — PBC Ingest Fixture');
    // Schema CHECK: small|standard|complex|multi_entity (not paste's audit_ready_solo)
    expect(TEST_ENGAGEMENT_TIER).toBe('small');
    // Schema CHECK: monthly|per_engagement (trial lives on companies.billing_status)
    expect(TEST_ENGAGEMENT_BILLING_MODE).toBe('monthly');
  });
});
