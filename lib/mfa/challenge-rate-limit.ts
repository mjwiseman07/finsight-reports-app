/**
 * In-memory MFA challenge attempt tracker.
 * 3 failures within 5 minutes → lockout for 15 minutes.
 * Process-local (same pattern as lib/rate-limit.js); sufficient for
 * per-instance protection on Vercel Fluid Compute.
 */

type AttemptBucket = {
  failures: number[];
  lockedUntil: number | null;
};

const store: Map<string, AttemptBucket> =
  (globalThis as unknown as { __advisacorMfaChallengeStore?: Map<string, AttemptBucket> })
    .__advisacorMfaChallengeStore || new Map();

(
  globalThis as unknown as { __advisacorMfaChallengeStore?: Map<string, AttemptBucket> }
).__advisacorMfaChallengeStore = store;

const FAILURE_WINDOW_MS = 5 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_FAILURES = 3;

export function getMfaChallengeLockState(userId: string): {
  locked: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const bucket = store.get(userId);
  if (!bucket?.lockedUntil || bucket.lockedUntil <= now) {
    if (bucket?.lockedUntil && bucket.lockedUntil <= now) {
      bucket.lockedUntil = null;
      bucket.failures = [];
    }
    return { locked: false, retryAfterSeconds: 0 };
  }
  return {
    locked: true,
    retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
  };
}

export function recordMfaChallengeFailure(userId: string): {
  locked: boolean;
  retryAfterSeconds: number;
  remainingAttempts: number;
} {
  const now = Date.now();
  let bucket = store.get(userId);
  if (!bucket) {
    bucket = { failures: [], lockedUntil: null };
    store.set(userId, bucket);
  }

  if (bucket.lockedUntil && bucket.lockedUntil > now) {
    return {
      locked: true,
      retryAfterSeconds: Math.ceil((bucket.lockedUntil - now) / 1000),
      remainingAttempts: 0,
    };
  }

  bucket.failures = bucket.failures.filter((t) => now - t < FAILURE_WINDOW_MS);
  bucket.failures.push(now);

  if (bucket.failures.length >= MAX_FAILURES) {
    bucket.lockedUntil = now + LOCKOUT_MS;
    bucket.failures = [];
    return { locked: true, retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000), remainingAttempts: 0 };
  }

  return {
    locked: false,
    retryAfterSeconds: 0,
    remainingAttempts: MAX_FAILURES - bucket.failures.length,
  };
}

export function clearMfaChallengeFailures(userId: string): void {
  store.delete(userId);
}

/** Test-only reset. */
export function _resetMfaChallengeStore(): void {
  store.clear();
}
