export const ERROR_CLASS = {
  QBO_AUTH_TOKEN_EXPIRED: "qbo.auth.token_expired",
  QBO_AUTH_DISCONNECTED: "qbo.auth.disconnected",
  QBO_AUTH_SCOPE_INSUFFICIENT: "qbo.auth.scope_insufficient",
  QBO_RATE_LIMIT: "qbo.rate_limit",
  QBO_READ_VALIDATION: "qbo.read.validation",
  QBO_WRITE_VALIDATION: "qbo.write.validation",
  QBO_WRITE_READONLY_SUBSCRIPTION: "qbo.write.subscription_readonly",
  QBO_WRITE_CONCURRENCY: "qbo.write.concurrency",
  QBO_UNAVAILABLE: "qbo.unavailable",
  CDC_STALLED: "cdc.stalled",
  CDC_FAILED: "cdc.failed",
  INTERNAL_UNCAUGHT: "internal.uncaught",
  INTERNAL_TIMEOUT: "internal.timeout",
  INTERNAL_DB_ERROR: "internal.db_error",
  BEDROCK_UNAVAILABLE: "bedrock.unavailable",
  STRIPE_ERROR: "stripe.error",
  UNKNOWN: "unknown",
} as const;

export type ErrorClass = (typeof ERROR_CLASS)[keyof typeof ERROR_CLASS];

export function humanNameForErrorClass(errorClass: string): string {
  switch (errorClass) {
    case ERROR_CLASS.QBO_AUTH_TOKEN_EXPIRED:
      return "your QuickBooks connection needing to be refreshed";
    case ERROR_CLASS.QBO_AUTH_DISCONNECTED:
      return "your QuickBooks connection being disconnected";
    case ERROR_CLASS.QBO_AUTH_SCOPE_INSUFFICIENT:
      return "missing permissions on your QuickBooks connection";
    case ERROR_CLASS.QBO_RATE_LIMIT:
      return "QuickBooks slowing us down temporarily";
    case ERROR_CLASS.QBO_WRITE_READONLY_SUBSCRIPTION:
      return "your QuickBooks subscription being in read-only mode";
    case ERROR_CLASS.QBO_WRITE_VALIDATION:
      return "QuickBooks rejecting a change we tried to make";
    case ERROR_CLASS.QBO_READ_VALIDATION:
      return "QuickBooks rejecting a request we made";
    case ERROR_CLASS.QBO_WRITE_CONCURRENCY:
      return "a data conflict with QuickBooks";
    case ERROR_CLASS.QBO_UNAVAILABLE:
      return "QuickBooks being temporarily unavailable";
    case ERROR_CLASS.CDC_STALLED:
      return "your data sync getting stuck";
    case ERROR_CLASS.CDC_FAILED:
      return "your data sync failing";
    case ERROR_CLASS.INTERNAL_UNCAUGHT:
      return "an unexpected error in Advisacor";
    case ERROR_CLASS.INTERNAL_TIMEOUT:
      return "an operation taking too long";
    case ERROR_CLASS.INTERNAL_DB_ERROR:
      return "a database issue";
    case ERROR_CLASS.BEDROCK_UNAVAILABLE:
      return "our AI assistant being temporarily unavailable";
    case ERROR_CLASS.STRIPE_ERROR:
      return "a billing issue";
    default:
      return "an issue";
  }
}

export function adaptiveDedupWindowMinutes(errorClass: string): number {
  if (errorClass.startsWith("qbo.auth")) return 60;
  if (errorClass === ERROR_CLASS.QBO_RATE_LIMIT) return 120;
  if (errorClass.startsWith("qbo.write")) return 5;
  if (errorClass === ERROR_CLASS.CDC_STALLED || errorClass === ERROR_CLASS.CDC_FAILED) return 240;
  if (errorClass === ERROR_CLASS.INTERNAL_UNCAUGHT) return 15;
  return 15;
}
