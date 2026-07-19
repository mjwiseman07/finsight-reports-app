import { NextResponse } from "next/server";
import { createMfaUserClient, getUserFromRequest } from "@/lib/mfa/server";
import { userHasWebAuthn } from "@/lib/mfa/webauthn";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ hasTotp: false, hasWebAuthn: false }, { status: 200 });
  }
  const supabase = await createMfaUserClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasTotp = Boolean(factors?.totp?.[0]);
  const hasWebAuthn = await userHasWebAuthn(user.id);
  return NextResponse.json({ hasTotp, hasWebAuthn });
}
