export function humanContext(path: string | null): string {
  if (!path) return "using Advisacor";
  if (path.startsWith("/dashboard/reports") || path.startsWith("/reports")) return "generating a report";
  if (path.startsWith("/dashboard/reviewer") || path.startsWith("/reviewer")) return "running a review";
  if (path.startsWith("/dashboard")) return "on your dashboard";
  if (path.startsWith("/onboarding")) return "setting up Advisacor";
  if (path.startsWith("/pulse")) return "chatting with Ask Pulse";
  if (path.startsWith("/support")) return "in the support area";
  return "using Advisacor";
}

export function humanNameForSignalKind(kind: string): string {
  switch (kind) {
    case "qbo_connection_expired":
      return "Your QuickBooks connection needs a refresh";
    case "qbo_connection_disconnected":
      return "Your QuickBooks connection is disconnected";
    case "qbo_connection_missing":
      return "You don't have QuickBooks connected yet";
    case "cdc_stalled":
      return "Your data sync is stuck";
    case "recent_api_error":
      return "There were some errors on your account recently";
    case "recent_auto_filed_ticket":
      return "We already filed a ticket for a related issue";
    case "referrer_context":
      return "You came here from a specific page";
    default:
      return kind;
  }
}
