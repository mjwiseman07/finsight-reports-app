/**
 * Phase DASH_1C Block A — GET /api/dashboard/accuracy-contract
 *
 * Query: kpi_code, period, pilot_slot_id (optional).
 * Emits a hash-chained provenance receipt on every successful response.
 */

import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { composeAccuracyContract } from "@/lib/dashboard/accuracy-contract/compose-contract";
import {
  readCachedContract,
  writeCachedContract,
} from "@/lib/dashboard/accuracy-contract/cache";
import { checkAccuracyContractGate } from "@/lib/dashboard/accuracy-contract/gate";
import { emitProvenanceLifecycleEvent } from "@/lib/lifecycle/emit-provenance-event";
import type { KpiCode } from "@/lib/dashboard/accuracy-contract/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPPORTED_KPIS: readonly KpiCode[] = [
  "cash_position",
  "net_profit_margin",
  "net_op_cash_flow",
  "ar_aging",
  "north_star",
] as const;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = randomUUID();
  const t0 = Date.now();

  try {
    const url = new URL(request.url);
    const kpiCode = url.searchParams.get("kpi_code");
    const period = url.searchParams.get("period");
    const pilotSlotIdParam = url.searchParams.get("pilot_slot_id");

    if (!kpiCode || !SUPPORTED_KPIS.includes(kpiCode as KpiCode)) {
      return jsonError(400, "kpi_unsupported", { kpi_code: kpiCode }, requestId);
    }
    if (!period || !/^\d{4}-\d{2}(\.\.\d{4}-\d{2})?$/.test(period)) {
      return jsonError(400, "invalid_period", { period }, requestId);
    }

    const ctx = await requireFirmAuth(request);
    const admin = createServiceClient();

    const companyId = await resolveCompanyId(admin, {
      userId: ctx.userId,
      pilotSlotId: pilotSlotIdParam,
    });
    if (!companyId) {
      return jsonError(404, "no_company_for_user", {}, requestId);
    }

    const gate = await checkAccuracyContractGate(admin, {
      userId: ctx.userId,
      companyId,
    });
    if (!gate.allowed) {
      return jsonError(403, "entitlement_denied", { reason: gate.reason }, requestId);
    }

    const { data: latestSync } = await admin
      .from("accounting_syncs")
      .select("id")
      .eq("company_id", companyId)
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latestSync?.id) {
      return jsonError(404, "no_sync_for_company", {}, requestId);
    }
    const accountingSyncsId = latestSync.id as string;

    const cached = await readCachedContract(admin, {
      companyId,
      kpiCode: kpiCode as KpiCode,
      period,
      accountingSyncsId,
    });

    const { data: companyRow } = await admin
      .from("companies")
      .select("industry_type, industry")
      .eq("id", companyId)
      .maybeSingle();
    const industryType =
      (companyRow?.industry_type as string | undefined) ||
      (companyRow?.industry as string | undefined) ||
      "General";

    let contract = cached;
    if (!cached) {
      const composed = await composeAccuracyContract({
        admin,
        companyId,
        industryType,
        kpiCode: kpiCode as KpiCode,
        period,
      });
      contract = composed.contract;
      await writeCachedContract(
        admin,
        {
          companyId,
          kpiCode: kpiCode as KpiCode,
          period,
          accountingSyncsId,
        },
        contract,
      );
    }

    if (contract) {
      void emitProvenanceLifecycleEvent({
        admin,
        pilotSlotId: gate.pilotSlotId,
        userId: ctx.userId,
        payload: {
          kpi_code: kpiCode as string,
          period,
          accounting_syncs_id: accountingSyncsId,
          receipt_chain_seq: contract.chain_receipt.chain_seq,
          receipt_row_hash: contract.chain_receipt.row_hash,
          computation_status: contract.computation_status,
          request_id: requestId,
          user_agent: request.headers.get("user-agent"),
        },
      });
    }

    const durationMs = Date.now() - t0;
    return NextResponse.json(
      {
        ok: true,
        request_id: requestId,
        duration_ms: durationMs,
        contract,
      },
      { headers: { "x-advisacor-request-id": requestId } },
    );
  } catch (e: unknown) {
    const err = e as {
      httpStatus?: number;
      message?: string;
      detail?: Record<string, unknown>;
      status?: number;
    };
    if (err?.httpStatus) {
      return jsonError(err.httpStatus, err.message ?? "error", err.detail ?? {}, requestId);
    }
    if (err?.status && typeof err.status === "number") {
      return authErrorResponse(e);
    }
    console.error("[accuracy-contract] unhandled", {
      requestId,
      error: err?.message,
    });
    return jsonError(500, "internal", { message: err?.message ?? "unknown" }, requestId);
  }
}

async function resolveCompanyId(
  admin: ReturnType<typeof createServiceClient>,
  args: { userId: string; pilotSlotId: string | null },
): Promise<string | null> {
  if (args.pilotSlotId) {
    const { data } = await admin
      .from("pilot_slots")
      .select("company_id")
      .eq("id", args.pilotSlotId)
      .maybeSingle();
    if (data?.company_id) return data.company_id as string;
  }
  const { data: cu } = await admin
    .from("company_users")
    .select("company_id")
    .eq("user_id", args.userId)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (cu?.company_id as string | undefined) ?? null;
}

function jsonError(
  status: number,
  code: string,
  detail: Record<string, unknown>,
  requestId: string,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, ...detail }, request_id: requestId },
    { status, headers: { "x-advisacor-request-id": requestId } },
  );
}
