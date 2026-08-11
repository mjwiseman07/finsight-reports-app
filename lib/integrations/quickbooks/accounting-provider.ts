/**
 * W1c.2 — QuickBooksWriteProvider
 *
 * Implements the write surface of AccountingSystemAdapter by composing:
 *   - W1b: writeEnabled kill-switch, validateJournalEntry, detectDrift,
 *          emitWriteLifecycleEvent, computeRequestHash, findPriorWriteByExternalRef,
 *          upsertQboAccounts, countQboAccounts
 *   - W1c.1 (qbo-preflight): canPostToQBO, validateJEPayload, resolveCurrencyForFirmClient,
 *          resolveExchangeRate, resolveQBOTokenForFirmClient
 *   - W1c.1 (type-adapters): toJEPayload, toWriteReceipt
 *   - lib/qbo/api-fetch: raw HTTP with QuotaGuard proxy
 *
 * The read surface (connect/fetch/normalize/validateSource/returnNormalizedFinancialData)
 * is delegated to the existing quickBooksLaneAdapter's read methods so this new provider
 * fully satisfies AccountingSystemAdapter.
 *
 * IMPORTANT: This provider is created and exported but not wired into the Q7 poster
 * until W1c.3. The Q7 poster continues to be the only real write path in prod.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin.js";
import type { AccountingConnectionRecord } from "@/lib/integrations/accounting/types";
import {
  writeEnabled,
  writeDisabledReason,
  validateJournalEntry as validateJournalEntryWB,
  detectDrift,
  emitWriteLifecycleEvent,
  computeRequestHash,
  upsertQboAccounts,
  readAllQboAccounts,
  markQboAccountsInactive,
  diffQboAccounts,
  WriteBoundaryDisabled,
  WriteRejected,
  WriteDrifted,
  WriteFailed,
  type WriteBoundaryConnection,
  type QboAccountUpsertInput,
  type ProviderWriteResponse,
  type CacheRefreshedPayload,
  checkQboCacheForWrite,
} from "@/lib/accounting/write-boundary";
import type {
  AccountingSystemAdapter,
  JournalEntry,
  ValidationResult,
  WriteReceipt,
  AccountsCacheRefreshResult,
  AccountsCacheRefreshOptions,
  ValidationIssue,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
import { qboPreflight, typeAdapters } from "@/lib/accounting/write-boundary";
import { quickBooksLaneAdapter } from "@/lib/integrations/quickbooks/adapter";
import {
  resolveFirmClientIdForConnection,
  resolvePilotSlotIdForConnection,
} from "@/lib/integrations/shared/resolve-write-context";
import { upsertMemory } from "@/lib/memory/client-memory-service";

const {
  canPostToQBO,
  validateJEPayload,
  resolveCurrencyForFirmClient,
  resolveExchangeRate,
  resolveQBOTokenForFirmClient,
} = qboPreflight;
const { toJEPayload, toWriteReceipt } = typeAdapters;

function qboApiBase(): string {
  return process.env.QB_ENVIRONMENT === "production"
    ? "https://quickbooks.api.intuit.com"
    : "https://sandbox-quickbooks.api.intuit.com";
}

function toWBConnection(c: AccountingConnectionRecord): WriteBoundaryConnection {
  return {
    id: c.id,
    provider: "quickbooks",
    tenant_or_realm_id: c.tenant_or_realm_id ?? "",
    status: c.status ?? "active",
    metadata_json: (c.metadata_json ?? {}) as Record<string, unknown>,
    home_currency: (c as unknown as { home_currency?: string }).home_currency ?? null,
  };
}

async function emitReject(
  admin: SupabaseClient,
  pilotSlotId: string,
  entry: JournalEntry,
  connection: WriteBoundaryConnection,
  issues: ValidationIssue[],
): Promise<string[]> {
  const eventId = await emitWriteLifecycleEvent({
    admin,
    pilotSlotId,
    eventKind: "pilot.lifecycle.write-rejected",
    payload: buildBasePayload(entry, connection, {
      validation_issues: issues.map((i) => ({
        code: i.code,
        message: i.message,
        line_index: i.lineIndex,
        account_code: i.accountCode,
        system_account: i.systemAccount,
        account_type: i.accountType,
      })),
    }),
  });
  return eventId ? [eventId] : [];
}

async function emitValidated(
  admin: SupabaseClient,
  pilotSlotId: string,
  entry: JournalEntry,
  connection: WriteBoundaryConnection,
): Promise<string[]> {
  const eventId = await emitWriteLifecycleEvent({
    admin,
    pilotSlotId,
    eventKind: "pilot.lifecycle.write-validated",
    payload: buildBasePayload(entry, connection, {}),
  });
  return eventId ? [eventId] : [];
}

function buildBasePayload(
  entry: JournalEntry,
  connection: WriteBoundaryConnection,
  extra: Record<string, unknown>,
) {
  const totalDebits = entry.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredits = entry.lines.reduce((s, l) => s + (l.credit || 0), 0);
  return {
    connection_id: connection.id,
    tenant_id: connection.tenant_or_realm_id,
    source_system: "quickbooks" as const,
    external_ref: entry.externalRef,
    narration: entry.narration,
    journal_date: entry.journalDate,
    currency: entry.currency,
    line_count: entry.lines.length,
    total_debits: Number(totalDebits.toFixed(2)),
    total_credits: Number(totalCredits.toFixed(2)),
    request_hash: computeRequestHash(entry),
    provenance: "live" as const,
    ...extra,
  };
}

export class QuickBooksWriteProvider implements AccountingSystemAdapter {
  readonly sourceSystem = "quickbooks" as const;

  // --- read surface: delegate to the existing lane adapter --------------
  connect = quickBooksLaneAdapter.connect.bind(quickBooksLaneAdapter);
  fetchInitialPeriodData = quickBooksLaneAdapter.fetchInitialPeriodData.bind(quickBooksLaneAdapter);
  fetchHistoricalData = quickBooksLaneAdapter.fetchHistoricalData.bind(quickBooksLaneAdapter);
  normalizeData = quickBooksLaneAdapter.normalizeData.bind(quickBooksLaneAdapter);
  validateSourceData = quickBooksLaneAdapter.validateSourceData.bind(quickBooksLaneAdapter);
  returnNormalizedFinancialData = quickBooksLaneAdapter.returnNormalizedFinancialData.bind(quickBooksLaneAdapter);

  // --- write surface -----------------------------------------------------

  async validateJournalEntry(
    entry: JournalEntry,
    connection: AccountingConnectionRecord,
  ): Promise<ValidationResult> {
    const admin = getSupabaseAdmin();
    const wbConn = toWBConnection(connection);
    // W1b structural + forbidden-account + idempotency
    return validateJournalEntryWB(admin, entry, wbConn);
  }

  async writeJournalEntry(
    entry: JournalEntry,
    connection: AccountingConnectionRecord,
  ): Promise<WriteReceipt> {
    const admin = getSupabaseAdmin();
    const wbConn = toWBConnection(connection);

    // --- kill-switch (always first) --------------------------------------
    if (!writeEnabled(wbConn)) {
      throw new WriteBoundaryDisabled(writeDisabledReason(wbConn));
    }

    // --- resolve pilot_slot_id + firm_client_id --------------------------
    const firmClientId = await resolveFirmClientIdForConnection(admin, connection);
    const pilotSlotId = await resolvePilotSlotIdForConnection(admin, connection, firmClientId);

    // --- W1b validator (structural + forbidden + duplicate externalRef) --
    const wbValidation = await validateJournalEntryWB(admin, entry, wbConn);
    if (!wbValidation.valid) {
      const ids = await emitReject(admin, pilotSlotId, entry, wbConn, wbValidation.issues);
      throw new WriteRejected(wbValidation.issues, ids);
    }

    // WBP W1c.4c — accounts-cache preflight self-heal (before edition preflight).
    {
      const referencedAccountIds = entry.lines
        .map((l) => String(l.accountCode ?? ""))
        .filter((id) => id.length > 0);
      const decision = await checkQboCacheForWrite({
        admin,
        connectionId: connection.id,
        referencedAccountIds,
      });
      if (decision.shouldRefresh) {
        await this.refreshAccountsCache(connection, { trigger: decision.trigger });
      }
    }

    // --- W1c.1 Q7 preflight (edition + subscription + health) ------------
    const preflight = await canPostToQBO(firmClientId);
    if (!preflight.canWrite) {
      const issues: ValidationIssue[] = [
        {
          code: "provider-rejected",
          message: `Q7 preflight blocked: ${preflight.reason ?? "unknown"} (edition=${preflight.edition ?? "null"}, subscription=${preflight.subscriptionStatus ?? "null"})`,
        },
      ];
      const ids = await emitReject(admin, pilotSlotId, entry, wbConn, issues);
      throw new WriteRejected(issues, ids);
    }

    // --- resolve currency + token + rate ---------------------------------
    const currencyResolution = await resolveCurrencyForFirmClient(
      admin,
      firmClientId,
      entry.currency,
    );
    if (!currencyResolution.ok) {
      const issues: ValidationIssue[] = [
        { code: "currency-mismatch", message: `currency resolution failed: ${currencyResolution.reason}` },
      ];
      const ids = await emitReject(admin, pilotSlotId, entry, wbConn, issues);
      throw new WriteRejected(issues, ids);
    }

    const tokenBundle = await resolveQBOTokenForFirmClient(firmClientId);
    if (!tokenBundle) {
      throw new WriteFailed("no_qbo_token", [], undefined, "token_missing");
    }

    const rateResult = await resolveExchangeRate(
      tokenBundle.realmId,
      tokenBundle.accessToken,
      currencyResolution.currency,
      currencyResolution.home_currency,
      entry.journalDate,
      tokenBundle.ownerUserId,
    );
    if (!rateResult.ok) {
      const issues: ValidationIssue[] = [
        { code: "currency-mismatch", message: `exchange rate resolution failed: ${rateResult.reason}` },
      ];
      const ids = await emitReject(admin, pilotSlotId, entry, wbConn, issues);
      throw new WriteRejected(issues, ids);
    }

    // --- convert to Q7 JEPayload + Q7 payload-level validator ------------
    const jePayload = toJEPayload(entry, {
      currency: currencyResolution.currency,
      privateNote: `wbp:${entry.externalRef}`,
    });
    const q7Validation = await validateJEPayload(
      firmClientId,
      jePayload,
      tokenBundle.realmId,
      tokenBundle.accessToken,
      currencyResolution.currency,
      currencyResolution.home_currency,
      tokenBundle.ownerUserId,
    );
    if (!q7Validation.valid) {
      const issues: ValidationIssue[] = [
        {
          code: "provider-rejected", // added in W1c.1
          message: `Q7 payload validator rejected: ${q7Validation.reason}`,
        },
      ];
      const ids = await emitReject(admin, pilotSlotId, entry, wbConn, issues);
      throw new WriteRejected(issues, ids);
    }

    // --- emit write-validated NOW so downstream events chain from here ---
    const validatedIds = await emitValidated(admin, pilotSlotId, entry, wbConn);

    // --- build QBO body (identical to Q7 poster's buildQBOJournalEntry) ---
    const qboBody = {
      TxnDate: jePayload.transaction_date,
      PrivateNote: jePayload.private_note,
      CurrencyRef: { value: currencyResolution.currency },
      ExchangeRate: Number(rateResult.rate.toFixed(6)),
      Line: jePayload.lines.map((l, idx) => ({
        Id: String(idx),
        DetailType: "JournalEntryLineDetail",
        Amount: Number(l.amount.toFixed(2)),
        Description: l.description,
        JournalEntryLineDetail: {
          PostingType: l.posting_type,
          AccountRef: { value: l.account_id },
          ClassRef: l.class_id ? { value: l.class_id } : undefined,
        },
      })),
    };

    // --- POST with one 401 retry via forced token refresh ---------------
    const { qboApiFetch } = await import("@/lib/qbo/api-fetch.js");
    const url = `${qboApiBase()}/v3/company/${tokenBundle.realmId}/journalentry?minorversion=73`;

    let response = await qboApiFetch(url, {
      accessToken: tokenBundle.accessToken,
      method: "POST",
      body: qboBody,
      context: tokenBundle.ownerUserId
        ? { userId: tokenBundle.ownerUserId, realmId: tokenBundle.realmId }
        : undefined,
    });

    if (response.status === 401) {
      const refreshed = await resolveQBOTokenForFirmClient(firmClientId, { forceRefresh: true });
      if (!refreshed) {
        const ids = [...validatedIds];
        const failEvt = await emitWriteLifecycleEvent({
          admin,
          pilotSlotId,
          eventKind: "pilot.lifecycle.write-failed",
          payload: buildBasePayload(entry, wbConn, {
            http_status: 401,
            error_message: "token_refresh_failed",
          }),
        });
        if (failEvt) ids.push(failEvt);
        throw new WriteFailed("token_refresh_failed", ids, 401, "token_refresh_failed");
      }
      response = await qboApiFetch(url, {
        accessToken: refreshed.accessToken,
        method: "POST",
        body: qboBody,
        context: refreshed.ownerUserId
          ? { userId: refreshed.ownerUserId, realmId: refreshed.realmId }
          : undefined,
      });
    }

    if (!response.ok) {
      const ids = [...validatedIds];
      const failEvt = await emitWriteLifecycleEvent({
        admin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.write-failed",
        payload: buildBasePayload(entry, wbConn, {
          http_status: response.status,
          error_message: `qbo_${response.status}`,
        }),
      });
      if (failEvt) ids.push(failEvt);
      throw new WriteFailed(
        `qbo_${response.status}`,
        ids,
        response.status,
        `qbo_${response.status}`,
      );
    }

    const qboJson = response.json;
    const qboJEId = qboJson?.JournalEntry?.Id;
    if (!qboJEId) {
      const ids = [...validatedIds];
      const failEvt = await emitWriteLifecycleEvent({
        admin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.write-failed",
        payload: buildBasePayload(entry, wbConn, {
          http_status: response.status,
          error_message: "qbo_response_missing_id",
        }),
      });
      if (failEvt) ids.push(failEvt);
      throw new WriteFailed("qbo_response_missing_id", ids, response.status);
    }

    // --- drift detection --------------------------------------------------
    // Reconstruct recordedLines from QBO response. QBO preserves order.
    const recordedQboLines = Array.isArray(qboJson.JournalEntry.Line)
      ? qboJson.JournalEntry.Line.filter(
          (l: { DetailType?: string }) => l?.DetailType === "JournalEntryLineDetail",
        )
      : [];
    const recordedLines = recordedQboLines.map(
      (l: {
        JournalEntryLineDetail?: { PostingType?: string; AccountRef?: { value?: string } };
        Amount?: number;
      }) => {
        const amt = Number(l?.Amount ?? 0);
        const posting = l?.JournalEntryLineDetail?.PostingType;
        const accountId = String(l?.JournalEntryLineDetail?.AccountRef?.value ?? "");
        return {
          accountCode: accountId, // QBO uses Account.Id as the canonical code
          accountId,
          debit: posting === "Debit" ? amt : 0,
          credit: posting === "Credit" ? amt : 0,
        };
      },
    );
    const providerResponse: ProviderWriteResponse = {
      providerJournalId: String(qboJEId),
      status: "POSTED", // QBO has no DRAFT concept
      writtenAt: (qboJson.JournalEntry.MetaData?.CreateTime as string) ?? new Date().toISOString(),
      recordedLines,
      warnings: [], // QBO does not return ValidationErrorCollection on 2xx
    };
    const drift = detectDrift({ ...entry, status: "POSTED" }, providerResponse);
    if (drift.drifted) {
      // Void the drifted JE, emit drifted event, then throw WriteDrifted.
      // Best-effort void; if it fails, we still throw with driftReasons.
      let voidedId: string | undefined;
      try {
        await this.voidJournalEntry(String(qboJEId), `drift: ${drift.reasons.join("; ")}`, connection);
        voidedId = String(qboJEId);
      } catch (voidErr) {
        console.error("[QuickBooksWriteProvider] void-after-drift failed", voidErr);
      }
      const ids = [...validatedIds];
      const driftEvt = await emitWriteLifecycleEvent({
        admin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.write-drifted",
        payload: buildBasePayload(entry, wbConn, {
          provider_journal_id: String(qboJEId),
          drift_reasons: drift.reasons,
          voided_journal_id: voidedId,
        }),
      });
      if (driftEvt) ids.push(driftEvt);
      throw new WriteDrifted(drift.reasons, ids, voidedId);
    }

    // --- emit write-posted -----------------------------------------------
    const ids = [...validatedIds];
    const postedEvt = await emitWriteLifecycleEvent({
      admin,
      pilotSlotId,
      eventKind: "pilot.lifecycle.write-posted",
      payload: buildBasePayload(entry, wbConn, {
        provider_journal_id: String(qboJEId),
        status: "POSTED",
        written_at: providerResponse.writtenAt,
      }),
    });
    if (postedEvt) ids.push(postedEvt);

    // --- convert to WriteReceipt via type adapter ------------------------
    return toWriteReceipt(
      { status: "posted", attempt_id: "wbp-" + qboJEId, qbo_je_id: String(qboJEId) },
      entry,
      { lifecycleEventIds: ids, writtenAt: providerResponse.writtenAt, status: "POSTED" },
    );
  }

  async voidJournalEntry(
    providerJournalId: string,
    reason: string,
    connection: AccountingConnectionRecord,
  ): Promise<void> {
    const admin = getSupabaseAdmin();
    const wbConn = toWBConnection(connection);
    if (!writeEnabled(wbConn)) {
      throw new WriteBoundaryDisabled(writeDisabledReason(wbConn));
    }
    const firmClientId = await resolveFirmClientIdForConnection(admin, connection);
    const pilotSlotId = await resolvePilotSlotIdForConnection(admin, connection, firmClientId);
    const tokenBundle = await resolveQBOTokenForFirmClient(firmClientId);
    if (!tokenBundle) {
      throw new WriteFailed("no_qbo_token", [], undefined, "token_missing");
    }
    const { qboApiFetch } = await import("@/lib/qbo/api-fetch.js");
    // QBO's void semantics: POST /journalentry?operation=void with { Id, SyncToken }.
    // We need SyncToken; fetch the JE first.
    const getUrl = `${qboApiBase()}/v3/company/${tokenBundle.realmId}/journalentry/${providerJournalId}?minorversion=73`;
    const getResp = await qboApiFetch(getUrl, {
      accessToken: tokenBundle.accessToken,
      method: "GET",
      context: tokenBundle.ownerUserId
        ? { userId: tokenBundle.ownerUserId, realmId: tokenBundle.realmId }
        : undefined,
    });
    if (!getResp.ok) {
      throw new WriteFailed(`qbo_${getResp.status}_get_before_void`, [], getResp.status);
    }
    const syncToken = getResp.json?.JournalEntry?.SyncToken;
    if (syncToken === undefined || syncToken === null) {
      throw new WriteFailed("qbo_missing_sync_token", [], undefined);
    }
    const voidUrl = `${qboApiBase()}/v3/company/${tokenBundle.realmId}/journalentry?operation=void&minorversion=73`;
    const voidResp = await qboApiFetch(voidUrl, {
      accessToken: tokenBundle.accessToken,
      method: "POST",
      body: { Id: providerJournalId, SyncToken: syncToken },
      context: tokenBundle.ownerUserId
        ? { userId: tokenBundle.ownerUserId, realmId: tokenBundle.realmId }
        : undefined,
    });
    if (!voidResp.ok) {
      throw new WriteFailed(`qbo_${voidResp.status}_void`, [], voidResp.status);
    }
    await emitWriteLifecycleEvent({
      admin,
      pilotSlotId,
      eventKind: "pilot.lifecycle.write-void-succeeded",
      payload: {
        connection_id: connection.id,
        tenant_id: connection.tenant_or_realm_id ?? "",
        source_system: "quickbooks",
        external_ref: `void:${providerJournalId}`,
        narration: `void ${providerJournalId}`,
        journal_date: new Date().toISOString().slice(0, 10),
        currency: (connection as unknown as { home_currency?: string }).home_currency ?? "USD",
        line_count: 0,
        total_debits: 0,
        total_credits: 0,
        request_hash: "n/a",
        provider_journal_id: providerJournalId,
        voided_reason: reason,
        provenance: "live",
      },
    });
  }

  async refreshAccountsCache(
    connection: AccountingConnectionRecord,
    options?: AccountsCacheRefreshOptions,
  ): Promise<AccountsCacheRefreshResult> {
    // WBP W1c.4b/4c — precise diff refresh with lifecycle event + memory upsert.
    // Replaces the prior count-delta estimate that could not detect renames or
    // removed accounts. options.trigger defaults to "manual".
    const admin = getSupabaseAdmin();
    const firmClientId = await resolveFirmClientIdForConnection(admin, connection);
    const pilotSlotId = await resolvePilotSlotIdForConnection(admin, connection, firmClientId);
    const tokenBundle = await resolveQBOTokenForFirmClient(firmClientId);
    if (!tokenBundle) {
      throw new WriteFailed("no_qbo_token", [], undefined, "token_missing");
    }

    const startedAt = Date.now();
    const refreshedAtIso = new Date(startedAt).toISOString();

    // Snapshot cache BEFORE upsert so we can compute an accurate diff.
    const cached = await readAllQboAccounts(admin, connection.id);

    // Fetch all accounts upstream. QBO paginates via STARTPOSITION + MAXRESULTS.
    const { qboApiFetch } = await import("@/lib/qbo/api-fetch.js");
    const upstream: QboAccountUpsertInput[] = [];
    let startPos = 1;
    const pageSize = 1000;
    let paginationPages = 0;

    while (true) {
      const query = `SELECT * FROM Account STARTPOSITION ${startPos} MAXRESULTS ${pageSize}`;
      const url = `${qboApiBase()}/v3/company/${tokenBundle.realmId}/query?minorversion=73&query=${encodeURIComponent(query)}`;
      const resp = await qboApiFetch(url, {
        accessToken: tokenBundle.accessToken,
        method: "GET",
        context: tokenBundle.ownerUserId
          ? { userId: tokenBundle.ownerUserId, realmId: tokenBundle.realmId }
          : undefined,
      });
      if (!resp.ok) {
        throw new WriteFailed(`qbo_${resp.status}_accounts_query`, [], resp.status);
      }
      paginationPages += 1;
      const page = resp.json?.QueryResponse?.Account ?? [];
      if (page.length === 0) break;
      for (const a of page as Array<Record<string, unknown>>) {
        upstream.push({
          connection_id: connection.id,
          realm_id: tokenBundle.realmId,
          account_id: String(a.Id ?? ""),
          account_name: String(a.Name ?? ""),
          fully_qualified_name: (a.FullyQualifiedName as string) ?? null,
          account_type: String(a.AccountType ?? ""),
          account_sub_type: (a.AccountSubType as string) ?? null,
          classification: (a.Classification as string) ?? null,
          active: a.Active !== false,
          currency_ref: ((a.CurrencyRef as { value?: string } | undefined)?.value) ?? null,
          parent_ref: ((a.ParentRef as { value?: string } | undefined)?.value) ?? null,
          meta_created_time: ((a.MetaData as { CreateTime?: string } | undefined)?.CreateTime) ?? null,
          meta_last_updated_time:
            ((a.MetaData as { LastUpdatedTime?: string } | undefined)?.LastUpdatedTime) ?? null,
          raw_payload: a,
        });
      }
      if (page.length < pageSize) break;
      startPos += pageSize;
    }

    // Compute precise diff BEFORE upsert (upsert would mutate cached snapshots).
    const diff = diffQboAccounts(cached, upstream);

    // Persist: upsert everything upstream, then mark anything not-upstream inactive.
    await upsertQboAccounts(admin, upstream);
    const upstreamIds = upstream.map((r) => r.account_id).filter((id) => id.length > 0);
    await markQboAccountsInactive(admin, connection.id, upstreamIds);

    const apiCallDurationMs = Date.now() - startedAt;

    // Build the payload — SAME shape for lifecycle event AND client_memory row.
    const trigger: CacheRefreshedPayload["trigger"] = options?.trigger ?? "manual";
    const payload: CacheRefreshedPayload = {
      connection_id: connection.id,
      tenant_id: tokenBundle.realmId,
      source_system: "quickbooks",
      total_accounts: upstream.length,
      added_accounts: diff.addedCount,
      updated_accounts: diff.updatedCount,
      removed_accounts: diff.removedCount,
      refreshed_at: refreshedAtIso,
      trigger,
      api_call_duration_ms: apiCallDurationMs,
      pagination_pages: paginationPages,
      changed_account_codes:
        diff.changedIdentifiers.length > 0 ? diff.changedIdentifiers : undefined,
    };

    // Emit patented lifecycle event to the hash-chained pilot_lifecycle_events table.
    await emitWriteLifecycleEvent({
      admin,
      pilotSlotId,
      eventKind: "pilot.lifecycle.cache-refreshed",
      payload,
    });

    // Same-day dedupe: upsertMemory with deterministic memoryId derived from
    // (connection_id, refreshDate) keeps a single canonical daily row that
    // mutates in place. Lifecycle events still append separately.
    const refreshDate = refreshedAtIso.slice(0, 10);
    await upsertMemory({
      firmClientId,
      memoryType: "accounts_cache_refresh",
      memoryId: `mem_cache_refresh_${connection.id}_${refreshDate}`,
      memoryKey: `cache_refresh_${connection.id}_${refreshDate}`,
      domain: "accounting",
      subdomain: "connections",
      topic: "accounts_cache",
      entityType: "accounting_connection",
      entityId: connection.id,
      payload: payload as unknown as Record<string, unknown>,
      sourceSystem: "cache_refresh",
    });

    return {
      refreshedAt: refreshedAtIso,
      totalAccounts: upstream.length,
      addedAccounts: diff.addedCount,
      updatedAccounts: diff.updatedCount,
      removedAccounts: diff.removedCount,
    };
  }
}

export const quickBooksWriteProvider = new QuickBooksWriteProvider();
