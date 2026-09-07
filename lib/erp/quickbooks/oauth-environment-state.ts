/**
 * Server-signed QuickBooks OAuth state carrying expected provider_environment.
 *
 * The Intuit `state` query param and the HttpOnly `qb_oauth_state` cookie share
 * the same signed blob. Environment is never taken from browser query/body.
 */
import crypto from "crypto";
import {
  isPersistedQboProviderEnvironment,
  resolvePersistedQboProviderEnvironment,
  type PersistedQboProviderEnvironment,
} from "@/lib/erp/quickbooks/persisted-provider-environment";

export type QboOAuthEnvironmentStatePayload = {
  v: 1;
  nonce: string;
  expected_provider_environment: PersistedQboProviderEnvironment;
  /** Unix epoch seconds when minted. */
  iat: number;
  /** Unix epoch seconds when the state expires (cookie-aligned). */
  exp: number;
};

export class QboOAuthEnvironmentStateError extends Error {
  readonly code:
    | "missing_signing_secret"
    | "missing_server_environment"
    | "invalid_server_environment"
    | "malformed_state"
    | "bad_signature"
    | "expired_state"
    | "environment_mismatch"
    | "replay_or_cookie_mismatch";

  constructor(
    code: QboOAuthEnvironmentStateError["code"],
    message: string,
  ) {
    super(message);
    this.name = "QboOAuthEnvironmentStateError";
    this.code = code;
  }
}

const DEFAULT_TTL_SECONDS = 10 * 60;

function resolveSigningSecret(): string {
  const dedicated = process.env.QB_OAUTH_STATE_SECRET?.trim();
  if (dedicated) return dedicated;
  const clientSecret = process.env.QB_CLIENT_SECRET?.trim();
  if (clientSecret) return clientSecret;
  throw new QboOAuthEnvironmentStateError(
    "missing_signing_secret",
    "QuickBooks OAuth state signing secret is not configured",
  );
}

function base64UrlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function sign(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64url");
}

function timingSafeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * Resolve the deployment QuickBooks environment from trusted server config.
 * Fail closed on missing/invalid values.
 */
export function requireServerQboProviderEnvironment(
  envValue: string | undefined = process.env.QB_ENVIRONMENT,
): PersistedQboProviderEnvironment {
  const raw = String(envValue ?? "").trim();
  if (!raw) {
    throw new QboOAuthEnvironmentStateError(
      "missing_server_environment",
      "QuickBooks server environment is not configured",
    );
  }
  try {
    return resolvePersistedQboProviderEnvironment(raw);
  } catch {
    throw new QboOAuthEnvironmentStateError(
      "invalid_server_environment",
      "QuickBooks server environment is invalid",
    );
  }
}

/**
 * Mint a signed OAuth state bound to the current server QB_ENVIRONMENT.
 */
export function createQboOAuthEnvironmentState(options?: {
  ttlSeconds?: number;
  nowMs?: number;
}): { state: string; expectedProviderEnvironment: PersistedQboProviderEnvironment } {
  const expectedProviderEnvironment = requireServerQboProviderEnvironment();
  const nowSec = Math.floor((options?.nowMs ?? Date.now()) / 1000);
  const ttl = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  const payload: QboOAuthEnvironmentStatePayload = {
    v: 1,
    nonce: crypto.randomUUID(),
    expected_provider_environment: expectedProviderEnvironment,
    iat: nowSec,
    exp: nowSec + ttl,
  };
  const body = base64UrlJson(payload);
  const state = `${body}.${sign(body, resolveSigningSecret())}`;
  return { state, expectedProviderEnvironment };
}

/**
 * Verify Intuit callback state against the HttpOnly cookie and current server env.
 * Rejects browser-supplied environment fields (they are never read).
 */
export function verifyQboOAuthEnvironmentState(args: {
  stateFromQuery: string | null | undefined;
  stateFromCookie: string | null | undefined;
  /** Ignored if present — must not influence authority. */
  browserEnvironment?: string | null | undefined;
  nowMs?: number;
}): {
  expectedProviderEnvironment: PersistedQboProviderEnvironment;
  payload: QboOAuthEnvironmentStatePayload;
} {
  void args.browserEnvironment; // explicitly ignored

  const state = String(args.stateFromQuery || "");
  const cookie = String(args.stateFromCookie || "");
  if (!state || !cookie || !timingSafeEqualString(state, cookie)) {
    throw new QboOAuthEnvironmentStateError(
      "replay_or_cookie_mismatch",
      "QuickBooks OAuth state does not match server cookie",
    );
  }

  const parts = state.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new QboOAuthEnvironmentStateError(
      "malformed_state",
      "QuickBooks OAuth state is malformed",
    );
  }
  const [body, signature] = parts;
  const expectedSig = sign(body, resolveSigningSecret());
  if (!timingSafeEqualString(signature, expectedSig)) {
    throw new QboOAuthEnvironmentStateError(
      "bad_signature",
      "QuickBooks OAuth state signature is invalid",
    );
  }

  let payload: QboOAuthEnvironmentStatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new QboOAuthEnvironmentStateError(
      "malformed_state",
      "QuickBooks OAuth state payload is malformed",
    );
  }

  if (
    payload?.v !== 1 ||
    typeof payload.nonce !== "string" ||
    !payload.nonce ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    !isPersistedQboProviderEnvironment(payload.expected_provider_environment)
  ) {
    throw new QboOAuthEnvironmentStateError(
      "malformed_state",
      "QuickBooks OAuth state payload is invalid",
    );
  }

  const nowSec = Math.floor((args.nowMs ?? Date.now()) / 1000);
  if (payload.exp < nowSec || payload.iat > nowSec + 60) {
    throw new QboOAuthEnvironmentStateError(
      "expired_state",
      "QuickBooks OAuth state has expired",
    );
  }

  const serverEnv = requireServerQboProviderEnvironment();
  if (payload.expected_provider_environment !== serverEnv) {
    throw new QboOAuthEnvironmentStateError(
      "environment_mismatch",
      "QuickBooks OAuth state environment does not match server configuration",
    );
  }

  return {
    expectedProviderEnvironment: payload.expected_provider_environment,
    payload,
  };
}
