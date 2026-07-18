/**
 * Phase Q7 — QBO edition + capability matrix (Issue #7).
 *
 * Single source of truth for what a given QBO edition can do. Fail-closed:
 * unknown/NULL edition is treated as simple_start (most restricted).
 *
 * Sources:
 *   - Edition detection via CompanyInfo.NameValue[OfferingSku]
 *     https://developer.intuit.com/app/developer/qbo/docs/workflows/manage-business-units
 *   - Subscription status via CompanyInfo.SubscriptionStatus
 *     https://developer.intuit.com/app/developer/qbo/docs/develop/troubleshooting/subscription-states
 *   - Feature availability per edition
 *     https://quickbooks.intuit.com/subscription/
 *     https://quickbooks.intuit.com/accounting/advanced-features/
 */

export type QboEdition = "simple_start" | "essentials" | "plus" | "advanced";

export type QboSubscriptionStatus =
  | "trial"
  | "trialoptin"
  | "subscribed"
  | "expired"
  | "restricted"
  | "suspended"
  | "cancelled"
  | "unknown";

export type QboCapability =
  | "journal_entry_write"
  | "multicurrency"
  | "classes"
  | "locations"
  | "budgets_read"
  | "purchase_orders"
  | "inventory"
  | "custom_fields";

export const QBO_EDITION_CAPABILITIES: Record<QboEdition, Record<QboCapability, boolean>> = {
  simple_start: {
    journal_entry_write: true,
    multicurrency: false,
    classes: false,
    locations: false,
    budgets_read: false,
    purchase_orders: false,
    inventory: false,
    custom_fields: false,
  },
  essentials: {
    journal_entry_write: true,
    multicurrency: true,
    classes: false,
    locations: false,
    budgets_read: false,
    purchase_orders: false,
    inventory: false,
    custom_fields: false,
  },
  plus: {
    journal_entry_write: true,
    multicurrency: true,
    classes: true,
    locations: true,
    budgets_read: true,
    purchase_orders: true,
    inventory: true,
    custom_fields: true,
  },
  advanced: {
    journal_entry_write: true,
    multicurrency: true,
    classes: true,
    locations: true,
    budgets_read: true,
    purchase_orders: true,
    inventory: true,
    custom_fields: true,
  },
};

/**
 * Strict-match parse of Intuit's OfferingSku string.
 * Anything not matching one of the four supported editions → null (caller
 * fails closed to simple_start).
 */
export function parseOfferingSku(sku: string | null | undefined): QboEdition | null {
  if (!sku || typeof sku !== "string") return null;
  const normalized = sku.trim().toLowerCase();
  if (normalized === "quickbooks online simple start") return "simple_start";
  if (normalized === "quickbooks online essentials") return "essentials";
  if (normalized === "quickbooks online plus") return "plus";
  if (normalized === "quickbooks online advanced") return "advanced";
  return null;
}

/**
 * Normalize Intuit's SubscriptionStatus enum. Unknown values (or NULL) →
 * "unknown", which is read-only per Intuit.
 */
export function parseSubscriptionStatus(
  status: string | null | undefined,
): QboSubscriptionStatus {
  if (!status || typeof status !== "string") return "unknown";
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "trial":
    case "trialoptin":
    case "subscribed":
    case "expired":
    case "restricted":
    case "suspended":
    case "cancelled":
      return normalized as QboSubscriptionStatus;
    default:
      return "unknown";
  }
}

/**
 * Per Intuit doc, only TRIAL/TRIALOPTIN/SUBSCRIBED permit writes. Everything
 * else (including unknown) is read-only.
 */
export function subscriptionAllowsWrites(status: QboSubscriptionStatus): boolean {
  return status === "trial" || status === "trialoptin" || status === "subscribed";
}

/**
 * Fail-closed capability check. NULL edition → treated as simple_start.
 */
export function capabilityForEdition(
  edition: QboEdition | null | undefined,
  capability: QboCapability,
): boolean {
  const resolved: QboEdition = edition ?? "simple_start";
  return QBO_EDITION_CAPABILITIES[resolved][capability] === true;
}
