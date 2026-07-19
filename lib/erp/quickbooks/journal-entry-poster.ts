/**
 * QBO Journal Entry Poster (Doc D2, Phase MC-3 currency-aware).
 *
 * The single safe write path to QBO. Enforces, in order: idempotency,
 * cash-basis gate, write-enabled + health gate, token resolution, currency
 * resolution (MC-3), payload validation (currency-aware), exchange rate
 * resolution (MC-3), QBO body build with CurrencyRef + ExchangeRate, then
 * posts with one forced-refresh retry on 401. Every attempt writes exactly
 * one row to je_posting_audit; every success records a posted_je memory.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { canPostToQBO } from "@/lib/erp/quickbooks/write-preflight";
import { validateJEPayload } from "@/lib/erp/quickbooks/je-validator";
import { resolveCurrencyForFirmClient } from "@/lib/erp/quickbooks/currency-resolver";
import { resolveExchangeRate } from "@/lib/erp/quickbooks/exchange-rate";
import type {
  IJournalEntryPoster,
  JEPostRequest,
  JEPostResult,
  JEPayload,
  DataSourceReliabilityBasis,
} from "@/lib/erp/types";
import { recordMemory } from "@/lib/memory/client-memory-service";
import { persistJeEvidence } from "@/lib/je-evidence/persist";
import { dispatchBackupPacket } from "@/lib/je-evidence/dispatch-hook";
import { resolveFireAssertions } from "@/lib/assertions/resolve-rule-assertions";

function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

interface CurrencyContext {
  currency: string;
  home_currency: string;
  exchange_rate: number;
}

export const qboJournalEntryPoster: IJournalEntryPoster = {
  async post(req: JEPostRequest): Promise<JEPostResult> {
    const supabase = getSupabaseAdmin();

    // 1. Idempotency
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
          return { status: "posted", attempt_id: existing.attempt_id, qbo_je_id: existing.qbo_je_id };
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
        await persistJeEvidence({ db: supabase, attemptId, firmClientId: req.firm_client_id, composition });
      } catch (err) {
        await finalizeReject(
          attemptId,
          req,
          "evidence_contract_violation",
          { message: err instanceof Error ? err.message : String(err) },
          resolvedAssertions,
          resolvedReliability,
          null,
        );
        return { status: "rejected", attempt_id: attemptId, reason: "evidence_contract_violation" };
      }
    }

    // 2. Cash-basis gate
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
      );
      return { status: "rejected", attempt_id: attemptId, reason: "cash_basis_notes_only" };
    }

    // 3. Write-enabled + healthy gate
    const preflight = await canPostToQBO(req.firm_client_id);
    if (!preflight.canWrite) {
      await finalizeReject(
        attemptId,
        req,
        preflight.reason ?? "write_gate_failed",
        undefined,
        resolvedAssertions,
        resolvedReliability,
        null,
      );
      return { status: "rejected", attempt_id: attemptId, reason: preflight.reason ?? "write_gate_failed" };
    }

    // 4. Token
    const tokenResult = await resolveQBOTokenForFirmClient(req.firm_client_id);
    if (!tokenResult) {
      await finalizeReject(
        attemptId,
        req,
        "no_qbo_token",
        undefined,
        resolvedAssertions,
        resolvedReliability,
        null,
      );
      return { status: "rejected", attempt_id: attemptId, reason: "no_qbo_token" };
    }

    // 5. MC-3: Resolve currency (explicit > home_currency default; reject if home missing)
    const currencyResolution = await resolveCurrencyForFirmClient(
      supabase,
      req.firm_client_id,
      req.payload.currency,
    );
    if (!currencyResolution.ok) {
      await finalizeReject(
        attemptId,
        req,
        currencyResolution.reason,
        undefined,
        resolvedAssertions,
        resolvedReliability,
        null,
      );
      return { status: "rejected", attempt_id: attemptId, reason: currencyResolution.reason };
    }

    // 6. Validate (currency-aware)
    const validation = await validateJEPayload(
      req.firm_client_id,
      req.payload,
      tokenResult.realmId,
      tokenResult.accessToken,
      currencyResolution.currency,
      currencyResolution.home_currency,
      tokenResult.ownerUserId,
    );
    if (!validation.valid) {
      await finalizeReject(
        attemptId,
        req,
        validation.reason,
        validation.details,
        resolvedAssertions,
        resolvedReliability,
        {
          currency: currencyResolution.currency,
          home_currency: currencyResolution.home_currency,
          exchange_rate: 0, // pre-rate; not persisted as a real rate
        },
      );
      return {
        status: "rejected",
        attempt_id: attemptId,
        reason: validation.reason,
        details: validation.details,
      };
    }

    // 7. MC-3: Resolve exchange rate (home short-circuits to 1.0)
    const rateResult = await resolveExchangeRate(
      tokenResult.realmId,
      tokenResult.accessToken,
      currencyResolution.currency,
      currencyResolution.home_currency,
      req.payload.transaction_date,
      tokenResult.ownerUserId,
    );
    if (!rateResult.ok) {
      await finalizeReject(
        attemptId,
        req,
        rateResult.reason,
        rateResult.details,
        resolvedAssertions,
        resolvedReliability,
        {
          currency: currencyResolution.currency,
          home_currency: currencyResolution.home_currency,
          exchange_rate: 0,
        },
      );
      return { status: "rejected", attempt_id: attemptId, reason: rateResult.reason };
    }

    const currencyCtx: CurrencyContext = {
      currency: currencyResolution.currency,
      home_currency: currencyResolution.home_currency,
      exchange_rate: rateResult.rate,
    };

    // 8. Build QBO body (with CurrencyRef + ExchangeRate)
    const qboBody = buildQBOJournalEntry(req.payload, currencyCtx);

    // Phase Q7 (Issue #7): pick the strongest required capability based on
    // what this JE actually uses, then re-run preflight with that requirement.
    // Reject-not-degrade: if the edition can't support it, refuse the POST
    // with a clear reason.
    //
    // Deviation from paste: do NOT use Boolean(jePayload?.CurrencyRef) —
    // buildQBOJournalEntry always sets CurrencyRef post-MC-3, which would
    // incorrectly require multicurrency for every home-currency JE and block
    // simple_start. Detect foreign currency via CurrencyContext instead.
    let requiredCapability: import("@/lib/erp/quickbooks/qbo-editions").QboCapability =
      "journal_entry_write";
    const linesForCheck = Array.isArray(qboBody?.Line) ? qboBody.Line : [];
    const usesClass = linesForCheck.some(
      (line: { JournalEntryLineDetail?: { ClassRef?: unknown } }) =>
        Boolean(line?.JournalEntryLineDetail?.ClassRef),
    );
    const usesDepartment = linesForCheck.some(
      (line: { JournalEntryLineDetail?: { DepartmentRef?: unknown } }) =>
        Boolean(line?.JournalEntryLineDetail?.DepartmentRef),
    );
    const usesMulticurrency =
      currencyCtx.currency !== currencyCtx.home_currency || currencyCtx.exchange_rate !== 1;

    if (usesMulticurrency) requiredCapability = "multicurrency";
    if (usesDepartment) requiredCapability = "locations";
    if (usesClass) requiredCapability = "classes";

    if (requiredCapability !== "journal_entry_write") {
      const capabilityCheck = await canPostToQBO(req.firm_client_id, {
        requireCapability: requiredCapability,
      });
      if (!capabilityCheck.canWrite) {
        await finalizeReject(
          attemptId,
          req,
          capabilityCheck.reason ?? "edition_missing_capability",
          {
            missingCapability: capabilityCheck.missingCapability,
            edition: capabilityCheck.edition,
            subscriptionStatus: capabilityCheck.subscriptionStatus,
          },
          resolvedAssertions,
          resolvedReliability,
          currencyCtx,
        );
        return {
          status: "rejected",
          attempt_id: attemptId,
          reason: capabilityCheck.reason ?? "edition_missing_capability",
          missingCapability: capabilityCheck.missingCapability,
          edition: capabilityCheck.edition,
          subscriptionStatus: capabilityCheck.subscriptionStatus,
        };
      }
    }

    // 9. Post with one 401 retry after forced refresh
    let postResp = await postToQBO(
      tokenResult.realmId,
      tokenResult.accessToken,
      qboBody,
      req.posted_by_user_id,
      req.firm_client_id,
    );
    if (postResp.status === 401) {
      const refreshed = await resolveQBOTokenForFirmClient(req.firm_client_id, { forceRefresh: true });
      if (!refreshed) {
        await finalizeFail(attemptId, req, "token_refresh_failed", undefined, resolvedAssertions, resolvedReliability, currencyCtx);
        return { status: "failed", attempt_id: attemptId, error: "token_refresh_failed", retryable: true };
      }
      postResp = await postToQBO(
        refreshed.realmId,
        refreshed.accessToken,
        qboBody,
        req.posted_by_user_id,
        req.firm_client_id,
      );
    }

    if (!postResp.ok) {
      const errBody = await postResp.json().catch(() => ({}));
      await finalizeFail(attemptId, req, `qbo_${postResp.status}`, errBody, resolvedAssertions, resolvedReliability, currencyCtx);
      return {
        status: "failed",
        attempt_id: attemptId,
        error: `qbo_${postResp.status}`,
        retryable: postResp.status >= 500,
      };
    }

    const qboJson = await postResp.json();
    const qboJEId = qboJson?.JournalEntry?.Id;
    if (!qboJEId) {
      await finalizeFail(attemptId, req, "qbo_response_missing_id", qboJson, resolvedAssertions, resolvedReliability, currencyCtx);
      return { status: "failed", attempt_id: attemptId, error: "qbo_response_missing_id", retryable: false };
    }

    // 10. Success — persist + memory
    await finalizePost(attemptId, req, qboJEId, resolvedAssertions, resolvedReliability, currencyCtx);
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
  },

  async reverse(attemptId, reason, actorUserId) {
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
    // Preserve original currency; rate will be re-resolved at reversal post time
    // (matches QBO UI behavior — reversal posts at current rate, not historical).
    const reversedPayload: JEPayload = {
      transaction_date: shiftDate(originalPayload.transaction_date, 1),
      narration: `REVERSAL of ${original.qbo_je_id}: ${reason}`,
      currency: originalPayload.currency,
      lines: originalPayload.lines.map((l) => ({
        ...l,
        posting_type: l.posting_type === "Debit" ? "Credit" : "Debit",
      })),
    };

    const result = await qboJournalEntryPoster.post({
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
  },
};

// ---- helpers ----

function buildQBOJournalEntry(p: JEPayload, ctx: CurrencyContext) {
  return {
    TxnDate: p.transaction_date,
    PrivateNote: p.private_note,
    CurrencyRef: { value: ctx.currency },
    ExchangeRate: Number(ctx.exchange_rate.toFixed(6)),
    Line: p.lines.map((l, idx) => ({
      Id: String(idx),
      DetailType: "JournalEntryLineDetail",
      Amount: Number(l.amount.toFixed(2)),
      Description: l.description,
      JournalEntryLineDetail: {
        PostingType: l.posting_type,
        AccountRef: { value: l.account_id },
        Entity: l.customer_id
          ? { Type: "Customer", EntityRef: { value: l.customer_id } }
          : undefined,
        ClassRef: l.class_id ? { value: l.class_id } : undefined,
        DepartmentRef: l.department_id ? { value: l.department_id } : undefined,
      },
    })),
  };
}

type QboPostResult = {
  ok: boolean;
  status: number;
  intuit_tid: string | null;
  json: () => Promise<any>;
  text: () => Promise<string>;
};

async function postToQBO(
  realmId: string,
  accessToken: string,
  body: unknown,
  userId?: string,
  firmClientId?: string,
): Promise<QboPostResult> {
  const { qboApiFetch } = await import("../../qbo/api-fetch.js");
  const url = `${qboApiBase()}/v3/company/${realmId}/journalentry?minorversion=73`;
  const startedAt = Date.now();
  const { ok, status, json, intuit_tid } = await qboApiFetch(url, {
    accessToken,
    method: "POST",
    body: body as object,
    context: userId ? { userId, realmId } : undefined,
  });
  if (firmClientId) {
    try {
      const { recordQboApiTrace } = await import("../../qbo/api-trace");
      await recordQboApiTrace({
        firm_client_id: firmClientId,
        realm_id: realmId,
        endpoint: "/v3/company/{realmId}/journalentry",
        http_method: "POST",
        http_status: status,
        intuit_tid: intuit_tid ?? null,
        latency_ms: Date.now() - startedAt,
        error_code: ok ? null : String(status),
      });
    } catch {
      /* trace must never fail the post */
    }
  }
  return {
    ok,
    status,
    intuit_tid,
    json: async () => json,
    text: async () => JSON.stringify(json),
  };
}

async function finalizeReject(
  attemptId: string,
  req: JEPostRequest,
  reason: string,
  details: unknown | undefined,
  assertions: string[],
  reliability: string | null,
  currencyCtx: CurrencyContext | null,
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
  });
}

async function finalizeFail(
  attemptId: string,
  req: JEPostRequest,
  errorCode: string,
  details: unknown | undefined,
  assertions: string[],
  reliability: string | null,
  currencyCtx: CurrencyContext | null,
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
  });
}

async function finalizePost(
  attemptId: string,
  req: JEPostRequest,
  qboJEId: string,
  assertions: string[],
  reliability: string | null,
  currencyCtx: CurrencyContext,
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
  });
}

function sumSide(p: JEPayload, side: "Debit" | "Credit") {
  return Number(
    p.lines.filter((l) => l.posting_type === side).reduce((s, l) => s + Number(l.amount), 0).toFixed(2),
  );
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
