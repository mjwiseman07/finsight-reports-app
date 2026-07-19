import { NextResponse } from "next/server";
import { getUserFromRequest, logMfaEvent } from "@/lib/mfa/server";
import { deleteWebAuthnCredential, renameWebAuthnCredential } from "@/lib/mfa/webauthn";

type RouteCtx = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteCtx) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await deleteWebAuthnCredential(user.id, id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logMfaEvent({ userId: user.id, eventType: "webauthn_credential_removed", request });
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, context: RouteCtx) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: "auth required" }, { status: 401 });
  const { id } = await context.params;
  const { friendlyName } = await request.json();
  const { error } = await renameWebAuthnCredential(user.id, id, friendlyName);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logMfaEvent({ userId: user.id, eventType: "webauthn_credential_renamed", request });
  return NextResponse.json({ ok: true });
}
