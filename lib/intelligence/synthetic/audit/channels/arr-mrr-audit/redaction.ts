export function redactArrMrrPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  for (const key of ["customerName", "tenantId", "subscriptionId", "customerId", "rollupId"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
