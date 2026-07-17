import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["pending", "resolved", "dismissed"] as const;
type ReviewItemStatus = (typeof ALLOWED_STATUSES)[number];

function isValidStatus(value: string | null): value is ReviewItemStatus {
  return value !== null && (ALLOWED_STATUSES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireFirmAuth(request);
    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const status: ReviewItemStatus = isValidStatus(statusParam) ? statusParam : "pending";
    const limitParam = searchParams.get("limit");
    const limit = Math.min(Math.max(parseInt(limitParam ?? "25", 10) || 25, 1), 100);
    const cursor = searchParams.get("cursor");
    const companyId = searchParams.get("companyId");

    const supabase = createServiceClient();

    let query = supabase
      .from("ar_cash_app_review_items")
      .select(
        `
      id,
      payment_id,
      firm_id,
      company_id,
      top_candidates,
      status,
      resolved_action,
      resolved_by,
      resolved_at,
      write_off_amount,
      write_off_gl_account_id,
      on_account_customer_id,
      split_allocations,
      created_at,
      updated_at,
      ar_cash_app_match_scores (
        aggregate_feature_score,
        llm_tier_used,
        llm_confidence,
        llm_reasoning_excerpt,
        escalated_to_toptier,
        final_confidence,
        verdict
      )
    `,
      )
      .in("firm_id", session.firmIds)
      .eq("status", status)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    if (cursor) {
      query = query.gt("id", cursor);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "Failed to load review items" }, { status: 500 });
    }

    // Phase MC-2d.1: enrich each row with home_currency from
    // accounting_connections. Group company_ids to dedupe the lookup.
    const rawItems = data ?? [];
    const uniqueCompanyIds = Array.from(
      new Set(
        rawItems
          .map((r) => r.company_id as string | null | undefined)
          .filter((v): v is string => Boolean(v)),
      ),
    );
    const currencyByCompanyId = new Map<string, string>();
    if (uniqueCompanyIds.length > 0) {
      const { data: connections, error: connErr } = await supabase
        .from("accounting_connections")
        .select("id, user_id, home_currency, metadata_json")
        // company_id maps to user_id in the connections row (MC-1 canonical linkage)
        .in("user_id", uniqueCompanyIds);
      if (connErr) {
        // Non-fatal: fall through with no currency data. Modal will fall
        // back to prop / USD default. Log and continue rather than 500 the
        // reviewer queue over a currency lookup.
        console.warn("[review-items GET] home_currency lookup failed:", connErr.message);
      } else {
        for (const conn of connections ?? []) {
          if (conn.user_id && conn.home_currency) {
            currencyByCompanyId.set(conn.user_id, String(conn.home_currency).toUpperCase());
          }
        }
      }
    }
    const items = rawItems.map((row) => ({
      ...row,
      home_currency: row.company_id ? currencyByCompanyId.get(row.company_id) : undefined,
    }));

    return NextResponse.json({
      items,
      nextCursor: data && data.length === limit ? data[data.length - 1].id : null,
    });
  } catch (err) {
    return authErrorResponse(err);
  }
}
