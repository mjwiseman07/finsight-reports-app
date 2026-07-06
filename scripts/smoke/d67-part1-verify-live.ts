/**
 * D6.7 Part 1 — live smoke: Postmark ingest → remittance lines → Layer 1 matcher → ledger events.
 * Gated behind --allow-live-writes.
 */
import crypto, { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { publishEvent } from "@/lib/events/publisher";
import { matchLayer1 } from "@/lib/ar-cash-app/matcher/layer1";

type Step = { step: string; ok: boolean; details: string };

const PREFIX = "d67-p1-smoke";
const EDI_FIXTURE = readFileSync(
  path.join(process.cwd(), "lib/ar-cash-app/parsers/__fixtures__/edi-820-sample.edi"),
  "utf8",
);

function loadEnv(filePath: string) {
  try {
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) return;
        const eq = trimmed.indexOf("=");
        if (eq === -1) return;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
      });
  } catch {
    // optional
  }
}

loadEnv(".env.local");
loadEnv(".env");
if (!process.env.POSTMARK_INBOUND_WEBHOOK_SECRET && process.env.POSTMARK_INBOUND_HMAC_SECRET) {
  process.env.POSTMARK_INBOUND_WEBHOOK_SECRET = process.env.POSTMARK_INBOUND_HMAC_SECRET;
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const secret =
  process.env.POSTMARK_INBOUND_WEBHOOK_SECRET ?? process.env.POSTMARK_INBOUND_HMAC_SECRET;
process.env.POSTMARK_INBOUND_WEBHOOK_SECRET = secret;
const allowWrites =
  process.argv.includes("--allow-live-writes") || process.env.D67_P1_ALLOW_WRITES === "true";
const doCleanup = process.argv.includes("--cleanup");

if (!url || !key) {
  console.error(JSON.stringify([{ step: "env", ok: false, details: "Supabase env missing" }]));
  process.exit(2);
}
if (!secret) {
  console.error(
    JSON.stringify([
      { step: "env", ok: false, details: "POSTMARK_INBOUND_WEBHOOK_SECRET missing" },
    ]),
  );
  process.exit(2);
}
if (!allowWrites) {
  console.error(
    JSON.stringify([
      {
        step: "allow_live_writes",
        ok: false,
        details: "Pass --allow-live-writes or set D67_P1_ALLOW_WRITES=true",
      },
    ]),
  );
  process.exit(2);
}

const results: Step[] = [];
function record(step: string, ok: boolean, details: string) {
  results.push({ step, ok, details });
}

function signBody(body: string): string {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

async function main() {
  const { POST: postmarkInbound } = await import("@/app/api/webhooks/postmark/inbound/route");
  const db = createServiceClient();
  const ids: {
    firmId?: string;
    firmClientId?: string;
    companyId?: string;
    customerId?: string;
    remittanceId?: string;
    paymentId?: string;
    messageId?: string;
  } = {};

  try {
    const { data: firm } = await db.from("firms").select("id").limit(1).maybeSingle();
    if (!firm?.id) throw new Error("no firm in database");
    ids.firmId = firm.id;

    ids.companyId = randomUUID();
    const clientName = `${PREFIX} client`;
    const { data: fc, error: fcErr } = await db
      .from("firm_clients")
      .insert({
        firm_id: ids.firmId,
        name: clientName,
        company_id: ids.companyId,
        is_demo: true,
        industry_vertical: "general",
        accounting_method: "accrual",
        subscription_status: "active",
      })
      .select("id")
      .single();
    if (fcErr || !fc) throw new Error(`firm_client insert: ${fcErr?.message}`);
    ids.firmClientId = fc.id;

    const { data: customer, error: custErr } = await db
      .from("customers")
      .insert({
        firm_id: ids.firmId,
        company_id: ids.companyId,
        name: "ACME CORPORATION",
        email_domain: "acmecorp.com",
      })
      .select("id")
      .single();
    if (custErr || !customer) throw new Error(`customer insert: ${custErr?.message}`);
    ids.customerId = customer.id;
    record("seed_entities", true, `firm=${ids.firmId} company=${ids.companyId}`);

    ids.messageId = `${PREFIX}-${randomUUID()}`;
    const payload = {
      MessageID: ids.messageId,
      From: "ap@acmecorp.com",
      FromFull: { Email: "ap@acmecorp.com", Name: "ACME AP" },
      Subject: "Remittance advice",
      TextBody: "See attached EDI 820",
      Date: new Date().toISOString(),
      Attachments: [
        {
          Name: "remittance.edi",
          Content: Buffer.from(EDI_FIXTURE, "utf8").toString("base64"),
          ContentType: "text/plain",
          ContentLength: EDI_FIXTURE.length,
        },
      ],
    };
    const body = JSON.stringify(payload);
    const sig = encodeURIComponent(signBody(body));
    const req = new NextRequest(
      `http://localhost/api/webhooks/postmark/inbound?sig=${sig}`,
      { method: "POST", body, headers: { "content-type": "application/json" } },
    );
    const res = await postmarkInbound(req);
    const resJson = (await res.json()) as Record<string, unknown>;
    if (!res.ok || !resJson.ok) {
      throw new Error(`webhook failed: ${res.status} ${JSON.stringify(resJson)}`);
    }
    ids.remittanceId = resJson.id as string;
    record("postmark_webhook", true, `remittance=${ids.remittanceId} parse=${resJson.parse_status}`);

    const { data: rem } = await db
      .from("ar_cash_app_remittances")
      .select("parse_status")
      .eq("id", ids.remittanceId)
      .single();
    if (rem?.parse_status !== "parsed") {
      throw new Error(`expected parse_status=parsed got ${rem?.parse_status}`);
    }
    record("remittance_parsed", true, rem.parse_status);

    const { data: lines, error: linesErr } = await db
      .from("ar_cash_app_remittance_lines")
      .select("id")
      .eq("remittance_id", ids.remittanceId);
    if (linesErr) throw new Error(linesErr.message);
    if ((lines?.length ?? 0) !== 2) {
      throw new Error(`expected 2 remittance lines got ${lines?.length ?? 0}`);
    }
    record("remittance_lines", true, `count=${lines!.length}`);

    const externalPaymentId = `${PREFIX}-pay-${randomUUID()}`;
    const { data: payment, error: payErr } = await db
      .from("ar_cash_app_payments")
      .insert({
        firm_id: ids.firmId,
        company_id: ids.companyId,
        payment_source: "bank_feed",
        external_payment_id: externalPaymentId,
        payer_name_raw: "ACME CORPORATION",
        amount_received: 1250,
        currency: "USD",
        payment_date: "2026-07-05",
        linked_remittance_id: ids.remittanceId,
        pairing_method: "exact_ref",
        match_status: "unmatched",
      })
      .select("id")
      .single();
    if (payErr || !payment) throw new Error(`payment insert: ${payErr?.message}`);
    ids.paymentId = payment.id;

    await publishEvent(
      {
        eventType: "payment_ingested",
        eventCategory: "cash_app",
        firmId: ids.firmId,
        firmClientId: ids.firmClientId,
        aggregateType: "ar_cash_app_payment",
        aggregateId: ids.paymentId,
        actorType: "system",
        payload: { external_payment_id: externalPaymentId, amount: 1250 },
      },
      db,
    );
    record("payment_ingested", true, ids.paymentId);

    const inv1 = randomUUID();
    const inv2 = randomUUID();
    const matcherResult = matchLayer1(
      {
        id: ids.paymentId,
        amount_received: 1250,
        currency: "USD",
        payer_name_raw: "ACME CORPORATION",
        sender_email_domain: "acmecorp.com",
        payment_date: "2026-07-05",
        remittance_lines: [
          { invoice_reference: "INV-4521", amount_paid: 750 },
          { invoice_reference: "INV-4522", amount_paid: 500 },
        ],
      },
      [
        {
          id: inv1,
          doc_number: "INV-4521",
          balance: 750,
          currency: "USD",
          customer_id: ids.customerId!,
          customer_name: "ACME CORPORATION",
          customer_email_domain: "acmecorp.com",
        },
        {
          id: inv2,
          doc_number: "INV-4522",
          balance: 500,
          currency: "USD",
          customer_id: ids.customerId!,
          customer_name: "ACME CORPORATION",
          customer_email_domain: "acmecorp.com",
        },
      ],
      { exact_amount_tolerance_cents: 0, enable_single_open_invoice_shortcut: true },
    );

    if (matcherResult.candidates.length !== 2) {
      throw new Error(`expected 2 match candidates got ${matcherResult.candidates.length}`);
    }

    for (const c of matcherResult.candidates) {
      await publishEvent(
        {
          eventType: "match_candidate_proposed",
          eventCategory: "cash_app",
          firmId: ids.firmId,
          firmClientId: ids.firmClientId,
          aggregateType: "ar_cash_app_payment",
          aggregateId: ids.paymentId,
          actorType: "system",
          payload: {
            invoice_id: c.invoice_id,
            matched_amount: c.matched_amount,
            match_strategy: c.match_strategy,
            confidence: c.confidence,
          },
        },
        db,
      );
    }
    record("match_candidates", true, `count=${matcherResult.candidates.length}`);

    const checks: Array<{ eventType: string; aggregateId: string; min: number }> = [
      { eventType: "remittance_ingested", aggregateId: ids.remittanceId!, min: 1 },
      { eventType: "remittance_parsed", aggregateId: ids.remittanceId!, min: 1 },
      { eventType: "payment_ingested", aggregateId: ids.paymentId!, min: 1 },
      { eventType: "match_candidate_proposed", aggregateId: ids.paymentId!, min: 2 },
    ];

    for (const { eventType, aggregateId, min } of checks) {
      const { count, error: evErr } = await db
        .from("ledger_events")
        .select("event_id", { count: "exact", head: true })
        .eq("event_type", eventType)
        .eq("aggregate_id", aggregateId);
      if (evErr) throw new Error(evErr.message);
      if ((count ?? 0) < min) {
        throw new Error(`ledger_events missing ${eventType} (need ${min}, got ${count ?? 0})`);
      }
    }

    record("ledger_events", true, checks.map((c) => c.eventType).join(", "));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    record("failure", false, msg);
  } finally {
    if (doCleanup && ids.remittanceId) {
      await db.from("ar_cash_app_remittance_lines").delete().eq("remittance_id", ids.remittanceId);
      await db.from("ar_cash_app_payments").delete().eq("id", ids.paymentId ?? "");
      await db.from("ar_cash_app_remittances").delete().eq("id", ids.remittanceId);
      if (ids.customerId) await db.from("customers").delete().eq("id", ids.customerId);
      if (ids.firmClientId) await db.from("firm_clients").delete().eq("id", ids.firmClientId);
      record("cleanup", true, "deleted smoke rows (ledger_events append-only — left in place)");
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(JSON.stringify(results, null, 2));
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
