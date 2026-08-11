# Phase DASH_1C A2 — Accuracy Contract route (full contents for review)

**Status:** Approved for commit after Q1 Tier-2 `pilot_status` fail-closed fix + static Tier-4 import.  
**Do not smoke. Do not open PR until Matt smoke is green.**

## Files touched

| Path | Change |
|------|--------|
| `app/api/dashboard/accuracy-contract/route.ts` | Three-tier + fallback resolver; Tier-2 `pilot_status IN ('active','trialing')`; static `resolveCompanyIdForUser`; `routing.resolver_tier` on emit |
| `lib/lifecycle/emit-provenance-event.ts` | `ResolverTier` type; required `payload.routing` |

## Companion emit helper (`lib/lifecycle/emit-provenance-event.ts`)

- Adds `ResolverTier` union.
- Requires `payload.routing: { resolver_tier: ResolverTier }` on every emit (compile-time).
- Keeps `actor_via: "dashboard-provenance-drawer"` (DB CHECK allow-list).
- Tier is hash-chained via `payload` (Patent #6 SoR).

## Clarification — Tier 4 import

Dynamic `await import(...)` was an accidental Block A leftover (no circular dependency, no bundle need). A2 uses a normal static import at the top of the route file.

---

## Full contents: `app/api/dashboard/accuracy-contract/route.ts`

```ts
/**
 * Phase DASH_1C Block A / A2 — GET /api/dashboard/accuracy-contract
 *
 * Query: kpi_code, period, companyId (optional), pilot_slot_id (optional).
 * Emits a hash-chained provenance receipt on every successful response.
 *
 * Company identity (A2): three-tier + identity fallback — never data-driven.
 * See resolveCompanyIdWithRoutingTier below (Rule 1).
 */

import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getActiveCompanyForUser } from "@/lib/companies/active-company";
import { resolveCompanyIdForUser } from "@/lib/integrations/accounting/resolve-company-id";
import { composeAccuracyContract } from "@/lib/dashboard/accuracy-contract/compose-contract";
import {
  readCachedContract,
  writeCachedContract,
} from "@/lib/dashboard/accuracy-contract/cache";
import { checkAccuracyContractGate } from "@/lib/dashboard/accuracy-contract/gate";
import {
  emitProvenanceLifecycleEvent,
  type ResolverTier,
} from "@/lib/lifecycle/emit-provenance-event";
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
    // ar-aging shape: preferredCompanyId from companyId | company_id
    const preferredCompanyId = String(
      url.searchParams.get("companyId") || url.searchParams.get("company_id") || "",
    ).trim();
    const pilotSlotIdParam = String(url.searchParams.get("pilot_slot_id") || "").trim();

    if (!kpiCode || !SUPPORTED_KPIS.includes(kpiCode as KpiCode)) {
      return jsonError(400, "kpi_unsupported", { kpi_code: kpiCode }, requestId);
    }
    if (!period || !/^\d{4}-\d{2}(\.\.\d{4}-\d{2})?$/.test(period)) {
      return jsonError(400, "invalid_period", { period }, requestId);
    }

    const ctx = await requireFirmAuth(request);
    const admin = createServiceClient();

    const resolved = await resolveCompanyIdWithRoutingTier(admin, {
      userId: ctx.userId,
      preferredCompanyId: preferredCompanyId || null,
      pilotSlotId: pilotSlotIdParam || null,
    });
    if ("error" in resolved) {
      return jsonError(403, resolved.error, {}, requestId);
    }
    const { companyId, resolverTier } = resolved;

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
      // Rule 2 + 3: every 2xx emit carries routing.resolver_tier in the
      // hash-chained payload so the receipt proves identity signal, not just KPI.
      // actor_via stays CHECK-allowlisted `dashboard-provenance-drawer`; tier lives in payload.routing.
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
          routing: { resolver_tier: resolverTier },
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

/**
 * ------------------------------------------------------------------
 * A2 — Three-tier company identity resolver (DASH_1C Accuracy Contract)
 * ------------------------------------------------------------------
 * Order (strict — do not reorder):
 *   1. Explicit companyId / company_id → getActiveCompanyForUser(userId, preferred)
 *      Membership mandatory. Fail closed: 403 company_not_found_or_no_membership.
 *   2. Explicit pilot_slot_id → lookup slot WHERE pilot_status IN
 *      ('active','trialing') → membership via getActiveCompanyForUser.
 *      Fail closed: 403 pilot_slot_not_found_or_no_membership (never tier 3/4).
 *   3. Active-company fallback → getActiveCompanyForUser(userId, null)
 *      (same helper ar-aging / cash-flow-trailing use when no query companyId).
 *   4. Final identity fallback → resolveCompanyIdForUser(userId)
 *      (pilot-aware; A1 allow-list; DO NOT change that helper here).
 *   5. Else 403 no_active_company_for_user.
 *
 * Rule 1 (non-negotiable): Do NOT route by data availability (receipts,
 * sync recency, sync status, or any SoR payload presence). Identity is set
 * by user session / explicit client signals, matching Scorecard
 * dashboardCompanyId → sibling tile APIs. Data holes surface as 409/404
 * AFTER identity is fixed — never as a reason to pick another company.
 *
 * Rule 2: The winning resolverTier is stamped onto every
 * provenance-drawer-opened emit as payload.routing.resolver_tier.
 */
type ResolvedCompany =
  | { companyId: string; resolverTier: ResolverTier }
  | { error: "company_not_found_or_no_membership" }
  | { error: "pilot_slot_not_found_or_no_membership" }
  | { error: "no_active_company_for_user" };

async function resolveCompanyIdWithRoutingTier(
  admin: ReturnType<typeof createServiceClient>,
  args: {
    userId: string;
    preferredCompanyId: string | null;
    pilotSlotId: string | null;
  },
): Promise<ResolvedCompany> {
  // Tier 1 — explicit companyId (ar-aging: preferredCompanyId)
  // Membership mandatory. getActiveCompanyForUser may fall through to "first
  // membership" when preferred misses — reject unless returned id === preferred
  // (fail closed; do not leak into another company's contract).
  if (args.preferredCompanyId) {
    const company = await getActiveCompanyForUser(
      args.userId,
      args.preferredCompanyId,
    );
    if (!company || company.id !== args.preferredCompanyId) {
      return { error: "company_not_found_or_no_membership" };
    }
    return {
      companyId: company.id,
      resolverTier: "explicit_company_id",
    };
  }

  // Tier 2 — explicit pilot_slot_id (membership on slot.company_id mandatory;
  // pilot_status IN active|trialing fail closed — cancelled/complimentary/
  // pending/converted never resolve; do not degrade to tier 3/4)
  if (args.pilotSlotId) {
    const { data: slot } = await admin
      .from("pilot_slots")
      .select("company_id, pilot_status")
      .eq("id", args.pilotSlotId)
      .in("pilot_status", ["active", "trialing"])
      .maybeSingle();
    const slotCompanyId =
      typeof slot?.company_id === "string" ? slot.company_id : null;
    if (!slotCompanyId) {
      return { error: "pilot_slot_not_found_or_no_membership" };
    }
    const company = await getActiveCompanyForUser(args.userId, slotCompanyId);
    if (!company || company.id !== slotCompanyId) {
      return { error: "pilot_slot_not_found_or_no_membership" };
    }
    return {
      companyId: company.id,
      resolverTier: "explicit_pilot_slot_id",
    };
  }

  // Tier 3 — active-company fallback (ar-aging when preferredCompanyId is empty)
  const active = await getActiveCompanyForUser(args.userId, null);
  if (active?.id) {
    return {
      companyId: active.id,
      resolverTier: "active_company_fallback",
    };
  }

  // Tier 4 — final identity fallback (unchanged A1 helper; not data-driven)
  const fallbackId = await resolveCompanyIdForUser(admin, args.userId);
  if (fallbackId) {
    return {
      companyId: fallbackId,
      resolverTier: "resolver_fallback",
    };
  }

  return { error: "no_active_company_for_user" };
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
```
