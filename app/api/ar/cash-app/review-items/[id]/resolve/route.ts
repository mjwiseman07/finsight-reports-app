import { NextRequest, NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveReviewItem, type ResolvePayload } from "@/lib/cash-app/review-queue";

export const dynamic = "force-dynamic";

const VALID_ACTIONS = ["accept", "reject", "write_off", "on_account", "split"] as const;

function validatePayload(body: unknown): ResolvePayload {
  if (typeof body !== "object" || body === null || !("action" in body)) {
    throw new Error('Payload must include an "action" field');
  }
  const action = (body as { action: unknown }).action;
  if (typeof action !== "string" || !(VALID_ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`"action" must be one of: ${VALID_ACTIONS.join(", ")}`);
  }
  const b = body as Record<string, unknown>;

  switch (action) {
    case "accept": {
      if (typeof b.invoiceId !== "string" || typeof b.matchedAmount !== "number") {
        throw new Error("accept requires invoiceId (string) and matchedAmount (number)");
      }
      return { action: "accept", invoiceId: b.invoiceId, matchedAmount: b.matchedAmount };
    }
    case "reject": {
      if (typeof b.reason !== "string" || b.reason.trim().length === 0) {
        throw new Error("reject requires a non-empty reason (string)");
      }
      return { action: "reject", reason: b.reason };
    }
    case "write_off": {
      if (typeof b.amount !== "number" || typeof b.glAccountId !== "string") {
        throw new Error("write_off requires amount (number) and glAccountId (string)");
      }
      return {
        action: "write_off",
        writeOffAmount: b.amount,
        glAccountId: b.glAccountId,
        invoiceId: typeof b.invoiceId === "string" ? b.invoiceId : "",
      };
    }
    case "on_account": {
      if (typeof b.customerId !== "string") {
        throw new Error("on_account requires customerId (string)");
      }
      return { action: "on_account", customerId: b.customerId };
    }
    case "split": {
      if (!Array.isArray(b.splitAllocations) || b.splitAllocations.length < 2) {
        throw new Error("split requires splitAllocations (array of length >= 2)");
      }
      for (const alloc of b.splitAllocations) {
        if (
          typeof alloc !== "object" ||
          alloc === null ||
          typeof (alloc as { invoiceId?: unknown }).invoiceId !== "string" ||
          typeof (alloc as { amount?: unknown }).amount !== "number"
        ) {
          throw new Error("each splitAllocations entry requires invoiceId (string) and amount (number)");
        }
      }
      return {
        action: "split",
        splitAllocations: b.splitAllocations as { invoiceId: string; amount: number }[],
      };
    }
    default:
      throw new Error(`Unhandled action: ${action}`);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireFirmAuth(request);
    const { id } = await params;

    let payload: ResolvePayload;
    try {
      const body = await request.json();
      payload = validatePayload(body);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Invalid request body";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: reviewItemRow, error: fetchError } = await supabase
      .from("ar_cash_app_review_items")
      .select("id, firm_id, company_id, payment_id, top_candidates")
      .eq("id", id)
      .in("firm_id", session.firmIds)
      .single();

    if (fetchError || !reviewItemRow) {
      return NextResponse.json({ error: "Review item not found" }, { status: 404 });
    }

    const { data: paymentRow } = await supabase
      .from("ar_cash_app_payments")
      .select("payer_name_raw")
      .eq("id", reviewItemRow.payment_id)
      .maybeSingle();

    let payerContext: { payerNameRaw: string | null; customerName: string | null } | undefined;
    if (payload.action === "accept" && paymentRow && reviewItemRow.top_candidates) {
      const candidates = (reviewItemRow.top_candidates ?? []) as Array<{
        invoiceId?: string;
        customerName?: string;
      }>;
      const match = candidates.find((c) => c.invoiceId === payload.invoiceId);
      payerContext = {
        payerNameRaw: paymentRow.payer_name_raw,
        customerName: match?.customerName ?? null,
      };
    }

    const result = await resolveReviewItem({
      supabase,
      reviewItemId: id,
      actorUserId: session.userId,
      payload,
      tenantId: {
        firmId: reviewItemRow.firm_id as string,
        companyId: reviewItemRow.company_id as string,
      },
      payerContext,
    });

    return NextResponse.json({ result });
  } catch (err) {
    if (err && typeof err === "object" && "status" in err) {
      return authErrorResponse(err);
    }
    const message = err instanceof Error ? err.message : "Failed to resolve review item";
    const status = /already resolved|not found/i.test(message) ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
