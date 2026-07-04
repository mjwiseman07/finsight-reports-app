/**
 * D6.4d — Backup packet PDF generator (completes D6.4a stub).
 */
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "je-backup";
const GENERATOR_VERSION = "d6.4d-v1";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 12, color: "#01696F" },
  section: { fontSize: 12, marginTop: 10, marginBottom: 4, color: "#01696F" },
  mono: { fontFamily: "Courier", fontSize: 8 },
});

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

function BackupPacketDoc({
  attemptId,
  firmClientId,
  audit,
  evidence,
  attachments,
}: {
  attemptId: string;
  firmClientId: string;
  audit: Record<string, unknown>;
  evidence: Array<Record<string, unknown>>;
  attachments: Array<Record<string, unknown> & { signedUrl?: string }>;
}) {
  const payload = audit.payload_json ?? {};
  return (
    <Document title={`JE Backup ${attemptId}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>JE Backup Packet</Text>
        <Text>Attempt: {attemptId}</Text>
        <Text>Client: {firmClientId}</Text>
        <Text>Status: {String(audit.status ?? "")}</Text>
        <Text>QBO JE: {String(audit.qbo_je_id ?? "—")}</Text>
        <Text style={styles.section}>Payload</Text>
        <Text style={styles.mono}>{JSON.stringify(payload, null, 2)}</Text>
        <Text style={styles.section}>Line evidence</Text>
        {evidence.length === 0 ? (
          <Text>No line evidence recorded.</Text>
        ) : (
          <>
            {evidence.map((e) => (
              <Text key={String(e.evidence_id)}>
                L{String(e.line_index)}: {String(e.evidence_summary ?? "")}
              </Text>
            ))}
          </>
        )}
        <Text style={styles.section}>Attachments</Text>
        {attachments.length === 0 ? (
          <Text>No attachments.</Text>
        ) : (
          <>
            {attachments.map((a) => (
              <Text key={String(a.attachment_id)}>
                {String(a.original_filename)} — {String(a.signedUrl ?? a.storage_path)}
              </Text>
            ))}
          </>
        )}
      </Page>
    </Document>
  );
}

export async function generateBackupPacket(
  args: GenerateBackupPacketArgs,
): Promise<BackupPacketResult | null> {
  const { db, attemptId, firmClientId } = args;

  const { data: existing } = await db
    .from("je_backup_packets")
    .select("packet_id, storage_path, sha256, byte_size")
    .eq("attempt_id", attemptId)
    .eq("generation_status", "generated")
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return {
      packetId: existing.packet_id as string,
      storagePath: existing.storage_path as string,
      sha256: existing.sha256 as string,
      byteSize: Number(existing.byte_size),
    };
  }

  const { data: audit } = await db
    .from("je_posting_audit")
    .select("*")
    .eq("attempt_id", attemptId)
    .eq("status", "posted")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!audit) return null;

  const [{ data: evidence }, { data: rawAttachments }] = await Promise.all([
    db.from("je_line_evidence").select("*").eq("attempt_id", attemptId).order("line_index"),
    db.from("je_line_attachments").select("*").eq("attempt_id", attemptId),
  ]);

  const attachments = await Promise.all(
    (rawAttachments ?? []).map(async (a) => {
      const bucket = (a.storage_bucket as string) || BUCKET;
      const path = a.storage_path as string;
      const { data } = await db.storage.from(bucket).createSignedUrl(path, 300);
      return { ...a, signedUrl: data?.signedUrl };
    }),
  );

  const buffer = await renderToBuffer(
    <BackupPacketDoc
      attemptId={attemptId}
      firmClientId={firmClientId}
      audit={audit}
      evidence={evidence ?? []}
      attachments={attachments}
    />,
  );
  const pdf = Buffer.from(buffer);
  const sha256 = createHash("sha256").update(pdf).digest("hex");
  const storagePath = `${firmClientId}/${attemptId}/packet-${sha256}.pdf`;

  const { error: uploadErr } = await db.storage.from(BUCKET).upload(storagePath, pdf, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadErr && !uploadErr.message?.includes("already exists")) {
    console.error("[packet-generator] upload failed", uploadErr);
    return null;
  }

  const { data: inserted, error: insErr } = await db
    .from("je_backup_packets")
    .insert({
      attempt_id: attemptId,
      firm_client_id: firmClientId,
      close_period_id: null,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      sha256,
      byte_size: pdf.length,
      generation_status: "generated",
      generator_version: GENERATOR_VERSION,
    })
    .select("packet_id, storage_path, sha256, byte_size")
    .single();

  if (insErr) {
    if (insErr.code === "23505") {
      const { data: row } = await db
        .from("je_backup_packets")
        .select("packet_id, storage_path, sha256, byte_size")
        .eq("attempt_id", attemptId)
        .eq("sha256", sha256)
        .maybeSingle();
      if (row) {
        return {
          packetId: row.packet_id as string,
          storagePath: row.storage_path as string,
          sha256: row.sha256 as string,
          byteSize: Number(row.byte_size),
        };
      }
    }
    console.error("[packet-generator] insert failed", insErr);
    return null;
  }

  return {
    packetId: String(inserted!.packet_id ?? (inserted as { id?: string }).id ?? ""),
    storagePath: inserted!.storage_path as string,
    sha256: inserted!.sha256 as string,
    byteSize: Number(inserted!.byte_size),
  };
}
