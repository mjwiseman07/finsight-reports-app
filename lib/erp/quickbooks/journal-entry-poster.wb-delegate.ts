/**
 * Write-boundary delegate for the QBO poster (WBP W1c.3).
 *
 * Only loaded when WRITE_BOUNDARY_ENABLED === "true". Translates the legacy
 * JEPostRequest / JEPostResult envelope into the W1a canonical JournalEntry
 * / WriteReceipt / WriteBoundaryError shapes, delegates to
 * quickBooksWriteProvider, and back-writes je_post_attempts +
 * je_posting_audit + posted_je memory for byte-parity with the legacy path.
 *
 * Multi-currency guardrail: JournalEntry.currency must equal
 * connection.home_currency in W1. Rejects with
 * "not_home_currency_deferred_w1_5" until W1.5.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { recordMemory } from "@/lib/memory/client-memory-service";
import { persistJeEvidence } from "@/lib/je-evidence/persist";
import { dispatchBackupPacket } from "@/lib/je-evidence/dispatch-hook";
import { resolveFireAssertions } from "@/lib/assertions/resolve-rule-assertions";
import { quickBooksWriteProvider } from "@/lib/integrations/quickbooks/accounting-provider";
import {
  loadQboConnectionForFirmClient,
  type AccountingConnectionWithHomeCurrency,
} from "@/lib/integrations/shared/load-connection-for-firm-client";
import { jePayloadToJournalEntry } from "@/lib/accounting/write-boundary/type-adapters";
import {
  WriteRejected,
  WriteFailed,
  WriteDrifted,
  WriteBoundaryDisabled,
} from "@/lib/accounting/write-boundary/types";
import type {
  JEPayload,
  JEPostRequest,
  JEPostResult,
  DataSourceReliabilityBasis,
} from "@/lib/erp/types";

export async function postViaWriteBoundary(req: JEPostRequest): Promise<JEPostResult> {
  const supabase = getSupabaseAdmin();

  const { data: attempt, error: insertErr } = await supabase
    .from("je_post_attempts")
    .insert({
      firm_client_id: req.firm_client_id,
      idempotency_key: req.idempotency_key,
      status: "pending",
    })
    .select("attempt_id, status, qbo_je_id")
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") {
      const { data: existing } = await supabase
        .from("je_post_attempts")
        .select("attempt_id, status, qbo_je_id")
        .eq("firm_client_id", req.firm_client_id)
        .eq("idempotency_key", req.idempotency_key)
        .single();
      if (existing?.status === "posted" && existing.qbo_je_id) {
        return {
          status: "posted",
          attempt_id: existing.attempt_id,
          qbo_je_id: existing.qbo_je_id,
        };
      }
      return {
        status: "rejected",
        attempt_id: existing?.attempt_id ?? "",
        reason: "duplicate_idempotency_key",
        details: existing,
      };
    }
    throw insertErr;
  }
  const attemptId = attempt.attempt_id as string;

  let resolvedAssertions: string[] = req.assertions_addressed ?? [];
  let resolvedReliability: string | null = req.data_source_reliability_basis ?? null;
  if (req.source_type === "rule" && req.source_id && req.assertions_addressed === undefined) {
    resolvedAssertions = await resolveFireAssertions(supabase, req.source_id);
    if (resolvedAssertions.length > 0 && !resolvedReliability) {
      resolvedReliability = "rule_synthesized_from_qbo_ledger";
    }
  }

  const composition = req.composition;
  if (composition) {
    try {
      await persistJeEvidence({
        db: supabase,
        attemptId,
        firmClientId: req.firm_client_id,
        composition,
      });
    } catch (err) {
      await finalizeReject(
        attemptId,
        req,
        "evidence_contract_violation",
        { message: err instanceof Error ? err.message : String(err) },
        resolvedAssertions,
        resolvedReliability,
        null,
        [],
      );
      return { status: "rejected", attempt_id: attemptId, reason: "evidence_contract_violation" };
    }
  }

  const { data: fc } = await supabase
    .from("firm_clients")
    .select("accounting_method")
    .eq("id", req.firm_client_id)
    .single();
  if (fc?.accounting_method === "cash") {
    await finalizeReject(
      attemptId,
      req,
      "cash_basis_notes_only",
      undefined,
      resolvedAssertions,
      resolvedReliability,
      null,
      [],
    );
    return { status: "rejected", attempt_id: attemptId, reason: "cash_basis_notes_only" };
  }

  let connection: AccountingConnectionWithHomeCurrency;
  try {
    const loaded = await loadQboConnectionForFirmClient(supabase, req.firm_client_id);
    connection = loaded.connection;
  } catch (err) {
    const reason = err instanceof Error ? err.message.split(":")[0] : "no_qbo_connection";
    await finalizeReject(
      attemptId,
      req,
      reason,
      { message: err instanceof Error ? err.message : String(err) },
      resolvedAssertions,
      resolvedReliability,
      null,
      [],
    );
    return { status: "rejected", attempt_id: attemptId, reason };
  }

  const homeCurrency = connection.home_currency;
  if (!homeCurrency) {
    await finalizeReject(
      attemptId,
      req,
      "home_currency_missing",
      { connection_id: connection.id },
      resolvedAssertions,
      resolvedReliability,
      null,
      [],
    );
    return { status: "rejected", attempt_id: attemptId, reason: "home_currency_missing" };
  }

  const tenantId = connection.tenant_or_realm_id;
  if (!tenantId) {
    await finalizeReject(
      attemptId,
      req,
      "tenant_or_realm_id_missing",
      { connection_id: connection.id },
      resolvedAssertions,
      resolvedReliability,
      null,
      [],
    );
    return { status: "rejected", attempt_id: attemptId, reason: "tenant_or_realm_id_missing" };
  }

  const payloadCurrency = req.payload.currency ?? homeCurrency;
  if (payloadCurrency !== homeCurrency) {
    await finalizeReject(
      attemptId,
      req,
      "not_home_currency_deferred_w1_5",
      { payload_currency: payloadCurrency, home_currency: homeCurrency },
      resolvedAssertions,
      resolvedReliability,
      { currency: payloadCurrency, home_currency: homeCurrency, exchange_rate: 0 },
      [],
    );
    return {
      status: "rejected",
      attempt_id: attemptId,
      reason: "not_home_currency_deferred_w1_5",
    };
  }

  const journalEntry = jePayloadToJournalEntry({
    payload: req.payload,
    tenantId,
    homeCurrency,
    externalRef: req.idempotency_key,
    status: "POSTED",
  });

  let receipt;
  try {
    receipt = await quickBooksWriteProvider.writeJournalEntry(journalEntry, connection);
  } catch (err) {
    if (err instanceof WriteRejected) {
      const reason = err.issues[0]?.code ?? "validation_failed";
      await finalizeReject(
        attemptId,
        req,
        reason,
        { issues: err.issues },
        resolvedAssertions,
        resolvedReliability,
        homeCurrencyCtx(homeCurrency),
        err.lifecycleEventIds ?? [],
      );
      return {
        status: "rejected",
        attempt_id: attemptId,
        reason,
        details: { issues: err.issues },
      };
    }
    if (err instanceof WriteBoundaryDisabled) {
      await finalizeReject(
        attemptId,
        req,
        "write_gate_failed",
        { reason: err.message },
        resolvedAssertions,
        resolvedReliability,
        null,
        err.lifecycleEventIds ?? [],
      );
      return { status: "rejected", attempt_id: attemptId, reason: "write_gate_failed" };
    }
    if (err instanceof WriteDrifted) {
      await finalizeReject(
        attemptId,
        req,
        "write_drift_detected",
        { drift: err.driftReasons, voidedJournalId: err.voidedJournalId },
        resolvedAssertions,
        resolvedReliability,
        homeCurrencyCtx(homeCurrency),
        err.lifecycleEventIds ?? [],
      );
      return { status: "rejected", attempt_id: attemptId, reason: "write_drift_detected" };
    }
    if (err instanceof WriteFailed) {
      const errorCode = err.providerErrorCode
        ? `qbo_${err.providerErrorCode}`
        : err.httpStatus
          ? `qbo_${err.httpStatus}`
          : "qbo_unknown";
      await finalizeFail(
        attemptId,
        req,
        errorCode,
        { message: err.message, httpStatus: err.httpStatus },
        resolvedAssertions,
        resolvedReliability,
        homeCurrencyCtx(homeCurrency),
        err.lifecycleEventIds ?? [],
      );
      return {
        status: "failed",
        attempt_id: attemptId,
        error: errorCode,
        retryable: (err.httpStatus ?? 0) >= 500,
      };
    }
    await finalizeFail(
      attemptId,
      req,
      "unexpected_provider_error",
      { message: err instanceof Error ? err.message : String(err) },
      resolvedAssertions,
      resolvedReliability,
      null,
      [],
    );
    throw err;
  }

  const qboJEId = receipt.providerJournalId;
  const currencyCtx = homeCurrencyCtx(homeCurrency);
  await finalizePost(
    attemptId,
    req,
    qboJEId,
    resolvedAssertions,
    resolvedReliability,
    currencyCtx,
    receipt.lifecycleEventIds ?? [],
  );
  await recordMemory({
    firmClientId: req.firm_client_id,
    memoryType: "posted_je",
    memoryKey: `posted_je_${qboJEId}`,
    entityType: "journal_entry",
    entityId: String(qboJEId),
    sourceSystem: "je_poster",
    payload: {
      qbo_je_id: qboJEId,
      source_type: req.source_type,
      source_id: req.source_id,
      transaction_date: req.payload.transaction_date,
      dr_total: sumSide(req.payload, "Debit"),
      cr_total: sumSide(req.payload, "Credit"),
      line_count: req.payload.lines.length,
      currency: currencyCtx.currency,
      exchange_rate: currencyCtx.exchange_rate,
      home_currency_at_post: currencyCtx.home_currency,
    },
  });

  if (composition) dispatchBackupPacket(supabase, attemptId, req.firm_client_id);

  return { status: "posted", attempt_id: attemptId, qbo_je_id: qboJEId };
}

export async function reverseViaWriteBoundary(
  attemptId: string,
  reason: string,
  actorUserId: string,
): Promise<JEPostResult> {
  const supabase = getSupabaseAdmin();
  const { data: original } = await supabase
    .from("je_posting_audit")
    .select("*")
    .eq("attempt_id", attemptId)
    .eq("status", "posted")
    .single();

  if (!original) {
    return { status: "rejected", attempt_id: "", reason: "original_not_found_or_not_posted" };
  }

  const originalPayload = original.payload_json as JEPayload;
  const reversedPayload: JEPayload = {
    transaction_date: shiftDate(originalPayload.transaction_date, 1),
    narration: `REVERSAL of ${original.qbo_je_id}: ${reason}`,
    currency: originalPayload.currency,
    lines: originalPayload.lines.map((l) => ({
      ...l,
      posting_type: l.posting_type === "Debit" ? "Credit" : "Debit",
    })),
  };

  const result = await postViaWriteBoundary({
    firm_client_id: original.firm_client_id,
    idempotency_key: `reversal_${attemptId}`,
    source_type: "reversal",
    source_id: attemptId,
    posted_by: "human",
    posted_by_user_id: actorUserId,
    payload: reversedPayload,
    assertions_addressed: (original.assertions_addressed as string[]) ?? [],
    data_source_reliability_basis:
      (original.data_source_reliability_basis as DataSourceReliabilityBasis | null) ?? undefined,
  });

  if (result.status === "posted") {
    await supabase
      .from("je_post_attempts")
      .update({ status: "reversed" })
      .eq("attempt_id", attemptId);
  }

  return result;
}

type CurrencyCtx = { currency: string; home_currency: string; exchange_rate: number };

function homeCurrencyCtx(homeCurrency: string): CurrencyCtx {
  return {
    currency: homeCurrency,
    home_currency: homeCurrency,
    exchange_rate: 1,
  };
}

async function finalizeReject(
  attemptId: string,
  req: JEPostRequest,
  reason: string,
  details: unknown | undefined,
  assertions: string[],
  reliability: string | null,
  currencyCtx: CurrencyCtx | null,
  lifecycleEventIds: string[],
) {
  const supabase = getSupabaseAdmin();
  await supabase.from("je_post_attempts").update({ status: "rejected" }).eq("attempt_id", attemptId);
  await supabase.from("je_posting_audit").insert({
    attempt_id: attemptId,
    firm_client_id: req.firm_client_id,
    idempotency_key: req.idempotency_key,
    source_type: req.source_type,
    source_id: req.source_id,
    posted_by: req.posted_by,
    posted_by_user_id: req.posted_by_user_id,
    dr_total: sumSide(req.payload, "Debit"),
    cr_total: sumSide(req.payload, "Credit"),
    transaction_date: req.payload.transaction_date,
    narration: req.payload.narration,
    status: "rejected",
    rejection_reason: reason,
    qbo_error_json: details ? (details as object) : null,
    payload_json: req.payload,
    assertions_addressed: assertions,
    data_source_reliability_basis: reliability,
    currency: currencyCtx?.currency ?? null,
    exchange_rate: currencyCtx && currencyCtx.exchange_rate > 0 ? currencyCtx.exchange_rate : null,
    home_currency_at_post: currencyCtx?.home_currency ?? null,
    lifecycle_event_ids: lifecycleEventIds.length ? lifecycleEventIds : null,
  });
}

async function finalizeFail(
  attemptId: string,
  req: JEPostRequest,
  errorCode: string,
  details: unknown | undefined,
  assertions: string[],
  reliability: string | null,
  currencyCtx: CurrencyCtx | null,
  lifecycleEventIds: string[],
) {
  const supabase = getSupabaseAdmin();
  await supabase.from("je_post_attempts").update({ status: "failed" }).eq("attempt_id", attemptId);
  await supabase.from("je_posting_audit").insert({
    attempt_id: attemptId,
    firm_client_id: req.firm_client_id,
    idempotency_key: req.idempotency_key,
    source_type: req.source_type,
    source_id: req.source_id,
    posted_by: req.posted_by,
    posted_by_user_id: req.posted_by_user_id,
    dr_total: sumSide(req.payload, "Debit"),
    cr_total: sumSide(req.payload, "Credit"),
    transaction_date: req.payload.transaction_date,
    narration: req.payload.narration,
    status: "failed",
    rejection_reason: errorCode,
    qbo_error_json: details ? (details as object) : null,
    payload_json: req.payload,
    assertions_addressed: assertions,
    data_source_reliability_basis: reliability,
    currency: currencyCtx?.currency ?? null,
    exchange_rate: currencyCtx && currencyCtx.exchange_rate > 0 ? currencyCtx.exchange_rate : null,
    home_currency_at_post: currencyCtx?.home_currency ?? null,
    lifecycle_event_ids: lifecycleEventIds.length ? lifecycleEventIds : null,
  });
}

async function finalizePost(
  attemptId: string,
  req: JEPostRequest,
  qboJEId: string,
  assertions: string[],
  reliability: string | null,
  currencyCtx: CurrencyCtx,
  lifecycleEventIds: string[],
) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("je_post_attempts")
    .update({ status: "posted", qbo_je_id: qboJEId })
    .eq("attempt_id", attemptId);
  await supabase.from("je_posting_audit").insert({
    attempt_id: attemptId,
    firm_client_id: req.firm_client_id,
    idempotency_key: req.idempotency_key,
    source_type: req.source_type,
    source_id: req.source_id,
    posted_by: req.posted_by,
    posted_by_user_id: req.posted_by_user_id,
    qbo_je_id: qboJEId,
    dr_total: sumSide(req.payload, "Debit"),
    cr_total: sumSide(req.payload, "Credit"),
    transaction_date: req.payload.transaction_date,
    narration: req.payload.narration,
    status: "posted",
    payload_json: req.payload,
    assertions_addressed: assertions,
    data_source_reliability_basis: reliability,
    currency: currencyCtx.currency,
    exchange_rate: currencyCtx.exchange_rate,
    home_currency_at_post: currencyCtx.home_currency,
    lifecycle_event_ids: lifecycleEventIds.length ? lifecycleEventIds : null,
  });
}

function sumSide(p: JEPayload, side: "Debit" | "Credit") {
  return Number(
    p.lines
      .filter((l) => l.posting_type === side)
      .reduce((s, l) => s + Number(l.amount), 0)
      .toFixed(2),
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
