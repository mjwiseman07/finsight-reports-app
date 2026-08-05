import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkLivemode, getExpectedLivemode } from '../lib/stripe/livemode-guard.js';

describe('livemode-guard', () => {
  const origExpect = process.env.STRIPE_EXPECT_LIVEMODE;
  const origNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    delete process.env.STRIPE_EXPECT_LIVEMODE;
    delete process.env.NODE_ENV;
  });
  afterEach(() => {
    if (origExpect === undefined) delete process.env.STRIPE_EXPECT_LIVEMODE;
    else process.env.STRIPE_EXPECT_LIVEMODE = origExpect;
    if (origNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = origNodeEnv;
  });

  describe('getExpectedLivemode', () => {
    it('respects explicit STRIPE_EXPECT_LIVEMODE=true', () => {
      process.env.STRIPE_EXPECT_LIVEMODE = 'true';
      process.env.NODE_ENV = 'development';
      expect(getExpectedLivemode()).toBe(true);
    });

    it('respects explicit STRIPE_EXPECT_LIVEMODE=false', () => {
      process.env.STRIPE_EXPECT_LIVEMODE = 'false';
      process.env.NODE_ENV = 'production';
      expect(getExpectedLivemode()).toBe(false);
    });

    it('falls back to NODE_ENV=production → true', () => {
      process.env.NODE_ENV = 'production';
      expect(getExpectedLivemode()).toBe(true);
    });

    it('falls back to NODE_ENV!=production → false', () => {
      process.env.NODE_ENV = 'development';
      expect(getExpectedLivemode()).toBe(false);
    });

    it('falls back to unset NODE_ENV → false', () => {
      expect(getExpectedLivemode()).toBe(false);
    });
  });

  describe('checkLivemode', () => {
    it('accepts a live event on a live endpoint', () => {
      process.env.NODE_ENV = 'production';
      expect(checkLivemode({ livemode: true })).toEqual({ ok: true });
    });

    it('rejects a sandbox event on a live endpoint', () => {
      process.env.NODE_ENV = 'production';
      const result = checkLivemode({ livemode: false });
      expect(result.ok).toBe(false);
      expect(result.expected).toBe(true);
      expect(result.actual).toBe(false);
    });

    it('accepts a sandbox event on a sandbox endpoint (NODE_ENV != production)', () => {
      process.env.NODE_ENV = 'development';
      expect(checkLivemode({ livemode: false })).toEqual({ ok: true });
    });

    it('rejects a live event on a sandbox endpoint', () => {
      process.env.NODE_ENV = 'development';
      const result = checkLivemode({ livemode: true });
      expect(result.ok).toBe(false);
      expect(result.expected).toBe(false);
      expect(result.actual).toBe(true);
    });

    it('treats missing livemode as null actual and rejects on prod', () => {
      process.env.NODE_ENV = 'production';
      const result = checkLivemode({});
      expect(result.ok).toBe(false);
      expect(result.actual).toBeNull();
    });

    it('treats missing livemode as null actual and rejects off-prod (expected false !== null)', () => {
      process.env.NODE_ENV = 'development';
      const result = checkLivemode({});
      expect(result.ok).toBe(false);
      expect(result.actual).toBeNull();
    });
  });
});
