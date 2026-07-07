import type { IntakeAttachmentRecord, IntakeMessageRecord } from "@/lib/intake/types";
import {
  rasterFromSeed,
  type PageImage,
} from "@/lib/ap-intake/fingerprint/extractor";

export const BILLS_MIME_ACCEPT = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type BillsMime = (typeof BILLS_MIME_ACCEPT)[number];

export function acceptsBillsMime(mime: string): boolean {
  return (BILLS_MIME_ACCEPT as readonly string[]).includes(mime);
}

export interface BillTextExtractionResult {
  bill_id: string | null;
  mime_type: string | null;
  raw_text: string;
}

export function pickBillAttachment(
  attachments: IntakeAttachmentRecord[],
): IntakeAttachmentRecord | null {
  for (const att of attachments) {
    if (acceptsBillsMime(att.content_type)) return att;
  }
  return null;
}

export function extractBillText(
  message: IntakeMessageRecord,
  attachments: IntakeAttachmentRecord[],
): BillTextExtractionResult {
  const att = pickBillAttachment(attachments);
  const parts: string[] = [];
  if (message.raw_body_text) parts.push(message.raw_body_text);
  if (message.subject) parts.push(message.subject);
  if (att) {
    try {
      const decoded = Buffer.from(att.content_base64, "base64").toString("utf8");
      if (decoded.trim()) parts.push(decoded.slice(0, 8000));
    } catch {
      /* binary attachment */
    }
  }

  return {
    bill_id: null,
    mime_type: att?.content_type ?? null,
    raw_text: parts.join("\n"),
  };
}

export async function renderFirstPageRaster(
  message: IntakeMessageRecord,
  attachments: IntakeAttachmentRecord[],
): Promise<PageImage> {
  const att = pickBillAttachment(attachments);
  const seed = att
    ? `${message.source_message_id}:${att.content_sha256}`
    : `${message.source_message_id}:body`;
  return rasterFromSeed(seed);
}
