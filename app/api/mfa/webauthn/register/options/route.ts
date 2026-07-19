import { NextResponse } from "next/server";
import { getUserFromRequest, logMfaEvent } from "@/lib/mfa/server";
import { buildRegistrationOptions } from "@/lib/mfa/webauthn";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const options = await buildRegistrationOptions(user.id, user.email ?? "");
  await logMfaEvent({ userId: user.id, eventType: "webauthn_register_started", request });
  return NextResponse.json(options);
}
