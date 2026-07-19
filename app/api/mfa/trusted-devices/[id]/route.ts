import { NextResponse } from "next/server";
import { getUserFromRequest, logMfaEvent } from "@/lib/mfa/server";
import { revokeTrustedDevice } from "@/lib/mfa/trusted-devices";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteCtx) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await revokeTrustedDevice(user.id, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logMfaEvent({
    userId: user.id,
    eventType: "trusted_device_revoked",
    request,
    metadata: { deviceRowId: id },
  });
  return NextResponse.json({ ok: true });
}
