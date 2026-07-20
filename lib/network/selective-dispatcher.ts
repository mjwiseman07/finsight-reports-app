/**
 * QuotaGuard Selective Dispatcher.
 *
 * Wraps two undici `Dispatcher` instances (QuotaGuard proxy + default agent)
 * and routes each outbound `fetch()` to the correct one based on the request
 * hostname.
 *
 * Motivation: QuotaGuard is provisioned to give Intuit a static-IP allowlist
 * identity for QuickBooks Online API calls only. Routing unrelated traffic
 * (Supabase Auth, Stripe, Vercel, Datadog, our own internal APIs) through the
 * proxy causes CONNECT-tunnel cancellations and spurious 401/timeout failures.
 *
 * Design:
 *   - Allowlist of exact hostnames + suffix patterns (e.g. `.intuit.com`).
 *   - Every request is inspected once; hostname matches route to QuotaGuard,
 *     everything else routes to the default agent.
 *   - Both underlying dispatchers are memoized module singletons.
 *   - Dispatch is a thin passthrough; no request/response mutation.
 *
 * This file is safe to import from server code only. Do not import from
 * client bundles.
 */
import { Agent, Dispatcher, ProxyAgent } from "undici";
import { getQuotaGuardUndiciDispatcher, isQuotaGuardConfigured } from "./quotaguard-proxy";

/**
 * Hostnames (or `.suffix` patterns matching any subdomain of the suffix)
 * that MUST egress through the QuotaGuard proxy. Keep this list narrow.
 * Add hosts only when a third party requires our static IPs on their
 * allowlist.
 */
const QUOTAGUARD_ALLOWLIST: readonly string[] = [
  // Intuit QuickBooks Online — static-IP identity for App Assessment.
  ".intuit.com",
  ".quickbooks.api.intuit.com",
  ".oauth.platform.intuit.com",
  "quickbooks.api.intuit.com",
  "sandbox-quickbooks.api.intuit.com",
  "oauth.platform.intuit.com",
];

/**
 * Public helper: returns the current QuotaGuard allowlist. Used by the
 * admin network diagnostic endpoint.
 */
export function getQuotaGuardAllowlist(): readonly string[] {
  return QUOTAGUARD_ALLOWLIST;
}

/**
 * Returns true if the given hostname should egress through QuotaGuard.
 * Exported for unit testing.
 */
export function shouldRouteThroughQuotaGuard(hostname: string): boolean {
  if (!hostname) return false;
  const h = hostname.toLowerCase();
  for (const pattern of QUOTAGUARD_ALLOWLIST) {
    if (pattern.startsWith(".")) {
      // Suffix match (subdomains).
      if (h.endsWith(pattern) || h === pattern.slice(1)) return true;
    } else {
      // Exact host match.
      if (h === pattern) return true;
    }
  }
  return false;
}

let _default: Agent | null = null;

function getDefaultAgent(): Agent {
  if (_default) return _default;
  _default = new Agent();
  return _default;
}

/**
 * A `Dispatcher` that inspects the origin hostname on each request and
 * delegates to either the QuotaGuard `ProxyAgent` or the default `Agent`.
 *
 * We subclass `Dispatcher` directly rather than extending `Agent` — the
 * routing decision is made per-request, so there is no single upstream
 * origin to bind to.
 */
class SelectiveDispatcher extends Dispatcher {
  private readonly quotaGuard: ProxyAgent;
  private readonly direct: Agent;

  constructor(quotaGuard: ProxyAgent, direct: Agent) {
    super();
    this.quotaGuard = quotaGuard;
    this.direct = direct;
  }

  private pick(origin: string | URL): Dispatcher {
    try {
      const url = typeof origin === "string" ? new URL(origin) : origin;
      return shouldRouteThroughQuotaGuard(url.hostname) ? this.quotaGuard : this.direct;
    } catch {
      // Unparseable origin — fall through to direct.
      return this.direct;
    }
  }

  dispatch(
    options: Dispatcher.DispatchOptions,
    handler: Dispatcher.DispatchHandler,
  ): boolean {
    const origin = (options as { origin?: string | URL }).origin ?? "";
    return this.pick(origin).dispatch(options, handler);
  }

  close(): Promise<void>;
  close(callback: () => void): void;
  close(callback?: () => void): Promise<void> | void {
    if (callback) {
      void Promise.all([this.quotaGuard.close(), this.direct.close()]).then(
        () => callback(),
        () => callback(),
      );
      return;
    }
    return Promise.all([this.quotaGuard.close(), this.direct.close()]).then(
      () => undefined,
    );
  }

  destroy(): Promise<void>;
  destroy(err: Error | null): Promise<void>;
  destroy(callback: () => void): void;
  destroy(err: Error | null, callback: () => void): void;
  destroy(
    err?: Error | null | (() => void),
    callback?: () => void,
  ): Promise<void> | void {
    const error = typeof err === "function" ? null : (err ?? null);
    const cb = typeof err === "function" ? err : callback;
    if (cb) {
      void Promise.all([
        this.quotaGuard.destroy(error),
        this.direct.destroy(error),
      ]).then(
        () => cb(),
        () => cb(),
      );
      return;
    }
    return Promise.all([
      this.quotaGuard.destroy(error),
      this.direct.destroy(error),
    ]).then(() => undefined);
  }
}

/**
 * Build (and memoize) the selective dispatcher. Returns null if QuotaGuard
 * is not configured — caller should not install any global dispatcher and
 * let undici use its default agent for everything.
 */
let _selective: SelectiveDispatcher | null | undefined;

export function getSelectiveDispatcher(): SelectiveDispatcher | null {
  if (_selective !== undefined) return _selective;
  if (!isQuotaGuardConfigured()) {
    _selective = null;
    return null;
  }
  const qg = getQuotaGuardUndiciDispatcher();
  if (!qg) {
    _selective = null;
    return null;
  }
  _selective = new SelectiveDispatcher(qg, getDefaultAgent());
  return _selective;
}

/** Test-only reset. */
export function _resetSelectiveDispatcher(): void {
  _selective = undefined;
  _default = null;
}
