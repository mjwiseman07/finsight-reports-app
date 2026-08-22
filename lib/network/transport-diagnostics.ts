/**
 * Safe transport diagnostics for QuotaGuard / QBO egress.
 *
 * Goals:
 * - Unwrap Error.cause chains that undici hides behind "fetch failed"
 * - Never log secrets (proxy password, bearer tokens, realm ids, query strings)
 * - Expose runtime Undici/Node versions for dispatcher-compatibility checks
 *
 * Diagnostic-only — does not change proxy routing or bypass QuotaGuard.
 */
/**
 * Safe transport diagnostics for QuotaGuard / QBO egress.
 *
 * Goals:
 * - Unwrap Error.cause chains that undici hides behind "fetch failed"
 * - Never log secrets (proxy password, bearer tokens, realm ids, query strings)
 * - Expose runtime Undici/Node versions for dispatcher-compatibility checks
 *
 * Diagnostic-only — does not change proxy routing or bypass QuotaGuard.
 */
import { createRequire } from "node:module";
import { Agent } from "undici";
import {
  getQuotaGuardStaticIps,
  getQuotaGuardUndiciDispatcher,
  isQuotaGuardConfigured,
} from "./quotaguard-proxy";

const require = createRequire(import.meta.url);

export type NetworkErrorFrame = {
  name: string;
  message: string;
  code?: string;
  errno?: string | number;
  syscall?: string;
  hostname?: string;
  port?: string | number;
  address?: string;
};

export type NetworkErrorDiagnostics = {
  message: string;
  name: string;
  code?: string;
  errno?: string | number;
  syscall?: string;
  hostname?: string;
  port?: string | number;
  address?: string;
  causeChain: NetworkErrorFrame[];
  deepest: NetworkErrorFrame | null;
};

export type SanitizedQuotaGuardUrlMeta = {
  set: boolean;
  length?: number;
  startsWithHttps?: boolean;
  startsWithHttp?: boolean;
  endsWithNewline?: boolean;
  endsWithSpace?: boolean;
  parses?: boolean;
  parseError?: string;
  scheme?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  hasUsername?: boolean;
  hasPassword?: boolean;
  usernameLen?: number;
  passwordLen?: number;
  /** Never includes username/password values. */
};

export type RuntimeTransportVersions = {
  node: string;
  /** Built-in Undici bundled with the Node runtime (process.versions.undici). */
  processUndici: string | null;
  /** Userland `undici` package version used for ProxyAgent construction. */
  userlandUndici: string | null;
  versionsMatchHint: "aligned" | "mismatch" | "unknown";
};

const SECRETISH =
  /(authorization|bearer\s+[a-z0-9._\-]+|access_token|refresh_token|password|proxy.?url|quotaguard)/i;

/**
 * Redact credential-bearing URLs and obvious secret substrings from messages.
 */
export function redactSecretishText(input: string): string {
  let out = input;
  // user:pass@host → [redacted]@host
  out = out.replace(
    /(https?:\/\/)([^/\s:@]+):([^/\s@]+)@/gi,
    "$1[redacted]:[redacted]@",
  );
  // Bearer tokens
  out = out.replace(/Bearer\s+[A-Za-z0-9._\-]+/g, "Bearer [redacted]");
  // query string fragments that may carry tokens
  out = out.replace(
    /([?&](?:access_token|refresh_token|token|client_secret|password)=)[^&\s]+/gi,
    "$1[redacted]",
  );
  if (SECRETISH.test(out) && /[A-Za-z0-9_\-]{20,}/.test(out)) {
    out = out.replace(/[A-Za-z0-9_\-]{20,}/g, "[redacted]");
  }
  return out;
}

function pickOptionalString(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const v = (obj as Record<string, unknown>)[key];
  return typeof v === "string" ? v : undefined;
}

function pickOptionalStringOrNumber(
  obj: unknown,
  key: string,
): string | number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const v = (obj as Record<string, unknown>)[key];
  if (typeof v === "string" || typeof v === "number") return v;
  return undefined;
}

function frameFromUnknown(value: unknown): NetworkErrorFrame {
  if (value instanceof Error) {
    return {
      name: value.name || "Error",
      message: redactSecretishText(value.message || "unknown"),
      code: pickOptionalString(value, "code"),
      errno: pickOptionalStringOrNumber(value, "errno"),
      syscall: pickOptionalString(value, "syscall"),
      hostname: pickOptionalString(value, "hostname"),
      port: pickOptionalStringOrNumber(value, "port"),
      address: pickOptionalString(value, "address"),
    };
  }
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    const message =
      typeof rec.message === "string"
        ? redactSecretishText(rec.message)
        : redactSecretishText(String(value));
    return {
      name: typeof rec.name === "string" ? rec.name : "Unknown",
      message,
      code: typeof rec.code === "string" ? rec.code : undefined,
      errno:
        typeof rec.errno === "string" || typeof rec.errno === "number"
          ? rec.errno
          : undefined,
      syscall: typeof rec.syscall === "string" ? rec.syscall : undefined,
      hostname: typeof rec.hostname === "string" ? rec.hostname : undefined,
      port:
        typeof rec.port === "string" || typeof rec.port === "number"
          ? rec.port
          : undefined,
      address: typeof rec.address === "string" ? rec.address : undefined,
    };
  }
  return { name: "Unknown", message: redactSecretishText(String(value)) };
}

/**
 * Unwrap Error.cause (and undici nested causes) into a safe diagnostic object.
 */
export function extractNetworkErrorDiagnostics(
  err: unknown,
): NetworkErrorDiagnostics {
  const causeChain: NetworkErrorFrame[] = [];
  let cursor: unknown = err;
  let depth = 0;
  while (cursor != null && depth < 8) {
    const frame = frameFromUnknown(cursor);
    causeChain.push(frame);
    if (cursor instanceof Error && "cause" in cursor) {
      cursor = (cursor as Error & { cause?: unknown }).cause;
    } else if (cursor && typeof cursor === "object" && "cause" in cursor) {
      cursor = (cursor as { cause?: unknown }).cause;
    } else {
      cursor = undefined;
    }
    depth += 1;
  }

  const top = causeChain[0] ?? { name: "Unknown", message: "unknown" };
  const deepest = causeChain.length ? causeChain[causeChain.length - 1]! : null;

  return {
    message: top.message,
    name: top.name,
    code: top.code,
    errno: top.errno,
    syscall: top.syscall,
    hostname: top.hostname,
    port: top.port,
    address: top.address,
    causeChain,
    deepest,
  };
}

/**
 * Sanitized QuotaGuard URL metadata — never returns username/password values.
 */
export function sanitizeQuotaGuardUrlMeta(
  raw: string | null | undefined,
): SanitizedQuotaGuardUrlMeta {
  if (!raw) return { set: false };

  const meta: SanitizedQuotaGuardUrlMeta = {
    set: true,
    length: raw.length,
    startsWithHttps: raw.startsWith("https://"),
    startsWithHttp: raw.startsWith("http://"),
    endsWithNewline: raw.endsWith("\n"),
    endsWithSpace: raw.endsWith(" "),
  };

  try {
    const u = new URL(raw);
    meta.parses = true;
    meta.scheme = u.protocol;
    meta.hostname = u.hostname;
    meta.port = u.port;
    meta.pathname = u.pathname;
    meta.hasUsername = Boolean(u.username);
    meta.hasPassword = Boolean(u.password);
    meta.usernameLen = u.username.length;
    meta.passwordLen = u.password.length;
  } catch (err) {
    meta.parses = false;
    meta.parseError =
      err instanceof Error
        ? redactSecretishText(err.message)
        : redactSecretishText(String(err));
  }

  return meta;
}

export function getRuntimeTransportVersions(): RuntimeTransportVersions {
  const node = process.version;
  const processUndici =
    typeof process.versions?.undici === "string"
      ? process.versions.undici
      : null;

  let userlandUndici: string | null = null;
  try {
    userlandUndici = require("undici/package.json").version as string;
  } catch {
    userlandUndici = null;
  }

  let versionsMatchHint: RuntimeTransportVersions["versionsMatchHint"] =
    "unknown";
  if (processUndici && userlandUndici) {
    const majorProcess = processUndici.split(".")[0];
    const majorUserland = userlandUndici.split(".")[0];
    versionsMatchHint =
      majorProcess === majorUserland ? "aligned" : "mismatch";
  }

  return { node, processUndici, userlandUndici, versionsMatchHint };
}

export type TransportProbeResult = {
  name: string;
  ok: boolean;
  elapsedMs: number;
  httpStatus: number | null;
  reachedHttpResponse: boolean;
  intuitTid: string | null;
  egressIp: string | null;
  error: NetworkErrorDiagnostics | null;
  notes?: string;
};

async function timedFetch(
  name: string,
  url: string,
  init: RequestInit & { dispatcher?: unknown },
): Promise<TransportProbeResult> {
  const started = Date.now();
  try {
    const resp = await fetch(url, init as RequestInit);
    const elapsedMs = Date.now() - started;
    const intuitTid =
      resp.headers.get("intuit_tid") ||
      resp.headers.get("intuit-tid") ||
      null;

    let egressIp: string | null = null;
    const contentType = resp.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        const body = (await resp.json()) as { ip?: string };
        if (typeof body?.ip === "string") egressIp = body.ip;
      } catch {
        // ignore body parse — transport still succeeded
      }
    } else {
      // Drain body so sockets can reuse.
      await resp.text().catch(() => "");
    }

    return {
      name,
      ok: true,
      elapsedMs,
      httpStatus: resp.status,
      reachedHttpResponse: true,
      intuitTid,
      egressIp,
      error: null,
    };
  } catch (err) {
    return {
      name,
      ok: false,
      elapsedMs: Date.now() - started,
      httpStatus: null,
      reachedHttpResponse: false,
      intuitTid: null,
      egressIp: null,
      error: extractNetworkErrorDiagnostics(err),
    };
  }
}

/**
 * Run the diagnostic transport matrix against neutral + Intuit hosts.
 * Does not send QBO bearer tokens or realm/query identifiers.
 */
export async function runQuotaGuardTransportProbes(opts?: {
  neutralUrl?: string;
  intuitUrl?: string;
}): Promise<{
  versions: RuntimeTransportVersions;
  quotaGuardConfigured: boolean;
  quotaGuardUrlMeta: SanitizedQuotaGuardUrlMeta;
  expectedStaticIps: string[];
  probes: TransportProbeResult[];
  observedEgressIp: string | null;
  egressMatchesStaticPair: boolean | null;
}> {
  const neutralUrl = opts?.neutralUrl ?? "https://api.ipify.org?format=json";
  // HEAD/GET without auth — any HTTP response proves CONNECT+TLS through proxy.
  const intuitUrl =
    opts?.intuitUrl ?? "https://quickbooks.api.intuit.com/v3/company";

  const versions = getRuntimeTransportVersions();
  const quotaGuardConfigured = isQuotaGuardConfigured();
  const quotaGuardUrlMeta = sanitizeQuotaGuardUrlMeta(
    process.env.QUOTAGUARD_PROXY_URL,
  );
  const expectedStaticIps = getQuotaGuardStaticIps();
  const proxyDispatcher = getQuotaGuardUndiciDispatcher();
  const directAgent = new Agent();

  const probes: TransportProbeResult[] = [];

  // 1) Direct neutral HTTPS via explicit undici Agent (bypass global dispatcher).
  probes.push(
    await timedFetch("direct_neutral_https", neutralUrl, {
      method: "GET",
      dispatcher: directAgent,
    }),
  );

  // 2) Proxied neutral HTTPS via explicit QuotaGuard ProxyAgent.
  if (proxyDispatcher) {
    probes.push(
      await timedFetch("proxied_neutral_https", neutralUrl, {
        method: "GET",
        dispatcher: proxyDispatcher,
      }),
    );
  } else {
    probes.push({
      name: "proxied_neutral_https",
      ok: false,
      elapsedMs: 0,
      httpStatus: null,
      reachedHttpResponse: false,
      intuitTid: null,
      egressIp: null,
      error: null,
      notes: "QuotaGuard dispatcher unavailable",
    });
  }

  // 3) Proxied Intuit-host transport (explicit dispatcher, no auth token).
  if (proxyDispatcher) {
    probes.push(
      await timedFetch("proxied_intuit_host", intuitUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        dispatcher: proxyDispatcher,
      }),
    );
  } else {
    probes.push({
      name: "proxied_intuit_host",
      ok: false,
      elapsedMs: 0,
      httpStatus: null,
      reachedHttpResponse: false,
      intuitTid: null,
      egressIp: null,
      error: null,
      notes: "QuotaGuard dispatcher unavailable",
    });
  }

  // 4) Explicit-dispatcher pattern used by qboApiFetch (same ProxyAgent).
  if (proxyDispatcher) {
    probes.push(
      await timedFetch("explicit_dispatcher_qbo_pattern", intuitUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        dispatcher: proxyDispatcher,
      }),
    );
  } else {
    probes.push({
      name: "explicit_dispatcher_qbo_pattern",
      ok: false,
      elapsedMs: 0,
      httpStatus: null,
      reachedHttpResponse: false,
      intuitTid: null,
      egressIp: null,
      error: null,
      notes: "QuotaGuard dispatcher unavailable",
    });
  }

  // 5) Global / default fetch (selective dispatcher if instrumentation installed).
  probes.push(
    await timedFetch("global_selective_fetch", intuitUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    }),
  );

  const observedEgressIp =
    probes.find((p) => p.name === "proxied_neutral_https" && p.egressIp)
      ?.egressIp ??
    probes.find((p) => p.egressIp)?.egressIp ??
    null;

  const egressMatchesStaticPair =
    observedEgressIp == null
      ? null
      : expectedStaticIps.includes(observedEgressIp);

  return {
    versions,
    quotaGuardConfigured,
    quotaGuardUrlMeta,
    expectedStaticIps,
    probes,
    observedEgressIp,
    egressMatchesStaticPair,
  };
}
