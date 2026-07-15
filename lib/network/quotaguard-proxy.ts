/**
 * QuotaGuard Shield outbound proxy helper.
 *
 * Purpose: Route Advisacor's outbound QuickBooks Online API calls through
 * QuotaGuard's static IP pair (52.54.159.237, 52.73.143.252) so Intuit can
 * allowlist a fixed egress identity for App Assessment / Production keys.
 *
 * All exports are safe to call from hot paths — the underlying agents are
 * memoized module-level singletons.
 *
 * Environment variables required in production:
 *   QUOTAGUARD_PROXY_URL — full connection URL, e.g.
 *     https://<username>:<password>@us-east-shield-02.quotaguard.com:9294
 *   QUOTAGUARD_STATIC_IP_PRIMARY — 52.54.159.237
 *   QUOTAGUARD_STATIC_IP_FAILOVER — 52.73.143.252
 *
 * If QUOTAGUARD_PROXY_URL is not set (local dev, tests), the helpers
 * return null and callers use their default direct-connection path.
 */
import { HttpsProxyAgent } from "https-proxy-agent";
import { ProxyAgent } from "undici";

let _nodeAgent: HttpsProxyAgent<string> | null | undefined;
let _undiciDispatcher: ProxyAgent | null | undefined;

function getProxyUrl(): string | null {
  const url = process.env.QUOTAGUARD_PROXY_URL;
  if (!url) return null;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    console.warn(
      "[quotaguard-proxy] QUOTAGUARD_PROXY_URL is set but does not start with http(s)://; ignoring.",
    );
    return null;
  }
  return url;
}

/**
 * Returns the QuotaGuard static IPs used for allowlisting. Non-secret;
 * safe to log and expose in admin diagnostics.
 */
export function getQuotaGuardStaticIps(): string[] {
  const primary = process.env.QUOTAGUARD_STATIC_IP_PRIMARY;
  const failover = process.env.QUOTAGUARD_STATIC_IP_FAILOVER;
  return [primary, failover].filter((ip): ip is string => Boolean(ip));
}

/**
 * Node.js `https` agent for `node-quickbooks` and any code that uses
 * the legacy `request` / `https.request` interface.
 *
 * Returns null when QUOTAGUARD_PROXY_URL is unset (local dev / tests).
 */
export function getQuotaGuardHttpsAgent(): HttpsProxyAgent<string> | null {
  if (_nodeAgent !== undefined) return _nodeAgent;
  const url = getProxyUrl();
  if (!url) {
    _nodeAgent = null;
    return null;
  }
  _nodeAgent = new HttpsProxyAgent(url);
  return _nodeAgent;
}

/**
 * `undici` dispatcher for `fetch()` — global or per-call. Used by
 * `initGlobalDispatcher` and by any call site that wants explicit
 * per-request proxying.
 *
 * Returns null when QUOTAGUARD_PROXY_URL is unset.
 */
export function getQuotaGuardUndiciDispatcher(): ProxyAgent | null {
  if (_undiciDispatcher !== undefined) return _undiciDispatcher;
  const url = getProxyUrl();
  if (!url) {
    _undiciDispatcher = null;
    return null;
  }
  _undiciDispatcher = new ProxyAgent({ uri: url });
  return _undiciDispatcher;
}

/**
 * Reset memoized agents. Test-only.
 */
export function _resetQuotaGuardAgents(): void {
  _nodeAgent = undefined;
  _undiciDispatcher = undefined;
}

/**
 * True if a QuotaGuard proxy URL is configured. Callers can log this
 * to confirm proxy behavior in prod without leaking secrets.
 */
export function isQuotaGuardConfigured(): boolean {
  return getProxyUrl() !== null;
}
