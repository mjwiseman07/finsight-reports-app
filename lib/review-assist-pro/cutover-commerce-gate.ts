/**
 * Temporary RA Pro commerce/activation cutover gate.
 *
 * Server-controlled only via process env. Never read from client input,
 * Stripe metadata, query params, cookies, or NEXT_PUBLIC_* values.
 *
 * Contract:
 *   RA_PRO_CUTOVER_COMMERCE_GATE=open   → checkout + activation allowed
 *   RA_PRO_CUTOVER_COMMERCE_GATE=closed → checkout blocked; RA Pro webhooks held retryable
 *   missing / malformed / any other value → closed (fail closed)
 *
 * This is distinct from LAUNCH_GATE_REVIEW_ASSIST_PRO (cookie/token bypass).
 * Do not use the launch-gate bypass path for cutover.
 *
 * Pre-gate builds ignore this env var. Setting it to `closed` does not by
 * itself prove commerce is blocked; see docs/security/ra-pro-cutover-runbook.md.
 */
export const RA_PRO_CUTOVER_COMMERCE_GATE_ENV = "RA_PRO_CUTOVER_COMMERCE_GATE";

export type RaProCutoverCommerceGateState = "open" | "closed";

export const RA_PRO_CUTOVER_COMMERCE_GATED_CODE = "ra_pro_cutover_commerce_gated";

/** Resolve an explicit raw value (no env fallback). */
export function resolveRaProCutoverCommerceGateValue(
  raw: string | undefined | null,
): RaProCutoverCommerceGateState {
  const v = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (v === "open") return "open";
  return "closed";
}

/** Resolve from server process env only. */
export function resolveRaProCutoverCommerceGate(
  env: Record<string, string | undefined> = process.env,
): RaProCutoverCommerceGateState {
  return resolveRaProCutoverCommerceGateValue(env[RA_PRO_CUTOVER_COMMERCE_GATE_ENV]);
}

/** True when RA Pro checkout/activation must not proceed. */
export function isRaProCutoverCommerceClosed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return resolveRaProCutoverCommerceGate(env) === "closed";
}
