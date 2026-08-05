/**
 * Phase MEM_LIFECYCLE Block 9.2 — bounded-concurrency verification queue.
 *
 * Design goals (from Block_9_2_UX_Research.md §1.1–§1.3):
 *   - At most 4 verifications in flight at any time (WebCrypto ops are ~50-100ms
 *     each and 5-10 in parallel Promise.all() cause visible scroll jank).
 *   - Identical (chain_seq)-keyed requests share one promise. Two rows becoming
 *     visible simultaneously and both requesting verify for the same chain_seq
 *     must NOT trigger two verifications.
 *   - Cooperative yielding via scheduler.yield() (with setTimeout(0) fallback)
 *     between jobs so we don't monopolize the main thread even inside the limit.
 *   - The cache is module-scoped intentionally: React 19's use() API requires
 *     a cached promise external to render (per react.dev/reference/react/use).
 *
 * Non-goals: this is NOT a full Web Worker offload. Per web.dev's long-tasks
 * guidance, main-thread + concurrency limiter + yielding is sufficient at this
 * workload; Web Worker migration is deferred until PerformanceObserver
 * telemetry (INP, long-task entries) shows real user impact.
 */

import pLimit from "p-limit";
import {
  verifyEventAnchored,
  type VerifyReport,
} from "./anchor-verifier";
import {
  fetchAnchorPayload,
  type AnchorFetchResult,
} from "./anchor-fetch";

const MAX_CONCURRENT = 4;
const limit = pLimit(MAX_CONCURRENT);

export type QueueResult =
  | { status: "ok"; report: VerifyReport }
  | { status: "not-anchored"; reason: string }
  | { status: "error"; message: string };

// Module-level cache. Key is chain_seq (unique per event in the chain).
const cache = new Map<number, Promise<QueueResult>>();

/** Test-only helper — never call from product code. */
export function _clearAnchorVerifyCacheForTests(): void {
  cache.clear();
}

/** Cooperative yield: prefer scheduler.yield when available. */
async function yieldToMain(): Promise<void> {
  const s = (globalThis as unknown as {
    scheduler?: { yield?: () => Promise<void> };
  }).scheduler;
  if (s && typeof s.yield === "function") {
    return s.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Get (or create + cache) the verification promise for a given chain_seq.
 *
 * Two calls with the same chain_seq return the SAME promise — this is the
 * dedup guarantee. If verify fails, the failure is cached too (see caching
 * discussion below).
 *
 * NOTE ON FAILURE CACHING: we cache "error" and "not-anchored" results, not
 * just successes. Rationale: an event that isn't yet anchored won't become
 * anchored while a single tab session lives — the anchor batcher runs on a
 * cron cadence in the tens of minutes. Recomputing every scroll would waste
 * both bandwidth and CPU. If we ever want retry-on-error, that's an explicit
 * cache invalidation call, not an implicit refetch loop.
 */
export function getAnchorVerification(chainSeq: number): Promise<QueueResult> {
  const cached = cache.get(chainSeq);
  if (cached) return cached;

  const promise = limit(async (): Promise<QueueResult> => {
    // Yield BEFORE doing work so multiple queued jobs interleave with the
    // main thread rather than back-to-back.
    await yieldToMain();

    let fetched: AnchorFetchResult;
    try {
      fetched = await fetchAnchorPayload(chainSeq);
    } catch (e) {
      return {
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      };
    }

    if (fetched.status === "not-anchored") {
      return { status: "not-anchored", reason: fetched.reason };
    }
    if (fetched.status === "error") {
      return { status: "error", message: fetched.message };
    }

    try {
      const report = await verifyEventAnchored({
        targetChainSeq: chainSeq,
        batch: fetched.payload.batch,
        leaves: fetched.payload.leaves,
        tsrs: fetched.payload.tsrs,
      });
      // Post-verify yield so if 4 slots all release at once we don't
      // hammer the next 4 immediately.
      await yieldToMain();
      return { status: "ok", report };
    } catch (e) {
      return {
        status: "error",
        message: e instanceof Error ? e.message : String(e),
      };
    }
  });

  cache.set(chainSeq, promise);
  return promise;
}
