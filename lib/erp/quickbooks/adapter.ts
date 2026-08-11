import type {
  AccountingProviderId,
  AccountingWriteProvider,
  HealthCheckResult,
  JournalEntryDetail,
  JournalEntryInput,
  JournalEntryResult,
  JELine,
  JEPayload,
  JEPostRequest,
  PreflightResult,
  ProviderCapabilities,
  VoidResult,
  WriteContext,
} from "../types";
import { QBO_CAPABILITIES } from "./capabilities";
import { qboJournalEntryPoster } from "./journal-entry-poster";
import { checkQBOHealth } from "./health-checker";
import { canPostToQBO } from "./write-preflight";

/**
 * QuickBooksAdapter — the first conforming implementation of AccountingWriteProvider.
 * Wraps the mature journal-entry-poster / write-preflight / health-checker stack
 * without changing their external behavior. Structural refactor only.
 */
export class QuickBooksAdapter implements AccountingWriteProvider {
  readonly providerId: AccountingProviderId = "quickbooks";
  readonly capabilities: ProviderCapabilities = QBO_CAPABILITIES;

  async postJournalEntry(ctx: WriteContext, entry: JournalEntryInput): Promise<JournalEntryResult> {
    const legacyRequest: JEPostRequest = {
      firm_client_id: ctx.firm_client_id,
      idempotency_key: ctx.idempotency_key,
      source_type: ctx.source_type === "pulse_conversational" ? "manual" : ctx.source_type,
      source_id: ctx.source_id,
      posted_by: ctx.posted_by,
      posted_by_user_id: ctx.actor_user_id,
      assertions_addressed: ctx.assertions_addressed,
      data_source_reliability_basis: ctx.data_source_reliability_basis,
      payload: this.#toLegacyPayload(entry),
    };
    const result = await qboJournalEntryPoster.post(legacyRequest);
    return this.#fromLegacyResult(result);
  }

  async voidJournalEntry(ctx: WriteContext, providerJeId: string, reason: string): Promise<VoidResult> {
    // Legacy poster's reverse() takes attempt_id, not provider_je_id. Look up the
    // attempt record from pulse_je_submissions by provider_je_id → id, then delegate.
    const attemptId = await this.#resolveAttemptId(ctx, providerJeId);
    if (!attemptId) {
      return {
        status: "failed",
        error: `No submission record found for QBO JE ${providerJeId}`,
        retryable: false,
      };
    }
    const result = await qboJournalEntryPoster.reverse(attemptId, reason, ctx.actor_user_id);
    if (result.status === "posted") {
      return { status: "voided", provider_je_id: providerJeId, voided_at: new Date().toISOString() };
    }
    if (result.status === "failed") {
      return { status: "failed", error: result.error, retryable: result.retryable };
    }
    return { status: "failed", error: `Unexpected result status: ${result.status}`, retryable: false };
  }

  async getJournalEntry(_ctx: WriteContext, _providerJeId: string): Promise<JournalEntryDetail | null> {
    // W4 dependency — tie-out worker calls this to verify the JE landed.
    // For W0, returns null (tie-out worker treats null as "not-yet-implemented, skip").
    // Real implementation in W4 uses QBO's GET /journalentry/{id} endpoint.
    return null;
  }

  async preflight(ctx: WriteContext, _entry: JournalEntryInput): Promise<PreflightResult> {
    const result = await canPostToQBO(ctx.firm_client_id);
    return {
      canWrite: Boolean(result.canWrite),
      reasons: result.reason ? [result.reason] : [],
      actionRequired: this.#mapPreflightReason(result.reason),
    };
  }

  async checkHealth(ctx: WriteContext): Promise<HealthCheckResult> {
    const result = await checkQBOHealth(ctx.firm_client_id);
    const healthy = result.status === "healthy";
    const tokenValid = result.status !== "token_expired" && result.status !== "refresh_failed";
    return {
      healthy,
      tokenValid,
      tenantResolvable: Boolean(result.realmId) || healthy,
      message: result.errorMessage,
    };
  }

  #toLegacyPayload(entry: JournalEntryInput): JEPayload {
    const lines: JELine[] = entry.lines.map((line) => ({
      account_id: line.account_id,
      amount: line.amount,
      posting_type: line.side === "debit" ? "Debit" : "Credit",
      description: line.description,
      customer_id: line.customer_id,
      class_id: line.dimensions?.find((d) => d.name === "class")?.value_id,
      department_id: line.dimensions?.find((d) => d.name === "department")?.value_id,
    }));
    return {
      transaction_date: entry.transaction_date,
      narration: entry.narration,
      private_note: entry.private_note,
      lines,
      currency: entry.currency || entry.lines[0]?.currency || "USD",
    };
  }

  #fromLegacyResult(result: {
    status: "posted" | "rejected" | "failed";
    attempt_id: string;
    qbo_je_id?: string;
    reason?: string;
    details?: unknown;
    missingCapability?: string;
    error?: string;
    retryable?: boolean;
  }): JournalEntryResult {
    if (result.status === "posted") {
      return {
        status: "posted",
        submission_id: result.attempt_id,
        provider_je_id: result.qbo_je_id || "",
        posted_at: new Date().toISOString(),
      };
    }
    if (result.status === "rejected") {
      return {
        status: "rejected",
        submission_id: result.attempt_id,
        reason: result.reason || "unknown",
        details: result.details,
        missingCapability: result.missingCapability,
      };
    }
    return {
      status: "failed",
      submission_id: result.attempt_id,
      error: result.error || "unknown",
      retryable: Boolean(result.retryable),
    };
  }

  async #resolveAttemptId(ctx: WriteContext, providerJeId: string): Promise<string | null> {
    const { getSupabaseAdmin } = await import("../../supabase-admin.js");
    const admin = getSupabaseAdmin();
    const { data } = await admin
      .from("pulse_je_submissions")
      .select("id")
      .eq("provider", "quickbooks")
      .eq("provider_je_id", providerJeId)
      .limit(1)
      .maybeSingle();
    if (data?.id) return String(data.id);

    // Fallback: legacy ledger still has the attempt_id for pre-W0 posts.
    const { data: legacy } = await admin
      .from("je_post_attempts")
      .select("attempt_id")
      .eq("firm_client_id", ctx.firm_client_id)
      .eq("qbo_je_id", providerJeId)
      .limit(1)
      .maybeSingle();
    return legacy?.attempt_id ? String(legacy.attempt_id) : null;
  }

  #mapPreflightReason(reason: string | undefined): PreflightResult["actionRequired"] {
    switch (reason) {
      case "unhealthy_connection":
      case "stale_health_check":
      case "realm_missing":
        return "reconnect";
      case "edition_missing_capability":
        return "upgrade_edition";
      case "subscription_read_only":
        return "unlock_period";
      default:
        return "none";
    }
  }
}

/** Singleton — Router (W2) reads from adapter-registry.ts which imports this. */
export const quickBooksAdapter = new QuickBooksAdapter();
