import type { SupabaseClient } from "@supabase/supabase-js";

export interface IntakeMessageRecord {
  id: string;
  firm_id: string | null;
  company_id: string | null;
  firm_client_id: string | null;
  source_channel: string;
  source_message_id: string;
  recipient_address: string | null;
  recipient_prefix: string | null;
  recipient_firm_slug: string | null;
  recipient_token: string | null;
  sender_email: string | null;
  sender_domain: string | null;
  subject: string | null;
  received_at: string;
  raw_body_text: string | null;
  raw_body_html: string | null;
  raw_headers: unknown;
  raw_payload: unknown;
  content_hash: string;
}

export interface IntakeAttachmentRecord {
  id: string;
  filename: string;
  content_type: string;
  content_length: number;
  content_sha256: string;
  content_base64: string;
  is_duplicate_of: string | null;
}

export interface IntakeHandlerContext {
  supabase: SupabaseClient;
  message: IntakeMessageRecord & { firm_id: string; company_id: string };
  attachments: IntakeAttachmentRecord[];
}

export type IntakeHandlerOutcome =
  | { status: "success"; detail: Record<string, unknown> }
  | { status: "failed"; error: string; detail?: Record<string, unknown> }
  | { status: "skipped_not_applicable"; reason: string };

export interface IntakeHandler {
  readonly key: string;
  readonly requiredEntitlement: string | null;
  handle(ctx: IntakeHandlerContext): Promise<IntakeHandlerOutcome>;
}
