import { createHash } from "crypto";
import { sniffFormat } from "@/lib/ar-cash-app/parsers/sniff";
import { parseEdi820 } from "@/lib/ar-cash-app/parsers/edi-820";
import { parseCamt054 } from "@/lib/ar-cash-app/parsers/iso20022-camt054";
import { publishEvent } from "@/lib/events/publisher";
import type {
  IntakeHandler,
  IntakeHandlerContext,
  IntakeHandlerOutcome,
} from "../types";

async function handle(ctx: IntakeHandlerContext): Promise<IntakeHandlerOutcome> {
  const { supabase, message, attachments } = ctx;

  const dedupHash = createHash("sha256")
    .update(`intake|${message.source_message_id}`)
    .digest("hex");

  const { data: existing } = await supabase
    .from("ar_cash_app_remittances")
    .select("id")
    .eq("dedup_hash", dedupHash)
    .maybeSingle();

  if (existing) {
    return { status: "success", detail: { deduped: true, remittance_id: existing.id } };
  }

  const textCandidates: string[] = [];
  if (message.raw_body_text) textCandidates.push(message.raw_body_text);
  for (const att of attachments) {
    if (att.content_type.startsWith("text/") || /\.(edi|x12|xml)$/i.test(att.filename)) {
      try {
        const decoded = Buffer.from(att.content_base64, "base64").toString("utf8");
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
      firm_id: message.firm_id,
      company_id: message.company_id,
      intake_message_id: message.id,
      source_channel: message.source_channel,
      source_message_id: message.source_message_id,
      raw_payload: message.raw_payload,
      raw_body_text: message.raw_body_text,
      raw_attachments: attachments.map((a) => ({
        filename: a.filename,
        content_type: a.content_type,
        content_length: a.content_length,
      })),
      sender_email: message.sender_email,
      sender_domain: message.sender_domain,
      subject: message.subject,
      received_at: message.received_at,
      parse_status: parseStatus,
      parse_error: parseError,
      dedup_hash: dedupHash,
      assertions_addressed: ["completeness"],
    })
    .select()
    .single();

  if (insertErr || !remittance) {
    return {
      status: "failed",
      error: insertErr?.message ?? "remittance insert failed",
    };
  }

  if (remittanceLines.length > 0) {
    const lineRows = remittanceLines.map((l) => ({
      remittance_id: remittance.id,
      firm_id: message.firm_id,
      company_id: message.company_id,
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
      firmId: message.firm_id,
      firmClientId: message.firm_client_id ?? undefined,
      aggregateType: "ar_cash_app_remittance",
      aggregateId: remittance.id,
      actorType: "integration",
      payload: {
        source_channel: message.source_channel,
        message_id: message.source_message_id,
        sender_domain: message.sender_domain,
        company_id: message.company_id,
        intake_message_id: message.id,
      },
    },
    supabase,
  );

  if (parseStatus === "parsed") {
    await publishEvent(
      {
        eventType: "remittance_parsed",
        eventCategory: "cash_app",
        firmId: message.firm_id,
        firmClientId: message.firm_client_id ?? undefined,
        aggregateType: "ar_cash_app_remittance",
        aggregateId: remittance.id,
        actorType: "integration",
        payload: {
          lines: remittanceLines.length,
          company_id: message.company_id,
          intake_message_id: message.id,
        },
      },
      supabase,
    );
  }

  return {
    status: "success",
    detail: {
      remittance_id: remittance.id,
      parse_status: parseStatus,
      lines: remittanceLines.length,
    },
  };
}

export const cashAppRemitHandler: IntakeHandler = {
  key: "cash_app_remit",
  requiredEntitlement: "ar_cash_app",
  handle,
};
