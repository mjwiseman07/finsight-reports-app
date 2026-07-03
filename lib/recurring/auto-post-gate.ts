// D5.4 — pure auto-post gate. No DB, no clock, no env, no network.
// Given a template + client context + fire, decide whether to dispatch to
// D5.3's postFire() or hold for review. Evaluation order matters — see
// Phase_D5_4_Build_Spec.md §4.
import type { RecurringFire, RecurringTemplate } from "./types";

/** Minimal client context the gate needs. Decoupled from firm_clients row shape. */
export interface AutoPostClientContext {
  firm_client_id: string;
  recurring_auto_post_enabled: boolean;
  /** "accrual" | "cash" | other future methods. Cash gets its own decision. */
  accounting_method: string;
}

export type GateHoldReason =
  | "fire_not_proposed"
  | "template_not_active"
  | "cash_basis_client"
  | "client_auto_post_disabled"
  | "template_auto_post_off";

export type GateDecision =
  | { action: "dispatch" }
  | { action: "hold"; reason: GateHoldReason };

/**
 * Evaluate the auto-post gate. Short-circuits on first hold reason in this
 * strict order: structural (fire status → template status) then policy
 * (cash-basis → client kill switch → template flag). See §4 of the spec for
 * the rationale. Order is part of the contract and locked by tests.
 */
export function evaluateAutoPostGate(
  template: RecurringTemplate,
  client: AutoPostClientContext,
  fire: RecurringFire,
): GateDecision {
  if (fire.status !== "proposed") {
    return { action: "hold", reason: "fire_not_proposed" };
  }
  if (template.status !== "active") {
    return { action: "hold", reason: "template_not_active" };
  }
  if (client.accounting_method === "cash") {
    return { action: "hold", reason: "cash_basis_client" };
  }
  if (client.recurring_auto_post_enabled !== true) {
    return { action: "hold", reason: "client_auto_post_disabled" };
  }
  if (template.auto_post !== true) {
    return { action: "hold", reason: "template_auto_post_off" };
  }
  return { action: "dispatch" };
}
