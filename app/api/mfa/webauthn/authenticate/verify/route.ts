import { NextResponse } from "next/server";
import { getUserFromRequest, logMfaEvent } from "@/lib/mfa/server";
import { verifyAuthentication } from "@/lib/mfa/webauthn";
import {
  addTrustedDevice,
  mfaVerifiedCookieName,
  signMfaVerifiedCookie,
  trustedDeviceCookieName,
} from "@/lib/mfa/trusted-devices";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const body = await request.json();
  const { response, trustDevice } = body;
  const result = await verifyAuthentication(user.id, response);
  await logMfaEvent({
    userId: user.id,
    eventType: result.ok ? "webauthn_verify_success" : "webauthn_verify_failed",
    request,
    metadata: { credentialId: result.credentialId, error: result.error },
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const response_ = NextResponse.json({ ok: true });

  // Short-lived MFA-verified cookie (WebAuthn cannot mint Supabase aal2 JWTs).
  const verified = await signMfaVerifiedCookie(user.id);
  response_.cookies.set(mfaVerifiedCookieName(), verified.cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: verified.maxAgeSeconds,
  });

  if (trustDevice === true) {
    const ua = request.headers.get("user-agent");
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const { cookieValue, maxAgeSeconds } = await addTrustedDevice(user.id, ua, ip);
    response_.cookies.set(trustedDeviceCookieName(), cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: maxAgeSeconds,
    });
    await logMfaEvent({ userId: user.id, eventType: "trusted_device_added", request });
  }

  return response_;
}
