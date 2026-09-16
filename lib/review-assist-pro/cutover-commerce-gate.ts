/**
 * Temporary RA Pro commerce cutover gate (gate-only prep) — admission check.
 *
 * Server-controlled only via process env. Never read from client input,
 * Stripe metadata, query params, cookies, or NEXT_PUBLIC_* values.
 * There is no externally supplied "already admitted" bypass; admission is
 * solely the pre-insert check in stripe-sync / create-session.
 *
 * Contract:
 *   RA_PRO_CUTOVER_COMMERCE_GATE=open   → new RA Pro checkout + webhook admission allowed
 *   RA_PRO_CUTOVER_COMMERCE_GATE=closed → new admissions blocked (retryable hold)
 *   missing / malformed / any other value → closed (fail closed)
 *
 * Closure blocks *new* admissions only. It does not cancel work already
 * admitted (ledger row inserted under open). Do not delete ledger rows or
 * throw gate-related retryable errors after insert.
 *
 * Distinct from LAUNCH_GATE_REVIEW_ASSIST_PRO (cookie/token bypass).
 * Do not use the launch-gate bypass path for cutover.
 *
 * Pre-gate builds ignore this env var. Setting it to `closed` does not by
 * itself prove commerce is blocked — verify the gate-aware build is serving
 * checkout/webhook routes (see docs/security/ra-pro-cutover-commerce-gate-prep.md).
 *
 * Schema-compatible: no firm billing-link column, durable webhook lease RPCs,
 * or RA Pro activation RPC.
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

/** True when new RA Pro admissions must not proceed. */
export function isRaProCutoverCommerceClosed(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return resolveRaProCutoverCommerceGate(env) === "closed";
}
