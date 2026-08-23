/**
 * JE-3D — Sandbox-only QuickBooks environment enforcement.
 * Missing, invalid, and production QB_ENVIRONMENT values fail closed.
 */

import { resolveGovernedQboWriteApiBase } from "./provider-qbo-create-transport";
import {
  JE_3D_ACTIVATION_ERROR,
  JE_3D_SANDBOX_QBO_API_BASE,
  Je3dActivationError,
} from "./je3d-activation-policy";

export type QbEnvironmentClassification =
  | { ok: true; environment: "sandbox"; apiBase: typeof JE_3D_SANDBOX_QBO_API_BASE }
  | { ok: false; code: string; message: string };

export function classifyQbEnvironment(
  envValue: string | undefined = process.env.QB_ENVIRONMENT,
): QbEnvironmentClassification {
  const env = typeof envValue === "string" ? envValue.trim() : "";
  if (!env) {
    return {
      ok: false,
      code: JE_3D_ACTIVATION_ERROR.SANDBOX_ENV_REQUIRED,
      message: "QB_ENVIRONMENT is required for controlled sandbox activation.",
    };
  }
  if (env === "production") {
    return {
      ok: false,
      code: JE_3D_ACTIVATION_ERROR.PRODUCTION_ENV_FORBIDDEN,
      message:
        "Controlled sandbox activation cannot run with QB_ENVIRONMENT=production.",
    };
  }
  if (env !== "sandbox") {
    return {
      ok: false,
      code: JE_3D_ACTIVATION_ERROR.INVALID_QB_ENVIRONMENT,
      message: `QB_ENVIRONMENT invalid for controlled sandbox activation: ${env}`,
    };
  }
  let apiBase: string;
  try {
    apiBase = resolveGovernedQboWriteApiBase(env);
  } catch (err) {
    return {
      ok: false,
      code: JE_3D_ACTIVATION_ERROR.INVALID_QB_ENVIRONMENT,
      message:
        err instanceof Error ? err.message : "Invalid QB_ENVIRONMENT for governed QBO.",
    };
  }
  if (apiBase !== JE_3D_SANDBOX_QBO_API_BASE) {
    return {
      ok: false,
      code: JE_3D_ACTIVATION_ERROR.PRODUCTION_ENV_FORBIDDEN,
      message: `Governed API base must be sandbox; got ${apiBase}`,
    };
  }
  return { ok: true, environment: "sandbox", apiBase: JE_3D_SANDBOX_QBO_API_BASE };
}

export function assertJe3dSandboxQboEnvironment(
  envValue?: string,
): typeof JE_3D_SANDBOX_QBO_API_BASE {
  const classified = classifyQbEnvironment(envValue);
  if (!classified.ok) {
    throw new Je3dActivationError(classified.code, classified.message);
  }
  return classified.apiBase;
}

export function rejectCallerTransportOverrides(input: {
  callerRealmId?: string;
  callerConnectionId?: string;
  callerProviderId?: string;
  callerAccessToken?: string;
  callerApiHost?: string;
  callerCompanyId?: string;
}): void {
  const forbidden = [
    input.callerRealmId,
    input.callerConnectionId,
    input.callerProviderId,
    input.callerAccessToken,
    input.callerApiHost,
    input.callerCompanyId,
  ].some((v) => v != null && String(v).trim() !== "");
  if (forbidden) {
    throw new Je3dActivationError(
      JE_3D_ACTIVATION_ERROR.CALLER_OVERRIDE_FORBIDDEN,
      "Caller-supplied realm, connection, company, provider ID, token, or API host overrides are forbidden.",
    );
  }
}
