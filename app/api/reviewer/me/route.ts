import { NextResponse } from "next/server";
import { requireFirmAuth, authErrorResponse } from "@/lib/reviewer/auth";

export async function GET(request: Request) {
  try {
    const ctx = await requireFirmAuth(request);
    return NextResponse.json({
      userId: ctx.userId,
      firmIds: ctx.firmIds,
      writerFirmIds: ctx.writerFirmIds,
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
