export function redactPOCProgressPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const redacted = { ...payload };
  for (const key of ["customerName", "contractNumber", "projectName", "ownerName"]) {
    if (key in redacted) redacted[key] = "[REDACTED]";
  }
  return redacted;
}
