export function redactEngagementLetterPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  for (const key of ["clientName", "matterNumber", "engagementId", "partnerName", "clientContact"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
