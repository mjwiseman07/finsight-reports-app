import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/mfa/server";
import { listUserWebAuthnCredentials } from "@/lib/mfa/webauthn";

export async function GET(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const credentials = await listUserWebAuthnCredentials(user.id);
  return NextResponse.json({ credentials });
}
