/**
 * W1c.2 — XeroWriteProvider
 *
 * Implements the write surface of AccountingSystemAdapter for Xero.
 * Composes W1b (validator, drift, event emitter, kill-switch, idempotency,
 * upsertXeroAccounts, countXeroAccounts) with raw Xero fetch calls made
 * through the same tenant-aware header pattern the existing
 * XeroWriteProvider uses in lib/integrations/xero/provider.ts.
 *
 * Xero writes journal entries via ManualJournals (POST /api.xro/2.0/ManualJournals).
 * Xero has a DRAFT vs POSTED distinction and preserves line order in the response.
 *
 * As with QBO, this provider is created but not wired into any caller until W1c.3.
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
  countXeroAccounts,
  upsertXeroAccounts,
  WriteBoundaryDisabled,
  WriteRejected,
  WriteDrifted,
  WriteFailed,
  type WriteBoundaryConnection,
  type XeroAccountUpsertInput,
  type ProviderWriteResponse,
} from "@/lib/accounting/write-boundary";
import type {
  AccountingSystemAdapter,
  JournalEntry,
  ValidationResult,
  WriteReceipt,
  AccountsCacheRefreshResult,
  ValidationIssue,
} from "@/lib/integrations/shared/contracts/AccountingSystemAdapter";
import { xeroLaneAdapter } from "@/lib/integrations/xero/adapter";
import { resolvePilotSlotIdForConnection } from "@/lib/integrations/shared/resolve-write-context";

const XERO_API_BASE = "https://api.xero.com/api.xro/2.0";

function toWBConnection(c: AccountingConnectionRecord): WriteBoundaryConnection {
  return {
    id: c.id,
    provider: "xero",
    tenant_or_realm_id: c.tenant_or_realm_id ?? "",
    status: c.status ?? "active",
    metadata_json: (c.metadata_json ?? {}) as Record<string, unknown>,
    home_currency: (c as unknown as { home_currency?: string }).home_currency ?? null,
  };
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
    source_system: "xero" as const,
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

async function emitReject(
  admin: SupabaseClient,
  pilotSlotId: string,
  entry: JournalEntry,
  connection: WriteBoundaryConnection,
  issues: ValidationIssue[],
): Promise<string[]> {
  const id = await emitWriteLifecycleEvent({
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
  return id ? [id] : [];
}

async function xeroFetch(
  connection: AccountingConnectionRecord,
  path: string,
  init: { method: "GET" | "POST" | "PUT"; body?: unknown },
): Promise<{ status: number; ok: boolean; json: Record<string, unknown> }> {
  const tenantId =
    connection.tenant_or_realm_id ??
    (connection as unknown as { external_entity_id?: string }).external_entity_id?.replace(/^xero:/, "") ??
    "";
  if (!tenantId) throw new WriteFailed("xero_tenant_missing", []);
  const response = await fetch(`${XERO_API_BASE}/${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${(connection as unknown as { access_token: string }).access_token}`,
      "xero-tenant-id": tenantId,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { status: response.status, ok: response.ok, json };
}

export class XeroWriteProvider implements AccountingSystemAdapter {
  readonly sourceSystem = "xero" as const;

  // read surface: delegate to lane adapter
  connect = xeroLaneAdapter.connect.bind(xeroLaneAdapter);
  fetchInitialPeriodData = xeroLaneAdapter.fetchInitialPeriodData.bind(xeroLaneAdapter);
  fetchHistoricalData = xeroLaneAdapter.fetchHistoricalData.bind(xeroLaneAdapter);
  normalizeData = xeroLaneAdapter.normalizeData.bind(xeroLaneAdapter);
  validateSourceData = xeroLaneAdapter.validateSourceData.bind(xeroLaneAdapter);
  returnNormalizedFinancialData = xeroLaneAdapter.returnNormalizedFinancialData.bind(xeroLaneAdapter);

  async validateJournalEntry(
    entry: JournalEntry,
    connection: AccountingConnectionRecord,
  ): Promise<ValidationResult> {
    const admin = getSupabaseAdmin();
    return validateJournalEntryWB(admin, entry, toWBConnection(connection));
  }

  async writeJournalEntry(
    entry: JournalEntry,
    connection: AccountingConnectionRecord,
  ): Promise<WriteReceipt> {
    const admin = getSupabaseAdmin();
    const wbConn = toWBConnection(connection);

    if (!writeEnabled(wbConn)) {
      throw new WriteBoundaryDisabled(writeDisabledReason(wbConn));
    }

    const pilotSlotId = await resolvePilotSlotIdForConnection(admin, connection);

    const wbValidation = await validateJournalEntryWB(admin, entry, wbConn);
    if (!wbValidation.valid) {
      const ids = await emitReject(admin, pilotSlotId, entry, wbConn, wbValidation.issues);
      throw new WriteRejected(wbValidation.issues, ids);
    }

    const validatedId = await emitWriteLifecycleEvent({
      admin,
      pilotSlotId,
      eventKind: "pilot.lifecycle.write-validated",
      payload: buildBasePayload(entry, wbConn, {}),
    });
    const validatedIds = validatedId ? [validatedId] : [];

    // Build Xero ManualJournals request. Xero uses NarrationString and JournalLines[].
    // LineAmount sign convention: positive = debit, negative = credit.
    const journalBody = {
      ManualJournals: [
        {
          Narration: entry.narration,
          Date: entry.journalDate,
          Status: entry.status, // "DRAFT" or "POSTED"
          LineAmountTypes: "NoTax",
          JournalLines: entry.lines.map((l) => {
            const isDebit = (l.debit ?? 0) > 0;
            const amount = isDebit ? Number(l.debit) : -Number(l.credit);
            return {
              LineAmount: Number(amount.toFixed(2)),
              AccountCode: l.accountCode,
              Description: l.description,
              Tracking: l.trackingCategoryId
                ? [{ TrackingOptionID: l.trackingCategoryId }]
                : undefined,
            };
          }),
        },
      ],
    };

    const response = await xeroFetch(connection, "ManualJournals", {
      method: "POST",
      body: journalBody,
    });

    if (!response.ok) {
      const ids = [...validatedIds];
      const failEvt = await emitWriteLifecycleEvent({
        admin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.write-failed",
        payload: buildBasePayload(entry, wbConn, {
          http_status: response.status,
          error_message: `xero_${response.status}`,
        }),
      });
      if (failEvt) ids.push(failEvt);
      throw new WriteFailed(`xero_${response.status}`, ids, response.status);
    }

    const created = Array.isArray(response.json?.ManualJournals) ? response.json.ManualJournals[0] : null;
    const journalId = created?.ManualJournalID;
    if (!journalId) {
      const ids = [...validatedIds];
      const failEvt = await emitWriteLifecycleEvent({
        admin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.write-failed",
        payload: buildBasePayload(entry, wbConn, {
          http_status: response.status,
          error_message: "xero_response_missing_id",
        }),
      });
      if (failEvt) ids.push(failEvt);
      throw new WriteFailed("xero_response_missing_id", ids, response.status);
    }

    // Reconstruct recordedLines from Xero response (order preserved).
    // Positive LineAmount = debit; negative = credit.
    const recordedXeroLines = Array.isArray(created.JournalLines) ? created.JournalLines : [];
    const recordedLines = recordedXeroLines.map(
      (jl: { AccountCode?: string; AccountID?: string; LineAmount?: number }) => {
        const amt = Number(jl?.LineAmount ?? 0);
        return {
          accountCode: String(jl?.AccountCode ?? ""),
          accountId: String(jl?.AccountID ?? jl?.AccountCode ?? ""),
          debit: amt >= 0 ? amt : 0,
          credit: amt < 0 ? -amt : 0,
        };
      },
    );
    const warnings = Array.isArray(created.Warnings)
      ? created.Warnings.map((w: { Message?: string }) => String(w?.Message ?? ""))
      : [];
    const providerResponse: ProviderWriteResponse = {
      providerJournalId: String(journalId),
      providerJournalNumber: created?.JournalNumber ? String(created.JournalNumber) : undefined,
      status: (created?.Status as "DRAFT" | "POSTED") ?? entry.status,
      writtenAt: parseXeroDate(created?.UpdatedDateUTC) ?? new Date().toISOString(),
      recordedLines,
      warnings,
    };
    const drift = detectDrift(entry, providerResponse);
    if (drift.drifted) {
      // Xero manual journal void = PUT with Status="VOIDED".
      let voidedId: string | undefined;
      try {
        await xeroFetch(connection, `ManualJournals/${journalId}`, {
          method: "PUT",
          body: { ManualJournals: [{ ManualJournalID: journalId, Status: "VOIDED" }] },
        });
        voidedId = String(journalId);
      } catch (voidErr) {
        console.error("[XeroWriteProvider] void-after-drift failed", voidErr);
      }
      const ids = [...validatedIds];
      const driftEvt = await emitWriteLifecycleEvent({
        admin,
        pilotSlotId,
        eventKind: "pilot.lifecycle.write-drifted",
        payload: buildBasePayload(entry, wbConn, {
          provider_journal_id: String(journalId),
          drift_reasons: drift.reasons,
          voided_journal_id: voidedId,
        }),
      });
      if (driftEvt) ids.push(driftEvt);
      throw new WriteDrifted(drift.reasons, ids, voidedId);
    }

    const ids = [...validatedIds];
    const postedEvt = await emitWriteLifecycleEvent({
      admin,
      pilotSlotId,
      eventKind: "pilot.lifecycle.write-posted",
      payload: buildBasePayload(entry, wbConn, {
        provider_journal_id: String(journalId),
        provider_journal_number: providerResponse.providerJournalNumber,
        status: providerResponse.status,
        written_at: providerResponse.writtenAt,
      }),
    });
    if (postedEvt) ids.push(postedEvt);

    return {
      providerJournalId: String(journalId),
      providerJournalNumber: providerResponse.providerJournalNumber,
      status: providerResponse.status,
      writtenAt: providerResponse.writtenAt,
      resolvedAccounts: entry.lines.map((l, i) => ({
        accountCode: l.accountCode,
        accountId: recordedLines[i]?.accountId ?? l.accountId ?? l.accountCode,
      })),
      lifecycleEventIds: ids,
    };
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
    const pilotSlotId = await resolvePilotSlotIdForConnection(admin, connection);
    const response = await xeroFetch(connection, `ManualJournals/${providerJournalId}`, {
      method: "PUT",
      body: { ManualJournals: [{ ManualJournalID: providerJournalId, Status: "VOIDED" }] },
    });
    if (!response.ok) {
      throw new WriteFailed(`xero_${response.status}_void`, [], response.status);
    }
    await emitWriteLifecycleEvent({
      admin,
      pilotSlotId,
      eventKind: "pilot.lifecycle.write-void-succeeded",
      payload: {
        connection_id: connection.id,
        tenant_id: connection.tenant_or_realm_id ?? "",
        source_system: "xero",
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
  ): Promise<AccountsCacheRefreshResult> {
    const admin = getSupabaseAdmin();
    const before = await countXeroAccounts(admin, connection.id);
    const response = await xeroFetch(connection, "Accounts", { method: "GET" });
    if (!response.ok) {
      throw new WriteFailed(`xero_${response.status}_accounts`, [], response.status);
    }
    const list = Array.isArray(response.json?.Accounts) ? response.json.Accounts : [];
    const rows: XeroAccountUpsertInput[] = list.map((a: Record<string, unknown>) => ({
      connection_id: connection.id,
      tenant_id: connection.tenant_or_realm_id ?? "",
      account_id: String(a.AccountID ?? ""),
      account_code: String(a.Code ?? ""),
      account_name: String(a.Name ?? ""),
      account_type: String(a.Type ?? ""),
      account_class: (a.Class as string) ?? null,
      system_account: (a.SystemAccount as string) ?? null,
      status: String(a.Status ?? "ACTIVE"),
      enable_payments_to_account: a.EnablePaymentsToAccount === true,
      tax_type: (a.TaxType as string) ?? null,
      description: (a.Description as string) ?? null,
      updated_date_utc: parseXeroDate(a.UpdatedDateUTC as string | undefined),
      raw_payload: a,
    }));
    await upsertXeroAccounts(admin, rows);
    const after = await countXeroAccounts(admin, connection.id);
    const added = Math.max(0, after - before);
    return {
      refreshedAt: new Date().toISOString(),
      totalAccounts: after,
      addedAccounts: added,
      updatedAccounts: rows.length - added,
      removedAccounts: 0,
    };
  }
}

/**
 * Xero returns dates as "/Date(1699999999999+0000)/" strings. Convert to ISO8601.
 */
function parseXeroDate(input: string | undefined | null): string | null {
  if (!input) return null;
  if (input.startsWith("/Date(")) {
    const match = input.match(/\/Date\((\d+)([+-]\d{4})?\)\//);
    if (match) return new Date(Number(match[1])).toISOString();
    return null;
  }
  // Already ISO8601 → passthrough.
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export const xeroWriteProvider = new XeroWriteProvider();
