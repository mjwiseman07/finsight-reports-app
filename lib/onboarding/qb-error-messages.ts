// lib/onboarding/qb-error-messages.ts
//
// Phase TCP1 W3 — QuickBooks OAuth error codes surfaced to /onboarding as
// ?qbError=<code>. Keep codes short + stable — they appear in URLs and
// analytics. Copy is user-facing.

export type QbErrorCode =
  | "intuit_denied"
  | "state_mismatch"
  | "missing_callback_values"
  | "missing_admin_client"
  | "invalid_supabase_token"
  | "token_exchange_failed"
  | "connection_save_failed"
  | "unknown";

export interface QbErrorCopy {
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
}

export function qbErrorCopy(code: string | null | undefined): QbErrorCopy {
  const normalized = (code || "unknown") as QbErrorCode;
  switch (normalized) {
    case "intuit_denied":
      return {
        title: "QuickBooks authorization was declined",
        body:
          "You cancelled the QuickBooks authorization prompt or Intuit reported an error. " +
          "You can start the connection again — nothing was saved.",
        actionLabel: "Try connecting again",
        actionHref: "/onboarding?step=connect-accounting&provider=quickbooks",
      };
    case "state_mismatch":
      return {
        title: "Your QuickBooks connection session expired",
        body:
          "For security, the QuickBooks connection has a 10-minute window. " +
          "Please start the connection again from your onboarding.",
        actionLabel: "Start connection again",
        actionHref: "/onboarding?step=connect-accounting&provider=quickbooks",
      };
    case "missing_callback_values":
      return {
        title: "QuickBooks returned incomplete authorization data",
        body:
          "Intuit's response was missing required values. This is usually temporary — " +
          "please try connecting again.",
        actionLabel: "Try again",
        actionHref: "/onboarding?step=connect-accounting&provider=quickbooks",
      };
    case "missing_admin_client":
      return {
        title: "Advisacor is temporarily unable to process QuickBooks connections",
        body:
          "Our team has been notified. Please try again in a few minutes, or contact " +
          "support if this persists.",
        actionLabel: "Contact support",
        actionHref: "/support",
      };
    case "invalid_supabase_token":
      return {
        title: "Your Advisacor session expired during QuickBooks connect",
        body:
          "Please sign in again and restart the QuickBooks connection from onboarding.",
        actionLabel: "Sign in",
        actionHref: "/signin?returnTo=/onboarding",
      };
    case "token_exchange_failed":
      return {
        title: "QuickBooks token exchange failed",
        body:
          "Intuit rejected our token exchange. This typically means the connection was " +
          "cancelled, expired, or the QuickBooks environment is misconfigured. " +
          "Please try connecting again.",
        actionLabel: "Try again",
        actionHref: "/onboarding?step=connect-accounting&provider=quickbooks",
      };
    case "connection_save_failed":
      return {
        title: "Your QuickBooks connection could not be saved",
        body:
          "Intuit authorized the connection but Advisacor could not persist it. " +
          "Our team has been notified. Please try again or contact support.",
        actionLabel: "Contact support",
        actionHref: "/support",
      };
    default:
      return {
        title: "QuickBooks connection failed",
        body:
          "Something went wrong connecting QuickBooks. Please try again, and if the " +
          "problem persists contact support.",
        actionLabel: "Try again",
        actionHref: "/onboarding?step=connect-accounting&provider=quickbooks",
      };
  }
}
