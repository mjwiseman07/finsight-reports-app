/**
 * Customer vs internal visibility for the dashboard accounting diagnostics grid.
 *
 * Evidence (preflight, reportDataContext, Accuracy Contract) stays computed.
 * This predicate only controls whether the engineering "Report Source" panel
 * is rendered on the customer dashboard surface.
 *
 * Security: a query parameter alone must never grant visibility.
 * Privileged role AND explicit internal mode are both required.
 * customerView=true always wins (customer simulation must not leak internals).
 */
export function shouldShowAccountingDiagnostics(args: {
  customerViewMode: boolean;
  isPrivilegedRole: boolean;
  explicitInternalMode: boolean;
}): boolean {
  if (args.customerViewMode) return false;
  if (!args.isPrivilegedRole) return false;
  if (!args.explicitInternalMode) return false;
  return true;
}

/** Explicit internal modes that may unlock diagnostics when combined with privilege. */
export function isExplicitAccountingDiagnosticsMode(searchParams: URLSearchParams | { get: (key: string) => string | null }): boolean {
  return (
    searchParams.get("superAdmin") === "true" ||
    searchParams.get("debugAccounting") === "true"
  );
}
