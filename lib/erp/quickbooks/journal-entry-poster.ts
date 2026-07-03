/**
 * QBO Journal Entry Poster (Doc D2).
 *
 * The single safe write path to QBO. Enforces, in order: idempotency,
 * cash-basis gate, write-enabled + health gate, token resolution, payload
 * validation, then posts with one forced-refresh retry on 401. Every attempt
 * writes exactly one row to je_posting_audit; every success records a
 * posted_je memory.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import { resolveQBOTokenForFirmClient } from "@/lib/erp/quickbooks/token-resolver";
import { canPostToQBO } from "@/lib/erp/quickbooks/write-preflight";
import { validateJEPayload } from "@/lib/erp/quickbooks/je-validator";
import type {
  IJournalEntryPoster,
  JEPostRequest,
  JEPostResult,
  JEPayload,
} from "@/lib/erp/types";
import { recordMemory } from "@/lib/memory/client-memory-service";
import { persistJeEvidence } from "@/lib/je-evidence/persist";
import { dispatchBackupPacket } from "@/lib/je-evidence/dispatch-hook";

// Env-aware base URL: sandbox realm/token only work against the sandbox host.
function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

export const qboJournalEntryPoster: IJournalEntryPoster = {
  async post(req: JEPostRequest): Promise<JEPostResult> {
    const supabase = getSupabaseAdmin();

    // 1. Idempotency — insert pending; if duplicate key, return existing outcome
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

    // D6.4b: evidence-contract enforcement — only when a caller supplies a composition (legacy callers unaffected).
    const composition = (req as { composition?: import("@/lib/je-evidence/types").JeCompositionResult }).composition;
    if (composition) {
      try {
        await persistJeEvidence({ db: supabase, attemptId, firmClientId: req.firm_client_id, composition });
      } catch (err) {
        await finalizeReject(attemptId, req, "evidence_contract_violation", { message: err instanceof Error ? err.message : String(err) });
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
      await finalizeReject(attemptId, req, "cash_basis_notes_only");
      return { status: "rejected", attempt_id: attemptId, reason: "cash_basis_notes_only" };
    }

    // 3. Write-enabled + healthy gate
    const preflight = await canPostToQBO(req.firm_client_id);
    if (!preflight.canWrite) {
      await finalizeReject(attemptId, req, preflight.reason ?? "write_gate_failed");
      return { status: "rejected", attempt_id: attemptId, reason: preflight.reason ?? "write_gate_failed" };
    }

    // 4. Resolve token
    const tokenResult = await resolveQBOTokenForFirmClient(req.firm_client_id);
    if (!tokenResult) {
      await finalizeReject(attemptId, req, "no_qbo_token");
      return { status: "rejected", attempt_id: attemptId, reason: "no_qbo_token" };
    }

    // 5. Validate
    const validation = await validateJEPayload(
      req.firm_client_id,
      req.payload,
      tokenResult.realmId,
      tokenResult.accessToken,
    );
    if (!validation.valid) {
      await finalizeReject(attemptId, req, validation.reason, validation.details);
      return {
        status: "rejected",
        attempt_id: attemptId,
        reason: validation.reason,
        details: validation.details,
      };
    }

    // 6. Build QBO body
    const qboBody = buildQBOJournalEntry(req.payload);

    // 7. Post with one 401 retry after forced refresh
    let postResp = await postToQBO(tokenResult.realmId, tokenResult.accessToken, qboBody);
    if (postResp.status === 401) {
      const refreshed = await resolveQBOTokenForFirmClient(req.firm_client_id, { forceRefresh: true });
      if (!refreshed) {
        await finalizeFail(attemptId, req, "token_refresh_failed");
        return { status: "failed", attempt_id: attemptId, error: "token_refresh_failed", retryable: true };
      }
      postResp = await postToQBO(refreshed.realmId, refreshed.accessToken, qboBody);
    }

    if (!postResp.ok) {
      const errBody = await postResp.json().catch(() => ({}));
      await finalizeFail(attemptId, req, `qbo_${postResp.status}`, errBody);
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
      await finalizeFail(attemptId, req, "qbo_response_missing_id", qboJson);
      return { status: "failed", attempt_id: attemptId, error: "qbo_response_missing_id", retryable: false };
    }

    // 8. Success — persist + memory
    await finalizePost(attemptId, req, qboJEId);
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
      },
    });

    // D6.4b: fire-and-forget backup packet on success (only if composition supplied).
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
    const reversedPayload: JEPayload = {
      transaction_date: shiftDate(originalPayload.transaction_date, 1),
      narration: `REVERSAL of ${original.qbo_je_id}: ${reason}`,
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

function buildQBOJournalEntry(p: JEPayload) {
  return {
    TxnDate: p.transaction_date,
    PrivateNote: p.private_note,
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

async function postToQBO(realmId: string, accessToken: string, body: unknown) {
  return fetch(
    `${qboApiBase()}/v3/company/${realmId}/journalentry?minorversion=73`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );
}

async function finalizeReject(attemptId: string, req: JEPostRequest, reason: string, details?: unknown) {
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
  });
}

async function finalizeFail(attemptId: string, req: JEPostRequest, errorCode: string, details?: unknown) {
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
  });
}

async function finalizePost(attemptId: string, req: JEPostRequest, qboJEId: string) {
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
