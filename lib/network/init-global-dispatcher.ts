/**
 * Install a hostname-aware `Dispatcher` as the process-wide global
 * dispatcher for `fetch()`. Called once at Node.js runtime boot via
 * `instrumentation.ts`.
 *
 * Only allowlisted hostnames (Intuit QuickBooks Online) egress through
 * QuotaGuard's static IPs; every other outbound fetch (Supabase, Stripe,
 * Datadog, Vercel, our own APIs) uses the default undici agent (direct).
 *
 * Idempotent — safe to call multiple times.
 */
import { setGlobalDispatcher } from "undici";
import { getSelectiveDispatcher } from "./selective-dispatcher";
import { isQuotaGuardConfigured } from "./quotaguard-proxy";

let _installed = false;

export function initQuotaGuardGlobalDispatcher(): void {
  if (_installed) return;

  if (!isQuotaGuardConfigured()) {
    console.log(
      "[quotaguard] QUOTAGUARD_PROXY_URL not set; skipping selective dispatcher install (local dev / tests).",
    );
    _installed = true;
    return;
  }

  const dispatcher = getSelectiveDispatcher();
  if (!dispatcher) {
    console.warn(
      "[quotaguard] Proxy URL configured but selective dispatcher construction returned null; not installing.",
    );
    _installed = true;
    return;
  }

  setGlobalDispatcher(dispatcher);
  _installed = true;
  console.log(
    "[quotaguard] Selective global fetch dispatcher installed. QBO hosts route via QuotaGuard; all other hosts direct.",
  );
}
