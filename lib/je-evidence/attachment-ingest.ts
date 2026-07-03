// D6.4a: Attachment ingestion. Stubbed — full ingestion lands in D6.4b/c/d
// as composers start passing PendingAttachmentHint objects. This stub records
// the intent so D6.4a can ship without depending on QBO Attachable fetch.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PendingAttachmentHint } from "./types";

export interface IngestAttachmentsArgs {
  db: SupabaseClient;
  evidenceId: string;
  attemptId: string;
  firmClientId: string;
  lineIndex: number;
  hints: PendingAttachmentHint[];
}

export async function ingestPendingAttachments(_args: IngestAttachmentsArgs): Promise<void> {
  // TODO(D6.4b/c): implement per-source ingestion:
  //   qbo_attachable       -> fetch via QBO Attachable API, upload to storage
  //   plaid_statement_pdf  -> fetch signed URL, upload to storage
  //   ocr_upload           -> already in storage upload bucket, move to je-backup
  //   manual_upload        -> already in storage upload bucket, move to je-backup
  //   system_generated     -> compose (e.g. calculation worksheet) and upload
  // For now: no-op. Composers can pass hints; they're validated by the type
  // system but not persisted. This is intentional and documented.
  return;
}
