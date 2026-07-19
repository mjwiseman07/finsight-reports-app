import { NextResponse } from "next/server";
import { getUserFromRequest, logMfaEvent } from "@/lib/mfa/server";
import { verifyRegistration } from "@/lib/mfa/webauthn";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await request.json();
  const { response, friendlyName } = body;
  const result = await verifyRegistration(user.id, response, friendlyName ?? "Security key");
  await logMfaEvent({
    userId: user.id,
    eventType: result.ok ? "webauthn_register_completed" : "webauthn_register_failed",
    request,
    metadata: { error: result.error },
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, credentialId: result.credentialId });
}
