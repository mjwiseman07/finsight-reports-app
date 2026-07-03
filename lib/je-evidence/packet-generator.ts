// D6.4a: Backup packet PDF generator. Stubbed — full implementation lands in D6.4d
// as the review UI comes online. This stub records the intent and reserves the
// interface so the D2 post-success hook can wire the fire-and-forget call.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface GenerateBackupPacketArgs {
  db: SupabaseClient;
  attemptId: string;
  firmClientId: string;
}

export interface BackupPacketResult {
  packetId: string;
  storagePath: string;
  sha256: string;
  byteSize: number;
}

export async function generateBackupPacket(
  _args: GenerateBackupPacketArgs,
): Promise<BackupPacketResult | null> {
  // TODO(D6.4d): implement PDF composition with @react-pdf/renderer:
  //   1. Load je_posting_audit row -> payload_json (Dr/Cr lines)
  //   2. Load je_line_evidence rows by attempt_id
  //   3. Load je_line_attachments (storage signed URLs)
  //   4. Render cover page + line table + evidence detail + appendix
  //   5. Compute sha256, upload to storage.je-backup at
  //      {firm_client_id}/{attempt_id}/packet-{sha256}.pdf
  //   6. INSERT into je_backup_packets
  // For now: no-op. D2 post-success dispatcher may call this; nulls are safe.
  return null;
}
