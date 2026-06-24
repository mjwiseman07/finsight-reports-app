/** Phase 38 transport bundle — injected at execution boundary only. */

export interface Phase38Transports {
  readonly emailSend: ((payload: Record<string, unknown>) => Promise<void>) | null;
  readonly fileFetch: ((ref: string) => Promise<unknown>) | null;
  readonly apiCall: ((endpoint: string, payload: Record<string, unknown>) => Promise<unknown>) | null;
}
