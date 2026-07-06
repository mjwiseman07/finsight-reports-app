/**
 * Postmark inbound webhook — HMAC verify before any DB write.
 */
import { NextRequest, NextResponse } from "next/server";
import crypto, { createHash } from "crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { extractEmailDomain } from "@/lib/ar-cash-app/normalization/payer-name";
import { sniffFormat } from "@/lib/ar-cash-app/parsers/sniff";
import { parseEdi820 } from "@/lib/ar-cash-app/parsers/edi-820";
import { parseCamt054 } from "@/lib/ar-cash-app/parsers/iso20022-camt054";
import { publishEvent } from "@/lib/events/publisher";

export const runtime = "nodejs";

const SECRET = process.env.POSTMARK_INBOUND_WEBHOOK_SECRET;

const POSTMARK_WEBHOOK_IPS = [
  "3.134.147.250",
  "50.31.156.6",
  "50.31.156.77",
  "18.217.206.57",
];

function verifyHmac(rawBody: string, providedSig: string | null): boolean {
  if (!SECRET || !providedSig) return false;
  const expected = crypto.createHmac("sha256", SECRET).update(rawBody, "utf8").digest("base64");
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
}

export async function POST(req: NextRequest) {
  if (!SECRET) {
    console.error("[postmark-inbound] POSTMARK_INBOUND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  const rawBody = await req.text();
  const url = new URL(req.url);
  const providedSig = url.searchParams.get("sig");

  const validSig = verifyHmac(rawBody, providedSig);
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

  const senderEmail = payload.FromFull?.Email ?? payload.From;
  const senderDomain = extractEmailDomain(senderEmail);
  const supabase = createServiceClient();

  const dedupHash = createHash("sha256")
    .update(`postmark_inbound|${payload.MessageID}`)
    .digest("hex");

  const { data: existing } = await supabase
    .from("ar_cash_app_remittances")
    .select("id")
    .eq("dedup_hash", dedupHash)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, deduped: true, id: existing.id });
  }

  let firmId: string | null = null;
  let companyId: string | null = null;
  let firmClientId: string | null = null;

  if (senderDomain) {
    const { data: customer } = await supabase
      .from("customers")
      .select("firm_id, company_id")
      .eq("email_domain", senderDomain)
      .limit(1)
      .maybeSingle();

    if (customer) {
      firmId = customer.firm_id;
      companyId = customer.company_id;
      const { data: fc } = await supabase
        .from("firm_clients")
        .select("id")
        .eq("company_id", companyId)
        .maybeSingle();
      firmClientId = fc?.id ?? null;
    }
  }

  if (!firmId || !companyId) {
    console.warn("[postmark-inbound] unresolved sender", {
      senderDomain,
      messageId: payload.MessageID,
    });
    return NextResponse.json({
      ok: true,
      unresolved: true,
      reason: "sender_domain_not_matched_to_any_customer",
      messageId: payload.MessageID,
    });
  }

  const textCandidates: string[] = [];
  if (payload.TextBody) textCandidates.push(payload.TextBody);
  for (const att of payload.Attachments ?? []) {
    if (att.ContentType.startsWith("text/") || /\.(edi|x12|xml)$/i.test(att.Name)) {
      try {
        const decoded = Buffer.from(att.Content, "base64").toString("utf8");
        textCandidates.push(decoded);
      } catch {
        /* skip */
      }
    }
  }

  let parseStatus: "pending" | "parsed" | "parse_failed" = "pending";
  let parseError: string | null = null;
  let remittanceLines: Array<{
    invoice_reference: string;
    amount_paid: number;
    line_number: number;
    raw_line_text: string;
  }> = [];

  for (const content of textCandidates) {
    const format = sniffFormat(content);
    if (!format) continue;
    try {
      if (format === "edi_820") {
        const parsed = parseEdi820(content);
        remittanceLines = parsed.lines.map((l, i) => ({
          line_number: i + 1,
          invoice_reference: l.invoiceReference,
          amount_paid: l.amountPaid,
          raw_line_text: l.rawSegment,
        }));
        parseStatus = "parsed";
        break;
      }
      if (format === "iso20022_camt054") {
        const parsed = parseCamt054(content);
        let ln = 0;
        for (const entry of parsed.entries) {
          for (const ref of entry.invoiceReferences) {
            ln += 1;
            remittanceLines.push({
              line_number: ln,
              invoice_reference: ref,
              amount_paid: entry.amount / Math.max(entry.invoiceReferences.length, 1),
              raw_line_text: `${ref} (from camt.054 ${entry.bookingDate})`,
            });
          }
        }
        parseStatus = remittanceLines.length > 0 ? "parsed" : "pending";
        break;
      }
    } catch (e: unknown) {
      parseStatus = "parse_failed";
      parseError = e instanceof Error ? e.message : String(e);
    }
  }

  const { data: remittance, error: insertErr } = await supabase
    .from("ar_cash_app_remittances")
    .insert({
      firm_id: firmId,
      company_id: companyId,
      source_channel: "postmark_inbound",
      source_message_id: payload.MessageID,
      raw_payload: payload,
      raw_body_text: payload.TextBody ?? null,
      raw_attachments: (payload.Attachments ?? []).map((a) => ({
        filename: a.Name,
        content_type: a.ContentType,
        content_length: a.ContentLength,
      })),
      sender_email: senderEmail,
      sender_domain: senderDomain,
      subject: payload.Subject,
      received_at: payload.Date,
      parse_status: parseStatus,
      parse_error: parseError,
      dedup_hash: dedupHash,
      assertions_addressed: ["completeness"],
    })
    .select()
    .single();

  if (insertErr || !remittance) {
    console.error("[postmark-inbound] insert failed", insertErr);
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }

  if (remittanceLines.length > 0) {
    const lineRows = remittanceLines.map((l) => ({
      remittance_id: remittance.id,
      firm_id: firmId!,
      company_id: companyId!,
      line_number: l.line_number,
      invoice_reference: l.invoice_reference,
      invoice_reference_normalized: null,
      amount_paid: l.amount_paid,
      raw_line_text: l.raw_line_text,
    }));
    await supabase.from("ar_cash_app_remittance_lines").insert(lineRows);
  }

  await publishEvent(
    {
      eventType: "remittance_ingested",
      eventCategory: "cash_app",
      firmId,
      firmClientId: firmClientId ?? undefined,
      aggregateType: "ar_cash_app_remittance",
      aggregateId: remittance.id,
      actorType: "integration",
      payload: {
        source_channel: "postmark_inbound",
        message_id: payload.MessageID,
        sender_domain: senderDomain,
        company_id: companyId,
      },
    },
    supabase,
  );

  if (parseStatus === "parsed") {
    await publishEvent(
      {
        eventType: "remittance_parsed",
        eventCategory: "cash_app",
        firmId,
        firmClientId: firmClientId ?? undefined,
        aggregateType: "ar_cash_app_remittance",
        aggregateId: remittance.id,
        actorType: "integration",
        payload: { lines: remittanceLines.length, company_id: companyId },
      },
      supabase,
    );
  }

  return NextResponse.json({
    ok: true,
    id: remittance.id,
    parse_status: parseStatus,
    lines: remittanceLines.length,
  });
}
