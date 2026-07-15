/**
 * Install QuotaGuard's undici ProxyAgent as the process-wide global
 * dispatcher for `fetch()`. Called once at Node.js runtime boot via
 * `instrumentation.ts` so every `fetch()` in the codebase egresses
 * through QuotaGuard's static IPs — no per-call site changes required.
 *
 * Idempotent — safe to call multiple times.
 */
import { setGlobalDispatcher } from "undici";
import { getQuotaGuardUndiciDispatcher, isQuotaGuardConfigured } from "./quotaguard-proxy";

let _installed = false;

export function initQuotaGuardGlobalDispatcher(): void {
  if (_installed) return;

  if (!isQuotaGuardConfigured()) {
    console.log(
      "[quotaguard] QUOTAGUARD_PROXY_URL not set; skipping global dispatcher install (local dev / tests).",
    );
    _installed = true;
    return;
  }

  const dispatcher = getQuotaGuardUndiciDispatcher();
  if (!dispatcher) {
    console.warn(
      "[quotaguard] Proxy URL configured but ProxyAgent construction returned null; not installing dispatcher.",
    );
    _installed = true;
    return;
  }

  setGlobalDispatcher(dispatcher);
  _installed = true;
  console.log("[quotaguard] Global fetch dispatcher routing through QuotaGuard Shield.");
}
