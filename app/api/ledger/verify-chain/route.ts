/**
 * Phase D6.5 Part 2 — Block 5
 * GET /api/ledger/verify-chain — admin-only, rate-limited
 */
import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyChain } from "@/lib/ledger/chain-verifier";

let lastRunAt = 0;

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const now = Date.now();
    if (now - lastRunAt < 60_000) {
      const retryIn = Math.ceil((60_000 - (now - lastRunAt)) / 1000);
      return NextResponse.json(
        { error: "rate_limited", retry_in_seconds: retryIn },
        { status: 429 },
      );
    }

    const ctx = await requireFirmAuth(request);
    const supabase = createServiceClient();
    const { data: memberships } = await supabase
      .from("firm_memberships")
      .select("role")
      .eq("user_id", ctx.userId)
      .eq("status", "active");

    const isAdmin = (memberships ?? []).some((m) => m.role === "firm_admin");
    if (!isAdmin) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    lastRunAt = now;
    const startParam = new URL(request.url).searchParams.get("start");
    const endParam = new URL(request.url).searchParams.get("end");
    const result = await verifyChain({
      supabase,
      startChainIndex: startParam ? parseInt(startParam, 10) : undefined,
      endChainIndex: endParam ? parseInt(endParam, 10) : undefined,
    });

    return NextResponse.json(result);
  } catch (e) {
    return authErrorResponse(e);
  }
}
