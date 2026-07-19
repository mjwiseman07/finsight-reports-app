import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/mfa/server";
import { buildAuthenticationOptions } from "@/lib/mfa/webauthn";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const options = await buildAuthenticationOptions(user.id);
  return NextResponse.json(options);
}
