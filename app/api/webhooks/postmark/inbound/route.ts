/**
 * Postmark inbound webhook — universal intake entrypoint.
 * HMAC + IP verify, ingest into intake_messages, dispatch to handler bus.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto, { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { extractEmailDomain } from "@/lib/ar-cash-app/normalization/payer-name";
import { parseIntakeAddress } from "@/lib/intake/address";
import { dispatchMessage } from "@/lib/intake/dispatch";
import { publishEvent } from "@/lib/events/publisher";
import type { IntakeMessageRecord, IntakeAttachmentRecord } from "@/lib/intake/types";

export const runtime = "nodejs";

const POSTMARK_WEBHOOK_IPS = [
  "3.134.147.250",
  "50.31.156.6",
  "50.31.156.77",
  "18.217.206.57",
];

function verifyHmac(rawBody: string, providedSig: string | null, secret: string | undefined): boolean {
  if (!secret || !providedSig) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(providedSig);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isPostmarkIp(req: NextRequest): boolean {
  const xff = req.headers.get("x-forwarded-for") || "";
  const clientIp = xff.split(",")[0].trim();
  return POSTMARK_WEBHOOK_IPS.includes(clientIp);
}

interface PostmarkInboundPayload {
  MessageID: string;
  From: string;
  FromFull?: { Email: string; Name?: string };
  Subject: string;
  TextBody?: string;
  HtmlBody?: string;
  Date: string;
  MailboxHash?: string;
  Attachments?: Array<{
    Name: string;
    Content: string;
    ContentType: string;
    ContentLength: number;
    ContentID?: string;
  }>;
  Headers?: Array<{ Name: string; Value: string }>;
  OriginalRecipient?: string;
  To?: string;
  ToFull?: Array<{ Email: string; Name?: string }>;
}

export async function POST(req: NextRequest) {
  const secret = process.env.POSTMARK_INBOUND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[postmark-inbound] POSTMARK_INBOUND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const url = new URL(req.url);
  const providedSig = url.searchParams.get("sig");

  const validSig = verifyHmac(rawBody, providedSig, secret);
  const validIp = isPostmarkIp(req);
  if (!validSig && !validIp) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = JSON.parse(rawBody) as PostmarkInboundPayload;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const senderEmail = payload.FromFull?.Email ?? payload.From;
  const senderDomain = extractEmailDomain(senderEmail);
  const recipientAddress =
    payload.OriginalRecipient ?? payload.ToFull?.[0]?.Email ?? payload.To ?? null;
  const parsedAddress = recipientAddress ? parseIntakeAddress(recipientAddress) : null;

  const dedupKey = `postmark_inbound|${payload.MessageID}`;

  const attachmentDigests: Array<{
    filename: string;
    content_type: string;
    content_length: number;
    content_sha256: string;
    content_base64: string;
  }> = [];

  for (const att of payload.Attachments ?? []) {
    const buf = Buffer.from(att.Content, "base64");
    const sha = createHash("sha256").update(buf).digest("hex");
    attachmentDigests.push({
      filename: att.Name,
      content_type: att.ContentType,
      content_length: att.ContentLength,
      content_sha256: sha,
      content_base64: att.Content,
    });
  }

  const contentHash = createHash("sha256")
    .update(
      JSON.stringify({
        subject: payload.Subject ?? "",
        text: payload.TextBody ?? "",
        html: payload.HtmlBody ?? "",
        attachments: attachmentDigests.map((a) => a.content_sha256).sort(),
      }),
    )
    .digest("hex");

  const { data: existing } = await supabase
    .from("intake_messages")
    .select("id, dispatch_status")
    .eq("dedup_key", dedupKey)
    .maybeSingle();

  if (existing) {
    await publishEvent(
      {
        eventType: "intake_message_deduped",
        eventCategory: "intake",
        aggregateType: "intake_message",
        aggregateId: existing.id,
        actorType: "integration",
        payload: { dedup_key: dedupKey, reason: "message_id_seen" },
      },
      supabase,
    );
    return NextResponse.json({
      ok: true,
      deduped: true,
      intake_message_id: existing.id,
      previous_status: existing.dispatch_status,
    });
  }

  let isDuplicate = false;
  let duplicateOf: string | null = null;
  const { data: contentMatch } = await supabase
    .from("intake_messages")
    .select("id")
    .eq("content_hash", contentHash)
    .limit(1)
    .maybeSingle();
  if (contentMatch) {
    isDuplicate = true;
    duplicateOf = contentMatch.id;
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("intake_messages")
    .insert({
      source_channel: "postmark_inbound",
      source_message_id: payload.MessageID,
      recipient_address: recipientAddress,
      recipient_prefix: parsedAddress?.prefix ?? null,
      recipient_firm_slug: parsedAddress?.firmSlug ?? null,
      recipient_token: parsedAddress?.token ?? null,
      sender_email: senderEmail,
      sender_domain: senderDomain,
      subject: payload.Subject,
      received_at: payload.Date,
      raw_body_text: payload.TextBody ?? null,
      raw_body_html: payload.HtmlBody ?? null,
      raw_headers: payload.Headers ?? null,
      raw_payload: payload,
      content_hash: contentHash,
      dedup_key: dedupKey,
      is_duplicate: isDuplicate,
      duplicate_of: duplicateOf,
    })
    .select()
    .single();

  if (insertErr || !inserted) {
    console.error("[postmark-inbound] intake insert failed", insertErr);
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }

  const attachmentRows: IntakeAttachmentRecord[] = [];
  for (const d of attachmentDigests) {
    const { data: attRow, error: attErr } = await supabase
      .from("intake_attachments")
      .insert({
        intake_message_id: inserted.id,
        filename: d.filename,
        content_type: d.content_type,
        content_length: d.content_length,
        content_sha256: d.content_sha256,
        content_base64: d.content_base64,
      })
      .select()
      .single();
    if (attErr || !attRow) continue;
    attachmentRows.push(attRow as IntakeAttachmentRecord);
  }

  await publishEvent(
    {
      eventType: "intake_message_received",
      eventCategory: "intake",
      aggregateType: "intake_message",
      aggregateId: inserted.id,
      actorType: "integration",
      payload: {
        source_channel: "postmark_inbound",
        message_id: payload.MessageID,
        recipient_prefix: parsedAddress?.prefix ?? null,
        recipient_firm_slug: parsedAddress?.firmSlug ?? null,
        sender_domain: senderDomain,
        content_hash: contentHash,
        is_duplicate: isDuplicate,
      },
    },
    supabase,
  );

  const dispatchResult = await dispatchMessage(
    supabase,
    inserted as IntakeMessageRecord,
    attachmentRows,
  );

  return NextResponse.json({
    ok: true,
    intake_message_id: inserted.id,
    handler_key: dispatchResult.handlerKey,
    outcome: dispatchResult.outcome,
    detail: dispatchResult.detail,
    is_duplicate: isDuplicate,
  });
}
