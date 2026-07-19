import { NextResponse } from "next/server";
import { getUserFromRequest, logMfaEvent } from "@/lib/mfa/server";
import { listUserTrustedDevices, revokeAllTrustedDevices } from "@/lib/mfa/trusted-devices";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const devices = await listUserTrustedDevices(user.id);
  return NextResponse.json({ devices });
}

export async function DELETE(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  await revokeAllTrustedDevices(user.id);
  await logMfaEvent({
    userId: user.id,
    eventType: "trusted_device_revoked",
    request,
    metadata: { scope: "all" },
  });
  return NextResponse.json({ ok: true });
}
