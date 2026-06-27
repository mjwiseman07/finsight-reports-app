export interface AuditChannelHandler {
  channel: string;
  status: string;
  invoke: () => { status: string };
}
