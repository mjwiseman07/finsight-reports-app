import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";
import { revokeDelegation } from "@/lib/ap-intake/approvals/delegation-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireFirmAuth(req);
    if (!auth.firmIds[0]) {
      return NextResponse.json({ error: "no_firm_membership" }, { status: 403 });
    }
    const { id } = await ctx.params;
    await revokeDelegation({ delegationId: id, actorUserId: auth.userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return authErrorResponse(err);
  }
}
