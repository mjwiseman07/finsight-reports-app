/**
 * Gap 3 — record a metadata-only trace of a QBO API call.
 * Deliberately does NOT persist request/response bodies.
 */
import { createServiceClient } from "@/lib/supabase/service";

export interface QboApiTraceInput {
  firm_client_id: string;
  realm_id?: string | null;
  endpoint: string;
  http_method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  http_status?: number | null;
  intuit_tid?: string | null;
  request_id?: string | null;
  latency_ms?: number | null;
  error_code?: string | null;
  error_message?: string | null;
  correlation_id?: string | null;
}

export async function recordQboApiTrace(input: QboApiTraceInput): Promise<void> {
  try {
    const sb = createServiceClient();
    await sb.from("qbo_api_trace").insert({
      firm_client_id: input.firm_client_id,
      realm_id: input.realm_id ?? null,
      endpoint: input.endpoint,
      http_method: input.http_method,
      http_status: input.http_status ?? null,
      intuit_tid: input.intuit_tid ?? null,
      request_id: input.request_id ?? null,
      latency_ms: input.latency_ms ?? null,
      error_code: input.error_code ?? null,
      error_message: input.error_message?.slice(0, 500) ?? null,
      correlation_id: input.correlation_id ?? null,
    });
  } catch (err) {
    console.warn("[qbo.api-trace] insert failed", err);
  }
}
