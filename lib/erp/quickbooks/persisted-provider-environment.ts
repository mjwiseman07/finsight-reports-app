/**
 * Durable QBO grant environment persisted on accounting_connections at OAuth time.
 * Distinct from runtime QB_ENVIRONMENT host selection for individual API calls.
 */

export type PersistedQboProviderEnvironment = "sandbox" | "production";

export function resolvePersistedQboProviderEnvironment(
  envValue: string | undefined = process.env.QB_ENVIRONMENT,
): PersistedQboProviderEnvironment {
  const env = String(envValue || "").trim().toLowerCase();
  if (env === "production") return "production";
  if (env === "sandbox") return "sandbox";
  throw new Error(
    "QB_ENVIRONMENT must be sandbox or production to persist QBO provider_environment.",
  );
}

export function isPersistedQboProviderEnvironment(
  value: unknown,
): value is PersistedQboProviderEnvironment {
  return value === "sandbox" || value === "production";
}
