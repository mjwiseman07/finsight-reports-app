export interface AuditChannelHandler {
  channel: string;
  status: string;
  invoke: () => { status: string };
}

export interface AuditChannelInvocationResult {
  status: string;
  applicability?: "APPLICABLE" | "NOT_APPLICABLE_BY_DESIGN";
}
